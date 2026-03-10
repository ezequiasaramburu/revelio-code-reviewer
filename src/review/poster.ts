import type { Octokit } from '@octokit/rest';

export interface ReviewCommentInput {
  path: string;
  line: number;
  body: string;
}

export interface PostReviewParams {
  client: Octokit;
  owner: string;
  repo: string;
  pullNumber: number;
  comments: ReviewCommentInput[];
}

/**
 * Posts a single consolidated review to a pull request.
 * If there are no comments, posts an APPROVE review with a short summary.
 */
export async function postReview(params: PostReviewParams): Promise<void> {
  const { client, owner, repo, pullNumber, comments } = params;

  if (!comments.length) {
    await client.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: 'APPROVE',
      body: 'Revelio: no issues found in this pull request.',
    });
    return;
  }

  await client.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event: 'REQUEST_CHANGES',
    body: 'Revelio found issues in this pull request. See inline comments for details.',
    comments: comments.map(c => ({
      path: c.path,
      line: c.line,
      side: 'RIGHT',
      body: c.body,
    })),
  });
}

