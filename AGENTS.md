# maison

Interior-design project management app. Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, pnpm. Tracks clients, billable hours, furniture purchases, and generates PDF invoices.

## Architecture (layered)

```
app/              → Next.js App Router (pages + API routes)
lib/services/     → business logic (ProjectService, InvoiceService)
lib/repository/   → data access (MemoryProjectRepository, MemoryInvoiceRepository)
lib/types/        → domain types + shared helpers
lib/validators/   → Zod schemas
lib/query/        → React Query hooks
components/ui/    → shadcn base primitives
components/features/ → feature-specific client components
```

## Commands

- `pnpm dev` — dev server (Turbo)
- `pnpm build` — production build (`next build`)
- `pnpm start` — production server
- `npx tsc --noEmit` — type check (build skips type validation: `ignoreBuildErrors: true` in `next.config.mjs`)

No test, lint, or format scripts exist.

## Package manager

- `pnpm` (lockfile: `pnpm-lock.yaml`). `package.json` pins `packageManager: pnpm@12.3.4`.
- `node_modules` not committed; install before running.

## Data layer

- `lib/repository/memory.ts` — in-memory repositories. Swap implementations here to connect a real DB.
- `lib/services/container.ts` — DI container, singleton services. Import `projectService` / `invoiceService` from here.
- `lib/services/projects.ts` — `ProjectService`: CRUD, log hours, add/update/delete furniture.
- `lib/services/invoices.ts` — `InvoiceService`: generates PDF via `pdf-lib`, uploads to `@vercel/blob`, persists invoice record.
- `lib/validators/invoices.ts` — Zod schemas for invoice generation, project creation, hour/furniture logs.
- API route: `app/api/invoices/route.ts` (POST) — validates with Zod, delegates to `invoiceService`.

## State management

- Server state: React Query (`@tanstack/react-query`). Hooks in `lib/query/projects.ts` and `lib/query/invoices.ts`.
- Client UI state: React `useState` / `useReducer` in feature components.
- Forms: React Hook Form + Zod resolvers (`@hookform/resolvers`).

## Pages

- `/` — redirects to `/projects`
- `/projects` — project list (`ProjectsListClient`), create project via `ProjectOnboard`
- `/projects/[id]` — project detail (`ProjectClient` → `ProjectView` shell with sub-views: `ProjectSummary`, `ProjectLog`, `ProjectStatus`, `ProjectInvoice`)

## Styling

- Tailwind CSS v4 — no `tailwind.config.js`; design tokens as CSS variables in `app/globals.css` (`@theme inline`).
- Use `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`) for class merging.
- Icons from `lucide-react`.
- Path alias `@/*` → `./*`.

## Environment

- No `.env` file locally. `@vercel/blob` requires `BLOB_READ_WRITE_TOKEN` at runtime (invoice uploads fail without it). Do not commit real tokens.

## Version control

- `.gitignore` excludes `node_modules`, `.next/`, `.vercel/`, `.env*.local`, v0 internals.
- No git repository initialized yet.

## What to skip

- No tests, lint, CI, pre-commit, codegen, or migrations exist. Do not invent commands for them.
- `Untitled` file at root was a placeholder; it has been removed.
