// End-to-end round-trip for site/scripts/encrypt.mjs:
//   build a fixture out/ tree → runEncrypt() → decrypt the embedded payload
//   with the same password and verify shape.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-expect-error — encrypt.mjs is JS; no .d.ts and we don't need typed exports here.
import { runEncrypt } from '../scripts/encrypt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_SRC = join(HERE, '..', 'scripts', 'unlock-bootstrap.js');
const PBKDF2_ITERATIONS = 600_000;
const SALT = new Uint8Array(16);

let tmp: string;
let outDir: string;

function setupFixture() {
  tmp = mkdtempSync(join(tmpdir(), 'gp-encrypt-test-'));
  outDir = join(tmp, 'out');
  mkdirSync(join(outDir, 'data', 'stories'), { recursive: true });
  mkdirSync(join(outDir, 'commit', 'abc1234'), { recursive: true });

  writeFileSync(
    join(outDir, 'index.html'),
    '<!DOCTYPE html><html><body><h1>Headline secret</h1></body></html>',
  );
  writeFileSync(
    join(outDir, 'commit', 'abc1234', 'index.html'),
    '<!DOCTYPE html><html><body><p>Story body — confidential.</p></body></html>',
  );
  writeFileSync(
    join(outDir, 'data', 'stories', 'pr-1.json'),
    JSON.stringify({ headline: 'top secret', body: 'private' }),
  );
  writeFileSync(
    join(outDir, 'data', 'repo.json'),
    JSON.stringify({ owner: 'acme', repo: 'private-stuff' }),
  );
  writeFileSync(
    join(outDir, 'opengraph-image.png'),
    Buffer.from('fake-png-bytes'),
  );
  writeFileSync(join(outDir, 'sitemap.xml'), '<?xml version="1.0"?><urlset/>');
  writeFileSync(join(outDir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  writeFileSync(
    join(outDir, '__next.__PAGE__.txt'),
    'plaintext rsc payload with leaked headlines',
  );
}

beforeEach(setupFixture);
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

interface Envelope {
  iv: string;
  ct: string;
}

function readPagePayload(htmlPath: string): Envelope {
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(
    /<script id="gp" type="application\/json">([\s\S]*?)<\/script>/,
  );
  const captured = match?.[1];
  if (!captured) throw new Error(`no payload in ${htmlPath}`);
  return JSON.parse(captured.replace(/<\\\/script/gi, '</script')) as Envelope;
}

async function deriveKey(password: string): Promise<webcrypto.CryptoKey> {
  const baseKey = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(s, 'base64');
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
}

async function decrypt(
  env: Envelope,
  key: webcrypto.CryptoKey,
): Promise<string> {
  const plain = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(env.iv) },
    key,
    b64decode(env.ct),
  );
  return new TextDecoder().decode(plain);
}

describe('runEncrypt', () => {
  it('encrypts HTML + JSON, deletes OG/sitemap/RSC, ships unlock.js, rewrites robots', async () => {
    const r = await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'hunter2',
      basePath: '',
    });
    expect(r.skipped).toBe(false);
    expect(r.htmlCount).toBe(2);
    expect(r.jsonCount).toBe(2);
    expect(r.ogDeleted).toBe(1);
    expect(r.sitemapDeleted).toBe(1);
    expect(r.rscDeleted).toBe(1);

    expect(existsSync(join(outDir, 'opengraph-image.png'))).toBe(false);
    expect(existsSync(join(outDir, 'sitemap.xml'))).toBe(false);
    expect(existsSync(join(outDir, '__next.__PAGE__.txt'))).toBe(false);
    expect(existsSync(join(outDir, '_gp', 'unlock.js'))).toBe(true);
    expect(readFileSync(join(outDir, 'robots.txt'), 'utf8')).toContain(
      'Disallow: /',
    );

    // No plaintext content leaks into the output.
    const indexHtml = readFileSync(join(outDir, 'index.html'), 'utf8');
    expect(indexHtml).not.toContain('Headline secret');
    expect(indexHtml).toContain('id="gp"');

    const repoEnvelope = JSON.parse(
      readFileSync(join(outDir, 'data', 'repo.json'), 'utf8'),
    );
    expect(repoEnvelope.iv).toBeTypeOf('string');
    expect(repoEnvelope.ct).toBeTypeOf('string');
    expect(repoEnvelope.owner).toBeUndefined();
  });

  it('decrypts page payload back to original HTML', async () => {
    await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'hunter2',
      basePath: '',
    });
    const env = readPagePayload(join(outDir, 'index.html'));
    const key = await deriveKey('hunter2');
    const plain = await decrypt(env, key);
    expect(plain).toContain('Headline secret');
  });

  it('decrypts data envelopes with the same key', async () => {
    await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'hunter2',
      basePath: '',
    });
    const env = JSON.parse(
      readFileSync(join(outDir, 'data', 'stories', 'pr-1.json'), 'utf8'),
    ) as Envelope;
    const key = await deriveKey('hunter2');
    const plain = await decrypt(env, key);
    expect(JSON.parse(plain)).toEqual({
      headline: 'top secret',
      body: 'private',
    });
  });

  it('rejects wrong password (AES-GCM throws)', async () => {
    await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'right',
      basePath: '',
    });
    const env = readPagePayload(join(outDir, 'index.html'));
    const wrongKey = await deriveKey('wrong');
    await expect(decrypt(env, wrongKey)).rejects.toThrow();
  });

  it('cached unlock survives redeploy: second build with same password decrypts with the first build’s key', async () => {
    await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'hunter2',
      basePath: '',
    });
    const keyFromBuildA = await deriveKey('hunter2');

    rmSync(outDir, { recursive: true, force: true });
    setupFixture();
    await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'hunter2',
      basePath: '',
    });
    const envFromBuildB = readPagePayload(join(outDir, 'index.html'));

    const plain = await decrypt(envFromBuildB, keyFromBuildA);
    expect(plain).toContain('Headline secret');
  });

  it('embeds basePath into the unlock shell script src', async () => {
    await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: 'hunter2',
      basePath: '/myrepo',
    });
    const indexHtml = readFileSync(join(outDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('src="/myrepo/_gp/unlock.js"');
    expect(indexHtml).toContain('href="/myrepo/favicon.svg"');
  });

  it('skips when password is empty (no-op)', async () => {
    const r = await runEncrypt({
      outDir,
      bootstrapSrc: BOOTSTRAP_SRC,
      password: '',
      basePath: '',
    });
    expect(r.skipped).toBe(true);
    expect(readFileSync(join(outDir, 'index.html'), 'utf8')).toContain(
      'Headline secret',
    );
    expect(existsSync(join(outDir, 'opengraph-image.png'))).toBe(true);
    expect(existsSync(join(outDir, 'sitemap.xml'))).toBe(true);
  });
});
