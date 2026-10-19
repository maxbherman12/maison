# maison

Interior-design project management app. Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, pnpm. Tracks clients, billable hours, furniture purchases, and generates PDF invoices.

## Architecture (layered)

```
app/              → Next.js App Router (pages + API routes)
lib/services/     → business logic (ProjectService, InvoiceService)
lib/repository/   → data access (PostgresProjectRepository, PostgresInvoiceRepository)
lib/db/           → Drizzle schema + Postgres client
lib/types/        → domain types + shared helpers
lib/validators/   → Zod schemas
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
- `lib/services/invoices.ts` — `InvoiceService`: generates PDF via `pdf-lib`, uploads to `@vercel/blob`, persists invoice record.
- `lib/validators/invoices.ts` — Zod schemas for invoice generation, project creation, hour/furniture logs.
- API routes: `app/api/projects/*` and `app/api/invoices/route.ts` — validate with Zod, delegate to services.

## Local database setup

1. PostgreSQL must be running (Homebrew `postgresql@16` or Docker).
2. Create the database: `createdb maison_dev`
3. Copy `.env.local` and set `DATABASE_URL=postgresql://<user>@localhost:5432/maison_dev`
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

## Styling

- Tailwind CSS v4 — no `tailwind.config.js`; design tokens as CSS variables in `app/globals.css` (`@theme inline`).
- Use `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`) for class merging.
- Icons from `lucide-react`.
- Path alias `@/*` → `./*`.

## Environment

- `.env.local` required for `DATABASE_URL`. `@vercel/blob` requires `BLOB_READ_WRITE_TOKEN` at runtime (invoice uploads fail without it). Do not commit real tokens.
- `.gitignore` excludes `node_modules`, `.next/`, `.vercel/`, `.env*.local`, v0 internals, `tsconfig.tsbuildinfo`.

## Version control

- Git initialized. Remote: `origin` (github.com/maxbherman12/maison).

## What to skip

- No tests, lint, CI, pre-commit, codegen exist. Do not invent commands for them.
- `Untitled` file at root was a placeholder; it has been removed.
