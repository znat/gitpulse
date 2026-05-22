import { describe, it, expect, vi, beforeEach } from 'vitest';
import { put, list as blobList, del } from '@vercel/blob';
import {
  VercelBlobStorage,
  storeIdToHost,
  storeIdFromToken,
} from './vercel-blob.ts';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async () => ({
    url: 'https://abcdef123.public.blob.vercel-storage.com/a/b/c.webp',
  })),
  list: vi.fn(),
  del: vi.fn(async () => undefined),
}));

// Token that encodes the storeId AbCdEf123 — the suffix after `vercel_blob_rw_`
// up to the next underscore is the storeId without the `store_` prefix.
const TOKEN = 'vercel_blob_rw_AbCdEf123_secret';
const STORE_ID = 'store_AbCdEf123';

describe('storeIdToHost', () => {
  it('strips store_ prefix and lowercases', () => {
    expect(storeIdToHost('store_AbCdEf123')).toBe(
      'abcdef123.public.blob.vercel-storage.com',
    );
  });

  it('handles already-lowercase ids', () => {
    expect(storeIdToHost('store_abc')).toBe('abc.public.blob.vercel-storage.com');
  });

  it('handles ids without store_ prefix (defensive)', () => {
    expect(storeIdToHost('XyZ')).toBe('xyz.public.blob.vercel-storage.com');
  });

  it('trims whitespace', () => {
    expect(storeIdToHost('  store_abc  ')).toBe(
      'abc.public.blob.vercel-storage.com',
    );
  });

  it('throws on empty or whitespace-only input', () => {
    expect(() => storeIdToHost('')).toThrow(/storeId is required/);
    expect(() => storeIdToHost('   ')).toThrow(/storeId is required/);
  });

  it('throws when the prefix is the entire value', () => {
    expect(() => storeIdToHost('store_')).toThrow(/Invalid storeId/);
  });
});

describe('storeIdFromToken', () => {
  it('extracts the suffix between vercel_blob_rw_ and the next underscore', () => {
    expect(storeIdFromToken('vercel_blob_rw_AbCdEf123_secretpart')).toBe(
      'AbCdEf123',
    );
  });

  it('throws on tokens not matching the expected shape', () => {
    expect(() => storeIdFromToken('vercel_blob_ro_abc_secret')).toThrow(
      /expected `vercel_blob_rw_/,
    );
    expect(() => storeIdFromToken('not-a-token')).toThrow(
      /expected `vercel_blob_rw_/,
    );
    expect(() => storeIdFromToken('vercel_blob_rw__secret')).toThrow(
      /expected `vercel_blob_rw_/,
    );
  });
});

describe('VercelBlobStorage', () => {
  beforeEach(() => {
    vi.mocked(put).mockClear();
    vi.mocked(put).mockResolvedValue({
      url: 'https://abcdef123.public.blob.vercel-storage.com/a/b/c.webp',
    } as never);
    vi.mocked(blobList).mockReset();
    vi.mocked(del).mockClear();
  });

  it('throws if BLOB_READ_WRITE_TOKEN is missing', () => {
    expect(() => new VercelBlobStorage({}, {})).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it('throws when opts.storeId conflicts with the storeId encoded in the token', () => {
    expect(
      () =>
        new VercelBlobStorage(
          { storeId: 'store_DifferentStore' },
          { BLOB_READ_WRITE_TOKEN: TOKEN },
        ),
    ).toThrow(/points to store "AbCdEf123" but .gitpulse.json declares storeId/);
  });

  it('accepts opts.storeId when it matches the token (case-insensitive, prefix-tolerant)', () => {
    expect(
      () =>
        new VercelBlobStorage(
          { storeId: STORE_ID },
          { BLOB_READ_WRITE_TOKEN: TOKEN },
        ),
    ).not.toThrow();
    // Lowercase variant should also pass.
    expect(
      () =>
        new VercelBlobStorage(
          { storeId: 'store_abcdef123' },
          { BLOB_READ_WRITE_TOKEN: TOKEN },
        ),
    ).not.toThrow();
  });

  it('works without opts.storeId — host is derived from the token', () => {
    const storage = new VercelBlobStorage({}, { BLOB_READ_WRITE_TOKEN: TOKEN });
    expect(storage.urlFor('foo.txt')).toBe(
      'https://abcdef123.public.blob.vercel-storage.com/foo.txt',
    );
  });

  it('upload calls put with public access, exact options, and the token', async () => {
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    const body = Buffer.from('hello');
    await storage.upload('a/b/c.webp', body, 'image/webp');
    expect(put).toHaveBeenCalledExactlyOnceWith('a/b/c.webp', body, {
      access: 'public',
      contentType: 'image/webp',
      allowOverwrite: true,
      addRandomSuffix: false,
      token: TOKEN,
    });
  });

  it('upload returns the canonical URL the SDK reports — not a computed one', async () => {
    // Even if the SDK reports a wildly different host (e.g. a CDN rewrite or
    // a future change in URL format), we should pass that through verbatim
    // rather than synthesizing one from storeId.
    vi.mocked(put).mockResolvedValueOnce({
      url: 'https://some-other-host.example/a/b/c.webp',
    } as never);
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    const url = await storage.upload('a/b/c.webp', Buffer.from('x'), 'image/webp');
    expect(url).toBe('https://some-other-host.example/a/b/c.webp');
  });

  it('urlFor produces the deterministic public URL', () => {
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    expect(storage.urlFor('foo/bar.webp')).toBe(
      'https://abcdef123.public.blob.vercel-storage.com/foo/bar.webp',
    );
  });

  it('urlFor encodes special characters in path segments but preserves slashes', () => {
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    // Branch names in PR 2 keys can include spaces, ?, #, etc. Each segment
    // gets percent-encoded; slashes stay as path separators.
    expect(storage.urlFor('feature/foo bar/#hash?.webp')).toBe(
      'https://abcdef123.public.blob.vercel-storage.com/feature/foo%20bar/%23hash%3F.webp',
    );
  });

  it('list returns pathnames and follows cursors across pages', async () => {
    vi.mocked(blobList)
      .mockResolvedValueOnce({
        blobs: [
          { pathname: 'pfx/one.txt' },
          { pathname: 'pfx/two.txt' },
        ],
        cursor: 'next-page',
      } as never)
      .mockResolvedValueOnce({
        blobs: [{ pathname: 'pfx/three.txt' }],
        cursor: undefined,
      } as never);

    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    const keys = await storage.list('pfx/');

    expect(keys).toEqual(['pfx/one.txt', 'pfx/two.txt', 'pfx/three.txt']);
    expect(blobList).toHaveBeenCalledTimes(2);
    expect(blobList).toHaveBeenNthCalledWith(1, {
      prefix: 'pfx/',
      cursor: undefined,
      token: TOKEN,
    });
    expect(blobList).toHaveBeenNthCalledWith(2, {
      prefix: 'pfx/',
      cursor: 'next-page',
      token: TOKEN,
    });
  });

  it('delete maps keys through urlFor before calling del', async () => {
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    await storage.delete(['a/b.txt', 'c/d.webp']);
    expect(del).toHaveBeenCalledExactlyOnceWith(
      [
        'https://abcdef123.public.blob.vercel-storage.com/a/b.txt',
        'https://abcdef123.public.blob.vercel-storage.com/c/d.webp',
      ],
      { token: TOKEN },
    );
  });

  it('delete is a no-op when given an empty array', async () => {
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    await storage.delete([]);
    expect(del).not.toHaveBeenCalled();
  });
});
