import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Story } from './types.ts';
import type { StateData, ManifestData } from './state.ts';
import { pMap } from './pmap.ts';

export class SiteFetcher {
  private siteUrl: string;

  constructor(siteUrl: string) {
    this.siteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  }

  async fetchState(): Promise<StateData | null> {
    return this.fetchJson<StateData>('data/state.json');
  }

  async fetchManifest(): Promise<ManifestData | null> {
    return this.fetchJson<ManifestData>('data/manifest.json');
  }

  async fetchStory(id: string): Promise<Story | null> {
    return this.fetchJson<Story>(`data/stories/${id}.json`);
  }

  async restorePriorStories(opts: {
    manifest: ManifestData;
    storiesDir: string;
    concurrency: number;
  }): Promise<{ restored: number; failed: number }> {
    let restored = 0;
    let failed = 0;
    await pMap(opts.manifest.entries, opts.concurrency, async (entry) => {
      const path = `${opts.storiesDir}/${entry.id}.json`;
      // Skip if we already have it on disk (defensive — local-dev runs may
      // already have content)
      if (existsAndValid(path)) {
        restored++;
        return;
      }
      const story = await this.fetchStory(entry.id);
      if (story) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(story, null, 2) + '\n');
        restored++;
      } else {
        failed++;
      }
    });
    return { restored, failed };
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    const url = `${this.siteUrl}${path}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return (await resp.json()) as T;
    } catch {
      return null;
    }
  }
}

function existsAndValid(path: string): boolean {
  try {
    const content = readFileSync(path, 'utf8');
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function deriveSiteUrl(repoFullName: string, override?: string): string {
  if (override) return override;
  const [owner, repo] = repoFullName.split('/');
  return `https://${owner}.github.io/${repo}/`;
}

export function readAllStories(storiesDir: string): Story[] {
  let files: string[] = [];
  try {
    files = readdirSync(storiesDir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  return files
    .map((f) => JSON.parse(readFileSync(join(storiesDir, f), 'utf8')) as Story)
    .sort((a, b) => b.committedAt.localeCompare(a.committedAt));
}
