# Invoice workspace (roadmap Phase 3)

**Status:** Implemented in `feature/invoice-workspace` (pending review)

**Date:** 2026-11-03

**Branch:** `feature/invoice-workspace`

**Roadmap:** [2026-10-21-product-roadmap.md](./2026-10-21-product-roadmap.md), Phase 3

## Problem

Invoicing is still a client-side view stacked inside project detail. It can only
bill every pending row, shows a total and a count, cannot preview the invoice,
cannot exclude an item, cannot edit an entry, and has no URL. Invoice detail and
the sent/paid lifecycle exist in the API after Phase 2 but have no UI.

Phase 3 turns invoicing into its own workspace:

- `/projects/[id]/invoices` — invoice history
- `/projects/[id]/invoices/new` — composer with preview and item sidebar
- `/projects/[id]/invoices/[invoiceId]` — generated invoice detail and lifecycle

## Desired outcome

- Every pending row is selected by default, but each row can be unchecked and
  stays pending after generation.
- The preview and total update immediately as items are included, excluded, or
  edited.
- The composer is usable at 375 px: Preview/Items tabs plus a sticky action bar.
- Editing an hour or furniture entry happens in one shared sheet and persists
  through the Phase 2 mutations.
- Invoice history shows number, issued date, status, total, due date, and paid
  date; each row opens invoice detail.
- Invoice detail shows the snapshot line items, PDF links, and valid lifecycle
  actions (`Mark sent`, `Mark paid`).
- Project detail's Invoice action opens the new workspace instead of switching
  an in-page view.

## Approach

### 1. Routes and data flow

All three routes are server components that load through `projectService` /
`invoiceService`, call `notFound()` for missing projects or invoices, and render
inside `ProjectShell`. Serializable data is passed to client components that
seed React Query:

- `app/projects/[id]/invoices/page.tsx` → `InvoiceIndex` (project + invoice list)
- `app/projects/[id]/invoices/new/page.tsx` → `InvoiceWorkspace` (project)
- `app/projects/[id]/invoices/[invoiceId]/page.tsx` → `InvoiceDetail`
  (project + invoice with snapshots)

The detail route also checks `invoice.projectId === project.id` before
rendering, so an invoice cannot be viewed under the wrong project.

`useProject`, `useInvoices`, and `useInvoice` gain an optional `initialData`
argument. Existing callers are unchanged; new pages avoid a loading flash while
still sharing cache with mutations made elsewhere.

### 2. Composer selection model

`InvoiceWorkspace` derives `BillableRow[]` from `buildBillableRows(project)`.
It tracks an **exclusion** set of row keys (`hours:<id>` / `furniture:<id>`)
rather than a selection set, so newly logged pending rows are included by
default. Select all clears the set; clear all sets every current key.

Selected line items and the total come from `buildSelectedLineItems`, so the
preview, sidebar, and server payload use the same ordering and amounts as the
pending grid.

Generation posts only `{ id, source }` refs. On success the router pushes to the
detail page. On failure the selection is preserved and the server message is
shown with a retry path.

### 3. Composer layout

Desktop (`lg` and up) is a two-column grid: fluid preview on the left, 380 px
item sidebar on the right. Mobile uses two tabs, `Preview` and `Items`, with
proper `tablist`/`tab`/`tabpanel` semantics. Both columns remain mounted on
desktop; tabs only control visibility below `lg`.

A sticky bottom bar (`lg:hidden`) shows included count, total, and the primary
Generate action, above the safe-area inset. The workspace adds bottom padding
so the bar never covers the last row.

`InvoicePreview` is a paper-like card: Maison wordmark, Draft badge, issue date,
client/project, line-item table, total, and a footer explaining that the final
number and amounts are assigned server-side. `InvoiceItemSidebar` groups Hours
and Furniture, with a native checkbox, type badge, description, secondary
detail, amount, Edit, and Remove on every row.

### 4. Shared edit sheet

`EditBillableItemSheet` takes the project and the pending row, resolves the
underlying hour/furniture record, and switches between two React Hook Form
forms. It reuses the furniture sheet conventions: backdrop click, Escape,
autofocus close, `role="dialog"`, `aria-modal`, `max-h-sheet`, and bottom
safe-area padding.

- Hour fields: title, date, hours, amount override.
- Furniture fields: name, vendor, retail, trade, link, tags, notes, status.

Forms validate locally with Zod, map string inputs to numbers, call
`useUpdateHourEntry` / `useUpdateFurniture`, close on success, and show the API
error inline. Query invalidation refreshes the workspace project, which updates
the preview and sidebar without resetting exclusions. Phase 4 will reuse this
sheet from the pending grid.

### 5. Invoice index and detail

`InvoicesGrid` is a semantic table on desktop and a card list on mobile. It
shows number, issued date, status, total, due date, and paid date, with each row
linking to invoice detail. Empty state points at the composer when pending work
exists and explains what to do when it does not.

`InvoiceStatusBadge` renders `Issued`, `Sent`, `Paid`, or `Overdue` as text plus
tint, using `getInvoiceStatus` so status is never inferred in the component.

`InvoiceDetail` shows the status, number, issue/due/paid dates, client/project,
snapshot line items, total, and View/Download PDF links through
`/api/invoices/[invoiceId]/pdf`. Legacy invoices without snapshots render a
clear "line items unavailable" state instead of an empty table.

Actions:

- `Issued` → Mark sent (confirmation; sets `sentAt` and `dueAt`)
- `Sent` / `Overdue` → Mark paid (confirmation)
- `Paid` → no action

All actions use the Phase 2 hooks; their invalidation refreshes the list and
detail. Errors are shown inline and leave the invoice unchanged.

### 6. Project detail wiring

`ProjectSummary` replaces the `onInvoice` callback with a link:

- pending rows exist → `/projects/[id]/invoices/new`
- otherwise → `/projects/[id]/invoices`

`ProjectDetail` drops the now-unreachable `invoice` view branch. The old
`ProjectInvoice` file is left in place until Phase 4 removes it with the other
dead views; it is no longer rendered.

### 7. Styling and accessibility

Follow the existing warm palette and serif/sans pairing. Touch targets are at
least 44 px, focus states are visible, checkboxes are native inputs, status is
conveyed by text, and no action relies on hover. Dates are formatted in UTC to
avoid server/client hydration differences. The composer, index, and detail all
render inside the single shell scroll region, so no route adds its own
`overflow-y-auto`.

## Alternatives considered

- **Keep the composer as a modal/view inside project detail.** Rejected: the
  preview plus sidebar needs width, invoice history needs a URL, and deep links
  to an invoice must survive reloads.
- **Persist draft invoices while the user toggles items.** Rejected for this
  phase: it adds draft lifecycle, autosave, conflict handling, and orphan
  cleanup. The composer stays ephemeral and the server creates the invoice only
  on confirmation.
- **Track included rows instead of excluded rows.** Rejected: newly logged
  pending items would be silently left out, and "select all" would need to
  special-case rows added after mount.
- **Put selection in the URL (`?exclude=...`).** Deferred: it would survive
  refresh and make the composer shareable, but adds serialization and back-button
  semantics. Local state is enough for the first version.
- **Render the real PDF in the browser as the preview.** Rejected: heavier than
  a faithful HTML preview, and the generated PDF remains the source of truth.
- **Use AG Grid for invoice history.** Rejected: the list is small, and a
  table/card layout is more readable and lighter. AG Grid stays on the dense
  pending-items grid.

## Files/modules affected

New:

- `app/projects/[id]/invoices/page.tsx`
- `app/projects/[id]/invoices/new/page.tsx`
- `app/projects/[id]/invoices/[invoiceId]/page.tsx`
- `components/features/invoices/InvoiceIndex.tsx`
- `components/features/invoices/InvoiceWorkspace.tsx`
- `components/features/invoices/InvoicePreview.tsx`
- `components/features/invoices/InvoiceItemSidebar.tsx`
- `components/features/invoices/InvoiceMobileTabs.tsx`
- `components/features/invoices/EditBillableItemSheet.tsx`
- `components/features/invoices/InvoiceDetail.tsx`
- `components/features/invoices/InvoiceStatusBadge.tsx`
- `components/features/invoices/InvoicesGrid.tsx`
- `lib/format-date.ts` (shared UTC date formatting)

Changed:

- `lib/query/projects.ts` (optional `initialData` for `useProject`)
- `lib/query/invoices.ts` (optional `initialData` for list/detail)
- `components/features/projects/ProjectSummary.tsx`
- `components/features/projects/ProjectDetail.tsx`

Unchanged but reused:

- `lib/billing.ts`, `lib/invoices/status.ts`, `lib/types/index.ts`
- Phase 2 API routes and mutation hooks

## Acceptance criteria

- `/projects/[id]/invoices/new` selects every pending item by default.
- Unchecking/removing an item updates the preview and total; it stays pending
  after generation.
- Editing an item updates the preview and persists to the source project.
- Generating marks only selected rows invoiced and navigates to detail.
- Mobile Preview/Items tabs work at 375 px; the sticky bar does not cover
  content.
- Invoice detail shows snapshots, status, PDF links, and only valid actions.
- Mark sent and mark paid update the UI and survive a reload.
- Invoice history lists all invoices and links to detail; empty states are
  useful.
- Project detail's Invoice action opens the new workspace.
- No route adds a second page-level scroll container.
- `npx tsc --noEmit` and `pnpm build` pass.

## Verification

1. `npx tsc --noEmit`
2. `pnpm build`
3. Manual smoke test at 375 px and desktop:
   - compose with all, some, and no items selected
   - edit an hour and a furniture row from the sidebar
   - generate, then confirm excluded rows are still pending
   - open the PDF, mark sent, mark paid
   - return to history and project detail
4. `git diff main...HEAD` review before merge.
5. Explicit user approval before merging.

There is no test/lint/CI setup in this repo, so manual verification and the
type/build checks are the definition of done.

## Risks

- **Stale source rows during composition:** another tab could edit or invoice a
  row between preview and generation. The server already rejects missing refs
  and the transaction aborts; the composer keeps the selection and shows the
  error so the user can refresh and retry.
- **Exclusions after edits:** the exclusion set is keyed by source id, so edits
  do not change keys. A deleted row leaves a harmless stale key, and the
  selected-row computation simply ignores it.
- **Query cache:** generated invoices and source edits invalidate project and
  invoice keys. The detail page seeds from the server, but mutations still
  invalidate so back/forward navigation does not show stale totals.
- **Date hydration:** rendered dates use UTC and a fixed locale to keep server
  and client markup identical.
- **Mobile keyboard:** the edit sheet uses `max-h-sheet` and safe-area padding;
  the sticky action bar sits above the inset and the workspace reserves space
  for it.
- **Legacy invoices:** phase 2 backfilled snapshots where source rows existed;
  invoices without them must render a legacy state rather than fail.
- **No automated tests:** rely on typecheck, build, and the manual flow above.

## Open questions

- URL-backed exclusions are deferred; local state is acceptable for now.
- Per-project payment terms remain deferred; the detail page shows the `dueAt`
  assigned when the invoice is sent.
- Search inside the composer sidebar is omitted until projects routinely have
  hundreds of pending rows.
