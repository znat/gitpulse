#!/usr/bin/env node
/**
 * Mirror the published gitpulse data from a deployed site into
 * site/public/data/ so `yarn dev` has something to render.
 *
 * Usage:
 *   yarn workspace @gitpulse/site data:fetch
 *   GITPULSE_SITE_URL=https://other.example/ yarn workspace @gitpulse/site data:fetch
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SITE_URL = (process.env.GITPULSE_SITE_URL ?? 'https://znat.github.io/gitpulse/')
  .replace(/\/?$/, '/');
const OUT_DIR = join(process.cwd(), 'public');

async function fetchJson(path) {
  const url = new URL(path, SITE_URL).toString();
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText} ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function writeJson(relPath, obj) {
  const path = join(OUT_DIR, relPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

async function fetchAndWrite(relPath) {
  const data = await fetchJson(relPath);
  writeJson(relPath, data);
  return data;
}

async function main() {
  console.log(`[fetch-local-data] source=${SITE_URL}`);
  console.log(`[fetch-local-data] target=${OUT_DIR}`);

  await fetchAndWrite('data/repo.json').catch((err) => {
    console.warn(`  repo.json … ✗ ${err.message}`);
  });

  const manifest = await fetchAndWrite('data/manifest.json');
  const storyResults = await Promise.allSettled(
    manifest.entries.map((e) => fetchAndWrite(`data/stories/${e.id}.json`)),
  );
  const storyOk = storyResults.filter((r) => r.status === 'fulfilled').length;
  console.log(`  stories … ${storyOk}/${manifest.entries.length}`);

  try {
    const releaseManifest = await fetchAndWrite('data/releases/manifest.json');
    const releaseResults = await Promise.allSettled(
      releaseManifest.entries.map((e) =>
        fetchAndWrite(`data/releases/${encodeURIComponent(e.tag)}.json`),
      ),
    );
    const releaseOk = releaseResults.filter((r) => r.status === 'fulfilled').length;
    console.log(`  releases … ${releaseOk}/${releaseManifest.entries.length}`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  releases … (none published)');
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(`[fetch-local-data] fatal: ${err.message}`);
  process.exit(1);
});
