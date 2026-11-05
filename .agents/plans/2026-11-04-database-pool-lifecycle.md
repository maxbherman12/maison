# Database pool lifecycle on Fluid Compute

**Status:** Draft for review

**Related:** [Phased product roadmap](./2026-10-21-product-roadmap.md), Neon + Vercel Blob provisioning (2026-11-04)

## Problem

`lib/db/client.ts` creates a module-scope `pg.Pool` and hands it to Drizzle:

```ts
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

The pool is lazy, so `next build` is safe without a database. The lifecycle is the problem.

On Vercel (Fluid Compute), the module scope lives as long as the function instance. Instances are frozen when idle, and a frozen instance keeps its sockets open from Postgres' point of view until the TCP stack or the server notices. Neon's pooled endpoint (`-pooler`, PgBouncer) has a finite number of client connections per compute, so a deployment that scales out and then idles accumulates connections that are held by instances doing no work. In practice that shows up as `too many connections`, connection timeouts, or slow first requests after an idle period — the classic serverless-Postgres failure mode, and the app now talks to Neon in production.

The same module-level pool also leaks locally: Next.js re-evaluates modules on hot reload, so every save during `pnpm dev` can create a fresh `Pool` and abandon the previous one. Local Postgres has a low connection limit too, so a long dev session can run out of connections without any code change.

### Desired outcome

- Production instances release idle database connections before they are suspended, instead of leaving them for the pooler to time out.
- Per-instance connection usage is bounded and predictable against Neon's pooler.
- `pnpm dev` reuses a single pool across hot reloads.
- Local development still needs no Vercel account, no network, and no credentials.
- The data layer keeps using `pg` + `drizzle-orm/node-postgres`; no call site changes.

## Approach

### 1. Register the pool with the runtime lifecycle

Add `@vercel/functions` and call `attachDatabasePool(pool)`:

```ts
import { attachDatabasePool } from '@vercel/functions';
```

`attachDatabasePool` registers the pool with Vercel's function lifecycle so idle clients are ended before the instance suspends, instead of being left to a TCP timeout. Outside Vercel (plain `next dev`, `next start` locally) it is inert, so development behavior does not change.

### 2. Bound the pool

Create the pool with `max: 5`. Each instance serves a handful of concurrent requests; keeping the ceiling low matters much more than peak parallelism because Neon's pooler enforces a cluster-wide limit. This is a documented, single-line setting, not a new abstraction.

### 3. Reuse the pool across hot reloads in development

Cache the pool on `globalThis` when `NODE_ENV !== 'production'`:

```ts
const globalForDb = globalThis as unknown as { __maisonPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  attachDatabasePool(pool);
  return pool;
}

export const pool = globalForDb.__maisonPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.__maisonPool = pool;
```

`createPool` still performs no I/O — `Pool` does not connect until the first query — so the build-time guarantee in the current comment is preserved.

### 4. Document it

Add one line to the "Data layer" section of `AGENTS.md`: the pool is attached to the runtime lifecycle and capped, and the `globalThis` cache exists for hot reload.

## Alternatives considered

1. **Switch to `@neondatabase/serverless` / `drizzle-orm/neon-http`.** Each query becomes an HTTP request, so there is no client pool to leak.
   - Rejected for now: it introduces a Neon-specific driver into a `pg`-based data layer, changes Drizzle's adapter and transaction semantics, and complicates `drizzle-kit` and local Docker Postgres. The leak is a lifecycle problem; fixing the lifecycle is the smaller, vendor-neutral change.
2. **Move to `drizzle-orm/neon-serverless` (WebSocket driver).** Same pool problem in a different protocol, plus new runtime requirements. No benefit over `attachDatabasePool`.
3. **Lazy `getDb()` accessor instead of the module-scope export.** The pool is already lazy, so this only moves the same construction to first call. It would touch every import site for no lifecycle gain. Rejected as churn without benefit.
4. **Rely on Neon's pooler alone and set `idleTimeoutMillis`.** A shorter idle timeout does not help frozen instances — timers do not run while suspended, so connections are not closed during the exact window that matters. Rejected as incomplete.

## Files and modules affected

| File | Change |
| --- | --- |
| `.agents/plans/2026-11-04-database-pool-lifecycle.md` | This plan |
| `lib/db/client.ts` | Attach pool to runtime lifecycle, cap `max`, dev-only `globalThis` cache |
| `package.json`, `pnpm-lock.yaml` | Add `@vercel/functions` |
| `AGENTS.md` | One-line note in the data-layer section |

## Acceptance criteria

- `npx tsc --noEmit` passes.
- `pnpm build` still succeeds with `DATABASE_URL` unset — no connection attempted at module load.
- With `pnpm dev`, editing and saving a server file repeatedly does not increase the number of backend connections to `maison_dev`.
- A production deployment serves `GET /api/projects` with 200 after an idle period, with no connection errors in the function logs.
- No call site changes; `lib/repository/postgres.ts` imports the same `db`.

## Verification

1. `npx tsc --noEmit`.
2. `pnpm build` with `DATABASE_URL` temporarily unset.
3. `pnpm dev` against the local Docker Postgres: count `pg_stat_activity` rows for the `maison` database, touch a server file several times, count again.
4. Preview deployment: load `/projects`, wait past the idle window, reload, and check runtime logs for connection errors.

## Risks and open questions

- **`max: 5` is a judgment call.** It is comfortably above the concurrency a single Fluid instance sees, but if a future endpoint fans out many parallel queries, it will queue rather than open more sockets. One constant makes it easy to tune.
- **The dev cache survives `.env.local` edits.** A changed `DATABASE_URL` requires a dev-server restart; that is already true of most cached singletons and worth a sentence in the docs.
- **`attachDatabasePool` is Vercel-specific.** It is inert elsewhere, so the data layer stays runnable outside Vercel, at the cost of one small dependency.
- **Neon connection limits depend on compute size.** If the pooler limit ever becomes the binding constraint, the next lever is a regional pooler with fewer instances, not a larger `max`.
