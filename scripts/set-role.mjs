#!/usr/bin/env node
/**
 * Sets the `role` column for an existing account. `user.role` is the only
 * source of truth for admin access, so this script is both the first-admin
 * bootstrap and the promote/demote path:
 *
 *   pnpm db:set-role --email=owner@example.com --role=admin
 *   pnpm db:set-role --email=someone@example.com --role=user
 *
 * The account must already exist: sign in once, then run this. Plain Node (no
 * app imports) so it does not need the Next.js server runtime or the
 * `server-only` guard.
 */
import { Pool } from 'pg';

const ROLES = new Set(['admin', 'user']);

function readArg(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(`--${name}=`.length);

  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

try {
  process.loadEnvFile('.env.local');
} catch {
  // Fall back to variables already in the environment.
}

const email = readArg('email') ?? process.env.SET_ROLE_EMAIL;
const role = (readArg('role') ?? process.env.SET_ROLE_ROLE ?? '')
  .trim()
  .toLowerCase();

if (!email || !role) {
  console.error(
    'Usage: pnpm db:set-role --email=<email used to sign in> --role=admin|user'
  );
  process.exit(1);
}

if (!ROLES.has(role)) {
  console.error(`Invalid role "${role}". Use "admin" or "user".`);
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
    'select id, role from "user" where lower(email) = lower($1)',
    [email]
  );

  if (rows.length === 0) {
    throw new Error(
      `No account found for ${email}. Sign in to Maison once, then re-run this script.`
    );
  }

  const account = rows[0];
  const previousRole = account.role ?? 'user';

  if (previousRole === role) {
    await client.query('commit');
    console.log(`${email} is already "${role}".`);
  } else {
    await client.query('update "user" set role = $1 where id = $2', [
      role,
      account.id,
    ]);
    await client.query('commit');
    console.log(`Changed ${email} from "${previousRole}" to "${role}".`);
  }

  if (role === 'user') {
    const admins = await client.query(
      `select count(*)::int as count from "user" where role = 'admin'`
    );

    if (admins.rows[0].count === 0) {
      console.warn(
        'Warning: no admin accounts remain. Re-run with --role=admin to restore access.'
      );
    }
  }
} catch (error) {
  await client.query('rollback');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
