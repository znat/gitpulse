// Pluggable storage backend for binary assets (today: AI-generated images, later:
// any other artifact gitpulse needs to persist). The interface is deliberately
// thin — upload, resolve to a public URL, list, batch-delete. All four methods
// have direct equivalents on Vercel Blob, Cloudflare R2, AWS S3, and Supabase
// Storage, so adding providers later is purely additive.
export interface ImageStorage {
  // Returns the canonical public URL for the uploaded blob. For vercel-blob,
  // this is the URL the SDK returns from `put()` — the source of truth for
  // where the blob actually landed, which avoids drift between the configured
  // host and the token's store.
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  urlFor(key: string): string;
  list(prefix: string): Promise<string[]>;
  delete(keys: string[]): Promise<void>;
}

// Discriminated union so future providers can land without breaking
// .gitpulse.json schema. Only 'vercel-blob' is implemented in PR 1; the others
// are reserved here so the zod schema in project-config.ts stays stable.
//
// For vercel-blob, storeId is optional and acts as a sanity assertion: when
// set, it must match the storeId encoded in BLOB_READ_WRITE_TOKEN, otherwise
// startup throws. The host is always derived from the token.
export type StorageConfig =
  | { provider: 'vercel-blob'; storeId?: string }
  | { provider: 'r2'; accountId: string; bucket: string; publicBaseUrl: string }
  | { provider: 's3'; region: string; bucket: string; publicBaseUrl?: string }
  | { provider: 'supabase'; projectUrl: string; bucket: string };

export type StorageProvider = StorageConfig['provider'];
