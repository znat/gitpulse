// Server-only release loader. Mirror of stories-loader.ts.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Release } from './releases';

const RELEASES_DIR = join(process.cwd(), 'public', 'data', 'releases');

export function loadReleases(): Release[] {
  let files: string[] = [];
  try {
    files = readdirSync(RELEASES_DIR).filter(
      (f) => f.endsWith('.json') && f !== 'manifest.json',
    );
  } catch {
    return [];
  }
  return files
    .map(
      (f) => JSON.parse(readFileSync(join(RELEASES_DIR, f), 'utf8')) as Release,
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function loadRelease(tag: string): Release | null {
  const releases = loadReleases();
  return releases.find((r) => r.tag === tag) ?? null;
}
