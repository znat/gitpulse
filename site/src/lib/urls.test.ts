import { describe, it, expect } from 'vitest';
import {
  storySlug,
  storyPath,
  storyOgImagePath,
  releasePath,
  releaseOgImagePath,
  releaseSlug,
  releasesIndexPath,
} from './urls';
import type { Story } from './stories';
import type { Release } from './releases';

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'pr-42',
    kind: 'pr',
    prNumber: 42,
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

function makeCommitStory(overrides: Partial<Story> = {}): Story {
  return makeStory({
    id: 'commit-abc1234',
    kind: 'direct-push',
    prNumber: undefined,
    sha: 'abc1234567890abcdef1234567890abcdef123456',
    ...overrides,
  });
}

describe('storySlug', () => {
  it('returns the slugified headline', () => {
    expect(storySlug('Hello World')).toBe('hello-world');
  });
});

describe('storyPath', () => {
  it('builds /pull/<n>/<slug>/ for PR stories', () => {
    const story = makeStory({ prNumber: 42, headline: 'Add Feature X' });
    expect(storyPath(story)).toBe('/pull/42/add-feature-x/');
  });

  it('builds /commit/<sha>/<slug>/ for direct-push stories', () => {
    const story = makeCommitStory({
      sha: 'abc1234567890abcdef1234567890abcdef123456',
      headline: 'Refactor logger',
    });
    expect(storyPath(story)).toBe(
      '/commit/abc1234567890abcdef1234567890abcdef123456/refactor-logger/',
    );
  });

  it('omits the slug segment when a PR headline produces no slug', () => {
    const story = makeStory({ prNumber: 7, headline: '!!! ???' });
    expect(storyPath(story)).toBe('/pull/7/');
  });

  it('omits the slug segment when a commit headline produces no slug', () => {
    const story = makeCommitStory({ sha: 'deadbeef', headline: '???' });
    expect(storyPath(story)).toBe('/commit/deadbeef/');
  });
});

describe('storyOgImagePath', () => {
  it('appends opengraph-image.png at the PR slug path', () => {
    const story = makeStory({ prNumber: 42, headline: 'Add Feature X' });
    expect(storyOgImagePath(story)).toBe(
      '/pull/42/add-feature-x/opengraph-image.png',
    );
  });

  it('appends opengraph-image.png at the commit slug path', () => {
    const story = makeCommitStory({
      sha: 'abc1234567890abcdef1234567890abcdef123456',
      headline: 'Refactor logger',
    });
    expect(storyOgImagePath(story)).toBe(
      '/commit/abc1234567890abcdef1234567890abcdef123456/refactor-logger/opengraph-image.png',
    );
  });

  it('appends opengraph-image.png at the bare PR path when no slug', () => {
    const story = makeStory({ prNumber: 7, headline: '???' });
    expect(storyOgImagePath(story)).toBe('/pull/7/opengraph-image.png');
  });
});

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    schemaVersion: 1,
    tag: 'v1.0.0',
    name: null,
    publishedAt: '2026-05-02T12:00:00Z',
    authorLogin: 'octocat',
    isPrerelease: false,
    releaseUrl: 'https://github.com/x/y/releases/tag/v1.0.0',
    previousTag: null,
    quip: '',
    releaseStory: '',
    prCount: 0,
    contributorCount: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    topStories: [],
    changelogStoryIds: [],
    inputsHash: 'h',
    ...overrides,
  };
}

describe('releasesIndexPath', () => {
  it('returns the releases index path', () => {
    expect(releasesIndexPath()).toBe('/releases/');
  });
});

describe('releaseSlug', () => {
  it('uses the release name when present', () => {
    const release = makeRelease({ name: 'First Stable Release' });
    expect(releaseSlug(release)).toBe('first-stable-release');
  });

  it('falls back to the tag when name is null', () => {
    const release = makeRelease({ name: null, tag: 'v1.0.0' });
    expect(releaseSlug(release)).toBe('v1-0-0');
  });

  it('falls back to the tag when name is an empty string', () => {
    // Regression: `??` would have let '' through, yielding an empty slug.
    const release = makeRelease({ name: '', tag: 'v1.0.0' });
    expect(releaseSlug(release)).toBe('v1-0-0');
  });
});

describe('releasePath', () => {
  it('builds /releases/tag/<tag>/<slug>/ when name is set', () => {
    const release = makeRelease({ tag: 'v1.0.0', name: 'First' });
    expect(releasePath(release)).toBe('/releases/tag/v1.0.0/first/');
  });

  it('builds /releases/tag/<tag>/<tag-slug>/ when name is null', () => {
    const release = makeRelease({ tag: 'v1.0.0', name: null });
    expect(releasePath(release)).toBe('/releases/tag/v1.0.0/v1-0-0/');
  });

  it('encodes tags containing slashes', () => {
    const release = makeRelease({ tag: 'release/v1.0.0', name: 'First' });
    expect(releasePath(release)).toBe(
      '/releases/tag/release%2Fv1.0.0/first/',
    );
  });
});

describe('releaseOgImagePath', () => {
  it('appends opengraph-image.png at the slug path', () => {
    const release = makeRelease({ tag: 'v1.0.0', name: 'First' });
    expect(releaseOgImagePath(release)).toBe(
      '/releases/tag/v1.0.0/first/opengraph-image.png',
    );
  });
});
