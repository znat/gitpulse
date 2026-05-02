#!/usr/bin/env node
/**
 * Mirror the published gitpulse data from a deployed site into
 * site/public/data/ so `yarn dev` has something to render.
 *
 * Usage:
 *   yarn workspace @gitpulse/site data:fetch
 *   GITPULSE_SITE_URL=https://other.example/ yarn workspace @gitpulse/site data:fetch
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const SITE_URL = (process.env.GITPULSE_SITE_URL ?? 'https://znat.github.io/gitpulse/')
  .replace(/\/?$/, '/');
const OUT_DIR = resolve(process.cwd(), 'public');

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
  // Guard against path traversal: a manifest entry like {"id": "../../etc"}
  // could otherwise escape OUT_DIR and overwrite arbitrary files.
  const path = resolve(OUT_DIR, relPath);
  if (path !== OUT_DIR && !path.startsWith(OUT_DIR + sep)) {
    throw new Error(`Refusing to write outside output dir: ${relPath}`);
  }
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
    manifest.entries.map((e) =>
      fetchAndWrite(`data/stories/${encodeURIComponent(String(e.id))}.json`),
    ),
  );
  const storyOk = storyResults.filter((r) => r.status === 'fulfilled').length;
  const storyRejected = storyResults.filter((r) => r.status === 'rejected');
  if (storyRejected.length > 0) {
    const errors = storyRejected.map((r) => r.reason?.message || String(r.reason)).join('; ');
    throw new Error(`Failed to fetch ${storyRejected.length} story file(s): ${errors}`);
  }
  console.log(`  stories … ${storyOk}/${manifest.entries.length}`);

  await backfillPRTitles();

  try {
    const releaseManifest = await fetchAndWrite('data/releases/manifest.json');
    const releaseResults = await Promise.allSettled(
      releaseManifest.entries.map((e) =>
        fetchAndWrite(`data/releases/${encodeURIComponent(e.tag)}.json`),
      ),
    );
    const releaseOk = releaseResults.filter((r) => r.status === 'fulfilled').length;
    const releaseRejected = releaseResults.filter((r) => r.status === 'rejected');
    if (releaseRejected.length > 0) {
      const errors = releaseRejected.map((r) => r.reason?.message || String(r.reason)).join('; ');
      throw new Error(`Failed to fetch ${releaseRejected.length} release file(s): ${errors}`);
    }
    console.log(`  releases … ${releaseOk}/${releaseManifest.entries.length}`);
  } catch (err) {
    if (err.status === 404) {
      console.log('  releases … (none published)');
    } else {
      throw err;
    }
  }
}

// Patch in prTitle for any PR-kind story missing it. This compensates for
// older deploys that predated the analyzer change (the deployed JSONs don't
// carry prTitle, so the panel link would show only "#NN").
async function backfillPRTitles() {
  const repoPath = resolve(OUT_DIR, 'data/repo.json');
  let repo;
  try {
    repo = JSON.parse(readFileSync(repoPath, 'utf8'));
  } catch {
    return;
  }
  if (!repo.owner || !repo.repo) return;

  const storiesDir = resolve(OUT_DIR, 'data/stories');
  const files = (await import('node:fs')).readdirSync(storiesDir).filter(
    (f) => f.startsWith('pr-') && f.endsWith('.json'),
  );

  let patched = 0;
  for (const f of files) {
    const path = resolve(storiesDir, f);
    let story;
    try {
      story = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      continue;
    }
    if (story.kind !== 'pr' || typeof story.prNumber !== 'number') continue;
    if (story.prTitle) continue;

    const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls/${story.prNumber}`;
    try {
      const res = await fetch(url, {
        headers: { accept: 'application/vnd.github+json' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.title) continue;
      story.prTitle = data.title;
      writeFileSync(path, JSON.stringify(story, null, 2) + '\n');
      patched++;
    } catch {
      // ignore
    }
  }
  if (patched > 0) console.log(`  prTitle backfill … ${patched} stories`);
}

main().catch((err) => {
  console.error(`[fetch-local-data] fatal: ${err.message}`);
  process.exit(1);
});
