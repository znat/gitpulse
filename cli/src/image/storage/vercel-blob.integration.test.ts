import { describe, it, expect, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { VercelBlobStorage } from './vercel-blob.ts';

// Runs a real round-trip against the Vercel Blob store identified by
// GITPULSE_TEST_STORE_ID. Both env vars are required — the test fails loudly
// rather than silently skipping if they're missing. Workflow gates ensure
// this only runs in environments that have access to the secret.
const STORE_ID = requireEnv('GITPULSE_TEST_STORE_ID');
requireEnv('BLOB_READ_WRITE_TOKEN');

describe('VercelBlobStorage integration', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    if (createdKeys.length === 0) return;
    const storage = new VercelBlobStorage({ storeId: STORE_ID });
    await storage.delete(createdKeys.splice(0));
  });

  it('uploads, fetches, lists, and deletes a blob', async () => {
    const storage = new VercelBlobStorage({ storeId: STORE_ID });
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required to run the storage integration test`,
    );
  }
  return value;
}
