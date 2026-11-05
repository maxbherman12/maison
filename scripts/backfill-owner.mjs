#!/usr/bin/env node
/**
 * Reassigns pre-account data from the `legacy-owner` placeholder to a real
 * account. Run this once after that account has signed in for the first time:
 *
 *   pnpm db:backfill-owner --email=owner@example.com
 *
 * The script is intentionally a plain Node script (no app imports) so it does
 * not need the Next.js server runtime or the `server-only` guard.
 */
import { Pool } from 'pg';

const LEGACY_OWNER_ID = 'legacy-owner';

function readEmail() {
  const inline = process.argv.find((arg) => arg.startsWith('--email='));
  if (inline) return inline.slice('--email='.length);

  const index = process.argv.indexOf('--email');
  if (index !== -1) return process.argv[index + 1];

  return process.env.BACKFILL_OWNER_EMAIL;
}

try {
  process.loadEnvFile('.env.local');
} catch {
  // Fall back to variables already in the environment.
}

const email = readEmail();

if (!email) {
  console.error(
    'Usage: pnpm db:backfill-owner --email=<email used to sign in>'
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local or the environment.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query('begin');

  const { rows } = await client.query(
    'select id from "user" where lower(email) = lower($1)',
    [email]
  );

  if (rows.length === 0) {
    throw new Error(
      `No account found for ${email}. Sign in to Maison once, then re-run this script.`
    );
  }

  const ownerId = rows[0].id;

  const projects = await client.query(
    'update projects set owner_id = $1 where owner_id = $2',
    [ownerId, LEGACY_OWNER_ID]
  );

  const invoices = await client.query(
    'update invoices set owner_id = $1 where owner_id = $2',
    [ownerId, LEGACY_OWNER_ID]
  );

  const leftover = await client.query(
    `select
       (select count(*) from projects where owner_id = $1) as projects,
       (select count(*) from invoices where owner_id = $1) as invoices`,
    [LEGACY_OWNER_ID]
  );

  const stillReferenced =
    Number(leftover.rows[0].projects) > 0 ||
    Number(leftover.rows[0].invoices) > 0;

  if (!stillReferenced) {
    await client.query('delete from "user" where id = $1', [LEGACY_OWNER_ID]);
  }

  await client.query('commit');

  console.log(
    `Assigned ${projects.rowCount ?? 0} project(s) and ${invoices.rowCount ?? 0} invoice(s) to ${email}.`
  );

  if (stillReferenced) {
    console.warn(
      'The legacy placeholder account still has rows and was left in place.'
    );
  }
} catch (error) {
  await client.query('rollback');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
