import { graphql } from '@octokit/graphql';

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

interface CommitWithPRsResponse {
  repository: {
    object: {
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

const COMMIT_WITH_PRS_QUERY = `
  query CommitWithPRs($owner: String!, $repo: String!, $oid: GitObjectID!) {
    repository(owner: $owner, name: $repo) {
      object(oid: $oid) {
        ... on Commit {
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

export class GitHubClient {
  private gql: typeof graphql;

  constructor(token: string) {
    this.gql = graphql.defaults({
      headers: { authorization: `token ${token}` },
    });
  }

  async fetchPRForCommit(
    owner: string,
    repo: string,
    sha: string,
  ): Promise<PRData | null> {
    let response: CommitWithPRsResponse;
    try {
      response = await this.gql<CommitWithPRsResponse>(COMMIT_WITH_PRS_QUERY, {
        owner,
        repo,
        oid: sha,
      });
    } catch (err) {
      console.warn(
        `[gitpulse] GraphQL fetch failed for ${sha.slice(0, 7)}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
    const pr = response.repository.object?.associatedPullRequests.nodes[0];
    if (!pr) return null;

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body ?? '',
      url: pr.url,
      mergedAt: pr.mergedAt,
      authorLogin: pr.author?.login ?? null,
      authorUrl: pr.author?.url ?? null,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      linkedIssues: pr.closingIssuesReferences.nodes.map((i) => ({
        number: i.number,
        title: i.title,
        body: i.body ?? '',
        url: i.url,
      })),
    };
  }
}

export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${fullName}`);
  return { owner, repo };
}
