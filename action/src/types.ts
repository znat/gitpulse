import type { ChangesNodeOutput, CategoryEntry } from './schemas.ts';
import type { SizeAssessment } from './size.ts';

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
  // gitsky-style ChangesNodeOutput fields, lifted into the story:
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
