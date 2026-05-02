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
  // Skip per-file parse errors so one corrupt file doesn't take down the
  // whole listing. The analyzer validates on write, so we only lose entries
  // if disk corrupts something between write and read.
  const out: Release[] = [];
  for (const f of files) {
    try {
      const release = JSON.parse(
        readFileSync(join(RELEASES_DIR, f), 'utf8'),
      ) as Release;
      out.push(release);
    } catch (err) {
      console.warn(
        `[releases-loader] skipping ${f}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function loadRelease(tag: string): Release | null {
  const releases = loadReleases();
  return releases.find((r) => r.tag === tag) ?? null;
}
