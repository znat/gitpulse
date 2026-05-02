import { describe, it, expect } from 'vitest';
import {
  assembleRelease,
  buildDraft,
  computeInputsHash,
  matchStoriesForRelease,
  toTopStory,
} from './release-builder.ts';
import type { Story } from './types.ts';

function makePRStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'pr-1',
    kind: 'pr',
    sha: 'sha-1',
    author: 'octocat',
    committedAt: '2026-05-01T12:00:00Z',
    categories: [{ key: 'feature', score: 90, reason: 'adds X' }],
    headline: 'Headline 1',
    standfirst: 'Standfirst 1',
    story: '',
    digestSentence: '',
    technicalDescription: '',
    imageDirection: null,
    hasFactCheckIssues: false,
    factCheckIssues: null,
    sizeAssessment: 'small',
    sizeReasoning: '',
    additions: 50,
    deletions: 10,
    filesChanged: 3,
    prNumber: 1,
    prUrl: 'https://github.com/x/y/pull/1',
    ...overrides,
  };
}

describe('matchStoriesForRelease', () => {
  it('returns only stories whose SHA is in the provided list', () => {
    const stories = [
      makePRStory({ id: 'pr-1', sha: 'sha-1' }),
      makePRStory({ id: 'pr-2', sha: 'sha-2' }),
      makePRStory({ id: 'pr-3', sha: 'sha-3' }),
    ];
    const result = matchStoriesForRelease(stories, ['sha-1', 'sha-3']);
    expect(result.map((s) => s.id)).toEqual(['pr-1', 'pr-3']);
  });

  it('returns empty array when no SHAs match', () => {
    const stories = [makePRStory({ sha: 'sha-1' })];
    expect(matchStoriesForRelease(stories, ['sha-99'])).toEqual([]);
  });

  it('returns empty array when shaList is empty', () => {
    const stories = [makePRStory()];
    expect(matchStoriesForRelease(stories, [])).toEqual([]);
  });
});

describe('toTopStory', () => {
  it('produces the expected denormalized shape', () => {
    const story = makePRStory({
      id: 'pr-42',
      prNumber: 42,
      additions: 100,
      deletions: 20,
      author: 'alice',
    });
    const ts = toTopStory(story);
    expect(ts).toEqual({
      storyId: 'pr-42',
      prNumber: 42,
      headline: 'Headline 1',
      standfirst: 'Standfirst 1',
      authorLogin: 'alice',
      primaryCategoryKey: 'feature',
      additions: 100,
      deletions: 20,
    });
  });

  it('uses 0 for prNumber on direct-push stories', () => {
    const story: Story = {
      ...makePRStory(),
      kind: 'direct-push',
      id: 'commit-abc',
      prNumber: undefined,
    };
    expect(toTopStory(story).prNumber).toBe(0);
  });

  it('falls back to misc when categories is empty', () => {
    const story = makePRStory({ categories: [] });
    expect(toTopStory(story).primaryCategoryKey).toBe('misc');
  });
});

describe('buildDraft', () => {
  const baseInput = {
    schemaVersion: 1,
    tag: 'v1.0.0',
    name: 'First',
    publishedAt: '2026-05-02T12:00:00Z',
    authorLogin: 'octocat',
    authorUrl: 'https://github.com/octocat',
    isPrerelease: false,
    releaseUrl: 'https://github.com/x/y/releases/tag/v1.0.0',
    previousTag: 'v0.9.0',
  };

  it('puts the largest 5 stories in topStories and the rest in changelog', () => {
    const matchedStories: Story[] = [
      makePRStory({ id: 'pr-1', additions: 500, deletions: 20 }),
      makePRStory({ id: 'pr-2', additions: 100, deletions: 5 }),
      makePRStory({ id: 'pr-3', additions: 50, deletions: 5 }),
      makePRStory({ id: 'pr-4', additions: 30, deletions: 5 }),
      makePRStory({ id: 'pr-5', additions: 20, deletions: 5 }),
      makePRStory({ id: 'pr-6', additions: 10, deletions: 5 }),
      makePRStory({ id: 'pr-7', additions: 5, deletions: 5 }),
    ];
    const draft = buildDraft({ ...baseInput, matchedStories });
    expect(draft.meta.topStories.map((s) => s.storyId)).toEqual([
      'pr-1',
      'pr-2',
      'pr-3',
      'pr-4',
      'pr-5',
    ]);
    expect(draft.meta.changelogStoryIds).toEqual(['pr-6', 'pr-7']);
  });

  it('aggregates stats across all matched stories', () => {
    const matchedStories: Story[] = [
      makePRStory({ id: 'pr-1', author: 'a', additions: 10, deletions: 1 }),
      makePRStory({ id: 'pr-2', author: 'b', additions: 20, deletions: 2 }),
      makePRStory({ id: 'pr-3', author: 'a', additions: 30, deletions: 3 }),
    ];
    const draft = buildDraft({ ...baseInput, matchedStories });
    expect(draft.meta.prCount).toBe(3);
    expect(draft.meta.contributorCount).toBe(2);
    expect(draft.meta.totalAdditions).toBe(60);
    expect(draft.meta.totalDeletions).toBe(6);
  });

  it('handles a release with zero matched stories (first release)', () => {
    const draft = buildDraft({
      ...baseInput,
      previousTag: null,
      matchedStories: [],
    });
    expect(draft.meta.prCount).toBe(0);
    expect(draft.meta.topStories).toEqual([]);
    expect(draft.meta.changelogStoryIds).toEqual([]);
    expect(draft.meta.contributorCount).toBe(0);
    expect(draft.meta.totalAdditions).toBe(0);
    expect(draft.meta.totalDeletions).toBe(0);
  });

  it('produces a stable inputsHash for identical inputs', () => {
    const matchedStories = [
      makePRStory({ id: 'pr-1', sha: 's1' }),
      makePRStory({ id: 'pr-2', sha: 's2' }),
    ];
    const a = buildDraft({ ...baseInput, matchedStories });
    const b = buildDraft({ ...baseInput, matchedStories });
    expect(a.inputsHash).toBe(b.inputsHash);
  });

  it('produces a different inputsHash when story IDs differ', () => {
    const a = buildDraft({
      ...baseInput,
      matchedStories: [makePRStory({ id: 'pr-1' })],
    });
    const b = buildDraft({
      ...baseInput,
      matchedStories: [makePRStory({ id: 'pr-2' })],
    });
    expect(a.inputsHash).not.toBe(b.inputsHash);
  });

  it('produces the same hash regardless of input order', () => {
    const s1 = makePRStory({ id: 'pr-1', additions: 5, deletions: 0 });
    const s2 = makePRStory({ id: 'pr-2', additions: 5, deletions: 0 });
    const a = buildDraft({ ...baseInput, matchedStories: [s1, s2] });
    const b = buildDraft({ ...baseInput, matchedStories: [s2, s1] });
    expect(a.inputsHash).toBe(b.inputsHash);
  });
});

describe('computeInputsHash', () => {
  it('returns a 16-char hex string', () => {
    const hash = computeInputsHash({
      schemaVersion: 1,
      tag: 'v1.0.0',
      name: null,
      publishedAt: '2026-05-02T12:00:00Z',
      authorLogin: 'x',
      isPrerelease: false,
      releaseUrl: 'u',
      previousTag: null,
      prCount: 0,
      contributorCount: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      topStories: [],
      changelogStoryIds: [],
    });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('assembleRelease', () => {
  it('produces a Release object that matches the schema shape', () => {
    const draft = buildDraft({
      schemaVersion: 1,
      tag: 'v1.0.0',
      name: null,
      publishedAt: '2026-05-02T12:00:00Z',
      authorLogin: 'octocat',
      isPrerelease: false,
      releaseUrl: 'https://github.com/x/y/releases/tag/v1.0.0',
      previousTag: null,
      matchedStories: [makePRStory()],
    });
    const release = assembleRelease(draft, {
      quip: 'Q.',
      releaseStory: 'S.',
    });
    expect(release.quip).toBe('Q.');
    expect(release.releaseStory).toBe('S.');
    expect(release.inputsHash).toBe(draft.inputsHash);
    expect(release.tag).toBe('v1.0.0');
  });
});
