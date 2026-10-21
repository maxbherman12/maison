# Maison product roadmap — phased plan

**Status:** Draft for review

**Date:** 2026-10-21

**Source:** Feature list supplied by Max (reproduced in the appendix)

**Scope:** Homepage, project detail, invoices, cross-cutting app shell, reminders, and future bets

This document is a plan, not implementation approval. Each phase below is intended to ship as its own treehouse worktree/branch, be reviewed against `main`, and wait for explicit approval before merge.

---

## 1. Context and goal

Maison already has a working project/billing loop: projects contain hour entries and furniture items; uninvoiced rows feed a pending-items grid; generating an invoice writes a PDF to Vercel Blob and marks the source rows as invoiced.

The requested changes are not isolated tweaks. They move the app from a collection of stacked project views toward:

1. A native-feeling, app-shell layout where only the content region scrolls.
2. A real invoice workspace with a preview, controllable line items, and a lifecycle (issued → sent → paid).
3. A homepage that answers “how are we doing?” with a cumulative revenue chart.
4. A simplified project detail page focused on pending work and invoice history.
5. Reminders that surface work that should have been invoiced, or invoices that should have been paid.

The main architectural gap is invoicing. Today an invoice stores only a total and relies on the source rows’ `invoiceId` to describe what was billed. That is enough to generate a PDF once, but not enough to:

- Show an invoice’s line items after the source entry is edited.
- Let a user include/exclude pending items before generating.
- Track “sent” and “paid” timestamps for reminders.
- Show a trustworthy invoice history.

Phase 2 closes that gap before the UI phases depend on it.

---

## 2. Guiding decisions

### 2.1 Ship in vertical slices

Each phase should leave the app working and shippable. Avoid a broad refactor that touches every component before any user-facing value appears.

### 2.2 Keep business rules in services, not components

- Selection and totals in the UI are previews.
- The server re-derives line items, amounts, and totals from source records when an invoice is generated.
- Status transitions and reminder rules live in services/pure helpers so they can be reused by the grid, invoice detail, and notifications.

### 2.3 Persist invoice line items as snapshots

`invoice_line_items` records what was billed, at what amount, when the invoice was generated. Source entries can be edited later without rewriting history.

### 2.4 Use routes, not stacked client views

The current `ProjectDetail` view switcher (`summary` / `status` / `invoice`) hides state and prevents deep-linking. Invoice composition and invoice detail become URL-addressable pages. The furniture board and log already follow this pattern.

### 2.5 No new background infrastructure yet

Reminders are derived on read from existing timestamps plus explicit dismissal records. No cron, queue, email provider, or push service is required for the first version. Those can be added later without changing the rule definitions.

### 2.6 Single-user assumptions

The app currently has no auth or user model. Settings, dismissals, and alert thresholds are app-wide. If multi-user support is added later, these tables gain a `userId`/workspace scope.

---

## 3. Phase overview

| Phase | Outcome | Depends on | Rough size |
| --- | --- | --- | --- |
| 1 | Native app shell; no document scroll; shared headers | — | M |
| 2 | Invoice line items, status timestamps, editable entries, invoice APIs | 1 (soft) | L |
| 3 | Invoice workspace: preview + item sidebar + mobile tabs; invoice detail | 2 | L |
| 4 | Simplified project detail: no stat cards/icons, row-click sheet, invoice grid | 2, 3 | M |
| 5 | Homepage cumulative revenue chart + list cleanup | 2 | M |
| 6 | In-app invoice cadence and overdue reminders | 2, 3 | M |
| 7 | Future bets: room ideation, scratchpad, task board | Separate plans | — |

Recommended order: **1 → 2 → 3 → 4 → 5 → 6**. Phases 4 and 5 both depend on Phase 2; they can swap order if the homepage is more valuable sooner. Phase 6 should come after invoice detail exists, because “mark sent” is part of the reminder loop.

---

## 4. Phase 1 — Native app shell

### Problem

Every page repeats its own `min-h-screen` wrapper and header. The document itself scrolls, which produces the familiar mobile-web behaviors the request wants to remove: the URL bar collapsing, the whole page bouncing, headers scrolling away, and nested scroll areas inside sheets/grids.

### Approach

Introduce one app shell and one scroll region.

1. **Root layout owns the viewport.**
   - `app/layout.tsx`: body becomes a full-height flex column with `overflow-hidden`.
   - Add `viewportFit: 'cover'` so safe-area insets are available.
   - Keep zoom enabled; do not set `maximumScale: 1` or `userScalable: false`.
2. **One shared shell component.**
   - New `components/layout/AppShell.tsx`: fixed header slot + `<main>` scroll container.
   - New `components/layout/AppHeader.tsx`: brand, back link, page title/context, optional actions.
   - The scroll container uses `min-h-0 flex-1 overflow-y-auto overscroll-contain` and bottom safe-area padding.
   - Add a `data-app-scroll` hook/attribute for scroll restoration or “scroll to top on route change” later.
3. **Project chrome becomes a small shared layout.**
   - New `components/layout/ProjectShell.tsx` (or `ProjectHeader`) that renders client/project context and a back link.
   - Use it from `/projects`, `/projects/[id]`, `/projects/[id]/board`, `/projects/[id]/log`, and the new invoice routes.
4. **CSS rules.**
   - `html, body { height: 100%; }`
   - `body { overscroll-behavior: none; }`
   - Use `100dvh` where full-height calculations are needed; keep a `100vh` fallback.
   - Ensure sheets/dialogs use `max-h-[calc(100dvh-...)]` rather than `90vh`.
5. **Remove page-level scroll wrappers.**
   - Replace `min-h-screen` page wrappers with the shell’s flex layout.
   - Keep long content inside the shell’s `<main>`; do not add a second `overflow-y-auto` around it.

### Alternatives considered

- **Make every page `h-screen overflow-auto` independently.** Rejected: duplicates the same layout rules in every route, makes header behavior inconsistent, and creates nested scroll traps.
- **Use `position: fixed` on `body` and let pages scroll internally.** Rejected: it breaks mobile keyboard resizing and makes focus/scroll restoration harder than a single flex scroll region.
- **Hide the scrollbar with CSS only.** Rejected: it does not fix the underlying document scroll, URL-bar collapse, or overscroll bounce.

### Files/modules affected

- `app/layout.tsx`
- `app/globals.css`
- New: `components/layout/AppShell.tsx`, `AppHeader.tsx`, `ProjectShell.tsx`
- `app/projects/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/projects/[id]/board/page.tsx`
- `app/projects/[id]/log/page.tsx`
- `components/features/projects/ProjectView.tsx` (remove redundant full-screen wrapper)
- Any sheets/dialogs with `vh`-based max heights (`FurnitureSheet`, item modals)

### Acceptance criteria

- The document/body does not scroll on any route; only the shell’s `<main>` scrolls.
- Headers remain fixed while content scrolls.
- On mobile, content clears the notch/home indicator via safe-area padding.
- Opening a sheet or focusing an input does not hide the input behind the keyboard.
- Every existing route still renders and navigates correctly.
- `npx tsc --noEmit` passes; manual smoke test at 375 px and desktop widths.

### Risks

- AG Grid’s internal scroll and the shell scroll must not fight. Grid height stays bounded; the shell handles page scroll.
- iOS `100dvh` behavior varies; test with the keyboard open.
- Scroll restoration may need to be added after the shell lands.

---

## 5. Phase 2 — Billing data foundation

### Problem

The invoice model is too thin for the requested invoice page, invoice history grid, and reminders:

- `invoices` has `total`, `paid`, and `pathname`, but no line items, sent timestamp, due date, or paid timestamp.
- Invoice line items are inferred from source rows at generation time and not persisted.
- The client sends titles and amounts; the service recomputes the total from those client-sent amounts, so item integrity depends on the client.
- Hour entries and most furniture fields cannot be edited after creation.
- There is no invoice list/detail API or query hook.

### Approach

#### 5.1 Schema migration

Add to `invoices`:

- `sentAt timestamp null` (UTC, matching the existing timestamp style)
- `dueAt timestamp null`
- `paidAt timestamp null`
- Keep `paid boolean` for compatibility; derive status from timestamps + `paid`.
- Add indexes on `project_id` and `created_at`.
- Add a unique index on `number` if existing data permits it.

Add `invoice_line_items`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | UUID |
| `invoiceId` | text FK → `invoices.id` | `onDelete: cascade` |
| `source` | enum `hours` / `furniture` | Which table the item came from |
| `sourceId` | text | Source row id |
| `title` | text | Snapshot of the description at billing time |
| `amount` | real | Snapshot of the billable amount |
| `createdAt` | timestamp | Default now |

Indexes: `invoice_id`, and a unique constraint on `(invoice_id, source, source_id)`.

Backfill existing invoices in a hand-written SQL migration:

- For every existing invoice, read the source rows whose `invoice_id` points at it and insert matching `invoice_line_items`.
- Existing invoices with no resolvable rows remain legacy totals; the detail UI shows “Legacy invoice — line items unavailable” rather than failing.

#### 5.2 Domain types and helpers

- Extend `Invoice` with `sentAt?`, `dueAt?`, `paidAt?`, and optional `lineItems`.
- Add `InvoiceStatus = 'Issued' | 'Sent' | 'Paid' | 'Overdue'`.
- Add `getInvoiceStatus(invoice, now)` in `lib/invoices/status.ts`:
  - paid → `Paid`
  - sent and dueAt < now → `Overdue`
  - sent → `Sent`
  - otherwise → `Issued`
- Add `getInvoiceBalance` / `isOutstanding` if needed by the grid.
- Keep `lib/billing.ts` as the single source for pending rows. Add:
  - `billableRowKey(row)` (`hours:<id>` / `furniture:<id>`)
  - `buildSelectedLineItems(project, selectedKeys)` or an equivalent helper that preserves the same ordering as the pending grid.

#### 5.3 Repository changes

`InvoiceRepository` gains:

- `get(id): Promise<Invoice | null>` with line items.
- `list(projectId)` returns invoices with line items or line-item counts.
- `listAll()` for reminders/analytics.
- `createWithItems(invoice, items, sourceRefs)` — a single transaction that inserts the invoice, inserts snapshots, and sets `invoice_id` on the source rows.
- `markSent(id, sentAt, dueAt)`.
- `markPaid(id, paidAt)`.
- Optional `delete` for rollback/cleanup.

`ProjectRepository` gains:

- `updateHourEntry(projectId, hourId, patch)`.
- `deleteHourEntry(projectId, hourId)`.
- `updateFurniture(projectId, furnitureId, patch)` — full editable fields, not just status.
- Existing `markItemsInvoiced` either stays for compatibility or is folded into `createWithItems` so the billing write is atomic.

The Postgres implementation should use `db.transaction` for invoice + line items + source updates. If PDF generation happens before the transaction and the transaction fails, delete the uploaded blob in a `catch` block.

#### 5.4 Service changes

`InvoiceService.generateInvoice` should accept only source references:

```ts
{
  projectId: string;
  items: { id: string; source: 'hours' | 'furniture' }[];
}
```

The service:

1. Loads the project.
2. Rejects duplicate refs and refs that are not pending/on the project.
3. Derives title and amount from the project rows.
4. Recomputes the total server-side.
5. Generates the PDF.
6. Persists invoice + line items + source links in one transaction.
7. Returns the invoice with number and status.

Add:

- `listInvoices(projectId)`
- `getInvoice(invoiceId)`
- `markSent(invoiceId)` — sets `sentAt = now`, `dueAt = now + INVOICE_DUE_DAYS` (default 14).
- `markPaid(invoiceId)` — sets `paid = true`, `paidAt = now`; also set `sentAt` if it was never marked sent.
- `voidInvoice` only if the product needs it; not part of this roadmap.

`ProjectService` gains `updateHourEntry`, `deleteHourEntry`, and a full `updateFurniture`.

#### 5.5 Validation and API surface

New/updated Zod schemas in `lib/validators/invoices.ts`:

- `GenerateInvoiceSchema` — project id + item refs only.
- `MarkInvoiceSchema` — `action: 'send' | 'pay'`.
- `UpdateHourEntrySchema` — title/date/hours/amount.
- `UpdateFurnitureSchema` — full patch, all fields optional.
- `InvoiceListQuerySchema` — project id for list.

Routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/invoices?projectId=...` | List project invoices |
| `POST` | `/api/invoices` | Generate invoice from refs |
| `GET` | `/api/invoices/[invoiceId]` | Invoice + line items |
| `PATCH` | `/api/invoices/[invoiceId]` | `send` / `pay` |
| `GET` | `/api/invoices/[invoiceId]/pdf` | Stream private blob |
| `PATCH` | `/api/projects/[id]/hours/[hourId]` | Edit hour entry |
| `DELETE` | `/api/projects/[id]/hours/[hourId]` | Delete hour entry |
| `PATCH` | `/api/projects/[id]/furniture/[furnitureId]` | Edit furniture fields |
| `DELETE` | `/api/projects/[id]/furniture/[furnitureId]` | Existing delete |

The PDF route should not expose a raw `pathname`. Use `get(pathname, { access: 'private' })` from `@vercel/blob` and return the stream with `Content-Type: application/pdf` and a `Content-Disposition` filename.

#### 5.6 Query hooks

Add to `lib/query/invoices.ts`:

- `useInvoices(projectId)`
- `useInvoice(invoiceId)`
- `useMarkInvoiceSent()`
- `useMarkInvoicePaid()`

Add to `lib/query/projects.ts`:

- `useUpdateHourEntry()`
- `useDeleteHourEntry()`
- `useUpdateFurniture()` (extend the existing status hook or add a separate full-patch hook)

Invalidation rules:

- Invoice generation invalidates the project detail, project lists, invoice list, and notifications.
- Entry edits invalidate the project detail and any invoice composer using that project.
- Mark sent/paid invalidates invoice list, invoice detail, project detail, and notifications.

### Alternatives considered

- **Keep derived line items and only add timestamps.** Rejected: historical invoices would change when a source entry is edited, and there would be no persisted record of exactly what was billed.
- **Store line items as JSONB on `invoices`.** Rejected: harder to query, no referential constraints, and the invoice grid/detail would still lack a clean source link.
- **Persist draft invoices and line items before generation.** Deferred: it adds draft lifecycle, autosave, and orphan cleanup. The composer can be ephemeral for now; line-item snapshots are persisted only when the invoice is generated.
- **Trust client-sent line items but re-check the total.** Rejected: clients could still change titles/amounts. The server must derive line items from source ids.

### Files/modules affected

- `lib/db/schema.ts`
- `lib/db/migrations/*` (generated + hand-written backfill)
- `lib/types/index.ts`
- New: `lib/invoices/status.ts`
- `lib/billing.ts`
- `lib/repository/memory.ts`
- `lib/repository/postgres.ts`
- `lib/services/invoices.ts`
- `lib/services/projects.ts`
- `lib/services/container.ts`
- `lib/validators/invoices.ts`
- New: `app/api/invoices/[invoiceId]/route.ts`
- New: `app/api/invoices/[invoiceId]/pdf/route.ts`
- New: `app/api/projects/[id]/hours/[hourId]/route.ts`
- `app/api/invoices/route.ts`
- `app/api/projects/[id]/furniture/[furnitureId]/route.ts`
- `lib/query/invoices.ts`
- `lib/query/projects.ts`

### Acceptance criteria

- `pnpm db:generate` produces the schema migration; `pnpm db:migrate` applies it locally.
- Existing invoices render with backfilled line items where source rows exist.
- Generating an invoice stores line items and marks source rows in one transaction.
- Editing an hour/furniture entry after invoicing does not alter the historical invoice.
- Invoice list/detail/PDF routes return correct data and 404s.
- `npx tsc --noEmit` passes.

### Risks

- **Migration safety:** backfill must be idempotent and tolerate invoices with missing source rows.
- **Number generation:** `max(number)+1` can race. Add a unique constraint and retry or use a sequence if concurrent invoicing matters.
- **Blob/DB consistency:** PDF upload can succeed while the DB transaction fails. Delete the blob on failure and log it.
- **Legacy invoices:** the UI needs a graceful “no line items” state.
- **`outstanding` column:** the project row stores an `outstanding` value but repositories recompute it. Continue recomputing; do not rely on the stored value for billing decisions.

---

## 6. Phase 3 — Invoice workspace

### Problem

Invoicing is currently a client-side view inside project detail. It shows only a total and item count, cannot preview the invoice, cannot exclude items, cannot edit entries, and has no URL. On mobile it is a long stack with no focused action.

### Approach

#### 6.1 Routes

| Route | Purpose |
| --- | --- |
| `/projects/[id]/invoices` | Invoice index: history + “New invoice” CTA |
| `/projects/[id]/invoices/new` | Composer: preview + item sidebar |
| `/projects/[id]/invoices/[invoiceId]` | Generated invoice detail + lifecycle actions |

Server components fetch the project/invoice through the service layer and pass serializable data to client components, matching the existing board/log pattern.

#### 6.2 Composer layout

`components/features/invoices/InvoiceWorkspace.tsx`:

- Desktop: two-column layout, preview on the left and a 360–400 px item sidebar on the right.
- Mobile: tabs `Preview` / `Items`, with a sticky bottom bar showing the selected total and the primary action.
- Default selection: **every pending row is included**. Track exclusions rather than selections, so newly logged pending items are included automatically and “select all” is just clearing the exclusion set.
- Selection keys use the existing `BillableRow` key (`hours:<id>` / `furniture:<id>`).

`InvoicePreview`:

- Paper-like card: Maison letterhead, client/project, “Draft” invoice number, issue date, due date, bill-to, line-item table, total due.
- Uses selected `BillableRow`s and `formatMoney`.
- Footer note that the server will re-derive amounts and assign the final number on generation.

`InvoiceItemSidebar`:

- Header with included count, total, and “Select all” / “Clear all”.
- Each row: checkbox, type badge, description, secondary detail, amount, edit button, remove (uncheck) button.
- Group headings for Hours and Furniture; keep the same ordering as the pending grid.
- Search is optional but useful; reuse the pending grid’s quick-filter approach if it stays cheap.
- All checkboxes are real `<input type="checkbox">` elements for keyboard/screen-reader support.

`EditBillableItemSheet`:

- One sheet component that switches between hour fields and furniture fields.
- Hour fields: title, date, hours, amount override.
- Furniture fields: name, vendor, retail, trade, link, tags, notes, status.
- Uses React Hook Form + Zod; saves through the Phase 2 mutation hooks; closes on success.
- This sheet is reused by the project detail grid in Phase 4.

Mobile tabs:

- Use local state (`preview` / `items`) and `role="tablist"` semantics.
- Sticky action bar remains visible on both tabs.
- After generating, navigate to the invoice detail route.

#### 6.3 Empty and error states

- No pending items: explain that everything is invoiced, link to the log page, and link to invoice history.
- No pending items but invoices exist: show history.
- Generation error: keep the selection intact, show the server message, allow retry.
- Deleting/editing an item that disappears: close the sheet and refresh.

#### 6.4 Invoice detail

`components/features/invoices/InvoiceDetail.tsx`:

- Status badge using `getInvoiceStatus`.
- Number, issue date, due date, paid date.
- Client/project, line-item table, total.
- PDF link through `/api/invoices/[invoiceId]/pdf` (inline view + download).
- Actions:
  - `Issued` → “Mark sent” (sets sentAt/dueAt).
  - `Sent` / `Overdue` → “Mark paid”.
  - `Paid` → no action.
- Confirmation for irreversible actions; optimistic UI is optional but the query invalidation must be reliable.

#### 6.5 Wiring

- Change the project detail `Invoice` action from the old `onInvoice` callback to a link to `/projects/[id]/invoices/new`.
- If there are no pending items, link to `/projects/[id]/invoices` instead.
- Delete the old `ProjectInvoice` view in Phase 4; during Phase 3 it can remain as a fallback until the new route is verified.

### Alternatives considered

- **Keep the invoice flow as a modal/view inside project detail.** Rejected: the requested sidebar/preview layout needs width, and a URL is needed for invoice history/detail deep links.
- **Persist a draft invoice as the user toggles items.** Deferred: it requires autosave, conflict handling, and cleanup of abandoned drafts. The composer can be ephemeral, with the server creating the invoice only when the user confirms.
- **Put selection in component state only.** Rejected for extensibility: URL-backed exclusions (`?exclude=hours:id,...`) would survive refresh and make the composer shareable. This is a small optional enhancement; start with state, add URL sync if it stays simple.
- **Use a rich PDF preview library.** Rejected: rendering the real PDF in-browser is heavier than a faithful HTML preview; the generated PDF remains the source of truth.

### Files/modules affected

- New: `app/projects/[id]/invoices/page.tsx`
- New: `app/projects/[id]/invoices/new/page.tsx`
- New: `app/projects/[id]/invoices/[invoiceId]/page.tsx`
- New: `components/features/invoices/InvoiceWorkspace.tsx`
- New: `components/features/invoices/InvoicePreview.tsx`
- New: `components/features/invoices/InvoiceItemSidebar.tsx`
- New: `components/features/invoices/InvoiceMobileTabs.tsx`
- New: `components/features/invoices/EditBillableItemSheet.tsx`
- New: `components/features/invoices/InvoiceDetail.tsx`
- New: `components/features/invoices/InvoiceStatusBadge.tsx`
- New: `components/features/invoices/InvoicesGrid.tsx` (used by the index and Phase 4)
- `components/features/projects/ProjectSummary.tsx` (invoice link)
- `lib/query/invoices.ts`, `lib/query/projects.ts`
- `lib/billing.ts`

### Acceptance criteria

- `/projects/[id]/invoices/new` previews all pending items by default.
- Unchecking/removing an item immediately updates the preview and total, and that item stays pending after generation.
- Editing an item updates its title/amount in the preview and persists to the source project.
- Generating from the composer creates an invoice, marks only the selected items invoiced, and navigates to its detail page.
- On mobile, Preview/Items tabs are usable at 375 px; the sticky action bar does not cover content.
- Invoice detail shows line items, status, PDF, and valid lifecycle actions.
- No document-level scroll (Phase 1 shell).
- `npx tsc --noEmit` passes.

### Risks

- **Source edits during composition:** another tab could edit/delete an item between preview and generation. The server re-derives and rejects missing/non-pending refs; the UI should surface that as a refresh-and-retry message.
- **Large projects:** rendering every row in the sidebar is fine for now; add virtualization if projects routinely exceed a few hundred pending items.
- **PDF privacy:** private blobs must be streamed through the API; never expose the token or assume `pathname` is a public URL.
- **Mobile keyboard:** the edit sheet and sticky bar must coexist with the shell’s scroll region.

---

## 7. Phase 4 — Project detail simplification

### Problem

The project detail page has three summary cards, a strip of furniture icons, a hidden furniture modal, and an invoice view embedded in client state. The furniture icons duplicate the furniture board and are not an efficient way to inspect items. The invoice history is not visible at all.

### Approach

1. **Remove the summary cards.**
   - Delete the `StatCard` block from `ProjectSummary`.
   - Do not replace it with another row of cards. The pending grid, invoice grid, and action row carry the important information.
2. **Remove the furniture icon strip and its modal.**
   - Delete the avatar row and `FurnitureItemDetail` from `ProjectSummary`.
   - Keep the `Board` action as the place to manage all furniture.
3. **Make grid rows actionable.**
   - Add `onRowClicked` to `ProjectItemsGridInner`.
   - Pass an `onOpenItem(row)` callback through `ProjectItemsGrid`.
   - Furniture rows open the board’s `FurnitureSheet` for read/move/delete, with an Edit action that opens `EditBillableItemSheet` (built in Phase 3). Hours rows open a source-specific `BillableItemSheet`/edit variant.
   - Ensure keyboard activation works: row click plus a visible/focusable action cell or accessible row button. AG Grid row click alone is not sufficient for keyboard-only users; add a per-row “Open” affordance or `onCellKeyDown` handling.
4. **Add an invoices grid below pending items.**
   - `InvoicesGrid` lists number, issue date, status, total, due date, paid date.
   - Rows link to `/projects/[id]/invoices/[invoiceId]`.
   - Empty state: “No invoices yet” + “Create invoice” CTA.
   - Use a semantic `<table>` with responsive card fallback rather than a second AG Grid instance. The invoice list is small and benefits from clean typography/links; it also keeps the AG Grid bundle out of this section.
5. **Simplify the view state.**
   - `ProjectDetail` no longer needs `summary` / `status` / `invoice` view switching.
   - Remove the dead `ProjectStatus`, `ProjectInvoice`, `HomeView`, and `ProjectHeader` components if they have no remaining imports.
   - `ProjectView` can render `ProjectSummary` directly.
6. **Action row.**
   - Log → `/projects/[id]/log`
   - Board → `/projects/[id]/board`
   - Invoices → `/projects/[id]/invoices` (or `/new` when pending items exist)
   - Optionally add a compact “Uninvoiced” figure near the pending grid header, but not as a card.

### Alternatives considered

- **Keep the furniture icons as quick actions.** Rejected: they duplicate the board, only show five items, and the requested behavior is row-click from the grid.
- **Use AG Grid for the invoice history too.** Rejected: the invoice list is small, and a table/card layout is more readable, lighter, and easier to link. AG Grid remains the right tool for the dense pending-items grid.
- **Keep the old status view for hours.** Rejected: the board covers furniture, and hour history is available in the pending grid and invoice detail. If a full hour ledger is needed later, add a dedicated route.
- **Replace summary cards with a hero metric row.** Rejected: the request is to remove the cards; adding a different card row would not simplify the page.

### Files/modules affected

- `components/features/projects/ProjectSummary.tsx`
- `components/features/projects/ProjectItemsGrid.tsx`
- `components/features/projects/ProjectItemsGridInner.tsx`
- New: `components/features/invoices/InvoicesGrid.tsx`
- `components/features/projects/ProjectDetail.tsx`
- `components/features/projects/ProjectView.tsx`
- Delete if unused: `ProjectStatus.tsx`, `ProjectInvoice.tsx`, `HomeView.tsx`, `ProjectHeader.tsx`
- Reuse: `components/features/furniture/FurnitureSheet.tsx`
- Reuse: `components/features/invoices/EditBillableItemSheet.tsx`

### Acceptance criteria

- Project detail has no summary cards and no furniture icon strip.
- Clicking a furniture row in the pending grid opens the furniture detail sheet.
- Clicking an hour row opens the hour detail/edit sheet (or at minimum is keyboard-focusable).
- Invoice history is visible below pending items with status, total, and date; each row opens invoice detail.
- The `Invoice` action opens the new invoice page.
- No dead view-switcher code remains.
- `npx tsc --noEmit` passes; manual smoke test on mobile/desktop.

### Risks

- AG Grid row-click vs. future cell editing: if inline editing is added later, use a dedicated action cell instead of row click.
- Furniture row click only covers pending furniture. Invoiced furniture remains accessible through the board; make that clear in the UI.
- Removing `ProjectStatus` may remove the only hour ledger. Confirm the pending grid + invoice detail are sufficient, or add a dedicated log/history route later.

---

## 8. Phase 5 — Homepage revenue dashboard

### Problem

The homepage lists projects and an outstanding dollar amount, but does not answer the higher-level question: how much work has been logged versus billed over time? The outstanding number in each project row is also being removed by request.

### Approach

#### 8.1 Define the series precisely

- **Logged revenue:** value of work recorded, regardless of invoicing.
  - Hour entries: sum `amount` by the entry’s `date`.
  - Furniture: sum `trade` by `createdAt` (the model has no purchase date; `createdAt` is the proxy until a `purchasedAt` field is added).
- **Billed revenue:** invoice totals by issue date (`invoices.createdAt`).
- **Cumulative:** each point is the running total from the beginning of history through the bucket end, so the chart shows the gap between logged and billed work.
- **Window:** the selected range controls the visible x-axis; opening balances before the range are included so the lines do not restart at zero mid-history.

Document these definitions in the chart’s tooltip/help text so “billed” is not confused with “paid.” A paid-revenue series is a natural follow-up, but the request asks for two lines.

#### 8.2 Data path

- New `lib/repository/analytics.ts` interface and Postgres implementation.
- The repository returns daily aggregates for hours, furniture, and invoices (DB-side `GROUP BY` on day).
- New `lib/services/analytics.ts` merges daily buckets, computes opening balances, and returns cumulative points.
- New route `GET /api/dashboard/revenue?from=...&to=...&bucket=day|week|month`.
- Zod query schema with:
  - default `from` = 12 months ago, `to` = today
  - maximum range (e.g. 5 years)
  - `bucket` default `month` for long ranges, `day` for short ranges
- New `lib/query/analytics.ts` hook.

#### 8.3 UI

- Add `RevenueDashboard` at the top of `/projects`, above `All projects`.
- Header: title, total logged, total billed, and the gap (unbilled) for the selected range.
- Date range control: presets `30D`, `90D`, `YTD`, `12M`, `All`, plus a custom range popover if it stays simple.
- Chart: two lines with accessible labels, gridlines, tooltip showing date + both cumulative values + gap.
  - Use `recharts` (React 19-compatible) with a custom theme matching the current palette (`#bd765b` for billed, `#7f8f72` for logged).
  - Add a `role="img"` summary and a visually hidden data table or a “View data” disclosure for screen-reader users.
- Empty state when there is no history.
- Responsive: chart height ~240–280 px on mobile, ~320 px on desktop; range control scrolls horizontally on narrow screens.
- Remove `formatMoney(item.outstanding)` from `ProjectList` rows. Keep the project name/client/initials.
- Remove the dead `HomeView` component if Phase 4 has not already done so.

#### 8.4 Extensibility

- Keep the series computation pure and typed so a future “paid revenue” line or per-project filter can reuse it.
- If multi-user/auth arrives, scope the analytics query by workspace/user.
- If furniture gets a real purchase date, switch the furniture series from `createdAt` to that field without changing the API shape.

### Alternatives considered

- **Compute the chart entirely from `useProjects()` on the client.** Rejected: the project payload does not include invoice totals, furniture lacks a reliable date, and loading all history to the browser does not scale.
- **Use a paid-only series instead of billed.** Rejected for this phase: the request explicitly asks for billed vs. logged. Paid revenue is a useful third series later.
- **Build a custom SVG chart.** Rejected: tooltips, responsive sizing, axes, and accessibility are non-trivial; `recharts` is a better fit for this app’s needs. If bundle size becomes a concern, revisit with a smaller chart primitive.
- **Show outstanding per project in the list.** Rejected by the request; the chart and project detail carry that information.

### Files/modules affected

- New: `lib/repository/analytics.ts`
- New: `lib/services/analytics.ts`
- New: `lib/validators/analytics.ts`
- New: `app/api/dashboard/revenue/route.ts`
- New: `lib/query/analytics.ts`
- New: `components/features/dashboard/RevenueDashboard.tsx`
- New: `components/features/dashboard/RevenueChart.tsx`
- New: `components/features/dashboard/RevenueRangePicker.tsx`
- `app/projects/page.tsx`
- `components/features/projects/ProjectsListClient.tsx`
- `components/features/projects/ProjectList.tsx`
- `package.json` / `pnpm-lock.yaml` (`recharts`)

### Acceptance criteria

- `/projects` shows a cumulative chart above the project list.
- Range presets update the chart without a full page reload.
- Billed and logged lines use the definitions above; tooltips show both and the gap.
- The list no longer shows outstanding dollar amounts.
- Empty data shows a useful state, not a broken chart.
- Chart is usable at 375 px and keyboard/screen-reader accessible.
- `npx tsc --noEmit` passes.

### Risks

- Date/time zones: hour `date` is a plain date string; invoices/furniture use timestamps. Normalize to UTC dates in the analytics service and document the choice.
- Cumulative opening balances are easy to get wrong; verify with a known fixture (e.g. one invoice mid-range).
- Recharts adds bundle weight; keep it in a client component and consider dynamic import if the homepage becomes heavy.
- Furniture `createdAt` is not the purchase date; flag this in the UI or add `purchasedAt` before relying on it for accounting.

---

## 9. Phase 6 — Invoice cadence and overdue reminders

### Problem

Nothing prompts the user to invoice pending work or to chase an invoice that was sent but not paid. The request asks for notifications after a configurable amount of time between invoices, and after an invoice has been sent and remains unpaid.

### Approach

#### 9.1 Derived alerts, not a background job

Compute alerts on read:

- `GET /api/notifications` calls `NotificationService.list()`, which loads projects/invoices and returns current alerts plus dismissal state.
- No cron, queue, or email provider is required. The bell updates when the app is opened or React Query refetches.
- Dismissals are persisted so an alert does not reappear on every page load.

Tables:

- `notification_dismissals`:
  - `key text primary key`
  - `dismissedAt timestamp default now()`

Alert keys must change when the underlying state changes:

- `invoice-overdue:<invoiceId>:<sentAt ISO>` — a new send resets the alert.
- `project-cadence:<projectId>:<lastInvoiceId|never>:<lastInvoiceAt ISO>` — a new invoice resets the alert.

#### 9.2 Rules

Put pure functions in `lib/notifications/rules.ts`:

1. **Invoice cadence**
   - Trigger when a project has pending billable rows and either:
     - it has never been invoiced and was created more than `INVOICE_CADENCE_DAYS` ago (default 30), or
     - its most recent invoice is older than `INVOICE_CADENCE_DAYS`.
   - Copy: “<Project> has <amount> in unbilled work. Last invoice: <date / never>.”
   - Link to `/projects/<id>/invoices/new`.
2. **Overdue invoice**
   - Trigger when `sentAt` is set, `paid` is false, and `sentAt + PAYMENT_REMINDER_DAYS` (default 14) is in the past.
   - Prefer `dueAt` when present; fall back to `sentAt + reminder days`.
   - Copy: “Invoice <number> for <project> is <n> days overdue (<amount>).”
   - Link to `/projects/<id>/invoices/<invoiceId>`.

Thresholds:

- `INVOICE_CADENCE_DAYS=30`
- `PAYMENT_REMINDER_DAYS=14`
- `INVOICE_DUE_DAYS=14`
- Read via a small `lib/notifications/config.ts` with safe integer parsing. Document them in the environment section. A settings UI can come later.

#### 9.3 UI

- Add a bell to the shared `AppHeader` (from Phase 1).
- Badge shows unread/undismissed count.
- Desktop: popover/dropdown with alert cards, dismiss buttons, and deep links.
- Mobile: full-height sheet or dedicated `/notifications` route; use the same list component.
- Dismiss is optimistic; failure restores the alert.
- Empty state: “You’re all caught up.”
- If there are zero alerts, the bell can still be present (no badge) so the feature is discoverable.

#### 9.4 Future channels

- Email digest (Resend/Postmark) requires a scheduled job, provider key, and unsubscribe/settings.
- Web push requires a service worker, VAPID keys, and permission UX.
- Keep the rule functions pure so a future worker can reuse them.

### Alternatives considered

- **Cron + email reminders now.** Rejected for this phase: it adds infrastructure, credentials, and delivery concerns before the in-app reminder loop is proven. The rule layer is designed so email can be added later.
- **Persist every notification as a row on creation.** Rejected: without a worker, rows would still need a trigger to be created. Deriving from current state is simpler and avoids stale duplicate alerts.
- **Store dismissals in `localStorage`.** Rejected: dismissals would not survive devices/browsers and would be invisible to a future email worker.
- **Use a fixed hard-coded threshold.** Rejected: “after a certain amount of time” implies configurability. Environment-backed config is a small step that avoids a settings UI for now.

### Files/modules affected

- New: `lib/notifications/config.ts`
- New: `lib/notifications/rules.ts`
- New: `lib/services/notifications.ts`
- New: `lib/repository/notifications.ts`
- New: `app/api/notifications/route.ts`
- New: `app/api/notifications/dismiss/route.ts`
- New: `lib/query/notifications.ts`
- New: `components/features/notifications/NotificationBell.tsx`
- New: `components/features/notifications/NotificationList.tsx`
- `components/layout/AppHeader.tsx` (Phase 1)
- `lib/db/schema.ts` (dismissals)
- `app/layout.tsx` / providers if a notification provider is needed (likely not; React Query is enough)

### Acceptance criteria

- A project with pending work older than the cadence threshold produces an alert.
- A sent, unpaid invoice past the reminder threshold produces an alert.
- Marking the invoice paid removes the overdue alert.
- Generating a new invoice resets the cadence alert for that project.
- Dismissed alerts stay dismissed across reloads; changed state produces a new alert key.
- Bell/badge works on mobile and desktop; no alert blocks navigation.
- `npx tsc --noEmit` passes.

### Risks

- Date math around time zones and “days overdue”; use UTC and a single helper.
- Alerts could be noisy for projects with no activity. Require pending items and/or an invoice before alerting.
- If the app is opened rarely, in-app reminders are only seen when opened; that is acceptable until email/push is added.
- No auth means dismissal state is global.

---

## 10. Phase 7 — Future bets (unscheduled)

These are captured so they are not lost, but they should not be bundled into the phases above. Each needs its own plan, estimate, and approval.

### 7A. Nano Banana room ideation

**Idea:** Upload a room photo and a prompt, generate design variations, and save them to a project.

**Approach sketch:**

- Server-side API route calls the image model (Google “Nano Banana” / Gemini image model) with the uploaded image + prompt. Never expose the API key client-side.
- Upload source/generated images to Vercel Blob; store metadata in a `design_concepts` table (`projectId`, `sourceImageUrl`, `prompt`, `generatedImageUrl`, `createdAt`).
- Project detail or a dedicated “Ideas” tab shows a gallery and lets the user regenerate/save.
- Add cost caps, moderation, image-size limits, and a clear “AI-generated” label.

**Alternatives:** client-side model calls (rejected: key exposure), a generic image-generation provider (rejected: Nano Banana specifically requested), storing only URLs in project JSON (rejected: no history/metadata).

**Open questions:** provider/API access, per-image cost budget, image rights, whether generated images are client-facing, and where the gallery lives.

### 7B. Scratchpad / notebook

**Idea:** Per-project notes for ideas, links, and loose thoughts.

**Approach sketch:**

- `project_notes` table: `id`, `projectId`, `title`, `body` (markdown), `pinned`, `createdAt`, `updatedAt`.
- Simple editor with markdown preview and autosave; optional attachments through Blob.
- A “Notes” route or tab on project detail; search across notes later.
- Start with plain text/markdown rather than a full block editor.

**Alternatives:** reuse furniture notes (rejected: not general), a third-party docs product (rejected: data leaves the app), rich-text block editor (deferred: unnecessary complexity for v1).

### 7C. Kanban tasks

**Idea:** Add project tasks to a Kanban board.

**Approach sketch:**

- `tasks` table: `id`, `projectId`, `title`, `notes`, `status` (`todo` / `doing` / `done`), `dueDate`, `position`, timestamps.
- Reuse the dnd-kit patterns from `FurnitureBoard` for drag/drop and mobile lane tabs.
- API routes under `/api/projects/[id]/tasks`; React Query hooks.
- Optionally link tasks to invoices/reminders later.

**Alternatives:** reuse the furniture board’s data model (rejected: tasks and purchases have different lifecycles), a generic project-management integration (rejected: adds an external dependency and sync complexity).

---

## 11. Cross-cutting architecture

### 11.1 Target data model additions

```
invoices
  + sent_at
  + due_at
  + paid_at
  (paid remains)

invoice_line_items
  id
  invoice_id      -> invoices.id (cascade)
  source          -> 'hours' | 'furniture'
  source_id
  title           -> snapshot
  amount          -> snapshot
  created_at

notification_dismissals
  key             -> stable alert key
  dismissed_at
```

Future-only tables (`design_concepts`, `project_notes`, `tasks`) are intentionally not part of this migration.

### 11.2 API surface after Phase 6

| Area | Routes |
| --- | --- |
| Projects | existing CRUD + `PATCH/DELETE /api/projects/[id]/hours/[hourId]` |
| Furniture | existing CRUD + full-field `PATCH` |
| Invoices | `GET/POST /api/invoices`, `GET/PATCH /api/invoices/[id]`, `GET /api/invoices/[id]/pdf` |
| Analytics | `GET /api/dashboard/revenue` |
| Notifications | `GET /api/notifications`, `POST /api/notifications/dismiss` |

### 11.3 Layer responsibilities

- **Components:** layout, selection/exclusion UI, preview rendering, optimistic affordances.
- **Query hooks:** fetch/mutate API routes; invalidate the right keys.
- **Services:** validation, server-side derivation of line items, status transitions, reminder rules.
- **Repositories:** SQL/Drizzle queries, transactions, snapshot persistence.
- **Validators:** Zod schemas shared by routes and forms where appropriate.

### 11.4 Mobile/responsive rules

- The shell owns scrolling; sheets/dialogs use `dvh` and safe-area padding.
- Invoice composer uses tabs below `lg`; desktop uses a two-column layout.
- Touch targets ≥ 44 px for checkboxes, edit/remove buttons, and sticky actions.
- Do not rely on hover for edit/remove affordances.

### 11.5 Accessibility

- Native checkboxes and buttons, visible focus states.
- Chart has a text summary/data table.
- AG Grid rows need a keyboard path to open items.
- Status is conveyed by text, not color alone.
- Sheets trap focus and close on Escape (reuse `FurnitureSheet` patterns).

### 11.6 Verification per phase

There is no test/lint/CI setup in this repo, so each phase’s definition of done is:

1. `npx tsc --noEmit`
2. `pnpm build`
3. Manual smoke test of the changed flows at 375 px and desktop widths.
4. `git diff main...HEAD` review before merge.
5. Explicit user approval before merging.

Database phases additionally require `pnpm db:generate` + `pnpm db:migrate` against a local database, and a check that existing invoice data backfills.

---

## 12. Open questions

1. **Notification channel:** Is the first version in-app only, or is email/push required? This plan assumes in-app; email/push is a follow-up.
2. **“Billed” semantics:** Should the chart’s billed line mean invoices issued or invoices paid? This plan uses issued; a paid series can be added.
3. **Invoice terms:** Is Net 14 right for `dueAt`, or should it be configurable per project?
4. **Draft invoices:** Is losing an in-progress composer selection on navigation acceptable? The plan assumes yes; persisted drafts are deferred.
5. **Furniture purchase date:** Should furniture get a real `purchasedAt` field for revenue reporting, rather than using `createdAt`?
6. **Auth/multi-user:** Are reminders/dismissals app-wide for the foreseeable future? This plan assumes single-user.
7. **Room ideation:** Which image provider/API key, and what is the per-image budget?

---

## 13. Appendix — original feature list

### General

- Remove page scrolling to make it feel like a native app
- Setup notifications after a certain amount of time between invoices or if invoice was sent and not marked as paid for a certain amount of time

### Homepage

- Top of page should have a cumulative revenue chart with date range selector
  - This could include two timeseries lines, one for billed revenue and one for logged revenue to show the gap between cash received and accounts receivable
- Remove the outstanding dollar amount from the client summary

### Project Detail

- Remove furniture icons and change so that clicking the furniture row in the grid pops open this component
- Remove summary cards from the top
- Add a grid of invoices that shows each status, total, etc

### Invoices

- This should be its own page, clicking the invoice button should bring you to this page which shows a preview invoice including all pending items by default
- Include a sidebar with checkmarks next to all the included items with the ability to remove items and an edit button that allows you to edit an entry
  - In mobile this is maybe handled by a tabbed view for usability

## Future feature ideas

- Nano banana integration to allow room ideation
- Scratchpad / notebook for saving ideas, links, etc
- Adding tasks to Kanban board
