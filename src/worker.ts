import dotenv from 'dotenv';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ReviewJobData } from './queue/jobs';
import { REVIEW_QUEUE_NAME } from './queue/constants';
import { GitHubClient } from './github/client';
import { fetchPRDiff } from './github/diff';
import { chunkDiff } from './diff/chunker';
import { createProviderFromEnv } from './llm/factory';
import { SYSTEM_PROMPT } from './review/constants';
import { buildUserPrompt } from './review/prompt';
import { parseReviewResponse } from './review/parser';
import { postReview } from './review/poster';

dotenv.config();

function createRedisConnection() {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = Number(process.env.REDIS_PORT) || 6379;
  return new IORedis({ host, port });
}

async function handleReviewJob(job: Job<ReviewJobData>): Promise<void> {
  const data = job.data;
  const { installationId, owner, repo, pullNumber } = data;

  const github = new GitHubClient();
  const octokit = await github.forInstallation(installationId);

  const { raw } = await fetchPRDiff(octokit, { owner, repo, pullNumber });
  if (!raw.trim()) {
    // No diff to review – post an approval and exit early.
    await postReview({
      client: octokit,
      owner,
      repo,
      pullNumber,
      comments: [],
    });
    return;
  }

  const chunks = chunkDiff(raw);
  if (!chunks.length) {
    await postReview({
      client: octokit,
      owner,
      repo,
      pullNumber,
      comments: [],
    });
    return;
  }

  const provider = createProviderFromEnv();
  const allComments: { path: string; line: number; body: string }[] = [];
  const categories = ['bug', 'security', 'logic', 'architecture'];
  const minSeverity = 'medium';

  for (const chunk of chunks) {
    const userPrompt = buildUserPrompt(chunk, categories, minSeverity);
    const response = await provider.complete(
      [{ role: 'user', content: userPrompt }],
      SYSTEM_PROMPT,
    );
    const parsed = parseReviewResponse(response.content, minSeverity);
    for (const c of parsed) {
      allComments.push({
        path: c.filename,
        line: c.line,
        body: `**${c.title}**\n\n${c.body}`,
      });
    }
  }

  await postReview({
    client: octokit,
    owner,
    repo,
    pullNumber,
    comments: allComments,
  });
}

async function main(): Promise<void> {
  const connection = createRedisConnection();

  const worker = new Worker<ReviewJobData>(REVIEW_QUEUE_NAME, async job => handleReviewJob(job), {
    connection: connection as any,
    concurrency: 5,
  });

  worker.on('completed', job => {
    // eslint-disable-next-line no-console
    console.log('Job completed', { id: job.id });
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error('Job failed', { id: job?.id, err });
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

