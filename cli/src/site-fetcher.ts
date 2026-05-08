import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';
import type { Release, ReleaseManifest, Story } from './types.ts';
import type { StateData, ManifestData } from './state.ts';
import { pMap } from './pmap.ts';
import { encodeFilename, decodeFilename } from './release-render.ts';

const PBKDF2_ITERATIONS = 600_000;

interface Envelope {
  iv: string;
  ct: string;
  salt?: string;
}

function isEnvelope(x: unknown): x is Envelope {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as Envelope).iv === 'string' &&
    typeof (x as Envelope).ct === 'string'
  );
}

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(s, 'base64');
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<webcrypto.CryptoKey> {
  const baseKey = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

export class WrongGitpulsePasswordError extends Error {
  constructor() {
    super(
      'Wrong GITPULSE_PASSWORD for the deployed site. ' +
        'Either rotate the password in your CI environment or update the deployed site.',
    );
    this.name = 'WrongGitpulsePasswordError';
  }
}

export class SiteFetcher {
  private siteUrl: string;
  private password: string | null = null;

  constructor(siteUrl: string, opts: { password?: string } = {}) {
    this.siteUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
    if (opts.password) this.password = opts.password;
  }

  private async decryptEnvelope(env: Envelope): Promise<string> {
    if (!this.password) {
      throw new Error('Password required to decrypt site');
    }
    // Use envelope's salt if present (new format), otherwise fallback to zero salt (legacy)
    const salt = env.salt ? b64decode(env.salt) : new Uint8Array(16);
    const key = await deriveKey(this.password, salt);
    try {
      const plain = await webcrypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64decode(env.iv) },
        key,
        b64decode(env.ct),
      );
      return new TextDecoder().decode(plain);
    } catch {
      // AES-GCM auth-tag mismatch is the only way decrypt can fail here.
      throw new WrongGitpulsePasswordError();
    }
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

  async fetchReleaseManifest(): Promise<ReleaseManifest | null> {
    return this.fetchJson<ReleaseManifest>('data/releases/manifest.json');
  }

  async fetchRelease(tag: string): Promise<Release | null> {
    return this.fetchJson<Release>(
      `data/releases/${encodeFilename(tag)}.json`,
    );
  }

  async restorePriorReleases(opts: {
    manifest: ReleaseManifest;
    releasesDir: string;
    concurrency: number;
  }): Promise<{ restored: number; failed: number }> {
    let restored = 0;
    let failed = 0;
    await pMap(opts.manifest.entries, opts.concurrency, async (entry) => {
      const path = `${opts.releasesDir}/${encodeFilename(entry.tag)}.json`;
      if (existsAndValid(path)) {
        restored++;
        return;
      }
      const release = await this.fetchRelease(entry.tag);
      if (release) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(release, null, 2) + '\n');
        restored++;
      } else {
        failed++;
      }
    });
    return { restored, failed };
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    const url = `${this.siteUrl}${path}`;
    let resp: Response;
    try {
      resp = await fetch(url);
    } catch {
      return null;
    }
    if (!resp.ok) return null;
    let body: unknown;
    try {
      body = await resp.json();
    } catch {
      return null;
    }
    if (isEnvelope(body) && !this.password) {
      throw new Error('Password required to decrypt site');
    }
    if (!this.password) return body as T;
    if (!isEnvelope(body)) {
      // The site is unprotected (or the file is plaintext) — accept as-is.
      return body as T;
    }
    const plain = await this.decryptEnvelope(body); // throws WrongGitpulsePasswordError on mismatch
    try {
      return JSON.parse(plain) as T;
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

export function readAllReleases(releasesDir: string): Release[] {
  let files: string[] = [];
  try {
    files = readdirSync(releasesDir).filter(
      (f) => f.endsWith('.json') && f !== 'manifest.json',
    );
  } catch {
    return [];
  }
  return files
    .map(
      (f) => JSON.parse(readFileSync(join(releasesDir, f), 'utf8')) as Release,
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// Re-export so callers don't need to know the file lives in release-render.ts.
export { decodeFilename };
