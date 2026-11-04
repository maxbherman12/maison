# Viewport-first route layouts (Phase 4 review correction)

**Status:** Done — merged to `main` via fast-forward to `c4ded72` (2026-11-04)

**Date:** 2026-11-03

**Branch:** `feature/project-detail-simplification`

**Related:** [2026-10-22-native-app-shell.md](./2026-10-22-native-app-shell.md), [2026-11-03-project-detail-simplification.md](./2026-11-03-project-detail-simplification.md)

## Problem

Phase 1 established one app shell with one scrolling `<main>`, but it did not
require page content to fit that shell. Phase 3 and Phase 4 then stacked more
content vertically:

- Project detail is 961 px tall on a 390 x 844 mobile viewport and 912 px on a
  1440 x 900 desktop viewport. The invoice section falls below the fold.
- The invoice index stacks three large summary cards on mobile, pushing the
  actual invoice list far below the fold.
- The invoice composer is 1232 px tall on mobile and 995 px on desktop. The
  sticky action bar covers the preview instead of belonging to the layout.
- Invoice detail repeats the app header title and compresses the document with
  stat cards and action rows, so long invoices require page scrolling.
- Invoice pages repeat the project name/title and “Invoice history” links that
  already exist in the app header.

This contradicts the Phase 1 mandate: one clean view, app-like navigation, no
competing page chrome. The shell should own the viewport; routes should decide
what fills it.

## Approach

### 1. Add an explicit fill mode to the shell

`AppShell` and `ProjectShell` gain a `fill` prop.

- **Default:** current behavior. `<main>` scrolls when a form or document needs
  it.
- **Fill:** `<main>` is a flex column with `overflow-hidden`; the content wrapper
  is `flex min-h-0 flex-1 flex-col`. Children can use the available height and
  own their internal scroll regions.

This keeps the Phase 1 single-shell model and avoids per-route `h-screen`
wrappers.

### 2. Project detail: one page, two focused tabs

Project detail becomes a full-height view with no page scroll:

- The app header owns the project title. The content starts with a compact
  client line, edit action, and three actions (Log, Board, Invoice).
- Replace the stacked “Pending items” and “Invoices” sections with a segmented
  control: **Pending** and **Invoices**, both with counts.
- Only the active panel is rendered. It fills the remaining height.
- Pending uses the existing AG Grid in fill mode. The grid scrolls internally
  when rows exceed the panel; the page does not.
- Invoices shows a compact history header and the invoice list in an internal
  scroll region.
- The “Invoice” action opens the composer when pending work exists. With no
  pending work it switches to the Invoices tab.
- Remove the duplicate page `<h1>` and redundant “All invoices” link; the tab is
  the history.

### 3. ProjectItemsGrid fill mode

`ProjectItemsGrid` and `ProjectItemsGridInner` gain an optional `fill` prop.

- `ProjectItemsGrid` becomes a flex column with a compact search row and a
  `min-h-0 flex-1` grid region.
- The fixed row-count height calculation remains for non-fill use.
- In fill mode, AG Grid gets `height: 100%` and scrolls its own rows. The pinned
  total row stays pinned to the grid bottom.
- The duplicate “Pending items” heading/count copy is removed from inside the
  tab; the tab label carries the count.

### 4. Invoice index: a compact ledger

The invoice index keeps its own route but fits one view:

- Remove the duplicate `<h1>`; the app header already says Invoices.
- Replace three stacked cards with one compact three-column summary strip.
- Keep “New invoice” visible in the content toolbar.
- The invoice list or empty state fills the remaining height and scrolls
  internally. Empty states become compact rather than a large dashed panel.
- `InvoicesGrid` gains a `compact` option for empty states used inside a
  viewport panel.

### 5. Composer: panels, not a tall page

`InvoiceWorkspace` becomes a flex column:

- Header: no duplicated “New invoice” title or “Invoice history” link. The app
  header already owns both.
- Mobile: the existing Preview/Items tabs remain, but the active panel is the
  only visible panel and scrolls internally.
- Desktop: preview and item sidebar sit side by side, each scrolling
  independently inside the content height.
- The “Included” total and Generate action become a flex footer in the layout,
  not a sticky overlay. The page never scrolls behind it.
- Empty and error states stay compact.
- Reduce preview/card padding slightly so more of the document is visible
  without scrolling; the document itself remains scrollable.

### 6. Invoice detail: document viewer

Invoice detail becomes a full-height viewer:

- Remove the duplicate invoice-number `<h1>`; the app header owns it.
- Put status, issue date, lifecycle action, and PDF actions in one compact
  toolbar.
- Replace four stat cards with one compact strip (2 x 2 on mobile, 4 across on
  desktop).
- The invoice document fills the remaining height and scrolls internally.
- Remove the separate lower PDF action row.

### 7. Documentation

Update the Phase 4 plan, roadmap status, and `AGENTS.md` so the shell’s fill
mode and viewport-first routing are documented.

## Alternatives considered

- **Reduce vertical padding and keep page scrolling.** Rejected: it helps the
  current sample data but any longer list or invoice still scrolls the page.
- **Make every route `overflow-hidden` globally.** Rejected: forms and long
  documents legitimately need scrolling; the shell should opt in per route.
- **Keep invoices below pending items on project detail.** Rejected: two
  full-width sections always compete for height and force page scrolling.
- **Move invoice history into a sheet/drawer.** Rejected: a tab is one tap,
  keeps the history visible, and avoids a new modal surface.
- **Separate routes for the project detail tabs.** Rejected: increases
  navigation and adds URL state for what is a local view choice.
- **Keep a sticky overlay footer in the composer.** Rejected: it covers the
  preview and makes the scroll height dishonest. A flex footer owns its space.
- **Use AG Grid for invoice history.** Rejected in Phase 4 and still rejected:
  the list is small, semantic tables/cards are cleaner.

## Files/modules affected

Changed:

- `components/layout/AppShell.tsx`
- `components/layout/ProjectShell.tsx`
- `components/features/projects/ProjectSummary.tsx`
- `components/features/projects/ProjectItemsGrid.tsx`
- `components/features/projects/ProjectItemsGridInner.tsx`
- `components/features/invoices/InvoiceIndex.tsx`
- `components/features/invoices/InvoicesGrid.tsx`
- `components/features/invoices/InvoiceWorkspace.tsx`
- `components/features/invoices/InvoicePreview.tsx`
- `components/features/invoices/InvoiceItemSidebar.tsx`
- `components/features/invoices/InvoiceDetail.tsx`
- `app/projects/[id]/page.tsx`
- `app/projects/[id]/invoices/page.tsx`
- `app/projects/[id]/invoices/new/page.tsx`
- `app/projects/[id]/invoices/[invoiceId]/page.tsx`
- `AGENTS.md`
- `.agents/plans/2026-10-21-product-roadmap.md`
- `.agents/plans/2026-11-03-project-detail-simplification.md`

No data-layer, API, validator, or dependency changes.

## Acceptance criteria

- `/projects/[id]` has no page-level vertical scroll at 390 x 844 or
  1440 x 900; the active tab panel owns any internal scroll.
- `/projects/[id]/invoices` has no page-level vertical scroll; the invoice list
  or empty state fits the remaining height.
- `/projects/[id]/invoices/new` has no page-level vertical scroll; preview,
  item list, and footer each own their space.
- `/projects/[id]/invoices/[invoiceId]` has no page-level vertical scroll; the
  document scrolls inside its own panel.
- App-header titles are not repeated as page `<h1>`s on these routes.
- Project detail exposes Pending and Invoices in one tap, with counts.
- Composer footer is always visible and never covers the preview.
- Empty states and summary strips remain readable at 375–390 px.
- `document.documentElement.scrollHeight === window.innerHeight`; only
  designated inner panels scroll.
- `npx tsc --noEmit` and `pnpm build` pass.
- `git diff main...HEAD` contains no generated build artifacts.

## Verification

1. Use Chrome DevTools emulation at 390 x 844 and 1440 x 900.
2. Measure `documentElement.scrollHeight`, `<main>` dimensions, and
   `main.scrollHeight` for each affected route.
3. Confirm only the intended inner panel scrolls.
4. Capture screenshots of project detail (both tabs), invoice index, composer
   (both mobile tabs), and invoice detail.
5. Test with a long pending list and multiple invoices using a throwaway
   Postgres database.
6. `npx tsc --noEmit`
7. `pnpm build`
8. Review `git diff main...HEAD` and wait for explicit approval before merge.

## Verification results (2026-11-03)

Chrome DevTools emulation, measured from `document.documentElement` and
`[data-app-scroll]`:

- **390 x 844:** `/projects/[id]`, `/projects/[id]/invoices`,
  `/projects/[id]/invoices/new`, and
  `/projects/[id]/invoices/[invoiceId]` all report
  `documentElement.scrollHeight === 844` and
  `main.scrollHeight === main.clientHeight`.
- **1440 x 900:** the same routes report
  `documentElement.scrollHeight === 900` and
  `main.scrollHeight === main.clientHeight`.
- **375 x 667:** the same routes report
  `documentElement.scrollHeight === 667` and
  `main.scrollHeight === main.clientHeight`.
- The composer preview panel scrolls internally (953 px of content in a 580 px
  mobile panel) while the footer stays visible.
- Invoice detail scrolls the document article internally (645 px of content in a
  549 px mobile panel).
- A temporary project with 22 pending rows verified that the pending grid keeps
  the page fixed and scrolls its own rows; the pinned total stays at the grid
  bottom.
- Screenshots captured for both project tabs, invoice index, composer preview
  and items tabs, and invoice detail at mobile and desktop sizes.

Static checks: `npx tsc --noEmit` and `pnpm build` pass. The temporary project,
invoices, and blobs used for the long-list check were removed afterward.

## Risks

- **Internal scroll traps:** fill pages intentionally use inner scroll regions.
  Keep overscroll contained and avoid nesting scroll areas where possible.
- **AG Grid fill:** AG Grid needs a parent with an explicit height; the flex
  chain must include `min-h-0` at every level.
- **Mobile keyboard:** the composer footer and panels use `dvh`-aware shell
  height; test with a focused sheet input.
- **Short viewports:** tabs/toolbars must shrink; panels scroll rather than
  clipping actions.
- **Route-level state:** tab state is local and resets on navigation. That is
  acceptable; the default tab is chosen from pending work.
- **No automated UI tests:** rely on CDP measurements, screenshots, typecheck,
  build, and a browser pass.
