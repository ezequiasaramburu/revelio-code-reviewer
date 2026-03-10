import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

export interface GitHubClientConfig {
  appId: number;
  privateKey: string;
}

export class GitHubClient {
  private readonly appOctokit: Octokit;

  constructor(config?: Partial<GitHubClientConfig>) {
    const appId = config?.appId ?? Number(process.env.GITHUB_APP_ID);
    const privateKey = config?.privateKey ?? process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      throw new Error('Missing GitHub App configuration (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)');
    }

    this.appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId,
        privateKey,
      },
    });
  }

  /**
   * Returns an Octokit instance authenticated as a specific installation.
   * All GitHub API calls for a given job should go through this client.
   */
  async forInstallation(installationId: number): Promise<Octokit> {
    if (!installationId) {
      throw new Error('installationId is required to create an installation client');
    }

    const auth = this.appOctokit.auth as ReturnType<typeof createAppAuth>;
    const installationAuth = await auth({
      type: 'installation',
      installationId,
    });

    const token =
      typeof installationAuth === 'object' && 'token' in installationAuth
        ? (installationAuth as { token: string }).token
        : undefined;

    if (!token) {
      throw new Error('Failed to obtain installation access token from GitHub');
    }

    return new Octokit({ auth: token });
  }
}

