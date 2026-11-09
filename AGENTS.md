# maison

Interior-design project management app. Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, pnpm. Tracks clients, billable hours, furniture purchases, and generates PDF invoices.

## Feature workflow (required)

Every feature follows this sequence, in order. Do not skip a step, and never commit, push, or merge feature work into `main` yourself.

1. **Plan first.** Write a detailed plan before touching code: the problem, the proposed approach, at least one alternative considered and why it was rejected, and the files/modules affected. Optimize for clean code, extensibility, and simplicity — not the fastest patch. Store it in `.agents/plans/YYYY-MM-DD-<slug>.md` (see `.agents/plans/README.md`).
2. **Build in a worktree.** All implementation happens in a treehouse worktree on its own branch (see below), never in the main checkout.
3. **Review collaboratively.** When the work is done, walk the user through the changes (`git diff main...HEAD`, `git status`) and iterate on their feedback. Fix issues in the worktree.
4. **Wait for explicit approval.** Merging into `main` requires the user's explicit approval of *that* feature. Approval of a plan or of a review pass is not merge approval, and approval never carries over to another feature.
5. **Land and clean up.** Only after approval: merge into `main`, then return the worktree (`treehouse return <path>`) and delete the branch (`git branch -d <branch>`). Confirm the pool with `treehouse status`.

If you discover feature work already sitting on `main` or uncommitted in the main checkout, stop and ask before committing, merging, or discarding it.

## Worktrees (required)

All feature work happens in a treehouse worktree.
- Detect: `git rev-parse --git-dir` vs `--git-common-dir` differ inside a worktree.
- Main checkout: `treehouse get --lease --json`, then move into the printed `path` (add `-b <branch>`; default is detached HEAD). Fresh worktrees need `pnpm install` + a copy of `.env.local`.
- Already in a worktree: stay there; acquire another only if instructed, and ask if unclear.
- Done: `treehouse return <path>`. Pool: `treehouse status`; protect a slot: `treehouse lease <name>`.

## Architecture (layered)

```
app/              → Next.js App Router (pages + API routes)
lib/services/     → business logic (ProjectService, InvoiceService)
lib/repository/   → data access (PostgresProjectRepository, PostgresInvoiceRepository)
lib/storage/      → blob storage port + local/Vercel drivers
lib/db/           → Drizzle schema + Postgres client
lib/types/        → domain types + shared helpers
lib/validators/   → Zod schemas
lib/billing.ts     → billable ("pending") rows shared by the grid and the invoice flow
lib/query/        → React Query hooks (calls API routes via fetch)
components/ui/    → shadcn base primitives
components/features/ → feature-specific client components
```

## Commands

- `pnpm dev` — dev server (Turbo)
- `pnpm build` — production build (`next build`)
- `pnpm start` — production server
- `npx tsc --noEmit` — type check (build skips type validation: `ignoreBuildErrors: true` in `next.config.mjs`)
- `pnpm db:generate` — generate Drizzle migration from schema
- `pnpm db:migrate` — run Drizzle migrations against the database
- `pnpm db:studio` — open Drizzle Studio (local DB GUI)

No test, lint, or format scripts exist.

## Package manager

- `pnpm` (lockfile: `pnpm-lock.yaml`). `package.json` pins `packageManager: pnpm@12.3.4`.
- `node_modules` not committed; install before running.

## Data layer

- PostgreSQL via Drizzle ORM. Schema in `lib/db/schema.ts`, client in `lib/db/client.ts`.
- Every primary key and row-reference column is a Postgres `uuid`. Domain inserts use `crypto.randomUUID()`; Better Auth is configured with `advanced.database.generateId: 'uuid'`.
- `lib/db/client.ts` caps the `pg` pool at 5 connections per instance and attaches it to the Vercel runtime lifecycle (`attachDatabasePool`), so idle instances release connections before they suspend. The pool is cached on `globalThis` in development so hot reloads reuse it.
- `lib/repository/postgres.ts` — `PostgresProjectRepository`, `PostgresInvoiceRepository` implement the repository interfaces using Drizzle + pg.
- `lib/services/container.ts` — authenticated service entry points. `getPageServices()` (pages/Server Components) redirects to sign-in, `getApiServices()` (route handlers) throws `AppError(401)`. Both build repositories/services bound to the session user; raw owner-id construction is private.
- `lib/services/projects.ts` — `ProjectService`: CRUD, log hours, add/update/delete furniture.
- `lib/services/invoices.ts` — `InvoiceService`: renders a PDF via `pdf-lib`, stores it through the `BlobStore`, persists the invoice record.
- `lib/validators/invoices.ts` — Zod schemas for invoice generation, project creation, hour/furniture logs.
- API routes: `app/api/projects/*`, `app/api/invoices/route.ts`, and `app/api/invoices/[invoiceId]/pdf/route.ts` — validate with Zod, delegate to services.

## Authentication and accounts

- Better Auth (v1.7) with the Google provider. Users, sessions, and accounts live in the same Postgres (`lib/db/auth-schema.ts`).
- `ALLOWED_EMAILS` is the admission boundary: comma-separated, case-insensitive, **fail-closed**. An unknown Google account cannot create a user.
- `lib/auth/session.ts` — `requireUser()` for pages, `requireApiUser()` for route handlers (throws `AppError(401)`), `requireAdmin()` for `/admin`.
- `proxy.ts` only checks that a session cookie exists for page routes (or that the development-only `IMPERSONATE_USER` switch is active). Every route handler and page verifies the real session and re-checks the allowlist, so removing an email locks out an existing cookie on its next request.
- Data is isolated per account. `projects.owner_id` and `invoices.owner_id` are `NOT NULL`; `hour_entries` and `furniture_items` inherit ownership through their project. Repositories take `ownerId` in the constructor, so there is no unscoped query path. Never build services with a client-supplied id.
- Invoice numbers are per account: the advisory lock key is `invoice_number:<ownerId>` and the unique index is `(owner_id, number)`.
- Admin access is the `role` column on `user` (`admin`), and that column is the only source of truth. Set it directly in Postgres for now; the change takes effect on the next request. Admins can impersonate non-admin accounts for up to one hour from `/admin`; impersonation swaps the session identity, so it still goes through the owner-scoped repositories. The banner in `app/(app)/layout.tsx` is the way back.
- There is no `legacy-owner` placeholder. The auth migration is a clean UUID baseline; an older database must be reset, not backfilled.
- Google Cloud setup: External consent screen, publish it (basic scopes need no review), redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://<domain>/api/auth/callback/google`.

## Blob storage

- `lib/storage/blob-store.ts` defines the `BlobStore` port (`put`, `get`, `delete`). Services depend on this, not on a vendor SDK.
- `lib/storage/local.ts` writes to `.data/blobs/` (override with `LOCAL_BLOB_DIR`). Used when `BLOB_DRIVER=local`.
- `lib/storage/vercel.ts` uses private `@vercel/blob` blobs. Used when `BLOB_DRIVER=vercel` or unset.
- `lib/storage/index.ts` selects the driver; unknown values throw at startup.
- Invoice PDFs are served by `GET /api/invoices/[invoiceId]/pdf`. Never expose a blob pathname or URL to the browser.
- `.data/` is gitignored.

## Local database setup

1. PostgreSQL must be running (Homebrew `postgresql@16` or Docker).
2. Create the database: `createdb maison_dev`
3. Copy `.env.local` and set `DATABASE_URL=postgresql://<user>@localhost:5432/maison_dev` plus `BLOB_DRIVER=local`.
4. Run migrations: `pnpm db:generate` then `pnpm db:migrate`
5. Start dev server: `pnpm dev`

## State management

- Server state: React Query (`@tanstack/react-query`). Hooks call API routes via `fetch`.
- Query keys are scoped to the signed-in user with `userScopedKey(userId, ...)` from `lib/query/session.ts`. `SessionProvider` clears the query cache whenever the session identity changes, so impersonation or account switching cannot reuse another account's cached data.
- Client UI state: React `useState` / `useReducer` in feature components.
- Forms: React Hook Form + Zod resolvers (`@hookform/resolvers`).

## Pages

- `app/(app)/` — authenticated routes, wrapped by a layout that verifies the session.
- `app/(auth)/sign-in` — public Google sign-in page.
- `/` — redirects to `/projects`
- `/projects` — project list (`ProjectsListClient`), create project via `ProjectOnboard`
- `/projects/[id]` — project detail (Server Component fetches project + invoice history, passes to `ProjectClient` → `ProjectSummary`). The page fills the viewport and switches between **Pending** and **Invoices** tabs; only the active panel is mounted.
- `/projects/[id]/log` — log hours and furniture
- `/projects/[id]/board` — furniture board
- `/projects/[id]/invoices` — invoice ledger with a compact summary strip and an internally scrolling list
- `/projects/[id]/invoices/new` — invoice composer; preview and item panels scroll independently, with the total/generate footer outside both
- `/projects/[id]/invoices/[invoiceId]` — invoice detail; the document scrolls inside its own panel

## Layout and scrolling

- `AppShell` / `ProjectShell` render the app's single `<main>`. By default `<main>` scrolls.
- Pass `fill` to `AppShell` / `ProjectShell` for viewport-first routes. The shell then makes `<main>` a non-scrolling flex column; the route must build a `min-h-0` flex chain and own its inner scroll regions.
- `fill` is used by project detail, invoice index, composer, and invoice detail. Forms, the board, and the project list keep the default page scroll.
- Do not repeat the app-header title as a page `<h1>` on viewport-first routes.
- Use `overflow-y-auto overscroll-contain` only on the panel that genuinely needs to scroll. Do not add full-height page wrappers; the shell owns the viewport.

## Billing model

- Hours and furniture are billable items. `hour_entries.invoice_id` / `furniture_items.invoice_id` point at the invoice they were billed on; `null` means still pending.
- `lib/billing.ts` derives the pending rows and the invoice line items from the same source, so the grid and the invoice always agree.
- `outstanding` on a project is the total of its *uninvoiced* items.
- The invoice total is recomputed server-side from the line items; the client-sent total is advisory.

## Grids

- AG Grid Community (`ag-grid-react`, `ag-grid-community`). `components/features/projects/ProjectItemsGrid.tsx` is the wrapper (toolbar + data), `ProjectItemsGridInner.tsx` holds the grid itself and is loaded client-side only via `next/dynamic`.
- Always set `cellDataType` on columns. AG Grid infers it from the first row's value, so a column starting with a date renders later non-date values as blank.
- The AG Grid cell is `display: block` with a tall line-height, so cell renderers should use `absolute inset-0 flex items-center` to centre themselves.
- Pending rows are actionable: row click, Enter/Space, and the pinned Open cell all call `onOpenItem`; the pinned total row is ignored.
- `ProjectItemsGrid` accepts `fill`. In fill mode the grid sizes to its rows up to the available height (`maxHeight: 100%`) and scrolls its own rows; the pinned total stays at the grid bottom. Keep every ancestor in the flex chain `min-h-0`.
- Compact mobile columns are tuned to fit 375–390 px without horizontal clipping. Re-check the Type, Description, Amount, and pinned Open widths together when changing one.
- `InvoicesGrid` accepts `compact` for tighter empty states and `fill` when it should own its list scroll. The project detail Invoices tab keeps its own scroll container around the non-fill grid.

## Styling

- Tailwind CSS v4 — no `tailwind.config.js`; design tokens as CSS variables in `app/globals.css` (`@theme inline`).
- Use `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`) for class merging.
- Icons from `lucide-react`.
- Path alias `@/*` → `./*`.

## Environment

- `.env.local` requires `DATABASE_URL`. Set `BLOB_DRIVER=local` for filesystem-backed invoice PDFs (stored in `.data/blobs/`). In production leave it unset (or set `vercel`); Vercel Blob needs `BLOB_READ_WRITE_TOKEN` or OIDC and private blob access. Do not commit real tokens.
- Development-only auth bypass: set `IMPERSONATE_USER=<user uuid>` in `.env.local` and restart `pnpm dev` to act as that account without Google OAuth. Find UUIDs with `select id, email from "user";`. The variable is ignored in production; remove it (and restart) to return to Google sign-in. While active, Better Auth's admin impersonation endpoints are read-only/unavailable and sign-out is a no-op.
- Auth also requires `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ALLOWED_EMAILS`. After the first sign-in, set `user.role = 'admin'` in Postgres. Set `BETTER_AUTH_URL` to the production origin; leave it unset on Preview so Better Auth infers the host.
- `.gitignore` excludes `node_modules`, `.next/`, `.vercel/`, `.data/`, `.env*.local`, v0 internals, `tsconfig.tsbuildinfo`.

## Version control

- Git initialized. Remote: `origin` (github.com/maxbherman12/maison).
- `main` is the integration branch. It only receives work through an approved feature branch — no direct commits, and no merging without the user's explicit approval (see Feature workflow).

## What to skip

- No tests, lint, CI, pre-commit, codegen exist. Do not invent commands for them.
- `Untitled` file at root was a placeholder; it has been removed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
