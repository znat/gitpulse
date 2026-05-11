import { describe, it, expect, vi, beforeEach } from 'vitest';
import { put, list as blobList, del } from '@vercel/blob';
import { VercelBlobStorage, storeIdToHost } from './vercel-blob.ts';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async () => ({ url: 'mocked' })),
  list: vi.fn(),
  del: vi.fn(async () => undefined),
}));

const TOKEN = 'vercel_blob_rw_FAKE_TOKEN_FOR_TESTS';
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
});

describe('VercelBlobStorage', () => {
  beforeEach(() => {
    vi.mocked(put).mockClear();
    vi.mocked(blobList).mockReset();
    vi.mocked(del).mockClear();
  });

  it('throws if BLOB_READ_WRITE_TOKEN is missing', () => {
    expect(() => new VercelBlobStorage({ storeId: STORE_ID }, {})).toThrow(
      /BLOB_READ_WRITE_TOKEN/,
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

  it('urlFor produces the deterministic public URL', () => {
    const storage = new VercelBlobStorage(
      { storeId: STORE_ID },
      { BLOB_READ_WRITE_TOKEN: TOKEN },
    );
    expect(storage.urlFor('foo/bar.webp')).toBe(
      'https://abcdef123.public.blob.vercel-storage.com/foo/bar.webp',
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
