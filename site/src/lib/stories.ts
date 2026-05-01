import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type StoryKind = 'pr' | 'direct-push';

export interface StoryBase {
  id: string;
  kind: StoryKind;
  sha: string;
  author: string;
  authorUrl?: string;
  committedAt: string;
  headline: string;
  standfirst: string;
  body: string;
}

export interface PRStory extends StoryBase {
  kind: 'pr';
  prNumber: number;
  prUrl: string;
  mergedAt: string;
}

export interface DirectPushStory extends StoryBase {
  kind: 'direct-push';
  commitUrl: string;
}

export type Story = PRStory | DirectPushStory;

const CONTENT_DIR = join(process.cwd(), 'src/content/stories');

export function loadStories(): Story[] {
  let files: string[] = [];
  try {
    files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const stories = files
    .map((f) => JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf8')) as Story)
    .sort((a, b) => b.committedAt.localeCompare(a.committedAt));
  return stories;
}

export function loadStory(id: string): Story | null {
  const all = loadStories();
  return all.find((s) => s.id === id) ?? null;
}
