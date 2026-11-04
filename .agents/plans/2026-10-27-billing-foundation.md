# Billing data foundation (roadmap Phase 2)

**Status:** Implemented and merged into `main` via `5b82633` (2026-11-01); implementation in `335277b` and `26c5097`. Re-verified 2026-11-03: `npx tsc --noEmit` and `pnpm build` pass.

**Date:** 2026-10-27

**Branch:** `feature/billing-foundation`

**Roadmap:** [2026-10-21-product-roadmap.md](./2026-10-21-product-roadmap.md), Phase 2

## Problem

The invoice model is too thin for the invoice workspace, invoice history, and
reminders that later phases depend on:

- `invoices` stores only a total, a `paid` flag, and a blob pathname. There is no
  sent date, due date, or paid date.
- Line items are derived from source rows at generation time and never
  persisted, so editing an hour entry or furniture item rewrites the history of
  an invoice that was already issued.
- The client sends titles and amounts. The service re-checks only the total, so
  item content is client-controlled.
- Hour entries cannot be edited at all, and furniture can only change status.
- There is no invoice list or detail API, and no query hook to read one.

Phase 2 fixes the data model and API surface. It does not build the invoice
workspace UI (Phase 3) or change page layouts.

## Desired outcome

- Every generated invoice has immutable line-item snapshots.
- Invoice lifecycle timestamps (`sentAt`, `dueAt`, `paidAt`) exist and a single
  helper derives `Issued | Sent | Paid | Overdue`.
- Generation is atomic: invoice + snapshots + source-row links commit together.
- The server derives line items and totals from source ids, never from
  client-sent titles or amounts.
- Hour entries and all furniture fields are editable through the API.
- The existing project invoice view keeps working while Phase 3 is unbuilt.

## Approach

### 1. Schema

`invoices` gains nullable `sent_at`, `due_at`, `paid_at`, indexes on
`project_id` and `created_at`, and a unique index on `number`. `paid` stays for
compatibility; status is derived from timestamps plus `paid`.

New `invoice_line_items`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | UUID |
| `invoice_id` | text FK → `invoices.id` | cascade delete |
| `source` | text enum `hours` / `furniture` | |
| `source_id` | text | source row id |
| `title` | text | snapshot |
| `amount` | real | snapshot |
| `created_at` | timestamp | default now |

Index on `invoice_id`; unique on `(invoice_id, source, source_id)`.

A generated Drizzle migration creates the columns/table/indexes. Hand-written
SQL appended to that migration:

1. Renumbers duplicate invoice numbers above the current maximum before the
   unique index is created, so the migration works on databases that already
   contain duplicates.
2. Backfills line items for every existing invoice by joining the source rows
   whose `invoice_id` points at it. `ON CONFLICT DO NOTHING` makes it
   idempotent. Invoices with no resolvable source rows stay legacy totals.

Backfill uses current titles/amounts because historical values are not
recoverable. This is documented in the migration.

### 2. Domain types and helpers

- `Invoice` gains `sentAt?`, `dueAt?`, `paidAt?`, `lineItems?`,
  `lineItemCount?`.
- New `InvoiceLineItemSnapshot` (persisted snapshot) and
  `InvoiceStatus = 'Issued' | 'Sent' | 'Paid' | 'Overdue'`.
- `BillableItemRef` moves to `lib/types` and is re-exported from the repository
  module for compatibility.
- `GenerateInvoiceInput` becomes `{ projectId, items: BillableItemRef[] }`.
- `lib/invoices/status.ts`: `getInvoiceStatus(invoice, now)` and
  `isOutstanding(invoice)`.
- `lib/invoices/config.ts`: `getInvoiceDueDays()` reads `INVOICE_DUE_DAYS`,
  default 14. This is the first env-backed billing setting; Phase 6 can move
  all thresholds into a shared config.
- `lib/billing.ts`: `billableRowKey(row)`, `buildSelectedLineItems(project,
  selectedKeys)`; `buildInvoiceLineItems` delegates to it.

### 3. Repositories

`InvoiceRepository`:

- `get(id)` returns the invoice with snapshots.
- `list(projectId)` / `listAll()` return invoices with `lineItemCount`.
- `createWithItems(input)` runs one transaction:
  - `pg_advisory_xact_lock(hashtext('invoice_number'))`, then `max(number)+1`
    so concurrent generation cannot duplicate a number.
  - insert invoice, insert snapshots, attach source rows.
  - source updates are guarded by `project_id` and `invoice_id IS NULL`; a
    mismatch throws and rolls the whole transaction back, which also covers a
    concurrent invoice of the same row.
- `markSent(id, sentAt, dueAt)` and `markPaid(id, paidAt)`.

`ProjectRepository` gains `updateHourEntry`, `deleteHourEntry`, and a
full-patch `updateFurniture`. `markItemsInvoiced` stays for compatibility.

The memory repository implements the same interface so it continues to compile;
Postgres remains the wired implementation.

### 4. Services

`InvoiceService.generateInvoice` accepts refs only:

1. Load the project (404 if missing).
2. Reject duplicate refs, unknown refs, and refs that are not pending on the
   project (400).
3. Derive title/amount from the pending rows and recompute the total.
4. Render and upload the PDF.
5. Persist invoice + snapshots + source links in one transaction.
6. If the transaction fails, delete the uploaded blob and rethrow; log cleanup
   failures.

Add `getInvoice`, `markSent`, and `markPaid`:

- `markSent`: 404 if missing, 409 if paid, idempotent if already sent; sets
  `dueAt = sentAt + INVOICE_DUE_DAYS`.
- `markPaid`: 404 if missing, idempotent if paid; sets `paidAt` and backfills
  `sentAt` when the invoice was never marked sent.

`ProjectService` gains `updateHourEntry`, `deleteHourEntry`, and
`updateFurniture`. If `amount` is omitted, it is left unchanged; changing
`hours` does not silently recompute a previously overridden amount.

A small `AppError` (message + HTTP status) and API error helper keep routes from
mapping every failure to 500. Zod errors become 400.

### 5. API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/invoices?projectId=...` | list with line-item counts |
| `POST` | `/api/invoices` | generate from refs |
| `GET` | `/api/invoices/[invoiceId]` | invoice + snapshots |
| `PATCH` | `/api/invoices/[invoiceId]` | `send` / `pay` |
| `GET` | `/api/invoices/[invoiceId]/pdf` | unchanged private blob stream |
| `PATCH` | `/api/projects/[id]/hours/[hourId]` | edit hour entry |
| `DELETE` | `/api/projects/[id]/hours/[hourId]` | delete hour entry |
| `PATCH` | `/api/projects/[id]/furniture/[furnitureId]` | full furniture patch |

The furniture PATCH schema is a superset of the old status-only body, so the
existing board keeps working unchanged.

### 6. Query hooks

- `useInvoices(projectId)`, `useInvoice(invoiceId)`.
- `useMarkInvoiceSent()`, `useMarkInvoicePaid()`.
- `useGenerateInvoice` switches to the refs payload.
- `useUpdateHourEntry`, `useDeleteHourEntry`, `useUpdateFurniture`.

Invalidation: invoice list + detail, project detail, project lists. Notification
invalidation arrives with Phase 6.

### 7. Keep the current invoice view working

`components/features/projects/ProjectInvoice.tsx` currently posts titles and
amounts. It is updated to post `{ id, source }` refs derived from the same
pending rows. The view itself is untouched; Phase 3 replaces it.

## Alternatives considered

- **Keep derived line items and only add timestamps.** Rejected: an issued
  invoice would change whenever a source row is edited, which breaks history and
  the invoice detail page.
- **Store line items as JSONB on `invoices`.** Rejected: no uniqueness or
  referential guarantees, harder to count/query, and the detail page still needs
  a clean source link.
- **Persist draft invoices before generation.** Deferred: adds draft lifecycle,
  autosave, conflict handling, and orphan cleanup. The composer stays ephemeral
  until Phase 3 proves it needs drafts.
- **Trust client titles/amounts but re-check the total.** Rejected: clients could
  still alter line content. The server must derive everything from source ids.
- **Retry on duplicate invoice numbers.** Rejected in favor of a
  transaction-scoped advisory lock plus a unique index: simpler and race-free.

## Files/modules affected

- `lib/db/schema.ts`
- `lib/db/migrations/*` (generated + appended backfill/dedupe SQL)
- `lib/types/index.ts`
- New: `lib/invoices/status.ts`
- New: `lib/invoices/config.ts`
- New: `lib/errors.ts`, `lib/api/errors.ts`
- `lib/billing.ts`
- `lib/repository/memory.ts`
- `lib/repository/postgres.ts`
- `lib/services/invoices.ts`
- `lib/services/projects.ts`
- `lib/validators/invoices.ts`
- `app/api/invoices/route.ts`
- New: `app/api/invoices/[invoiceId]/route.ts`
- New: `app/api/projects/[id]/hours/[hourId]/route.ts`
- `app/api/projects/[id]/furniture/[furnitureId]/route.ts`
- `lib/query/invoices.ts`
- `lib/query/projects.ts`
- `components/features/projects/ProjectInvoice.tsx`

## Acceptance criteria

- `pnpm db:generate` produces the schema migration and `pnpm db:migrate` applies
  it to a local database.
- Existing invoices get backfilled snapshots where source rows exist; invoices
  without resolvable rows still load.
- Generating an invoice persists snapshots and marks only the referenced rows,
  in one transaction.
- Editing an hour or furniture entry after invoicing leaves the invoice snapshot
  untouched.
- Invoice list/detail/PDF routes return correct data and 404s.
- The existing project invoice view still generates an invoice.
- `npx tsc --noEmit` and `pnpm build` pass.

## Verification

1. `npx tsc --noEmit`
2. `pnpm build`
3. `pnpm db:generate`; inspect SQL; `pnpm db:migrate` where a database is
   available.
4. Manual API smoke test: generate, list, get, mark sent, mark paid, PDF, edit a
   source row, confirm the snapshot is unchanged.
5. `git diff main...HEAD` review before merge.

## Risks

- **Duplicate invoice numbers.** Pre-check plus renumbering keeps the unique
  index safe on existing data.
- **Number parsing.** `substring(number from '[0-9]+')` ignores non-numeric
  prefixes; the fallback remains `1042`.
- **Blob/DB consistency.** A PDF upload can succeed while the transaction fails;
  the blob is deleted in `catch` and cleanup failures are logged.
- **Legacy invoices.** Some invoices have no source rows and therefore no line
  items; the Phase 3 detail UI must show a legacy state.
- **Concurrent edits during generation.** The guarded source update aborts the
  transaction, and the API reports a retryable error.
- **`outstanding` column.** It stays stale; repositories keep recomputing it on
  read.

## Open questions

- Net 14 is env-backed now (`INVOICE_DUE_DAYS`); per-project terms are deferred.
- Draft invoices remain deferred.
- Furniture purchase date is still proxied by `createdAt` for Phase 5.
