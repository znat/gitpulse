import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Release, ReleaseManifest, Story } from './types.ts';
import { slugify } from './slugify.ts';

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

// ── Releases ─────────────────────────────────────────────

export function writeReleaseManifest(
  dataDir: string,
  manifest: ReleaseManifest,
): void {
  const path = `${dataDir}/releases/manifest.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
}

export function buildReleaseManifestFromReleases(
  releases: Release[],
): ReleaseManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    entries: releases
      .map((r) => ({
        tag: r.tag,
        slug: slugify(r.name ?? r.tag),
        publishedAt: r.publishedAt,
        isPrerelease: r.isPrerelease,
      }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
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
