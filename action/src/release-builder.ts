// Pure builders for release files — no LLM calls. The analyzer
// orchestrator (index.ts) calls these, decides whether the inputs hash
// changed, then optionally invokes the LLM and writes the final file.

import { createHash } from 'node:crypto';
import { primaryCategoryKey } from './category-helpers.ts';
import type {
  Release,
  ReleaseTopStory,
  Story,
} from './types.ts';

const TOP_STORIES_LIMIT = 5;

// Pull from `allStories` only those whose `sha` was in the merge-commit
// SHA list returned by the GitHub compare endpoint for this release pair.
export function matchStoriesForRelease(
  allStories: Story[],
  shaList: string[],
): Story[] {
  const wanted = new Set(shaList);
  return allStories.filter((s) => wanted.has(s.sha));
}

// Rank stories: largest first by (additions + deletions). The LLM uses
// the top N as featured context; the rest become the changelog.
function rankStories(stories: Story[]): Story[] {
  return [...stories].sort((a, b) => {
    const aSize = a.additions + a.deletions;
    const bSize = b.additions + b.deletions;
    if (aSize !== bSize) return bSize - aSize;
    return a.committedAt.localeCompare(b.committedAt);
  });
}

export function toTopStory(story: Story): ReleaseTopStory {
  return {
    storyId: story.id,
    prNumber: story.kind === 'pr' ? story.prNumber! : 0,
    headline: story.headline,
    standfirst: story.standfirst,
    authorLogin: story.author,
    primaryCategoryKey: primaryCategoryKey(story.categories),
    additions: story.additions,
    deletions: story.deletions,
  };
}

export interface ReleaseAssemblyInput {
  schemaVersion: number;
  tag: string;
  name: string | null;
  publishedAt: string;
  authorLogin: string;
  authorUrl?: string;
  isPrerelease: boolean;
  releaseUrl: string;
  previousTag: string | null;
  matchedStories: Story[];
}

export interface ReleaseDraft {
  meta: Omit<Release, 'quip' | 'releaseStory' | 'inputsHash'>;
  topPRStories: Story[]; // for LLM context (full Story refs, not denormalized)
  inputsHash: string;
}

export function buildDraft(input: ReleaseAssemblyInput): ReleaseDraft {
  const ranked = rankStories(input.matchedStories);
  const top = ranked.slice(0, TOP_STORIES_LIMIT);
  const rest = ranked.slice(TOP_STORIES_LIMIT);

  const totalAdditions = input.matchedStories.reduce(
    (s, x) => s + x.additions,
    0,
  );
  const totalDeletions = input.matchedStories.reduce(
    (s, x) => s + x.deletions,
    0,
  );
  const contributors = new Set(input.matchedStories.map((s) => s.author));

  const meta: ReleaseDraft['meta'] = {
    schemaVersion: input.schemaVersion,
    tag: input.tag,
    name: input.name,
    publishedAt: input.publishedAt,
    authorLogin: input.authorLogin,
    authorUrl: input.authorUrl,
    isPrerelease: input.isPrerelease,
    releaseUrl: input.releaseUrl,
    previousTag: input.previousTag,
    prCount: input.matchedStories.length,
    contributorCount: contributors.size,
    totalAdditions,
    totalDeletions,
    topStories: top.map(toTopStory),
    changelogStoryIds: rest.map((s) => s.id),
  };

  const inputsHash = computeInputsHash(meta);
  return { meta, topPRStories: top, inputsHash };
}

// Stable hash over the inputs that affect the LLM-generated content.
// Re-running the analyzer with the same inputs should produce the same
// hash so we can skip the LLM call entirely.
export function computeInputsHash(
  meta: Omit<Release, 'quip' | 'releaseStory' | 'inputsHash'>,
): string {
  const fingerprint = JSON.stringify({
    tag: meta.tag,
    previousTag: meta.previousTag,
    prCount: meta.prCount,
    contributorCount: meta.contributorCount,
    totalAdditions: meta.totalAdditions,
    totalDeletions: meta.totalDeletions,
    // Sort to be order-independent.
    topStoryIds: meta.topStories.map((s) => s.storyId).sort(),
    changelogStoryIds: [...meta.changelogStoryIds].sort(),
  });
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
}

export function assembleRelease(
  draft: ReleaseDraft,
  edition: { quip: string; releaseStory: string },
): Release {
  return {
    ...draft.meta,
    quip: edition.quip,
    releaseStory: edition.releaseStory,
    inputsHash: draft.inputsHash,
  };
}
