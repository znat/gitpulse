import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Story } from './types.ts';

export interface StateData {
  schemaVersion: number;
  lastCommitSha: string | null;
  lastCommittedDate: string | null;
  lastRunAt: string;
}

export interface ManifestEntry {
  id: string;
  sha: string;
  committedAt: string;
}

export interface ManifestData {
  schemaVersion: number;
  generatedAt: string;
  entries: ManifestEntry[];
}

export const SCHEMA_VERSION = 1;

export function writeState(dataDir: string, state: StateData): void {
  const path = `${dataDir}/state.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
}

export function writeManifest(dataDir: string, manifest: ManifestData): void {
  const path = `${dataDir}/manifest.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
}

export function buildManifestFromStories(stories: Story[]): ManifestData {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    entries: stories
      .map((s) => ({ id: s.id, sha: s.sha, committedAt: s.committedAt }))
      .sort((a, b) => b.committedAt.localeCompare(a.committedAt)),
  };
}

export function buildStateFromStories(stories: Story[]): StateData {
  if (stories.length === 0) {
    return {
      schemaVersion: SCHEMA_VERSION,
      lastCommitSha: null,
      lastCommittedDate: null,
      lastRunAt: new Date().toISOString(),
    };
  }
  const newest = [...stories].sort((a, b) =>
    b.committedAt.localeCompare(a.committedAt),
  )[0]!;
  return {
    schemaVersion: SCHEMA_VERSION,
    lastCommitSha: newest.sha,
    lastCommittedDate: newest.committedAt,
    lastRunAt: new Date().toISOString(),
  };
}
