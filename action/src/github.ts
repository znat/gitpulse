import { graphql } from '@octokit/graphql';

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  url: string;
}

export interface PRData {
  number: number;
  title: string;
  body: string;
  url: string;
  mergedAt: string | null;
  authorLogin: string | null;
  authorUrl: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  linkedIssues: LinkedIssue[];
}

export interface LinkedIssue {
  number: number;
  title: string;
  body: string;
  url: string;
}

export interface CommitAuthor {
  login: string;
  url: string;
}

export interface CommitContext {
  pr: PRData | null;
  commitAuthor: CommitAuthor | null;
}

interface CommitContextResponse {
  repository: {
    object: {
      author?: {
        user?: { login: string; url: string } | null;
      } | null;
      associatedPullRequests: {
        nodes: Array<{
          number: number;
          title: string;
          body: string | null;
          url: string;
          mergedAt: string | null;
          additions: number;
          deletions: number;
          changedFiles: number;
          author: { login: string; url?: string } | null;
          closingIssuesReferences: {
            nodes: Array<{
              number: number;
              title: string;
              body: string | null;
              url: string;
            }>;
          };
        }>;
      };
    } | null;
  };
}

const COMMIT_CONTEXT_QUERY = `
  query CommitContext($owner: String!, $repo: String!, $oid: GitObjectID!) {
    repository(owner: $owner, name: $repo) {
      object(oid: $oid) {
        ... on Commit {
          author {
            user { login url }
          }
          associatedPullRequests(first: 1, orderBy: { field: CREATED_AT, direction: DESC }) {
            nodes {
              number
              title
              body
              url
              mergedAt
              additions
              deletions
              changedFiles
              author { login url }
              closingIssuesReferences(first: 10) {
                nodes {
                  number
                  title
                  body
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;

const REPO_QUERY = `
  query Repo($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      description
      url
    }
  }
`;

interface RepoQueryResponse {
  repository: { description: string | null; url: string };
}

export class GitHubClient {
  private gql: typeof graphql;

  constructor(token: string) {
    this.gql = graphql.defaults({
      headers: { authorization: `token ${token}` },
    });
  }

  async fetchRepo(owner: string, repo: string): Promise<RepoInfo> {
    try {
      const r = await this.gql<RepoQueryResponse>(REPO_QUERY, { owner, repo });
      return {
        owner,
        repo,
        description: r.repository.description ?? '',
        url: r.repository.url,
      };
    } catch (err) {
      console.warn(
        `[gitpulse] repo fetch failed: ${err instanceof Error ? err.message : err}`,
      );
      return { owner, repo, description: '', url: `https://github.com/${owner}/${repo}` };
    }
  }

  async fetchCommitContext(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<CommitContext> {
    let response: CommitContextResponse;
    try {
      response = await this.gql<CommitContextResponse>(COMMIT_CONTEXT_QUERY, {
        owner,
        repo,
        oid: sha,
      });
    } catch (err) {
      console.warn(
        `[gitpulse] GraphQL fetch failed for ${sha.slice(0, 7)}: ${err instanceof Error ? err.message : err}`,
      );
      return { pr: null, commitAuthor: null };
    }

    const obj = response.repository.object;
    const userNode = obj?.author?.user ?? null;
    const commitAuthor: CommitAuthor | null = userNode
      ? { login: userNode.login, url: userNode.url }
      : null;

    const prNode = obj?.associatedPullRequests.nodes[0];
    const pr: PRData | null = prNode
      ? {
          number: prNode.number,
          title: prNode.title,
          body: prNode.body ?? '',
          url: prNode.url,
          mergedAt: prNode.mergedAt,
          authorLogin: prNode.author?.login ?? null,
          authorUrl: prNode.author?.url ?? null,
          additions: prNode.additions,
          deletions: prNode.deletions,
          changedFiles: prNode.changedFiles,
          linkedIssues: prNode.closingIssuesReferences.nodes.map((i) => ({
            number: i.number,
            title: i.title,
            body: i.body ?? '',
            url: i.url,
          })),
        }
      : null;

    return { pr, commitAuthor };
  }
}

export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${fullName}`);
  return { owner, repo };
}
