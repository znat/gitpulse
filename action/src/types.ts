import type { ChangesNodeOutput, CategoryEntry, SizeAssessment } from './schemas.ts';

export interface CommitRecord {
  sha: string;
  shortSha: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  subject: string;
  body: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: FileChange[];
}

export interface FileChange {
  path: string;
  status: string; // M, A, D, R, etc.
  additions: number;
  deletions: number;
  patch: string;
}

export type StoryKind = 'pr' | 'direct-push';

export interface Story {
  id: string;
  kind: StoryKind;
  sha: string;
  author: string;
  authorUrl?: string;
  committedAt: string;
  // ChangesNodeOutput fields:
  categories: CategoryEntry[];
  headline: string;
  standfirst: string;
  story: string; // Markdown body — the user-facing narrative
  digestSentence: string;
  technicalDescription: string;
  imageDirection: string | null;
  hasFactCheckIssues: boolean;
  factCheckIssues: string | null;
  // Size assessment (rule-based)
  sizeAssessment: SizeAssessment;
  sizeReasoning: string;
  additions: number;
  deletions: number;
  filesChanged: number;
  // Source metadata
  commitUrl?: string;
  prNumber?: number;
  prUrl?: string;
  mergedAt?: string;
}

export type AISummary = ChangesNodeOutput;

// ── Releases ─────────────────────────────────────────────
//
// Releases are a sibling entity to Story — not a discriminated kind. They
// aggregate PRs merged between two tags. The top stories are denormalized
// here so the site can render the release detail page without re-loading
// every linked story file.

export interface ReleaseTopStory {
  storyId: string; // 'pr-42' — links to existing /stories/<id>/<slug>/
  prNumber: number;
  headline: string;
  standfirst: string;
  authorLogin: string;
  primaryCategoryKey: string;
  additions: number;
  deletions: number;
}

export interface Release {
  schemaVersion: number;
  tag: string;
  name: string | null;
  publishedAt: string;
  authorLogin: string;
  authorUrl?: string;
  isPrerelease: boolean;
  releaseUrl: string;
  previousTag: string | null;
  quip: string;
  releaseStory: string;
  prCount: number;
  contributorCount: number;
  totalAdditions: number;
  totalDeletions: number;
  topStories: ReleaseTopStory[];
  changelogStoryIds: string[];
  // Hash of the inputs that produced quip+releaseStory. If a later run
  // produces the same inputsHash for an already-on-disk release, skip the
  // LLM call entirely.
  inputsHash: string;
}

export interface ReleaseManifestEntry {
  tag: string;
  slug: string;
  publishedAt: string;
  isPrerelease: boolean;
}

export interface ReleaseManifest {
  schemaVersion: number;
  generatedAt: string;
  entries: ReleaseManifestEntry[];
}
