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
- `lib/repository/postgres.ts` — `PostgresProjectRepository`, `PostgresInvoiceRepository` implement the repository interfaces using Drizzle + pg.
- `lib/services/container.ts` — DI container. Singleton services wired to Postgres repos. Import `projectService` / `invoiceService` from here (server-only).
- `lib/services/projects.ts` — `ProjectService`: CRUD, log hours, add/update/delete furniture.
- `lib/services/invoices.ts` — `InvoiceService`: renders a PDF via `pdf-lib`, stores it through the `BlobStore`, persists the invoice record.
- `lib/validators/invoices.ts` — Zod schemas for invoice generation, project creation, hour/furniture logs.
- API routes: `app/api/projects/*`, `app/api/invoices/route.ts`, and `app/api/invoices/[invoiceId]/pdf/route.ts` — validate with Zod, delegate to services.

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
- Client UI state: React `useState` / `useReducer` in feature components.
- Forms: React Hook Form + Zod resolvers (`@hookform/resolvers`).

## Pages

- `/` — redirects to `/projects`
- `/projects` — project list (`ProjectsListClient`), create project via `ProjectOnboard`
- `/projects/[id]` — project detail (Server Component fetches, passes to `ProjectClient` → sub-views: `ProjectSummary`, `ProjectLog`, `ProjectStatus`, `ProjectInvoice`)

## Billing model

- Hours and furniture are billable items. `hour_entries.invoice_id` / `furniture_items.invoice_id` point at the invoice they were billed on; `null` means still pending.
- `lib/billing.ts` derives the pending rows and the invoice line items from the same source, so the grid and the invoice always agree.
- `outstanding` on a project is the total of its *uninvoiced* items.
- The invoice total is recomputed server-side from the line items; the client-sent total is advisory.

## Grids

- AG Grid Community (`ag-grid-react`, `ag-grid-community`). `components/features/projects/ProjectItemsGrid.tsx` is the wrapper (toolbar + data), `ProjectItemsGridInner.tsx` holds the grid itself and is loaded client-side only via `next/dynamic`.
- Always set `cellDataType` on columns. AG Grid infers it from the first row's value, so a column starting with a date renders later non-date values as blank.
- The AG Grid cell is `display: block` with a tall line-height, so cell renderers should use `absolute inset-0 flex items-center` to centre themselves.

## Styling

- Tailwind CSS v4 — no `tailwind.config.js`; design tokens as CSS variables in `app/globals.css` (`@theme inline`).
- Use `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`) for class merging.
- Icons from `lucide-react`.
- Path alias `@/*` → `./*`.

## Environment

- `.env.local` requires `DATABASE_URL`. Set `BLOB_DRIVER=local` for filesystem-backed invoice PDFs (stored in `.data/blobs/`). In production leave it unset (or set `vercel`); Vercel Blob needs `BLOB_READ_WRITE_TOKEN` or OIDC and private blob access. Do not commit real tokens.
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
