# Multi-account authentication and isolated workspaces

**Status:** Approved

## Problem

Maison is a single-user app. Every project, hour entry, furniture item, and
invoice lives in one global namespace, and every route is public. It is about to
become the primary record of a designer's billable hours, so two things must
change:

1. Only authorized people can reach or mutate the data.
2. The app must support up to ~5 accounts, each with their own clients,
   projects, hours, invoices, and PDFs.

The developer also needs a support path: an admin account that can impersonate
another account to see and fix what that user sees.

## Decisions

| Question | Decision |
| --- | --- |
| Tenancy | Isolated per account. Each login owns its own data. |
| Identity | Google OAuth via Better Auth (self-hosted, free). |
| Admission | `ALLOWED_EMAILS` environment allowlist, fail-closed. |
| Admin | `ADMIN_EMAILS`, Better Auth `admin` plugin, 1-hour impersonation sessions. |
| Impersonation | Read + write, no per-row actor attribution. |
| Session state | Database sessions in the existing Postgres, 14-day expiry. |

## Approach

### 1. Authentication

Add Better Auth 1.7 with the Drizzle adapter. It runs inside the app, stores
users/sessions/accounts/verification in the existing Postgres, and has no
vendor fee.

- `lib/db/auth-schema.ts` — generated Better Auth schema (`user`, `session`,
  `account`, `verification`) plus the admin plugin fields (`role`, `banned`,
  `banReason`, `banExpires`, `impersonatedBy`).
- `lib/auth.ts` — `betterAuth()` with the Google provider, the admin plugin, and
  `nextCookies()` last.
- `lib/auth-client.ts` — `createAuthClient()` with `adminClient()`.
- `app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)`.
- `lib/auth/allowlist.ts` — parse `ALLOWED_EMAILS` / `ADMIN_EMAILS`, normalise,
  and assert that every admin is also allowed.
- `lib/auth/session.ts` — `getSession`, `requireUser`, `requireSession`,
  `requireApiUser` (throws `AppError(401)`), `requireAdmin`.
- `proxy.ts` — cookie-presence gate for page routes only. API routes self-gate.
- `app/(auth)/sign-in/page.tsx` + `components/features/auth/SignInPanel.tsx`.

Allowlist enforcement happens at three points:

1. `databaseHooks.user.create.before` rejects unlisted emails, so no account is
   created for an outsider.
2. `getSession()` re-checks the email on every request. Removing someone from
   the env var locks them out immediately even if their cookie is still valid.
3. `requireApiUser()` performs the same check for every mutation.

Better Auth's `/admin/*` endpoints authorize against the database `role`, not
`ADMIN_EMAILS`. The auth route handler re-checks the env for those paths (and
refuses while impersonating) so a demoted admin cannot call them directly.
`getSession()` also syncs `role` toward `ADMIN_EMAILS` in both directions, so a
promotion or demotion takes effect on the next request. Session cookie caching
is disabled for the same reason: role, ban, and allowlist are always fresh.

If `ALLOWED_EMAILS` is empty, nobody can sign in. There is no "allow all" mode.

### 2. Data isolation

Add `owner_id` to the two root tables and scope at the repository boundary.

- `projects.owner_id` → `user.id`, `not null`, indexed.
- `invoices.owner_id` → `user.id`, `not null`, indexed. Denormalised so invoice
  reads and writes can be scoped without joining through projects.
- `hour_entries` and `furniture_items` stay unscoped: they are only reachable
  through a project, and every project query is owner-scoped.
- Repositories take `ownerId` in the constructor. Every read adds an owner
  predicate; every write verifies ownership of the parent project first.
- `lib/services/container.ts` exposes `servicesFor(ownerId)` and no longer
  exports unscoped singletons. It is impossible to construct a service without
  an owner.

Invoice numbering becomes per owner:

- advisory lock key is `invoice_number:<ownerId>`
- the `max(number)` query filters by owner
- the unique index becomes `(owner_id, number)`

### 3. Impersonation

Use the Better Auth admin plugin. Impersonation is an identity swap, not a query
bypass: `requireUser()` returns the impersonated user, so `servicesFor()` scopes
to that account. The data layer never contains an "admin can read everything"
branch.

- `/admin` lists accounts and offers "View as" for non-admin, non-banned users.
- Server actions `impersonate(userId)` / `stopImpersonating()` wrap
  `auth.api.impersonateUser` / `stopImpersonating`.
- A persistent banner in `app/(app)/layout.tsx` shows who is being viewed and
  offers "Return to admin". The normal sign-out control is hidden while
  impersonating.
- `requireAdmin()` refuses to run while impersonating, so sessions cannot chain.
- Impersonation lasts one hour (plugin default).

### 4. Migration

A single migration adds the auth tables plus the owner columns. Existing rows
are assigned to a synthetic `legacy-owner` user row inserted by the migration,
so `owner_id` can be `NOT NULL` immediately and a fresh database works without
manual steps.

After the primary account signs in for the first time:

```
pnpm db:backfill-owner --email=<primary email>
```

The script reassigns every `legacy-owner` project and invoice to that user, then
deletes the placeholder. It runs in a transaction and fails loudly if the user
does not exist yet.

## Alternatives considered

- **Shared workspace (no `owner_id`).** Cheaper, but the requirement is explicit
  that each account has its own data. Rejected.
- **Clerk free tier.** Free at this scale and less code, but adds a third-party
  identity dependency and a second user store for five users. Rejected in favour
  of owning the data in Postgres.
- **Neon Auth.** Already provisioned in the Vercel project, but it ties auth to
  Neon while local development runs Docker Postgres. Rejected.
- **Hand-rolled Google OAuth + signed cookie.** Viable, but re-implements session
  revocation, refresh, and CSRF handling. Better Auth is the same cost and less
  risk.
- **Admin read-bypass in the repositories.** Avoids a second cookie, but creates
  a permanent "ignore owner" path that every query must be audited against.
  Identity swap keeps isolation absolute. Rejected.
- **Per-write actor attribution.** Rejected by the product owner as unnecessary
  granularity.

## Files

New:

- `lib/db/auth-schema.ts`
- `lib/auth.ts`, `lib/auth-client.ts`, `lib/auth/allowlist.ts`, `lib/auth/session.ts`
- `lib/api/client.ts` (shared fetch with 401 handling)
- `app/api/auth/[...all]/route.ts`
- `app/(auth)/sign-in/page.tsx`
- `app/(app)/layout.tsx`, `app/(app)/actions.ts`
- `app/(app)/admin/page.tsx`
- `components/features/auth/SignInPanel.tsx`, `UserMenu.tsx`, `ImpersonationBanner.tsx`
- `components/features/admin/AdminUsers.tsx`
- `proxy.ts`
- `scripts/backfill-owner.mjs`
- `lib/db/migrations/0003_*.sql`

Changed:

- `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`
- `lib/repository/postgres.ts`
- `lib/services/container.ts`
- all 10 API routes under `app/api/`
- all 6 project pages (moved into `app/(app)/projects`, URLs unchanged)
- `lib/query/projects.ts`, `lib/query/invoices.ts`
- `components/layout/AppHeader.tsx`
- `package.json`, `AGENTS.md`

## Acceptance criteria

- An unauthenticated visitor is redirected to `/sign-in` for every app route.
- An email not in `ALLOWED_EMAILS` cannot sign in and gets no `user` row.
- Removing an email from `ALLOWED_EMAILS` locks that session out on its next
  request.
- Account A cannot read or mutate account B's project, hours, furniture,
  invoices, or invoice PDF, including by guessing IDs.
- Each account's projects list is empty on first sign-in.
- Invoice numbers are independent per account.
- An admin can impersonate a non-admin account, sees only that account's data,
  and can return to their own session.
- `npx tsc --noEmit` passes, `pnpm build` succeeds, and the migration applies
  cleanly to the local database.

## Risks

- **Google OAuth cannot be exercised in automated checks.** The flow needs real
  client credentials and a browser. Type checking and build only prove the
  wiring compiles.
- **Server-action cookie propagation.** Better Auth sets two cookies during
  impersonation (the impersonated session and the saved admin session). If
  `nextCookies()` does not forward them from a server action, the fallback is
  the client-side `authClient.admin.impersonateUser` call, which is the
  documented path.
- **Existing data needs one manual step.** Until the backfill runs, existing
  projects belong to `legacy-owner` and are invisible to the real account.
- **Impersonation is read/write by choice.** Writes made while impersonating are
  indistinguishable from the target's own. The banner is the only signal.

## Environment

```
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000   # unset on Preview
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_EMAILS=owner@example.com,partner@example.com
ADMIN_EMAILS=owner@example.com
```

Google Cloud: External consent screen, publish it (basic scopes need no review),
authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://<production-domain>/api/auth/callback/google`
