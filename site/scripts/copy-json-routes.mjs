#!/usr/bin/env node
/**
 * Post-build: expose JSON data at human-friendly URLs that mirror the HTML
 * page URLs.
 *
 *   /pull/<n>/<slug>/         →  /pull/<n>.json
 *   /commit/<sha>/<slug>/     →  /commit/<sha>.json
 *   /releases/<tag>/          →  /releases/<tag>.json
 *
 * Also augments the manifests in out/data/ with a `jsonUrl` field on each
 * entry (additive change at schemaVersion 1; old consumers ignore it).
 *
 * Source manifests in public/data/ are NOT modified — they are pipeline
 * artifacts. Only the exported copies in out/data/ get enriched.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = dirname(HERE);

// Sentinel used by /releases/[tag]/page.tsx when there are zero releases —
// a placeholder route exists, but no JSON file does.
const EMPTY_STUB_TAG = '__no_releases_yet__';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function copyTo(src, dst) {
  ensureDir(dirname(dst));
  copyFileSync(src, dst);
}

/**
 * @param {object} opts
 * @param {string} opts.outDir Path to the Next static export dir.
 */
export function copyJsonRoutes({ outDir }) {
  if (!existsSync(outDir)) {
    throw new Error(`out directory not found: ${outDir}`);
  }

  let storyCount = 0;
  let releaseCount = 0;
  const skipped = [];

  // ── Stories ─────────────────────────────────────────────
  const storiesManifestPath = join(outDir, 'data', 'manifest.json');
  if (existsSync(storiesManifestPath)) {
    const manifest = readJson(storiesManifestPath);
    for (const entry of manifest.entries ?? []) {
      const src = join(outDir, 'data', 'stories', `${entry.id}.json`);
      if (!existsSync(src)) {
        skipped.push(`story ${entry.id} (source missing)`);
        continue;
      }

      let jsonUrl;
      let dst;
      const prMatch = /^pr-(\d+)$/.exec(entry.id);
      if (prMatch) {
        const n = prMatch[1];
        dst = join(outDir, 'pull', `${n}.json`);
        jsonUrl = `/pull/${n}.json`;
      } else if (entry.id.startsWith('commit-')) {
        if (!entry.sha) {
          skipped.push(`story ${entry.id} (no sha in manifest entry)`);
          continue;
        }
        dst = join(outDir, 'commit', `${entry.sha}.json`);
        jsonUrl = `/commit/${entry.sha}.json`;
      } else {
        skipped.push(`story ${entry.id} (unknown id shape)`);
        continue;
      }

      copyTo(src, dst);
      entry.jsonUrl = jsonUrl;
      storyCount++;
    }
    writeJson(storiesManifestPath, manifest);
  }

  // ── Releases ────────────────────────────────────────────
  const releasesManifestPath = join(outDir, 'data', 'releases', 'manifest.json');
  if (existsSync(releasesManifestPath)) {
    const manifest = readJson(releasesManifestPath);
    for (const entry of manifest.entries ?? []) {
      if (entry.tag === EMPTY_STUB_TAG) continue;
      const src = join(outDir, 'data', 'releases', `${entry.tag}.json`);
      if (!existsSync(src)) {
        skipped.push(`release ${entry.tag} (source missing)`);
        continue;
      }
      // Disk path uses the raw tag — matches Next.js's own page dirs
      // (out/releases/<tag>/index.html). The static server decodes URLs
      // before file lookup, so the URL needs encodeURIComponent to stay
      // consistent with releaseJsonPath() in src/lib/urls.ts.
      const dst = join(outDir, 'releases', `${entry.tag}.json`);
      copyTo(src, dst);
      entry.jsonUrl = `/releases/${encodeURIComponent(entry.tag)}.json`;
      releaseCount++;
    }
    writeJson(releasesManifestPath, manifest);
  }

  return { storyCount, releaseCount, skipped };
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('copy-json-routes.mjs');

if (isMain) {
  const outDir = process.env.GITPULSE_OUT_DIR ?? join(SITE_ROOT, 'out');
  const r = copyJsonRoutes({ outDir });
  console.log(
    `[gitpulse json-routes] wrote ${r.storyCount} story json, ` +
      `${r.releaseCount} release json` +
      (r.skipped.length ? `; skipped ${r.skipped.length}` : ''),
  );
  if (r.skipped.length) {
    for (const s of r.skipped) console.warn(`  skipped: ${s}`);
  }
}
