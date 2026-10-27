import 'server-only';
import { BlobNotFoundError, del, get, put } from '@vercel/blob';
import type { BlobContent, BlobStore } from './blob-store';

/**
 * Production storage. Invoice PDFs are private, so reads must go through the
 * app's own route instead of exposing a blob URL.
 */
export class VercelBlobStore implements BlobStore {
  async put(
    pathname: string,
    data: Uint8Array,
    options: { contentType: string }
  ): Promise<{ pathname: string }> {
    const blob = await put(pathname, Buffer.from(data), {
      access: 'private',
      contentType: options.contentType,
      addRandomSuffix: false,
    });

    return { pathname: blob.pathname };
  }

  async get(pathname: string): Promise<BlobContent | null> {
    try {
      const result = await get(pathname, { access: 'private' });
      if (!result || result.statusCode !== 200) return null;

      return {
        stream: result.stream,
        contentType: result.blob.contentType,
      };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }

  async delete(pathname: string): Promise<void> {
    try {
      await del(pathname);
    } catch (error) {
      if (error instanceof BlobNotFoundError) return;
      throw error;
    }
  }
}
