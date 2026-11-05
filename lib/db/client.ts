import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@vercel/functions';
import * as schema from '@/lib/db/schema';

// Next.js re-evaluates modules on hot reload, so a module-scope pool would be
// recreated on every save during `pnpm dev` and leak connections. Reuse one
// pool per process outside production.
const globalForDb = globalThis as unknown as { __maisonPool?: Pool };

function createPool(): Pool {
  // The Pool constructor is lazy — it does not connect until the first query.
  // This means `next build` won't fail if DATABASE_URL is only set at runtime.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Each instance serves a handful of concurrent requests. Keep the ceiling
    // low: Neon's pooler enforces a cluster-wide connection limit.
    max: 5,
  });

  // Releases idle connections before a Fluid Compute instance suspends, so a
  // scaled-out deployment does not exhaust the pooler while sitting idle.
  // Inert outside Vercel.
  attachDatabasePool(pool);

  return pool;
}

export const pool = globalForDb.__maisonPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__maisonPool = pool;
}

export const db = drizzle(pool, { schema });
