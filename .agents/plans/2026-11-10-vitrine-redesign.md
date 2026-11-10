# Vitrine redesign

**Status:** Approved direction (prototype reviewed over three rounds). Merge still needs explicit approval.

## Problem

The app works but looks generic, and most screens need scrolling on a phone. Most users are non-technical and log time from their phones on site. The aesthetic is central to the product, since the users are interior designers.

## Outcome

The approved "Vitrine" prototype, built on the real architecture:

- White gallery look: Italiana for names and amounts, Jost for everything else, square corners.
- Each client owns a paint color. It appears as a chip in the client list and as a painted wall at the top of the project.
- The core of every phone screen fits without page scrolling. Only a long list scrolls, inside its own panel.
- Desktop shows clients on the left and the open project across the rest, with all three lists visible.
- A one-question-at-a-time Log flow for time, furniture, and other charges.
- Tap any entry to edit or delete it. Tap a furniture status to pick from the four stages.
- A new Earnings page, reached from a main menu that has room for more pages.

## Approach

**Routes stay routes.** Each flow keeps a URL, so the phone's back gesture and deep links work.

`/projects/[id]/layout.tsx` renders the project overview, and flow pages render as its children inside `FlowPanel`, a Base UI dialog that is full screen on phones and a right-hand drawer on desktop. The overview stays mounted behind a flow, so tab state survives and closing is instant.

`/projects/layout.tsx` renders the desktop client sidebar. On phones `/projects` shows the list instead. On desktop it shows the first project.

**One rule for phone chrome.** `AppHeader` and the bottom `AppNav` hide on phones under `/projects/*`, where the painted wall takes over. `AppShell` still owns the frame.

**Paint.** A single `lib/domain/paints.ts` list drives the `paint` Postgres enum, the validator, and the picker. `paintStyle()` overrides `--primary` and `--primary-foreground` on a wrapper, so existing `bg-primary` buttons take the client's color with no new variants.

**Each item appears once.** Project tabs are Time, Furniture, and Invoices. A furniture row states whether it still needs invoicing.

**Earnings.** `InvoiceService.paidSince()` returns paid invoices and pure `buildEarningsMonths()` in `lib/domain/earnings.ts` groups them, following the existing domain/service split.

**Invoices.** The app has no email sending, so the prototype's "Send invoice" becomes "Create invoice", followed by Download PDF and the existing Mark sent step. The screen must not claim a client received anything.

**Removed as replaced by the design:** the furniture board and `@dnd-kit`, the invoice index page, the pending-items table with search and sort, and the composer's Preview/Items tabs.

## Alternatives rejected

- **All flows as client state inside one page, as in the prototype.** Rejected: loses URLs and the phone back gesture, and needs its own navigation stack.
- **Intercepting/parallel routes for the drawer.** Rejected: more moving parts than a nested layout, for the same result.
- **Deriving client color from a hash of the id.** Rejected: designers could not choose it, and the picker is part of the approved design.
- **Two separate phone and desktop component trees.** Rejected: one tree with responsive classes is less code and cannot drift.

## Files affected

- `lib/domain/paints.ts`, `lib/domain/earnings.ts`, `lib/domain/furniture.ts` (labels)
- `lib/db/schema.ts` plus migration; `lib/validators/{projects,furniture}.ts`
- `lib/services/{charges,furniture,invoices}.ts`, `lib/actions/{charges,furniture}.ts` (return new ids for Undo/Edit)
- `app/globals.css`, `app/layout.tsx`, `proxy.ts`
- `app/(app)/projects/**`, new `app/(app)/earnings/page.tsx`
- `components/layout/*`, `components/ui/*` restyle, `components/features/{projects,invoices,furniture,billing}/*`
- `lib/invoices/pdf.ts` is unchanged; it is already neutral ink.
- `AGENTS.md` pages, layout, and tables sections

## Acceptance

- `npx tsc --noEmit` and `pnpm build` pass.
- Against a local database at phone and desktop sizes: create a project, log time, furniture, and a charge, edit and delete an entry, change a status, create an invoice, mark it sent and paid, and see it on Earnings.
- The clients page, a project, and each Log step have no page scroll at 390×664.

## Risks and open questions

- Existing projects all start as Verdigris; the owner can change each under Edit project.
- Removing the board is a feature cut. The Furniture tab covers status and details.
