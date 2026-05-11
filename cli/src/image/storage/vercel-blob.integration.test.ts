import { describe, it, expect, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { VercelBlobStorage } from './vercel-blob.ts';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const STORE_ID = process.env.GITPULSE_TEST_STORE_ID;

const hasCreds = Boolean(TOKEN && STORE_ID);

// Runs a real round-trip against the Vercel Blob store identified by
// GITPULSE_TEST_STORE_ID. Skipped when env is missing (fork PRs, local dev
// without secrets) so CI stays green without the secrets.
describe.skipIf(!hasCreds)('VercelBlobStorage integration', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    if (!hasCreds || createdKeys.length === 0) return;
    const storage = new VercelBlobStorage({ storeId: STORE_ID! });
    await storage.delete(createdKeys.splice(0));
  });

  it('uploads, fetches, lists, and deletes a blob', async () => {
    const storage = new VercelBlobStorage({ storeId: STORE_ID! });
    const key = `__integration-test__/${Date.now()}-${randomUUID()}.txt`;
    const bodyText = `hello from gitpulse integration test ${randomUUID()}\n`;
    createdKeys.push(key);

    await storage.upload(key, Buffer.from(bodyText), 'text/plain');

    const url = storage.urlFor(key);
    const fetched = await fetch(url);
    expect(fetched.status).toBe(200);
    expect(await fetched.text()).toBe(bodyText);

    const keys = await storage.list('__integration-test__/');
    expect(keys).toContain(key);

    await storage.delete([key]);
    createdKeys.length = 0;

    // Vercel Blob is eventually consistent at the CDN (up to ~60s propagation
    // per docs). Retry briefly so CI doesn't flake on the post-delete check.
    const status = await waitFor404(url, 10_000);
    expect(status).toBe(404);
  });
});

async function waitFor404(url: string, timeoutMs: number): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let status = 0;
  while (Date.now() < deadline) {
    const res = await fetch(url, { cache: 'no-store' });
    status = res.status;
    if (status === 404) return status;
    await new Promise((r) => setTimeout(r, 250));
  }
  return status;
}
