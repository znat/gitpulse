import { describe, it, expect } from 'vitest';
import { storySlug, storyPath, storyOgImagePath } from './urls';
import type { Story } from './stories';

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'pr-42',
    kind: 'pr',
    sha: 'abc1234',
    author: 'octocat',
    committedAt: '2026-05-01T12:00:00Z',
    categories: [{ key: 'feature', score: 90, reason: 'adds X' }],
    headline: 'Hello World',
    standfirst: '',
    story: '',
    digestSentence: '',
    technicalDescription: '',
    imageDirection: null,
    hasFactCheckIssues: false,
    factCheckIssues: null,
    sizeAssessment: 'small',
    sizeReasoning: '',
    additions: 0,
    deletions: 0,
    filesChanged: 0,
    ...overrides,
  };
}

describe('storySlug', () => {
  it('returns the slugified headline', () => {
    expect(storySlug('Hello World')).toBe('hello-world');
  });
});

describe('storyPath', () => {
  it('returns id + slug + trailing slash', () => {
    const story = makeStory({ id: 'pr-42', headline: 'Add Feature X' });
    expect(storyPath(story)).toBe('/stories/pr-42/add-feature-x/');
  });

  it('omits the slug segment when headline produces no slug', () => {
    const story = makeStory({ id: 'commit-abc', headline: '!!! ???' });
    expect(storyPath(story)).toBe('/stories/commit-abc/');
  });
});

describe('storyOgImagePath', () => {
  it('appends opengraph-image.png at the slug path', () => {
    const story = makeStory({ id: 'pr-42', headline: 'Add Feature X' });
    expect(storyOgImagePath(story)).toBe(
      '/stories/pr-42/add-feature-x/opengraph-image.png',
    );
  });

  it('appends opengraph-image.png at the bare id path when no slug', () => {
    const story = makeStory({ id: 'commit-abc', headline: '???' });
    expect(storyOgImagePath(story)).toBe(
      '/stories/commit-abc/opengraph-image.png',
    );
  });
});
