// Server-only loaders. DO NOT import from client components.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Story } from './stories';

const STORIES_DIR = join(process.cwd(), 'public/data/stories');

export function loadStories(): Story[] {
  let files: string[] = [];
  try {
    files = readdirSync(STORIES_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  return files
    .map((f) => JSON.parse(readFileSync(join(STORIES_DIR, f), 'utf8')) as Story)
    .sort((a, b) => b.committedAt.localeCompare(a.committedAt));
}

export function loadStory(id: string): Story | null {
  return loadStories().find((s) => s.id === id) ?? null;
}
