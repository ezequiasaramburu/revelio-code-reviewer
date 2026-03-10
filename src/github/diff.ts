import type { Octokit } from '@octokit/rest';

export interface PullRequestRef {
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface FetchedDiff {
  raw: string;
}

/**
 * Fetches the unified diff for a pull request.
 * Returns an empty string if the PR has no diffable changes.
 */
export async function fetchPRDiff(
  client: Octokit,
  ref: PullRequestRef,
): Promise<FetchedDiff> {
  const { owner, repo, pullNumber } = ref;

  const response = await client.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: {
      format: 'diff',
    },
  });

  const raw = typeof response.data === 'string' ? response.data : '';

  return { raw };
}

