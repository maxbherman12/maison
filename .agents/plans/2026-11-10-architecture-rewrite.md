# Maison rewrite: one data path, sound billing data, smaller UI

**Status:** Approved (plan only; merge still needs separate approval).

## Context

Maison works, but it carries the marks of its prototype. I read all of the roughly 8,000 lines of application code. The layering looks reasonable on paper, but several parts are ceremony (one-implementation interfaces, pass-through services, a dead in-memory repository that production code imports its types from). Money is stored in a type that loses cents, every read travels two paths, and the same rules are written up to six times. With no users, the schema and architecture can change freely.

**Decisions made with you:** Server Components + Server Actions replace React Query and REST. A plain table replaces AG Grid. PDFs stay stored in blob storage. One branch, one commit per phase, one merge approval.

**What is already good and stays:** owner scoping by construction, the `BlobStore` port and drivers, the auth allowlist model, `proxy.ts`, the `AppShell` viewport model, the design tokens, derived invoice status.

## Evaluation: what is wrong today

### Bugs and data-integrity problems (all fixed by this plan)

| Problem | Where | Effect |
|---|---|---|
| Money and hours stored as `real` (4-byte float) | `lib/db/schema.ts` | Only about 7 significant digits, so large amounts lose cents, and sums drift |
| UI rounds to whole dollars, PDF shows cents | `formatMoney` in `lib/types/index.ts` | Invoice page says $151 where the PDF says $150.50 |
| PDF has no invoice number or date | `lib/services/invoices.ts` | Rendered before the number exists |
| PDF has no pagination | same | Roughly 25+ line items run off the page |
| Helvetica cannot encode emoji or CJK | same | One such title makes invoice generation fail with a 500 |
| Amounts read outside the transaction | `generateInvoice` | An edit between read and commit bills the old amount |
| Invoiced items can be edited or deleted | `updateFurniture`, `deleteFurniture`, hour equivalents | Board can delete a billed piece, leaving a dangling line item |
| Non-UUID ids reach Postgres | all `[id]` routes and pages | `/projects/abc` returns a 500, not a 404 |
| Plain `Error` thrown from services, and one route returns `error.message` | `services/projects.ts`, `hours/route.ts` | Validation failures become 500s, and internal messages can leak |
| Board uses raw `fetch` outside the cache | `FurnitureBoard.tsx` | Other pages show stale status for up to 5 minutes |
| Custom charge stored as an hour entry with `hours: 0` | `ProjectLog.tsx` | Shows as "Hours · 0 hrs" |
| Renaming a client leaves stored `initials` stale | `projects.initials` | Wrong avatar |
| Form date defaults use the UTC day | `toISOString().slice(0,10)` | US evening entries get tomorrow's date |
| Sign-in `next=/\evil.com` passes `safeRedirect` | `sign-in/page.tsx` | Open redirect |
| Furniture links unvalidated, `invoices.project_id` has no FK, child tables have no indexes | schema, validators | Bad URLs stored, integrity and lookups unenforced |
| Sheets have no focus trap or focus return | `components/ui/sheet.tsx` | Keyboard users can tab behind the modal |

### Structure and readability

- **Two read paths.** Pages load on the server, then components re-query through `lib/query` and REST. `*Client` wrappers exist only for that. `initialData` is ignored once a cache entry exists.
- **Layers without a job.** `ProjectService` is pass-through plus validation that repeats Zod. Repository interfaces live in `memory.ts`, 409 lines of dead code.
- **Rules repeated.** Furniture statuses are defined in 6 places, validation in up to 3 layers that disagree (zero hours, date format), and input types are written twice.
- **Dead code.** `markItemsInvoiced`, `listAll`, `computeOutstanding` (two copies), `Money`, `isOutstanding`, `buildInvoiceLineItems`, the `outstanding` and `color` columns, "legacy" invoice handling, placeholder assets.
- **Weak models.** `BillableRow` has `type: ''`, a `secondary` field meaning date or vendor, and a fake total row. Invoice numbers are text parsed with a regex. `paid` duplicates `paid_at`. `project.project` is an awkward name. Row key logic exists twice.
- **Oversized components.** `FurnitureBoard` is 612 lines and `ProjectSummary` 501, with effects that sync derived state. The furniture sheet and delete flow, the invoice document, and the furniture form are each duplicated.
- **Safety net off.** `ignoreBuildErrors: true`, and no `error.tsx`, `loading.tsx` or `not-found.tsx`.

## Target architecture

```
app/                 Server Components read through services. Only auth and PDF routes remain in app/api.
lib/actions/         'use server' mutations: session -> validate -> service -> revalidate -> ActionResult
lib/services/        Owner-bound business logic and Drizzle queries (replaces repository + service)
lib/invoices/pdf.ts  Pure PDF rendering
lib/storage/         Unchanged
lib/domain/          Pure and client-safe: money, dates, billing, furniture statuses, invoice status, types
lib/validators/      One Zod schema per form, shared by client and server
lib/db/              Schema and one fresh baseline migration
components/          ui/ primitives, layout/, features/
```

Dependencies run one way: `app` and `components` -> `actions` -> `services` -> `db`. Only `lib/services` and `lib/auth` import `db`.

### Data schema (fresh baseline)

- **Money is integer cents** (`*_cents`). All arithmetic is on integers, and formatting happens at the edge.
- **`projects`:** `hourly_rate_cents`, `address` not null default `''`. Drops `outstanding`, `color`, `initials`. Outstanding is a SQL aggregate, initials are derived. The domain field becomes `name`.
- **`charges`** replaces `hour_entries`: `title`, `date` (Postgres `date`), `hours numeric(7,2)` nullable, `amount_cents`, `invoice_id`. No hours means a flat custom charge, so no third table is needed.
- **`furniture_items`:** `*_cents`, `tags text[]`, `vendor`/`link`/`notes` not null default `''`, status as `pgEnum` built from the one list in `lib/domain/furniture.ts`.
- **`invoices`:** `number integer`, unique per owner and displayed as `#1042`. `total_cents`. `pathname` NOT NULL. Snapshots `client_name`, `project_name`, `address` so the page always matches the stored PDF. Drops `paid`. `project_id` gets an FK.
- **`invoice_line_items`:** `kind` (`hours`, `charge`, `furniture`), `source_id`, `title`, `amount_cents`, `position`.
- **Everywhere:** `timestamptz`, `CHECK` for non-negative amounts and positive hours, indexes on `project_id` and `invoice_id`, `invoice_id` FK `RESTRICT`.
- Billable references are plain UUIDs. They cannot collide across tables, so the `source:id` key logic disappears.
- Domain types derive from `$inferSelect`, which removes the hand-written mirrors and row mappers.

### Services

`getServices()` in `lib/services/index.ts` is the single authenticated entry point and redirects when there is no session. Its factory stays private, so owner scoping remains structural.

- `ProjectService`, `ChargeService`, `FurnitureService`, `InvoiceService`. Child writes are one atomic statement scoped with `inArray(table.projectId, ownedProjectIds)`, replacing the check-then-write and re-select pattern.
- `get` returns `null` for non-UUIDs, so bad URLs become 404s.
- Every expected failure is an `AppError`. Invoiced items are locked: only furniture status can change, everything else returns a 409.

**Invoice generation is one transaction:**

1. Take the per-owner advisory lock.
2. Select the requested pending items `FOR UPDATE`, and return a 409 if any are gone.
3. Compute the total and allocate `max(number) + 1` (first number stays 1042, as a named constant).
4. Insert the invoice and lines, and attach the items.
5. Render the complete PDF (number, date, bill-to, pagination, unsupported characters replaced).
6. Upload to `invoices/<ownerId>/<invoiceId>.pdf`, then commit.

An upload failure rolls everything back. If commit fails after upload, the blob is deleted best-effort. An invoice therefore exists exactly when its PDF does. The cost is one held connection during a brief upload, which is acceptable at this volume. Downloads are named `invoice-1042.pdf`.

### Actions and client

- Each action is a plain `export async function` taking `unknown` and parsing it, since actions are public POST endpoints. A small `runAction` helper maps `AppError` and `ZodError` to `{ ok: false, error }`, logs anything unexpected behind a generic message, lets Next's redirect errors through, and revalidates `/projects` on success.
- One `useAction()` hook gives forms `run`, `pending` and `error`, replacing about 380 lines of query hooks.
- Forms validate with the same schema as the action. The client sends raw form values and the server does the dollars-to-cents transform, so it happens exactly once.
- The board uses `useOptimistic` over server props, so manual rollback code goes away.
- `SessionProvider` shrinks to a small context. User-scoped query keys, cache clearing and the `/api/auth/get-session` dev shim are removed, along with `requireApiUser`.
- `lib/auth.ts` and `lib/auth-client.ts` move to `lib/auth/server.ts` and `client.ts`. `listAccounts` becomes one direct query behind `requireAdmin`.

### UI restructuring (same look and flows)

- **`PendingItemsTable`** replaces AG Grid: search, sortable headers, real links/buttons for keyboard, filtered total, mobile cards.
- **Split large components:** `FurnitureBoard` into board, column, card, mobile view. `ProjectSummary` into detail, edit form, invoices panel.
- **Extract duplicates:** `FurnitureDetailSheet` (sheet, move, delete confirm), `InvoiceDocument` (preview and detail), `ChargeFields` and `FurnitureFields` (log and edit), one summary tile.
- **Remove effects** that sync derived state. Store ids, derive objects.
- **Routing:** `/projects/new` replaces the in-page toggle. The project list uses `Link` rather than full-page `<a>` reloads. Add `error.tsx`, `loading.tsx`, `not-found.tsx`. A cached `getProjectOrNotFound` replaces the block repeated across 6 pages.
- **`Sheet`** rebuilt on the already-installed Base UI Dialog. Sign-in, admin and banner reuse `Alert` and tone tokens.
- **Money display:** two decimals on invoices and tables, whole dollars on summary tiles and cards.
- **Small behaviour changes to review:** flat charges display as "Charge". Invoiced furniture cannot be deleted from the board. Column filter menus and resize go away, as you chose.

### Housekeeping

Remove `ignoreBuildErrors`, `images.unoptimized`, `@tanstack/react-query`, both `ag-grid-*` packages, placeholder assets and v0 ignores. Rename the package to `maison`. Rename for clarity: `ProjectOnboard` to `NewProjectForm`, `InvoiceWorkspace` to `InvoiceComposer`, `InvoicesGrid` to `InvoicesTable`. Rewrite the Architecture, Data layer, State management and Grids sections of AGENTS.md.

## Alternatives rejected

- **Keep repositories behind interfaces.** One implementation and no tests means the seam buys nothing. Owner scoping is kept by the constructor.
- **`numeric(12,2)` for money.** Works, but values still become JS floats. Integer cents are exact throughout.
- **A separate `expenses` table.** Same shape as a charge without hours. Duplicates the invoice-attachment path for no gain.
- **Upload the PDF after commit.** A failed upload would leave a billed invoice with no PDF and need a retry path.

## Execution

Worktree via `treehouse get --lease --json -b architecture-rewrite`, then `pnpm install` and a copy of `.env.local`. The main checkout's `node_modules` is stale (`better-auth` is missing), so type-checking must happen in the worktree. Read the relevant guides in `node_modules/next/dist/docs/` first, especially `server-actions.md`, `revalidatePath.md` and `error-handling`.

The worktree uses a **new local database, `maison_rewrite`**, with `BLOB_DRIVER=local`, so `maison_dev` is not touched.

| Commit | Content |
|---|---|
| 1 | Plan doc |
| 2 | `lib/domain`, validators, schema, baseline migration |
| 3 | Services, invoice transaction, PDF renderer. Delete `lib/repository` |
| 4 | Actions, pages to Server Components, remove React Query and REST, session simplification |
| 5 | UI restructuring, `PendingItemsTable`, Base UI sheet, routing, error boundaries |
| 6 | Dependency and config cleanup, AGENTS.md |

The types change underneath the UI, so only the branch tip is guaranteed to build. Compatibility shims between commits would be throwaway code.

**Critical files:** `lib/db/schema.ts`, `lib/services/invoices.ts`, `lib/services/index.ts`, `lib/actions/*`, `lib/domain/*`, `lib/validators/*`, `components/features/**`, `components/ui/sheet.tsx`, `app/(app)/**`, `AGENTS.md`.

**Landing:** after your explicit merge approval. Production needs its database reset for the new baseline, since migrations are squashed. I will confirm that with you separately and will not run it unprompted.

## Verification

The repo has no test tooling and I will not add any. The evidence is:

1. `npx tsc --noEmit` and `pnpm build` pass, now with type errors failing the build.
2. `pnpm db:migrate` applies cleanly to an empty `maison_rewrite`.
3. Drive the real app with `IMPERSONATE_USER` at desktop and 375 px width:
   - Create and edit a project. Log hours, furniture and a flat charge. Edit and delete each.
   - Move furniture on the board and confirm the project page reflects it immediately.
   - Generate an invoice with cents, 30+ items, and an emoji title. Open the PDF and check number, date, pagination and totals against the page.
   - Mark sent, mark paid, and confirm an invoiced item can't be edited or deleted but its status can move.
   - Generate the same items from two tabs: exactly one succeeds, the other shows a conflict.
4. Confirm `/projects/abc` is a 404, `next=/\evil.com` goes to `/projects`, a second account cannot open the first's project, invoice or PDF, and admin impersonation and return still work.
5. Grep confirms no references remain to removed modules. Review with you via `git diff main...HEAD`.
