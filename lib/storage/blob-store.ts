/**
 * The storage contract the invoice flow depends on. Implementations live in
 * `local.ts` (development) and `vercel.ts` (production).
 *
 * `pathname` is the value persisted on an invoice. It is an opaque key, not a
 * URL, and must never be sent to the browser.
 */
export interface BlobStore {
  put(
    pathname: string,
    data: Uint8Array,
    options: { contentType: string }
  ): Promise<{ pathname: string }>;

  /**
   * Reads a stored file. Returns `null` when the file does not exist so callers
   * can respond with a 404 instead of a storage error.
   */
  get(pathname: string): Promise<BlobContent | null>;

  delete(pathname: string): Promise<void>;
}

export interface BlobContent {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
}
