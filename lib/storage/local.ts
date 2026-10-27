import 'server-only';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { BlobContent, BlobStore } from './blob-store';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
};

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/**
 * Development storage backed by the filesystem. Files are written under
 * `.data/blobs` by default, so they survive dev-server restarts and can be
 * inspected with normal tools.
 */
export class LocalBlobStore implements BlobStore {
  private readonly root: string;

  constructor(root = process.env.LOCAL_BLOB_DIR ?? path.join(process.cwd(), '.data', 'blobs')) {
    this.root = path.resolve(root);
  }

  async put(
    pathname: string,
    data: Uint8Array,
    _options: { contentType: string }
  ): Promise<{ pathname: string }> {
    const filePath = this.resolve(pathname);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);

    return { pathname };
  }

  async get(pathname: string): Promise<BlobContent | null> {
    const filePath = this.resolve(pathname);

    try {
      const file = await stat(filePath);
      if (!file.isFile()) return null;

      return {
        stream: Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>,
        contentType: CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? DEFAULT_CONTENT_TYPE,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(pathname: string): Promise<void> {
    await rm(this.resolve(pathname), { force: true });
  }

  /**
   * Resolves a stored pathname inside the root and rejects anything that would
   * escape it. Pathnames come from the database, but a bad row must not be able
   * to read arbitrary files on the machine.
   */
  private resolve(pathname: string): string {
    const filePath = path.resolve(this.root, pathname);

    if (filePath !== this.root && !filePath.startsWith(`${this.root}${path.sep}`)) {
      throw new Error(`Blob pathname escapes the local store: ${pathname}`);
    }

    return filePath;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
