import { put, list as blobList, del } from '@vercel/blob';
import type { ImageStorage } from './types.ts';

export interface VercelBlobStorageOptions {
  // Optional. If provided, it must match the storeId encoded in
  // BLOB_READ_WRITE_TOKEN — we throw otherwise. Useful as a defensive
  // sanity check so the URLs we bake into release/story JSON don't
  // silently drift from the store the token actually writes to.
  storeId?: string;
}

export class VercelBlobStorage implements ImageStorage {
  private readonly token: string;
  private readonly host: string;
  // Lowercased storeId (without the `store_` prefix). The store's identity
  // for the purposes of ownsUrl() — independent of how the URL is shaped,
  // so a future CDN/format change in Vercel's URLs still matches as long as
  // the storeId appears as the leftmost subdomain label.
  private readonly storeSlug: string;

  constructor(opts: VercelBlobStorageOptions = {}, env: NodeJS.ProcessEnv = process.env) {
    const token = env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN env var is required for vercel-blob storage',
      );
    }
    const tokenStoreId = storeIdFromToken(token);
    this.storeSlug = normalizeStoreId(tokenStoreId);
    if (opts.storeId) {
      const declared = normalizeStoreId(opts.storeId);
      if (declared !== this.storeSlug) {
        throw new Error(
          `BLOB_READ_WRITE_TOKEN points to store "${this.storeSlug}" but .gitpulse.json declares storeId "${declared}" (both normalized: prefix stripped, lowercased). Either remove storeId from .gitpulse.json (it's derived from the token) or set a token for the declared store.`,
        );
      }
    }
    this.token = token;
    this.host = `${this.storeSlug}.public.blob.vercel-storage.com`;
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    // Use the URL Vercel returns rather than computing one — that way the
    // URL we bake into release/story JSON is always the canonical one for
    // the store the token actually wrote to, even if config/token drift.
    const result = await put(key, body, {
      access: 'public',
      contentType,
      allowOverwrite: true,
      addRandomSuffix: false,
      token: this.token,
    });
    return result.url;
  }

  urlFor(key: string): string {
    return `https://${this.host}/${encodePath(key)}`;
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await blobList({ prefix, cursor, token: this.token });
      for (const blob of page.blobs) keys.push(blob.pathname);
      cursor = page.cursor;
    } while (cursor);
    return keys;
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const urls = keys.map((k) => this.urlFor(k));
    await del(urls, { token: this.token });
  }

  // True when `url` is hosted by this backend's store. Used by the analyzer
  // to detect stale imageUrl values that point at a previous store.
  //
  // Matches by the leftmost subdomain label (the storeId) rather than the
  // full host, so a URL like `<storeSlug>.public.blob.vercel-storage.com`
  // and a hypothetical future variant (different domain, same storeId
  // subdomain) both pass — only a real change of store is treated as stale.
  ownsUrl(url: string): boolean {
    try {
      const host = new URL(url).host;
      const leftmost = host.split('.')[0]?.toLowerCase() ?? '';
      return leftmost === this.storeSlug;
    } catch {
      return false;
    }
  }
}

// Vercel Blob public URLs follow the pattern
// https://<lowercase-storeId-without-prefix>.public.blob.vercel-storage.com/<key>
// confirmed by derisking against the real API.
export function storeIdToHost(storeId: string): string {
  const slug = normalizeStoreId(storeId);
  return `${slug}.public.blob.vercel-storage.com`;
}

function normalizeStoreId(storeId: string): string {
  const trimmed = storeId.trim();
  if (!trimmed) throw new Error('storeId is required');
  const slug = trimmed.replace(/^store_/i, '').toLowerCase();
  if (!slug) throw new Error(`Invalid storeId: ${storeId}`);
  return slug;
}

// BLOB_READ_WRITE_TOKEN has the shape `vercel_blob_rw_<storeIdSuffix>_<secret>`,
// where the suffix is the storeId without the `store_` prefix. Extracting it
// here means callers don't have to maintain a separate `storeId` in config
// just to compute the public URL host.
//
// `[^_]+` (anything but underscore) rather than a stricter character class:
// Vercel doesn't document an allowed-character whitelist for storeIds, so we
// only commit to the separator (underscore between the three token parts).
// If Vercel issues a token whose storeId contains hyphens or other characters,
// we still extract it correctly instead of throwing at startup.
export function storeIdFromToken(token: string): string {
  const m = /^vercel_blob_rw_([^_]+)_/.exec(token.trim());
  if (!m) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not in the expected `vercel_blob_rw_<storeId>_<secret>` format',
    );
  }
  return m[1]!;
}

// Encode a slash-delimited key as URL path segments, preserving the slashes
// as path separators. Keys can include branch names or other arbitrary
// strings in PR 2/3, so we must handle spaces, ?, #, and unicode safely.
function encodePath(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
