import { put, list as blobList, del } from '@vercel/blob';
import type { ImageStorage } from './types.ts';

export interface VercelBlobStorageOptions {
  storeId: string;
}

export class VercelBlobStorage implements ImageStorage {
  private readonly token: string;
  private readonly host: string;

  constructor(opts: VercelBlobStorageOptions, env: NodeJS.ProcessEnv = process.env) {
    const token = env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error(
        'BLOB_READ_WRITE_TOKEN env var is required for vercel-blob storage',
      );
    }
    this.token = token;
    this.host = storeIdToHost(opts.storeId);
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await put(key, body, {
      access: 'public',
      contentType,
      allowOverwrite: true,
      addRandomSuffix: false,
      token: this.token,
    });
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
}

// Vercel Blob public URLs follow the pattern
// https://<lowercase-storeId-without-prefix>.public.blob.vercel-storage.com/<key>
// confirmed by derisking against the real API.
export function storeIdToHost(storeId: string): string {
  const trimmed = storeId.trim();
  if (!trimmed) throw new Error('storeId is required');
  const slug = trimmed.replace(/^store_/, '').toLowerCase();
  if (!slug) throw new Error(`Invalid storeId: ${storeId}`);
  return `${slug}.public.blob.vercel-storage.com`;
}

// Encode a slash-delimited key as URL path segments, preserving the slashes
// as path separators. Keys can include branch names or other arbitrary
// strings in PR 2/3, so we must handle spaces, ?, #, and unicode safely.
function encodePath(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}
