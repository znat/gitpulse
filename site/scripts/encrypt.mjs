#!/usr/bin/env node
/**
 * Post-build encryptor. Walks site/out/ and, when GITPULSE_PASSWORD is set,
 *   - replaces every .html with an unlock shell containing AES-GCM ciphertext
 *     of the original document
 *   - replaces every JSON file under data/ with an {iv,ct} envelope
 *   - deletes opengraph-image*.png + sitemap.xml + Next's RSC navigation .txt
 *     payloads (which would otherwise leak the rendered story content)
 *   - overwrites robots.txt with Disallow: /
 *   - copies scripts/unlock-bootstrap.js to out/_gp/unlock.js
 *
 * No-op when GITPULSE_PASSWORD is empty/unset.
 *
 * Crypto: PBKDF2-SHA256 (600k iters, fixed zero salt) → AES-GCM 256.
 * Stable salt means same password derives same key across all builds, so
 * cached unlock keys keep working through redeploys until the password
 * changes. AES-GCM auth-tag failure is the wrong-password signal.
 */

import { webcrypto } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ITERATIONS = 600_000;
const SALT = new Uint8Array(16); // intentional: see header comment

function b64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

export function resolveBasePath(env = process.env) {
  const isPaaSRootDeploy =
    !!env.VERCEL || env.NETLIFY === 'true' || env.CF_PAGES === '1';
  const repo = env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
  const fallback = isPaaSRootDeploy ? '' : repo ? `/${repo}` : '';
  const override = env.GITPULSE_BASE_PATH;
  if (!override || override === 'auto') return fallback;
  if (override === 'none') return '';
  const trimmed = override.trim().replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function htmlShell(payload, basePath) {
  const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Protected — gitpulse</title>
<link rel="icon" href="${basePath}/favicon.svg" type="image/svg+xml">
<style>html,body{margin:0;padding:0;min-height:100vh;background:#faf8f3;color:#1a1a17;}@media (prefers-color-scheme:dark){html,body{background:#0d0d0c;color:#f0ede8;}}body{display:flex;align-items:center;justify-content:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;color:#8a8780;}</style>
</head>
<body>
<noscript>This publication is private. JavaScript is required to unlock it.</noscript>
<div>Unlocking…</div>
<script id="gp" type="application/json">${json}</script>
<script src="${basePath}/_gp/unlock.js"></script>
</body>
</html>
`;
}

/**
 * @param {object} opts
 * @param {string} opts.outDir       Path to the Next static export dir.
 * @param {string} opts.bootstrapSrc Path to the unlock-bootstrap.js source.
 * @param {string} opts.password     Cleartext password (NEVER ships).
 * @param {string} [opts.basePath]   Mirror of next.config.js basePath.
 */
export async function runEncrypt({
  outDir,
  bootstrapSrc,
  password,
  basePath = '',
}) {
  if (!password) return { skipped: true };
  if (!existsSync(outDir)) {
    throw new Error(`out directory not found: ${outDir}`);
  }

  const subtle = webcrypto.subtle;
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  async function encryptText(text) {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(
      await subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(text),
      ),
    );
    return { iv: b64(iv), ct: b64(ct) };
  }

  const dataPrefix = join(outDir, 'data') + sep;
  let htmlCount = 0;
  let jsonCount = 0;
  let ogDeleted = 0;
  let sitemapDeleted = 0;
  let rscDeleted = 0;

  for (const path of walk(outDir)) {
    const lower = path.toLowerCase();
    const base = path.split(sep).pop() ?? '';
    if (lower.endsWith('.html')) {
      const original = readFileSync(path, 'utf8');
      writeFileSync(path, htmlShell(await encryptText(original), basePath));
      htmlCount++;
    } else if (lower.endsWith('.json') && path.startsWith(dataPrefix)) {
      const original = readFileSync(path, 'utf8');
      writeFileSync(path, JSON.stringify(await encryptText(original)));
      jsonCount++;
    } else if (
      /^opengraph-image(?:-[\w-]+)?\.png$/i.test(base) ||
      /^twitter-image(?:-[\w-]+)?\.png$/i.test(base)
    ) {
      unlinkSync(path);
      ogDeleted++;
    } else if (base === 'sitemap.xml') {
      unlinkSync(path);
      sitemapDeleted++;
    } else if (base !== 'robots.txt' && lower.endsWith('.txt')) {
      // Next's RSC navigation payloads — same content as the rendered HTML
      // shipped as plaintext for client-side router fetches. Deleting forces
      // full reloads on Link nav, which the cached key handles silently.
      unlinkSync(path);
      rscDeleted++;
    }
  }

  // Override whatever robots.ts emitted: keep crawlers out of the lock screen.
  writeFileSync(join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  const gpDir = join(outDir, '_gp');
  mkdirSync(gpDir, { recursive: true });
  copyFileSync(bootstrapSrc, join(gpDir, 'unlock.js'));

  return {
    skipped: false,
    htmlCount,
    jsonCount,
    ogDeleted,
    sitemapDeleted,
    rscDeleted,
  };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = dirname(HERE);

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('encrypt.mjs');

if (isMain) {
  const password = process.env.GITPULSE_PASSWORD;
  if (!password) {
    console.log('[gitpulse encrypt] GITPULSE_PASSWORD unset — skipping');
    process.exit(0);
  }
  const outDir = process.env.GITPULSE_ENCRYPT_OUT ?? join(SITE_ROOT, 'out');
  const bootstrapSrc = join(HERE, 'unlock-bootstrap.js');
  const basePath = resolveBasePath();
  const r = await runEncrypt({ outDir, bootstrapSrc, password, basePath });
  if (r.skipped) {
    console.log('[gitpulse encrypt] skipped');
  } else {
    console.log(
      `[gitpulse encrypt] encrypted ${r.htmlCount} html, ${r.jsonCount} json; ` +
        `deleted ${r.ogDeleted} og image(s), ${r.sitemapDeleted} sitemap, ` +
        `${r.rscDeleted} rsc payload(s); basePath=${basePath || '(empty)'}`,
    );
  }
}
