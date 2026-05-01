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
}

export interface AISummary {
  headline: string;
  standfirst: string;
  body: string;
}

export type StoryKind = 'pr' | 'direct-push';

export interface Story {
  id: string;
  kind: StoryKind;
  sha: string;
  author: string;
  authorUrl?: string;
  committedAt: string;
  headline: string;
  standfirst: string;
  body: string;
  commitUrl?: string;
  prNumber?: number;
  prUrl?: string;
  mergedAt?: string;
}
