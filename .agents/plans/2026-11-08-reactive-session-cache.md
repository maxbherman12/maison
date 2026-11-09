# Make React Query follow the signed-in user

**Status:** Implemented — awaiting review

Related: `2026-11-08-dev-auth-impersonation.md`

## Problem

Admin impersonation swaps the Better Auth session cookie on the server, but the
client keeps showing the previous account until a full page refresh. Two caches
are responsible:

1. `authClient.useSession()` stores the session in a module-level atom. The
   current impersonation server action calls `auth.api.impersonateUser()`
   directly, so Better Auth's client atom listener never sees
   `/admin/impersonate-user` and never refetches. The user menu keeps the old
   account.
2. React Query keys are global (`['projects']`, `['invoices', ...]`) and the
   query client is created once at the root. Cached rows from the admin account
   stay fresh for five minutes, so navigating to `/projects` renders the old
   account's data. A refresh creates a new query client and hides the problem.

The result is that services are owner-scoped on the server, but client data is
not scoped to the user who requested it.

## Desired outcome

The signed-in user becomes the base dependency for client data:

- Every project/invoice query key includes the session user id.
- Changing the session user clears the old query cache and refetches through
  the new cookie.
- The user menu reacts to the session change without a manual refresh.
- Signing out and signing in as another account cannot reuse the previous
  account's cached rows.

## Approach

1. **Use the Better Auth client for impersonation.**
   - Replace the `impersonate` and `stopImpersonating` server actions in
     `AdminUsers` / `ImpersonationBanner` with
     `authClient.admin.impersonateUser()` and
     `authClient.admin.stopImpersonating()`.
   - The admin plugin's client already notifies `$sessionSignal` for both
     routes, so the session atom refetches and the user menu updates.
   - The auth route wrapper still enforces the real admin session and blocks
     nested impersonation. The admin UI already disables admin/banned targets.
   - In `IMPERSONATE_USER` dev mode there is no real Better Auth session, so the
     admin page disables the action with an explanatory note instead of calling
     the endpoint.

2. **Introduce a session user provider.**
   - `app/(app)/layout.tsx` passes the verified server user id into a client
     `SessionProvider`.
   - The provider reads `authClient.useSession()` and falls back to the
     server-provided id while the client session is loading.
   - When the effective user id changes, it clears the React Query cache and
     notifies the session signal if the change came from a server render.

3. **Scope query keys by user.**
   - Add `useSessionUserId()` and `userScopedKey(userId, key)` in
     `lib/query/session.ts`.
   - Project and invoice query keys become
     `['session-user', userId, 'projects', ...]` and
     `['session-user', userId, 'invoices', ...]`.
   - Query hooks wait for a non-null user id; mutation invalidations use the
     same scope.

4. **Clear the cache on auth transitions.**
   - Impersonation and stop-impersonation clear React Query before navigating
     back to `/projects` and refresh the server layout so the banner updates.
   - Sign-out clears the cache before going to `/sign-in`.
   - `apiRequest` uses `cache: 'no-store'` so a browser-level cached GET body
     cannot survive the cookie change either.

5. **Remove the now-unused server actions.**
   - Delete `app/(app)/actions.ts` once both client surfaces call the Better
     Auth client directly.
   - Keep `blockImpersonatedAdminCall` in the auth route: it is still the guard
     against an impersonated session starting another impersonation.

## Alternative considered

**Keep the server actions and manually notify `$sessionSignal`.** Rejected:
it duplicates what the admin plugin client already does, keeps a parallel
impersonation path, and still relies on the server action finishing before the
client can update its atom. The client endpoint is the intended Better Auth
flow.

**Only call `queryClient.clear()` after impersonation.** Rejected as the sole
fix: it repairs the current screen, but future query keys would still be
account-independent and another auth transition could leak cached data. Key
scoping makes the dependency explicit.

**Reload the page after impersonation.** Rejected: it is the workaround the
user already has, and it throws away the app's client state instead of making
auth changes reactive.

## Files affected

- `app/(app)/layout.tsx`
- `app/(app)/actions.ts` (delete)
- `app/(app)/admin/page.tsx`
- `components/features/admin/AdminUsers.tsx`
- `components/features/auth/ImpersonationBanner.tsx`
- `components/features/auth/UserMenu.tsx`
- `lib/auth/session-provider.tsx` (new)
- `lib/query/session.ts` (new)
- `lib/query/projects.ts`
- `lib/query/invoices.ts`
- `lib/api/client.ts`
- `AGENTS.md` if the admin/dev-mode notes need updating

## Acceptance criteria

- Clicking **View as** switches the user menu, project list, project detail, and
  invoice data without a browser refresh.
- **Return to admin** restores the admin view without a refresh.
- Signing out and back in as a different account never shows the previous
  account's cached data.
- In `IMPERSONATE_USER` dev mode, `/admin` remains read-only with a clear note.
- `npx tsc --noEmit` and `pnpm build` pass.

## Risks and open questions

- Query keys now contain a user id, so any future query hook must remember to
  use `userScopedKey`. A shared helper keeps this visible.
- The session provider clears the whole query cache on a user change. That is
  intentional: no domain data should survive an identity change.
- Client-side impersonation relies on Better Auth's admin endpoint and cookie
  handling, which the route wrapper already guards.
