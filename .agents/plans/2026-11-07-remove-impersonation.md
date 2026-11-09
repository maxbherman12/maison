# Remove impersonation

**Status:** Reverted — impersonation was kept; the actual issue was service plumbing (see [service-plumbing](./2026-11-08-service-plumbing.md)).
**Related:** [multi-account-auth](./2026-11-05-multi-account-auth.md), [role-based-admin](./2026-11-07-role-based-admin.md)

## Problem

Impersonation shipped as part of the multi-account auth work, but the
implementation is not right and is not worth keeping while the design is redone.
It currently mixes four concerns: swapping the session cookie, a "View as"
button in the account list, a global banner with a return action, and guards in
the session and auth-route layers. Leaving it half-maintained gives admins a
write-capable identity swap with no audit trail.

## Desired outcome

Impersonation is gone from the product:

- `/admin` is a read-only account list; there is no way to view or act as
  another account.
- No server action, banner component, or session guard references
  impersonation.
- Better Auth's two impersonation endpoints are disabled at the router, so a
  client cannot call them directly.
- Role-based admin access, account listing, and owner-scoped data access keep
  working exactly as they do now.

## Approach

1. **Remove the product surface.**
   - `app/(app)/actions.ts`: delete the file. Its only two actions are
     `impersonate()` and `stopImpersonating()`.
   - `components/features/auth/ImpersonationBanner.tsx`: delete the file.
   - `app/(app)/layout.tsx`: drop the banner branch; keep the central
     `requireSession()` check.
   - `components/features/admin/AdminUsers.tsx`: make the list presentational
     (no `'use client'`, no button, no pending/error state). Keep the "you"
     marker.
   - `app/(app)/admin/page.tsx`: replace the impersonation instructions with a
     one-line description of the list.
   - `components/features/auth/UserMenu.tsx`: remove the banner-specific
     early return.
2. **Remove the guards.**
   - `lib/auth/session.ts`: `requireAdmin()` only checks that the session exists
     and `role === 'admin'`; the `impersonatedBy` branch goes away.
   - `app/api/auth/[...all]/route.ts`: drop the custom wrapper and export
     `toNextJsHandler(auth)` directly.
3. **Disable the endpoints at the auth router.**
   - `lib/auth.ts`: add
     `disabledPaths: ['/admin/impersonate-user', '/admin/stop-impersonating']`
     and remove `impersonationSessionDuration`. `disabledPaths` is checked
     before authentication, so both routes return 404 even for an admin.
   - Keep the admin plugin itself: it supplies `role`, `banned`, and
     `auth.api.listUsers`, which `/admin` still uses.
4. **Keep the database column.**
   - `session.impersonated_by` stays in the Drizzle schema and the existing
     migration. The admin plugin's schema includes the field, and removing it
     would require dropping a column from a plugin-owned table for no product
     benefit. Note in the schema comment that it is currently unused.
5. **Docs.**
   - `AGENTS.md`: remove the impersonation description from the auth section.
   - Mark the impersonation parts of the older plans as superseded/deferred.
   - Add this plan.

## Alternative considered

**Hide the UI but leave the endpoints enabled.** Rejected: the endpoints would
remain reachable with an admin session, so the risky half of the feature would
still exist. Disabling the paths is a two-line change and removes the API
surface, not just the buttons.

**Keep impersonation behind a feature flag.** Rejected: it is explicitly
deferred, and a flag would preserve the same cookie-swapping complexity plus a
second code path. Rebuilding it from scratch later is simpler.

## Files affected

- `app/(app)/actions.ts` (delete)
- `components/features/auth/ImpersonationBanner.tsx` (delete)
- `app/(app)/layout.tsx`
- `app/(app)/admin/page.tsx`
- `components/features/admin/AdminUsers.tsx`
- `components/features/auth/UserMenu.tsx`
- `lib/auth/session.ts`
- `lib/auth.ts`
- `app/api/auth/[...all]/route.ts`
- `lib/db/auth-schema.ts` (comment only)
- `AGENTS.md`
- `.agents/plans/2026-11-07-remove-impersonation.md` (this file)

## Acceptance criteria

- No application code imports or calls impersonation actions/components/APIs.
- `/admin` lists accounts with role and ban badges and has no "View as" action.
- `POST /api/auth/admin/impersonate-user` and
  `POST /api/auth/admin/stop-impersonating` return **404**, while other admin
  endpoints still return an auth error rather than 404.
- An admin can still load `/admin`; a non-admin is still redirected.
- `npx tsc --noEmit` and `pnpm build` pass.

## Risks and open questions

- **Existing impersonation sessions.** Anyone currently impersonating has a
  session row with `impersonated_by` set and can no longer call
  `stop-impersonating`. They must sign out and sign in again. This only affects
  local/PR environments today.
- **Dormant column.** `session.impersonated_by` remains in the database. If
  impersonation is designed again, it can reuse or drop it in that migration.
- **Plugin surface.** The admin plugin still exposes in-process
  `auth.api.impersonateUser`, but no code calls it and its HTTP routes are
  disabled. If that is not acceptable later, replace the admin plugin's role
  handling with app-owned queries.
