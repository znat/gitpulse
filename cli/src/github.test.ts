import { describe, it, expect, vi } from 'vitest';
import { GitHubClient } from './github.ts';

// Mock graphql instance — replaces the private `gql` field on a real
// GitHubClient so the parsing logic is exercised without touching the
// network. `defaults` returns a function that takes (query, vars).
function clientWithMock(impl: (query: string, vars: unknown) => Promise<unknown>): GitHubClient {
  const client = new GitHubClient('test-token');
  (client as unknown as { gql: typeof impl }).gql = impl;
  return client;
}

describe('GitHubClient.listLabeledPRs', () => {
  it('returns one entry per PR with the merge commit SHA', async () => {
    const client = clientWithMock(async () => ({
      search: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          { number: 45, mergeCommit: { oid: 'sha-45' } },
          { number: 52, mergeCommit: { oid: 'sha-52' } },
        ],
      },
    }));

    const result = await client.listLabeledPRs('o', 'r', 'gitpulse:ignore');
    expect(result).toEqual([
      { number: 45, sha: 'sha-45' },
      { number: 52, sha: 'sha-52' },
    ]);
  });

  it('skips PRs without a merge commit (still-open or squashed-into-nothing edge cases)', async () => {
    const client = clientWithMock(async () => ({
      search: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          { number: 1, mergeCommit: null },
          { number: 2, mergeCommit: { oid: 'sha-2' } },
        ],
      },
    }));

    const result = await client.listLabeledPRs('o', 'r', 'gitpulse:ignore');
    expect(result).toEqual([{ number: 2, sha: 'sha-2' }]);
  });

  it('returns an empty array on GraphQL error rather than throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = clientWithMock(async () => {
      throw new Error('boom');
    });
    const result = await client.listLabeledPRs('o', 'r', 'gitpulse:ignore');
    expect(result).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('paginates when hasNextPage is true', async () => {
    let call = 0;
    const client = clientWithMock(async () => {
      call++;
      if (call === 1) {
        return {
          search: {
            pageInfo: { hasNextPage: true, endCursor: 'cur-1' },
            nodes: [{ number: 1, mergeCommit: { oid: 'sha-1' } }],
          },
        };
      }
      return {
        search: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [{ number: 2, mergeCommit: { oid: 'sha-2' } }],
        },
      };
    });

    const result = await client.listLabeledPRs('o', 'r', 'gitpulse:ignore');
    expect(call).toBe(2);
    expect(result).toEqual([
      { number: 1, sha: 'sha-1' },
      { number: 2, sha: 'sha-2' },
    ]);
  });
});
