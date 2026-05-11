import type { ImageStorage, StorageConfig } from './types.ts';
import { VercelBlobStorage } from './vercel-blob.ts';

export type { ImageStorage, StorageConfig, StorageProvider } from './types.ts';
export { VercelBlobStorage } from './vercel-blob.ts';

export function createStorage(config: StorageConfig): ImageStorage {
  switch (config.provider) {
    case 'vercel-blob':
      return new VercelBlobStorage({ storeId: config.storeId });
    case 'r2':
    case 's3':
    case 'supabase':
      throw new Error(
        `Storage provider "${config.provider}" is not yet implemented`,
      );
    default: {
      const _exhaustive: never = config;
      throw new Error(`Unknown storage provider: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
