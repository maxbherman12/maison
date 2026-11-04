# Project detail simplification (roadmap Phase 4)

**Status:** Implemented in `feature/project-detail-simplification` (pending review)

**Date:** 2026-11-03

**Branch:** `feature/project-detail-simplification`

**Roadmap:** [2026-10-21-product-roadmap.md](./2026-10-21-product-roadmap.md), Phase 4

## Problem

Project detail still behaves like a collection of stacked mock views:

- Three summary cards repeat information already visible in the pending grid.
- A strip of furniture icons duplicates the board, only shows five items, and
  opens a dead modal whose save/delete buttons do not call the API.
- Pending rows are not actionable. Editing an hour or piece requires leaving the
  project page.
- Invoice history exists at `/projects/[id]/invoices` but is invisible from the
  project page.
- `ProjectDetail` keeps `summary` / `status` / `invoice` view state. The status
  and invoice views are unreachable from the current summary, and the old
  `ProjectInvoice` view has been replaced by the Phase 3 routes.
- Several components (`ProjectStatus`, `ProjectInvoice`, `HomeView`,
  `ProjectHeader`, `ProjectView`, `ProjectDetail`) no longer earn their place.

Phase 4 makes project detail a single, useful page: project heading and actions,
the pending-items grid, and invoice history.

## Desired outcome

- Project detail has no summary cards and no furniture icon strip.
- The pending grid is the primary content and its rows open the relevant item.
- A furniture row opens the board's `FurnitureSheet` for read/move/delete, with
  an Edit action that opens the shared `EditBillableItemSheet`.
- An hour row opens the shared `EditBillableItemSheet` for editing.
- Invoice history is visible below pending items, with status, total, dates, and
  links to invoice detail.
- The `Invoice` action opens the composer when pending work exists, otherwise
  invoice history.
- No dead view-switcher or duplicate detail components remain.
- The project edit form actually persists changes (small correctness fix while
  the summary is being consolidated).

## Approach

### 1. Data flow

`app/projects/[id]/page.tsx` already loads the project. It will also load
`invoiceService.listInvoices(project.id)` and pass both to `ProjectClient`.

`ProjectClient` seeds `useProject(project.id, project)` so the server data is
used immediately, then renders `ProjectSummary` directly. `ProjectSummary`
accepts `project` and initial `invoices`, and uses `useInvoices(project.id,
invoices)` for live updates after invoice lifecycle actions.

This removes `ProjectView` and `ProjectDetail`; there is no longer a client view
state between the page and the summary.

### 2. Summary layout

`ProjectSummary` keeps:

- Client eyebrow, project title, and project edit affordance.
- A compact action row: Log, Board, Invoice.
- The pending items grid.
- An invoice history section below it.

It drops:

- The three `StatCard`s.
- The furniture avatar strip and `selectedItem` modal.
- The old `FurnitureItemDetail` component.
- The `onStatus` prop and status branch.

The pending grid already reports the pending count and total. The invoice grid
reports invoice totals and dates. No replacement cards are added.

### 3. Actionable grid rows

`ProjectItemsGrid` gains `onOpenItem(row: BillableRow)` and passes it through to
`ProjectItemsGridInner`.

`ProjectItemsGridInner` gets three activation paths:

1. `onRowClicked` for pointer users.
2. `onCellKeyDown` for Enter/Space on a focused cell.
3. A pinned-right, focusable “Open” action cell with a chevron button and an
   accessible label. This is the visible affordance and the keyboard path that
   does not depend on AG Grid's cell navigation model.

All three paths ignore the pinned total row (`itemId` is empty). The row also
gets a pointer cursor via `getRowClass`.

`ProjectSummary` handles the row:

- **Furniture** → open `FurnitureSheet` for the item. The sheet already supports
  moving and deleting. Add an optional `onEdit` action that closes the detail
  sheet and opens `EditBillableItemSheet` for the same pending row.
- **Hours** → open `EditBillableItemSheet` directly. The shared sheet is both
  the detail and edit surface for hours.

Mutations use the existing hooks:

- Move: `useUpdateFurnitureStatus`
- Delete: `useDeleteFurniture`
- Edit: `useUpdateFurniture` / `useUpdateHourEntry` inside the shared sheet

Errors use a short fixed toast, matching the board's notice pattern. Successful
moves/deletes close the sheet; successful edits close themselves.

If a mutation removes the open row (for example, another tab invoices it), an
effect closes the stale sheet.

### 4. FurnitureSheet reuse

Add an optional `onEdit` prop to `FurnitureSheet`. When provided, render an
“Edit details” button above the delete action. The board does not pass it, so
the board's behavior is unchanged; project detail passes it.

The close button is bumped to the 44 px touch target used by the Phase 3 sheets.

### 5. Invoice history section

`ProjectSummary` renders, below the pending grid:

- A heading and “All invoices” link.
- `InvoicesGrid` with live invoices, project id, and an empty action.
- Empty action: “Create invoice” when pending rows exist, otherwise “Log work”.

`InvoicesGrid` already supports desktop tables, mobile cards, status badges,
and row links from Phase 3, so this is wiring rather than a new list.

### 6. Project edit form correctness

The current `ProjectEditForm` closes on save without calling the API. Since it
remains part of the simplified summary, wire it to `useUpdateProject`:

- Validate the hourly rate as a positive number.
- Trim text fields.
- Show the API error inline.
- Disable the save button while saving.
- Close only after a successful mutation.

This is a small fix in the same surface, not a separate feature.

### 7. Delete dead components

After rewiring imports, delete:

- `components/features/projects/ProjectDetail.tsx`
- `components/features/projects/ProjectView.tsx`
- `components/features/projects/ProjectStatus.tsx`
- `components/features/projects/ProjectInvoice.tsx`
- `components/features/projects/HomeView.tsx`
- `components/features/projects/ProjectHeader.tsx`

Update `AGENTS.md`'s Pages section and the roadmap status so they no longer
describe removed views.

## Alternatives considered

- **Keep the summary cards as a compact metric row.** Rejected: the request is
  to remove the cards, and a different card row would not simplify the page.
- **Keep the furniture icon strip as quick actions.** Rejected: it duplicates
  the board, only shows five items, and row clicks provide the requested path.
- **Keep `ProjectDetail` as a wrapper and remove only the status branch.**
  Rejected: a wrapper with no state or behavior adds a file and a hop without
  value. `ProjectSummary` can be rendered directly.
- **Open a read-only hour sheet and then a separate edit form.** Rejected:
  `EditBillableItemSheet` already presents the hour fields and persists through
  the Phase 2 hooks. A second sheet would duplicate the same surface.
- **Rely on AG Grid row clicks alone.** Rejected for accessibility: row clicks
  work for pointers but not keyboard users. Add an explicit action cell and
  `onCellKeyDown`.
- **Use AG Grid for invoice history.** Rejected: the list is small, and a
  semantic table/card layout is more readable and keeps the grid bundle scoped
  to the pending items.
- **Keep `ProjectStatus` for hour history.** Rejected: the pending grid plus
  invoice detail cover the current workflow; a dedicated ledger route can come
  later if needed.

## Files/modules affected

Changed:

- `app/projects/[id]/page.tsx`
- `components/features/projects/ProjectClient.tsx`
- `components/features/projects/ProjectSummary.tsx`
- `components/features/projects/ProjectItemsGrid.tsx`
- `components/features/projects/ProjectItemsGridInner.tsx`
- `components/features/furniture/FurnitureSheet.tsx`
- `AGENTS.md`
- `.agents/plans/2026-10-21-product-roadmap.md`

Deleted:

- `components/features/projects/ProjectDetail.tsx`
- `components/features/projects/ProjectView.tsx`
- `components/features/projects/ProjectStatus.tsx`
- `components/features/projects/ProjectInvoice.tsx`
- `components/features/projects/HomeView.tsx`
- `components/features/projects/ProjectHeader.tsx`

Reused:

- `components/features/invoices/InvoicesGrid.tsx`
- `components/features/invoices/EditBillableItemSheet.tsx`
- `lib/query/invoices.ts`
- `lib/query/projects.ts`
- `lib/billing.ts`

## Acceptance criteria

- Project detail has no summary cards and no furniture icon strip.
- Clicking a furniture row opens `FurnitureSheet`; Edit opens
  `EditBillableItemSheet`; move/delete persist and refresh the page.
- Clicking an hour row opens the hour edit sheet; saving persists and refreshes
  the pending grid.
- The grid has a visible, focusable Open action and Enter/Space activation.
- Invoice history is visible below pending items, including status, total, due
  and paid dates; each row opens invoice detail.
- The empty invoice state offers “Create invoice” when pending work exists.
- The Invoice action opens `/new` with pending work, otherwise `/invoices`.
- No dead view-switcher or duplicate detail components remain.
- Project edit saves through the API and reports errors.
- `npx tsc --noEmit` and `pnpm build` pass.
- `git diff main...HEAD` contains no generated build artifacts.

## Verification

1. `npx tsc --noEmit`
2. `pnpm build`
3. Smoke test against a throwaway Postgres database:
   - project detail renders with no summary cards and no furniture icon strip
   - pending grid renders rows and invoice history empty state
   - generate an invoice and confirm the history section updates
   - update a furniture status through the API and confirm the page reflects it
   - update an hour/furniture record and confirm the pending grid updates
   - confirm invoice detail links and empty states
4. Review `git diff main...HEAD` and `git status`.
5. Wait for explicit approval before merging.

Client-side click/keyboard interactions are type-checked and server-rendered
where possible; a real browser pass is still useful because this repo has no
automated UI tests.

## Risks

- **AG Grid event overlap:** row click and the Open cell can both fire. Both
  handlers are idempotent and ignore the pinned total row.
- **Keyboard focus in AG Grid:** the custom button is a real `<button>`; the
  cell key handler is a fallback. Both are covered by the acceptance criteria.
- **Furniture row visibility:** only pending furniture appears in the pending
  grid. Invoiced furniture stays on the board; the page copy should make the
  board the full furniture view.
- **Query invalidation:** edits and lifecycle actions already invalidate project
  and invoice keys. The project page seeds queries from server data, so the
  first render is stable and later mutations refresh it.
- **Deleting components:** verify no remaining imports before removal; the build
  will catch a missed reference.
- **No automated UI tests:** rely on typecheck, build, and the manual flow above.
