# Local blob storage for invoice PDFs

**Status:** Approved for implementation

**Related:** [Phased product roadmap](./2026-10-21-product-roadmap.md) (invoice PDF streaming route, section 5.5)

## Problem

Invoice PDFs are written with `put()` from `@vercel/blob` directly inside `lib/services/invoices.ts`. That has two consequences:

1. **Local development needs the cloud.** Generating an invoice locally requires a real Vercel Blob store, a token (or an OIDC session from `vercel env pull`), and network access. Without it the invoice flow fails at the last step, after the user has already done the work.
2. **The service layer is coupled to one vendor.** Storage is business logic, so swapping or faking it means editing the invoice service. The PDF route planned in the roadmap would add a second place that imports the SDK.

There is also an existing defect: private blobs are written with `access: 'private'`, but the API returns the raw `pathname` and the UI renders it as a link. A private blob URL cannot be opened directly, so "View invoice" is broken in every environment.

### Desired outcome

- `pnpm dev` can generate, store, and open invoice PDFs with no Vercel account, token, Docker, or network access.
- Production continues to use Vercel Blob, unchanged from a user's perspective.
- Invoice PDFs are only reachable through an authenticated-by-application route, never by exposing a storage pathname to the browser.
- Adding another storage backend later (S3, R2, database) means adding one adapter, not touching services or routes.

## Approach

Introduce a small storage port and two adapters, then wire it through the existing DI container.

### 1. Storage port

`lib/storage/blob-store.ts` defines the contract the app depends on:

```ts
export interface BlobStore {
  put(pathname: string, data: Uint8Array, options: { contentType: string }): Promise<{ pathname: string }>;
  get(pathname: string): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null>;
  delete(pathname: string): Promise<void>;
}
```

`pathname` remains the value stored in `invoices.pathname`, so no migration is needed. Returning a stream (instead of a buffer) keeps the route able to serve large files without buffering and matches what the Vercel SDK already provides.

### 2. Adapters

- **`lib/storage/local.ts` — `LocalBlobStore`**
  - Root: `LOCAL_BLOB_DIR` or `<cwd>/.data/blobs`.
  - `put` creates parent directories and writes the bytes.
  - `get` streams the file and infers the content type from the extension (`application/pdf` for `.pdf`, otherwise `application/octet-stream`). Missing files return `null`.
  - `delete` removes the file if present.
  - Every pathname is resolved against the root and rejected if it escapes it, so a malicious or accidental `../` in a stored pathname cannot read outside the blob directory.
  - Files are gitignored via `.data/`.

- **`lib/storage/vercel.ts` — `VercelBlobStore`**
  - Wraps `put`, `get`, and `del` with `access: 'private'`.
  - `get` maps a not-found error to `null`, so the route can return 404 instead of 500.

- **`lib/storage/index.ts` — factory**
  - `BLOB_DRIVER=local` selects the filesystem store; `vercel` (the default) selects Vercel Blob.
  - The default is explicit rather than inferred from a missing token. A production deployment that loses `BLOB_READ_WRITE_TOKEN` should fail loudly, not silently write to an ephemeral filesystem.
  - Unknown values throw at startup.

### 3. Invoice service

- Split rendering from persistence:
  - `PdfInvoiceRenderer` renders the PDF and returns a `Buffer` (renamed from `PdfInvoiceGenerator`; it no longer uploads).
  - `InvoiceService` receives a `BlobStore`, renders, uploads under the existing `invoices/<timestamp>-<slug>.pdf` key, then persists the invoice.
- Add `InvoiceService.getInvoicePdf(id)` returning `{ stream, contentType, filename } | null`. It loads the invoice, reads the blob, and derives a safe download filename from the stored pathname.
- Add `InvoiceRepository.get(id)` (memory + Postgres) so the service can resolve an invoice by id.

### 4. API and UI

- `app/api/invoices/route.ts` returns `{ id, number }` instead of `pathname`. The browser no longer needs a storage identifier.
- New `app/api/invoices/[invoiceId]/pdf/route.ts` streams the stored file with:
  - `Content-Type` from the store
  - `Content-Disposition: inline; filename="..."` so the browser opens the PDF in its viewer
  - `Cache-Control: private, no-store` because invoices are private documents
  - 404 for an unknown invoice or missing file
- `ProjectInvoice.tsx` links to `/api/invoices/<id>/pdf` instead of using the pathname. The query hook's success payload becomes `{ id }`.

### 5. Documentation

- `AGENTS.md`: document the storage layer, the PDF route, `BLOB_DRIVER`, and `.data/`.
- Local setup gains one line: `BLOB_DRIVER=local`.

## Alternatives considered

1. **Run a local Vercel Blob emulator** (`npx emulate --service vercel` or the Payload Docker emulator) and keep `put()` untouched.
   - Pros: no application changes, exercises the real SDK request/response shape.
   - Rejected as the primary solution: it adds a second process to every dev session, its state is in-memory (PDFs vanish on restart), and its blob endpoints are unauthenticated, so it does not test the private-access path. It remains a useful *optional* fidelity check, but it should not be the only way to run the app.
2. **Use a real Vercel Blob store for local development.**
   - Zero code changes, but requires an account, a token, network access, and puts throwaway development PDFs in cloud storage. It also does not fix the broken private link or the vendor coupling.
3. **Store PDF bytes in Postgres (`bytea`).**
   - Transactional with the invoice row and needs no extra infrastructure, but it changes the production data model for a development-only need and makes serving large files less natural. Rejected for scope and future flexibility.
4. **MinIO / LocalStack S3.**
   - `@vercel/blob` speaks the Vercel API, not generic S3, so this would require replacing the SDK entirely. Too much machinery for small PDFs.

## Files and modules affected

| File | Change |
| --- | --- |
| `.agents/plans/2026-10-25-local-blob-storage.md` | This plan |
| `lib/storage/blob-store.ts` | New storage port |
| `lib/storage/local.ts` | New filesystem adapter |
| `lib/storage/vercel.ts` | New Vercel Blob adapter |
| `lib/storage/index.ts` | New driver factory |
| `lib/services/invoices.ts` | Split renderer from storage; inject `BlobStore`; add `getInvoicePdf` |
| `lib/services/container.ts` | Wire the store and renderer |
| `lib/repository/memory.ts` | Add `InvoiceRepository.get` |
| `lib/repository/postgres.ts` | Implement `InvoiceRepository.get` |
| `app/api/invoices/route.ts` | Return invoice id, not pathname |
| `app/api/invoices/[invoiceId]/pdf/route.ts` | New PDF streaming route |
| `lib/query/invoices.ts` | Update success payload type |
| `components/features/projects/ProjectInvoice.tsx` | Link to the PDF route |
| `.gitignore` | Ignore `.data/` |
| `AGENTS.md` | Document storage, env var, and route |

## Acceptance criteria

- With `BLOB_DRIVER=local` and no Vercel credentials, generating an invoice writes a PDF under `.data/blobs/invoices/` and the "View invoice" link opens it in a new tab.
- With `BLOB_DRIVER` unset (or `vercel`), the Vercel adapter is selected and behaves as before, except the UI now uses the streaming route.
- `GET /api/invoices/<unknown>/pdf` returns 404.
- A stored pathname containing `..` cannot escape the local blob directory.
- Selecting `BLOB_DRIVER=local` does not read a token or make any network call.
- `npx tsc --noEmit` passes.
- `pnpm build` completes with no database or blob credentials (the pool is lazy, and the store factory does not perform I/O at import time).

## Verification

1. `npx tsc --noEmit`.
2. `pnpm build`.
3. A short Node script (run with Node's TypeScript stripping) that exercises `LocalBlobStore.put`/`get`/`delete` against a temporary directory, including a traversal attempt.
4. Manual dev check once a database is available: generate an invoice with `BLOB_DRIVER=local`, open the link, confirm the PDF and the DB pathname.

## Risks and open questions

- **Local files are ephemeral in some environments.** `.data/` survives normal development but not a container rebuild. That is acceptable for dev; production uses Blob.
- **Private-blob reads cost a function invocation in production.** This is the documented Vercel pattern for private blobs and is already required by the roadmap.
- **No auth layer exists yet.** The PDF route is only as private as the app itself; once authentication lands, the route must check that the caller can access the invoice's project. This plan does not add auth.
- **Existing invoices without a `pathname`** render a 404 rather than crashing. The UI only links immediately after generation today.
