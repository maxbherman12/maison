import 'server-only';
import type { BlobStore } from './blob-store';
import { LocalBlobStore } from './local';
import { VercelBlobStore } from './vercel';

/**
 * Selects the storage backend. The default is intentionally explicit: a
 * production deployment with a missing blob token should fail loudly rather
 * than silently write invoices to an ephemeral filesystem.
 *
 * Set `BLOB_DRIVER=local` in `.env.local` for filesystem-backed development.
 */
export function createBlobStore(): BlobStore {
  const driver = process.env.BLOB_DRIVER ?? 'vercel';

  switch (driver) {
    case 'local':
      return new LocalBlobStore();
    case 'vercel':
      return new VercelBlobStore();
    default:
      throw new Error(`Unknown BLOB_DRIVER: ${driver}`);
  }
}
