import { describe, it, expect } from 'vitest';
import { StorySchema } from './schemas.ts';

const validPRStory = {
  id: 'pr-42',
  kind: 'pr' as const,
  sha: 'abc123def456',
  author: 'octocat',
  authorUrl: 'https://github.com/octocat',
  committedAt: '2026-05-01T12:00:00Z',
  categories: [{ key: 'feature', score: 90, reason: 'adds X' }],
  headline: 'Add feature X',
  standfirst: 'A short summary.',
  story: 'Body text.',
  digestSentence: 'Digest.',
  technicalDescription: 'Technical detail.',
  imageDirection: null,
  hasFactCheckIssues: false,
  factCheckIssues: null,
  sizeAssessment: 'small',
  sizeReasoning: 'A few files changed.',
  additions: 10,
  deletions: 2,
  filesChanged: 3,
  commitUrl: 'https://github.com/znat/gitpulse/commit/abc123',
  prNumber: 42,
  prUrl: 'https://github.com/znat/gitpulse/pull/42',
  mergedAt: '2026-05-01T13:00:00Z',
};

const validCommitStory = {
  id: 'commit-abc1234',
  kind: 'direct-push' as const,
  sha: 'abc1234def567',
  author: 'octocat',
  committedAt: '2026-05-01T12:00:00Z',
  categories: [{ key: 'maintenance', score: 60, reason: 'tidy' }],
  headline: 'Tidy up imports',
  standfirst: 'A small cleanup.',
  story: 'Body.',
  digestSentence: 'Digest.',
  technicalDescription: 'Technical.',
  imageDirection: null,
  hasFactCheckIssues: false,
  factCheckIssues: null,
  sizeAssessment: 'xs',
  sizeReasoning: 'Tiny.',
  additions: 1,
  deletions: 1,
  filesChanged: 1,
  commitUrl: 'https://github.com/znat/gitpulse/commit/abc1234',
};

describe('StorySchema', () => {
  it('accepts a fully populated PR story', () => {
    expect(StorySchema.safeParse(validPRStory).success).toBe(true);
  });

  it('accepts a direct-push story without prNumber/prUrl/mergedAt', () => {
    expect(StorySchema.safeParse(validCommitStory).success).toBe(true);
  });

  it('rejects PR story missing prNumber', () => {
    const broken = { ...validPRStory } as Record<string, unknown>;
    delete broken.prNumber;
    const result = StorySchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects unknown kind', () => {
    const broken = { ...validPRStory, kind: 'tag' };
    expect(StorySchema.safeParse(broken).success).toBe(false);
  });

  it('rejects unknown size assessment', () => {
    const broken = { ...validCommitStory, sizeAssessment: 'huge' };
    expect(StorySchema.safeParse(broken).success).toBe(false);
  });

  it('rejects empty categories array', () => {
    const broken = { ...validCommitStory, categories: [] };
    expect(StorySchema.safeParse(broken).success).toBe(false);
  });

  it('rejects negative line counts', () => {
    const broken = { ...validCommitStory, additions: -1 };
    expect(StorySchema.safeParse(broken).success).toBe(false);
  });

  it('rejects PR story with prNumber of zero', () => {
    const broken = { ...validPRStory, prNumber: 0 };
    expect(StorySchema.safeParse(broken).success).toBe(false);
  });

  it('accepts PR story without optional mergedAt', () => {
    const story = { ...validPRStory } as Record<string, unknown>;
    delete story.mergedAt;
    expect(StorySchema.safeParse(story).success).toBe(true);
  });

  it('accepts story without optional commitUrl', () => {
    const story = { ...validCommitStory } as Record<string, unknown>;
    delete story.commitUrl;
    expect(StorySchema.safeParse(story).success).toBe(true);
  });

  it('rejects null where strings are required', () => {
    const broken = { ...validCommitStory, headline: null };
    expect(StorySchema.safeParse(broken).success).toBe(false);
  });

  it('accepts imageDirection as a non-null string', () => {
    const story = {
      ...validCommitStory,
      imageDirection: 'A wide-angle photo of a printing press.',
    };
    expect(StorySchema.safeParse(story).success).toBe(true);
  });

  it('accepts factCheckIssues as a non-null string when hasFactCheckIssues is true', () => {
    const story = {
      ...validCommitStory,
      hasFactCheckIssues: true,
      factCheckIssues: 'Headline overstates the change.',
    };
    expect(StorySchema.safeParse(story).success).toBe(true);
  });
});
