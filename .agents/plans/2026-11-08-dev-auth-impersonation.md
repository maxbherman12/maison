# Dev auth layer: `IMPERSONATE_USER`

**Status:** Draft for review

## Problem

Local development currently requires a real Google OAuth round trip. That is
slow, needs network access, and makes it awkward to act as a specific account.
We want a server-side development switch that signs the app in as a chosen user
without OAuth, while leaving production authentication untouched.

## Desired outcome

When `IMPERSONATE_USER=<user id>` is set for a development server:

- Pages and API routes resolve the session as that user.
- The client-side session (user menu, admin link) shows that user.
- The page-level cookie gate lets requests through.
- No Google account or OAuth callback is involved.
- The switch is ignored in production, so a stray environment variable cannot
  bypass authentication.

When the variable is unset, existing Google auth behaviour is unchanged.

## Approach

1. **Add an edge-safe mode module.**
   - `lib/auth/dev-mode.ts` reads `IMPERSONATE_USER`, trims it, and returns
     `null` unless `NODE_ENV !== 'production'`.
   - It contains no database or Node-only imports so `proxy.ts` can use it.
   - Production logs one warning and ignores the value rather than throwing,
     which keeps a local `pnpm build` (where `.env.local` is still loaded) from
     failing.

2. **Build a synthetic Better Auth-shaped session.**
   - `lib/auth/dev-impersonation.ts` looks the configured user up by id and
     returns `{ session, user }` with the same shape Better Auth returns.
   - The session is ephemeral: it is not written to the `session` table and
     carries a `dev-<user id>` token/id.
   - A missing user id throws a clear error instead of silently falling back to
     Google sign-in.
   - This is an explicit dev override, so the allowlist and ban checks are
     intentionally skipped. Those checks still apply to real sessions.

3. **Put the override in the session facade.**
   - `lib/auth/session.ts` asks for a dev session first, then falls back to
     `auth.api.getSession()`.
   - Every existing caller (`requireUser`, `requireApiUser`, `requireAdmin`,
     pages, server actions, services) gets the dev identity without knowing
     about the switch.

4. **Open the page gate.**
   - `proxy.ts` checks `devImpersonationUserId()` alongside the session cookie.
   - The real verification still happens in `getSession`; this only prevents a
     cookie-less dev request from being redirected to `/sign-in`.

5. **Make the client agree.**
   - `app/api/auth/[...all]/route.ts` intercepts `GET`/`POST`
     `/api/auth/get-session` while the switch is active and returns the
     synthetic session.
   - `authClient.useSession()` then renders the right user and admin link.

6. **Keep `/admin` usable.**
   - `lib/auth/accounts.ts` lists accounts from the database in dev mode and
     from `auth.api.listUsers` otherwise.
   - `app/(app)/admin/page.tsx` uses that helper.
   - `impersonate()` returns a clear message instead of calling the Better Auth
     admin endpoint, which has no real session to act on in this mode.

## Alternative considered

**A dev-only Better Auth email/password provider.** Rejected because the user
asked for a single user-id environment variable, not credentials or a second
login form. It would also create password accounts for existing Google users.

**Create a real Better Auth session row and set its signed cookie.** Rejected
for this iteration. It would make the admin plugin endpoints work unchanged,
but requires a cookie-bootstrap route or internal `internalAdapter` /
`setSessionCookie` usage, creates rows that need cleanup, and couples the dev
layer to Better Auth internals. The synthetic session is smaller and reflects
an environment change on the next request.

**Only override `getSession`.** Rejected because `proxy.ts` would still redirect
before the server runs and `authClient.useSession()` would still show no user.

## Files affected

- `lib/auth/dev-mode.ts` (new)
- `lib/auth/dev-impersonation.ts` (new)
- `lib/auth/accounts.ts` (new)
- `lib/auth/session.ts`
- `proxy.ts`
- `app/api/auth/[...all]/route.ts`
- `app/(app)/admin/page.tsx`
- `app/(app)/actions.ts`
- `AGENTS.md`
- `.env.local` (commented example only; not committed)

## Acceptance criteria

- With `IMPERSONATE_USER` set to an existing user id and a fresh dev server:
  - `/projects` loads without a Google cookie.
  - `/api/projects` returns that user's projects.
  - `/api/auth/get-session` returns the synthetic session.
  - The user menu shows the configured account.
- With `IMPERSONATE_USER` unset, unauthenticated pages redirect to `/sign-in`
  and unauthenticated APIs return 401 JSON.
- `IMPERSONATE_USER` has no effect in production.
- `npx tsc --noEmit` and `pnpm build` pass.

## Risks and open questions

- **Not a real session.** Better Auth admin endpoints (`impersonateUser`,
  `stopImpersonating`) cannot act on it. `/admin` is read-only in this mode; the
  view-as action explains why it is unavailable.
- **Sign out is a no-op.** The environment keeps signing the request in as the
  chosen user. Remove or change the variable and restart to sign out.
- **Restart required.** Next reads `.env.local` at startup, so changing the
  target user needs a dev-server restart.
- **Skipped admission checks.** A banned or non-allowlisted user can be used for
  local testing. This is deliberate for an explicit dev-only override.
