import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/lib/db/schema';

// The Pool constructor is lazy — it does not connect until the first query.
// This means `next build` won't fail if DATABASE_URL is only set at runtime.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool, { schema });
