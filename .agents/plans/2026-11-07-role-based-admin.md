# Role-based admin

**Status:** Draft for review
**Related:** [multi-account-auth](./2026-11-05-multi-account-auth.md)

## Problem

Admin access currently has two sources of truth:

- `ADMIN_EMAILS` in the environment (`lib/auth/allowlist.ts`).
- The `user.role` column that the Better Auth admin plugin already reads and
  enforces on its `/admin/*` endpoints.

They drift in both directions. `getSession()` rewrites `role` from the env on
every request, `requireAdmin()` and the auth route wrapper check the env instead
of the column, and changing who is an admin requires a redeploy. The database is
already the authoritative store for the plugin, so the env list adds a second,
conflicting policy.

## Desired outcome

`user.role` is the single source of truth for admin access. No request path
consults `ADMIN_EMAILS`. Admins are promoted or demoted by changing the row,
and a fresh install has a documented way to create the first admin. The
`ALLOWED_EMAILS` admission boundary is unchanged.

## Approach

1. **Remove env-based admin logic.**
   - `lib/auth/allowlist.ts`: drop `adminEmails()`, `isAdminEmail()`, and
     `assertAuthConfig()`. Keep `allowedEmails()` / `isAllowedEmail()`.
   - `lib/auth.ts`: remove the startup assertion and the `isAdminEmail` branch
     in the user-create hook. New users are created with `role: 'user'` (the
     plugin's `defaultRole` already does this; keeping it explicit avoids
     depending on plugin defaults).
2. **Read the role everywhere.**
   - `lib/auth/session.ts`: delete the read-time role sync (and the now-unused
     Drizzle imports). `requireAdmin()` checks `session.user.role === 'admin'`
     and still refuses impersonated sessions. `getSession()` continues to
     re-check the allowlist and ban flag.
   - `app/(app)/actions.ts`: refuse impersonation of a target whose
     `role === 'admin'`; drop the `isAdminEmail` check.
   - `app/api/auth/[...all]/route.ts`: keep the wrapper only as the
     "no chained impersonation" guard for `/api/auth/admin/*` (the plugin
     already authorizes against the database role). Check the session role as
     defense in depth.
3. **Bootstrap/administration without a redeploy.**
   - Add `scripts/set-role.mjs`, in the same plain-Node style as
     `backfill-owner.mjs`, invoked as
     `pnpm db:set-role --email=<email> --role=admin|user`.
   - It validates the role, normalises the email, fails loudly when the account
     does not exist, and reports the previous and new role.
   - This is the first-admin bootstrap and the recovery path if the last admin
     is demoted.
4. **Docs and local env.**
   - Update `AGENTS.md` (auth rules and environment sections) and drop
     `ADMIN_EMAILS` from `.env.local`.
   - Note the bootstrap command in the auth docs.
5. No schema or data migration: existing `role` values stay as they are, so an
   account that is currently an admin remains one.

## Alternative considered

**Keep `ADMIN_EMAILS` as a bootstrap seed only, then let the column take over.**
Rejected: it still leaves two policies to reason about, and the "seed" has to
run exactly once at the right moment. A one-off CLI write is simpler and
explicit, and the admin plugin's own endpoints can manage roles afterwards.

**Promote the first signed-in user automatically.** Rejected: `ALLOWED_EMAILS`
can contain several people and the first sign-in is not a reliable signal of
ownership; it also makes an accidental admin promotion silent.

## Files affected

- `lib/auth/allowlist.ts`
- `lib/auth.ts`
- `lib/auth/session.ts`
- `app/api/auth/[...all]/route.ts`
- `app/(app)/actions.ts`
- `scripts/set-role.mjs` (new)
- `package.json` (`db:set-role`)
- `AGENTS.md`
- `.env.local` (remove `ADMIN_EMAILS`)
- `.agents/plans/2026-11-07-role-based-admin.md` (this file)

## Acceptance criteria

- `ADMIN_EMAILS` no longer appears in application code or required env.
- A user with `role = 'admin'` can open `/admin`, impersonate, and return.
- A user with `role = 'user'` gets redirected away from `/admin`, and calling
  `/api/auth/admin/*` directly returns 403.
- Promoting/demoting via `pnpm db:set-role` takes effect on the next request
  without a restart or redeploy.
- An impersonated session cannot start another impersonation.
- `npx tsc --noEmit` and `pnpm build` pass.

## Risks and open questions

- **First admin is a manual step.** On a fresh database every user starts as
  `user`; someone must run `pnpm db:set-role --email=... --role=admin` before
  `/admin` is reachable. This replaces the previous env-driven bootstrap.
- **Last-admin lockout.** Demoting the only admin removes `/admin` access until
  the script is run again. The script is the documented recovery path; it does
  not currently block demoting the last admin.
- **Impersonated admin edge case.** Impersonating an admin is refused, and the
  auth route wrapper refuses all admin endpoints while impersonating, so a
  target promoted mid-impersonation cannot chain sessions.
