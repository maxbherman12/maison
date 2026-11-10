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
app/                 → Next.js App Router. Server Components read through services. Only auth and the invoice PDF remain in app/api.
lib/actions/         → 'use server' mutations: session → validate → service → revalidate → ActionResult
lib/services/        → owner-bound business logic and Drizzle queries
lib/invoices/pdf.ts  → invoice PDF rendering
lib/storage/         → blob storage port + local/Vercel drivers
lib/domain/          → pure, client-safe logic: money, dates, billing, furniture statuses, invoice status, types
lib/validators/      → Zod schemas, one per form, shared by client and server
lib/db/              → Drizzle schema + Postgres client
lib/auth/            → Better Auth server/client, session helpers, allowlist
components/ui/       → base primitives
components/layout/   → AppShell, AppHeader, AppNav, FlowPanel, Confirmation
components/features/ → feature components
```

Dependencies run one way: `app` and `components` → `actions` → `services` → `db`. Only `lib/services` and `lib/auth` import `db`.

## Commands

- `pnpm dev` — dev server (Turbo)
- `pnpm build` — production build (`next build`); type errors fail it
- `pnpm start` — production server
- `npx tsc --noEmit` — type check
- `pnpm db:generate` — generate Drizzle migration from schema
- `pnpm db:migrate` — run Drizzle migrations against the database
- `pnpm db:studio` — open Drizzle Studio (local DB GUI)

No test, lint, or format scripts exist.

## Package manager

- `pnpm` (lockfile: `pnpm-lock.yaml`). `package.json` pins `packageManager: pnpm@12.3.4`.
- `node_modules` not committed; install before running.

## Data layer

- PostgreSQL via Drizzle ORM. Schema in `lib/db/schema.ts` (auth tables in `lib/db/auth-schema.ts`), client in `lib/db/client.ts`.
- **Money is integer cents** (`*_cents`). Dollars exist only in form inputs and formatters (`lib/domain/money.ts`). Never do arithmetic on dollars.
- Every primary key and row-reference column is a Postgres `uuid`. Better Auth is configured with `advanced.database.generateId: 'uuid'`.
- Domain types derive from the schema with `$inferSelect` in `lib/domain/types.ts`. `Invoice` omits `pathname` and `ownerId`; never select them into anything sent to the browser.
- `lib/db/client.ts` caps the `pg` pool at 5 connections per instance and attaches it to the Vercel runtime lifecycle (`attachDatabasePool`). The pool is cached on `globalThis` in development.
- `lib/services/index.ts` — `getServices()` is the single authenticated entry point and redirects to sign-in without a session. The factory behind it is private, so an owner id can only come from the session.
- Services (`ProjectService`, `ChargeService`, `FurnitureService`, `InvoiceService`) take `ownerId` in the constructor. Writes to charges and furniture are one statement scoped by the `ownedProjectIds` subquery in `lib/services/scope.ts`. Throw `AppError` for every expected failure.
- `lib/actions/*` — each action takes `unknown`, parses with a Zod schema, and runs inside `runAction`, which maps `AppError`/`ZodError` to `{ ok: false, error }`, hides anything unexpected, and revalidates the app.
- `lib/validators/*` — one schema per form, used by the browser resolver (`raw: true`) and the action. Numeric inputs are strings; the dollars-to-cents transform runs only in the action's parse.

## Authentication and accounts

- Better Auth (v1.7) with the Google provider. Users, sessions, and accounts live in the same Postgres (`lib/db/auth-schema.ts`).
- `ALLOWED_EMAILS` is the admission boundary: comma-separated, case-insensitive, **fail-closed**. An unknown Google account cannot create a user.
- `lib/auth/session.ts` — `getSession()` (memoised per request), `requireSession()`, `requireUser()`, and `requireAdmin()` for `/admin`. Better Auth lives in `lib/auth/server.ts` and `lib/auth/client.ts`.
- `proxy.ts` only checks that a session cookie exists for page routes (or that the development-only `IMPERSONATE_USER` switch is active). Every route handler and page verifies the real session and re-checks the allowlist, so removing an email locks out an existing cookie on its next request.
- Data is isolated per account. `projects.owner_id` and `invoices.owner_id` are `NOT NULL`; `hour_entries` and `furniture_items` inherit ownership through their project. Services take `ownerId` in the constructor, so there is no unscoped query path. Never build services with a client-supplied id.
- Invoice numbers are per account: the advisory lock key is `invoice_number:<ownerId>` and the unique index is `(owner_id, number)`.
- Admin access is the `role` column on `user` (`admin`), and that column is the only source of truth. Set it directly in Postgres for now; the change takes effect on the next request. Admins can impersonate non-admin accounts for up to one hour from `/admin`; impersonation swaps the session identity, so it still goes through the owner-scoped services. The banner in `app/(app)/layout.tsx` is the way back.
- There is no `legacy-owner` placeholder. The auth migration is a clean UUID baseline; an older database must be reset, not backfilled.
- Google Cloud setup: External consent screen, publish it (basic scopes need no review), redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://<domain>/api/auth/callback/google`.

## Blob storage

- `lib/storage/blob-store.ts` defines the `BlobStore` port (`put`, `get`, `delete`). Services depend on this, not on a vendor SDK.
- `lib/storage/local.ts` writes to `.data/blobs/` (override with `LOCAL_BLOB_DIR`). Used when `BLOB_DRIVER=local`.
- `lib/storage/vercel.ts` uses private `@vercel/blob` blobs. Used when `BLOB_DRIVER=vercel` or unset.
- `lib/storage/index.ts` selects the driver; unknown values throw at startup.
- Invoice PDFs are stored at `invoices/<ownerId>/<invoiceId>.pdf` and served by `GET /api/invoices/[invoiceId]/pdf`. Never expose a blob pathname or URL to the browser.
- `.data/` is gitignored.

## Local database setup

1. PostgreSQL must be running (Homebrew `postgresql@16` or Docker).
2. Create the database: `createdb maison_dev`
3. Copy `.env.local` and set `DATABASE_URL=postgresql://<user>@localhost:5432/maison_dev` plus `BLOB_DRIVER=local`.
4. Run migrations: `pnpm db:generate` then `pnpm db:migrate`
5. Start dev server: `pnpm dev`

## State management

- Server state lives in Server Components. There is no client data cache. After a mutation, `runAction` calls `revalidatePath('/', 'layout')` and the new props arrive in the action's response.
- Call actions from client components with `useAction()` (`lib/actions/use-action.ts`), which provides `run`, `pending`, and `error`. Use `useOptimistic` over server props for instant feedback; `FurnitureList` is the example.
- Store ids in client state and derive objects from props, so a sheet closes by itself if its item disappears. Do not use effects to sync derived state.
- Forms: React Hook Form + `zodResolver(schema, undefined, { raw: true })`. Shared field sets read the form through `FormProvider`.

## Pages

- `app/(app)/` — authenticated routes, wrapped by a layout that verifies the session, plus `error.tsx`, `loading.tsx`, and `not-found.tsx`.
- `app/(auth)/sign-in` — public Google sign-in page.
- `/` — redirects to `/projects`
- `/projects` — client list on phones; the first project on desktop, beside the sidebar from `projects/layout.tsx`
- `/projects/[id]` — project overview, rendered by `[id]/layout.tsx` so it stays mounted behind flows. Its `page.tsx` is intentionally empty.
- Flows, each rendered in `FlowPanel`: `/projects/new`, `/projects/[id]/edit`, `/projects/[id]/log` (`?type=furniture` skips the type question), `/projects/[id]/items/[itemId]`, `/projects/[id]/invoices/new`, `/projects/[id]/invoices/[invoiceId]`
- `/earnings` — money received by month and by client
- `/settings` — placeholder settings page
- `/admin` — admin-only account list with impersonation
- Routes under `/projects/[id]` load through `load-project.ts`, which renders not-found for a bad or unowned id.

## Layout and scrolling

- `AppShell` renders the app's single `<main>`, `AppHeader`, and the phone `BottomNav`. To add a main page, add it to `PAGES` in `components/layout/AppNav.tsx`.
- On phones, routes under `/projects/` hide the header and bottom menu, because the project's painted wall replaces them.
- `FlowPanel` is a task on its own route: full screen on phones, a right-hand drawer on desktop. Build its contents from `FlowBody` (scrolls if long) and `FlowFooter`.
- The core of every phone screen must fit without scrolling. Only a list that grows with the user's data may scroll, inside its own panel.
- By default `<main>` scrolls. Pass `fill` to `AppShell` for viewport-first routes; the shell then makes `<main>` a non-scrolling flex column and the route must build a `min-h-0` flex chain.
- Use `overflow-y-auto overscroll-contain` only on the panel that genuinely needs to scroll. Do not add full-height page wrappers; the shell owns the viewport.

## Billing model

- Billable items are `charges` and `furniture_items`. A charge with `hours` is logged time; a charge with null `hours` is a flat custom charge. `invoice_id` points at the invoice it was billed on; `null` means pending.
- `buildBillableItems` in `lib/domain/billing.ts` derives pending items for the project lists, the composer, and generated invoices, so they always agree.
- `outstanding` is a SQL aggregate of uninvoiced items. Nothing stores it.
- There is no email sending. Creating an invoice makes the PDF; the designer sends it and marks it sent.
- Invoiced items are locked: only furniture status can change. Services return a 409 for anything else.
- `InvoiceService.generate` is one transaction: lock per owner, lock the pending rows, recompute amounts from the database, allocate the number, snapshot the bill-to details and line items, render the PDF, upload, commit. The client only sends item ids.
- Invoice numbers are integers per account, displayed with `formatInvoiceNumber`.
- Invoice status is derived from `sent_at`, `due_at`, and `paid_at`.

## Lists

- Project lists live in `components/features/projects/ProjectLists.tsx`. Each item appears in exactly one list.
- Rows must be keyboard reachable through a real button or link, not only a row click.

## Styling

- Tailwind CSS v4 — no `tailwind.config.js`; design tokens as CSS variables in `app/globals.css` (`@theme inline`).
- Fonts: Marcellus (`font-serif`) for names and amounts, Jost for everything else, loaded with `next/font`.
- Use the type scale in `globals.css`: `text-hero`, `text-amount`, `text-heading`, `text-name`, `text-base`, `text-label`.
- Corners are square. The only colors are ink, the client's paint, and red for delete and overdue.
- Each client owns a paint from `lib/domain/paints.ts`. `paintStyle(paint)` overrides `--primary` on a wrapper, so `bg-primary` and default buttons inside take that color. Portalled content needs its own wrapper, which is why `FlowPanel` takes `paint`.
- Use `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`) for class merging.
- Icons from `lucide-react`.
- Path alias `@/*` → `./*`.

## Environment

- `.env.local` requires `DATABASE_URL`. Set `BLOB_DRIVER=local` for filesystem-backed invoice PDFs (stored in `.data/blobs/`). In production leave it unset (or set `vercel`); Vercel Blob needs `BLOB_READ_WRITE_TOKEN` or OIDC and private blob access. Do not commit real tokens.
- Development-only auth bypass: set `IMPERSONATE_USER=<user uuid>` in `.env.local` and restart `pnpm dev` to act as that account without Google OAuth. Find UUIDs with `select id, email from "user";`. The variable is ignored in production; remove it (and restart) to return to Google sign-in. While active, the admin page is read-only and sign-out has no effect.
- Auth also requires `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ALLOWED_EMAILS`. After the first sign-in, set `user.role = 'admin'` in Postgres. Set `BETTER_AUTH_URL` to the production origin; leave it unset on Preview so Better Auth infers the host.
- `.gitignore` excludes `node_modules`, `.next/`, `.vercel/`, `.data/`, `.env*.local`, `tsconfig.tsbuildinfo`.

## Version control

- Git initialized. Remote: `origin` (github.com/maxbherman12/maison).
- `main` is the integration branch. It only receives work through an approved feature branch — no direct commits, and no merging without the user's explicit approval (see Feature workflow).

## What to skip

- No tests, lint, CI, pre-commit, codegen exist. Do not invent commands for them.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
