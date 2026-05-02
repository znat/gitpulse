import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ReleaseSchema } from './schemas.ts';
import type { Release } from './types.ts';

export function writeRelease(outDir: string, release: Release): string {
  const validation = ReleaseSchema.safeParse(release);
  if (!validation.success) {
    throw new Error(
      `Release ${release.tag} failed schema validation before write:\n` +
        JSON.stringify(validation.error.issues, null, 2),
    );
  }

  const path = `${outDir}/${encodeFilename(release.tag)}.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(release, null, 2) + '\n');
  return path;
}

// Tags can contain '/' (e.g., 'release/v1.0.0') or other characters that
// don't play well with filesystems. Encode for the filename — the in-file
// `tag` field stays canonical.
export function encodeFilename(tag: string): string {
  return encodeURIComponent(tag);
}

export function decodeFilename(filename: string): string {
  const stem = filename.endsWith('.json')
    ? filename.slice(0, -5)
    : filename;
  return decodeURIComponent(stem);
}
