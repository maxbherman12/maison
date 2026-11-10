# App header and account menu

**Status:** Draft for review

## Problem

The auth and impersonation work added controls to the top bar that do not match
the rest of Maison: an "Accounts" link for admins, a standalone sign-out icon,
and a "New project" button that only belongs on the project list. The header is
also inconsistent across routes: the project list shows the Maison wordmark,
while project and admin pages replace it with a back link. The result is a
header that changes shape per page and carries actions that are not global.

Desired outcome: one quiet, modern application header.

- Maison wordmark on the left on every page, linking to `/projects`.
- A single person icon on the right that opens an account menu:
  - Settings (new placeholder page)
  - Admin Dashboard, only for admins
  - Sign out
- No standalone Accounts or sign-out buttons.
- No New project button in the header; it moves onto the projects page.

## Proposed approach

### 1. Make `AppHeader` the global header

`components/layout/AppHeader.tsx` always renders the Maison wordmark linking to
`/projects`. The existing optional `back` link, `title`, `context`, and
page-specific `actions` slot (currently only "Invoice history" on the composer)
remain after the wordmark, separated by a subtle divider on wider screens. This
keeps project and admin pages oriented without letting them replace the global
brand, while the only *global* action is the account menu.

Remove the `brand` prop (the brand is no longer optional). Keep `actions` for
contextual page links, but stop using it for global account controls or the New
project button. Update `ProjectShell` and the admin page to match.

Suggested left-side hierarchy:

```
Maison  |  ← All projects   Project name                 Client — Project
```

On narrow screens the context stays hidden (as today) and the title truncates.

### 2. Replace `UserMenu` with `AccountMenu`

New `components/features/auth/AccountMenu.tsx`, built on `@base-ui/react/menu`
(already a dependency, already used by `Button`). It renders a ghost icon button
with `UserRound` and an accessible label ("Account menu").

Menu contents:

- **Settings** — link to `/settings`.
- **Admin Dashboard** — link to `/admin`, only when
  `session.user.role === 'admin'` and the session is not impersonated.
- **Sign out** — calls `authClient.signOut()`, clears the React Query cache,
  and routes to `/sign-in`. Hidden while impersonating because sign-out is a
  no-op in the dev override and the banner owns returning to the admin account.

Settings and Admin are links (`Menu.LinkItem`) so they support open-in-new-tab;
Sign out is a `Menu.Item`. A separator separates navigation from the destructive
action. The menu shows only the requested actions; account identity stays out of
it so the popup keeps clean `menu`/`menuitem` semantics.

`UserMenu.tsx` is deleted.

Session source: Better Auth's client atom, with a fallback to the verified
server session until the atom loads. `SessionProvider` (`lib/auth/session-provider.tsx`)
already bridges the server identity for React Query; extend it to expose the
minimal server session (id, name, email, role, impersonation state) via
`useServerSession()`. This covers two cases: the first paint before the atom
loads (no menu pop-in, and the icon server-renders), and the development-only
`IMPERSONATE_USER` override, where no client-side session exists at all —
without the fallback the menu would be invisible in local development.

Impersonation: the account menu stays visible (unlike today, where the whole
menu disappears), but while impersonating shows only Settings. The existing
`ImpersonationBanner` remains the way back to the admin account. The menu must
not expose Admin Dashboard while impersonating, because `requireAdmin()`
redirects impersonated sessions anyway.

### 3. Add a placeholder settings page

`app/(app)/settings/page.tsx` — a Server Component wrapped in `AppShell` with
`AppHeader` (brand + "Settings" title). Show a short "Settings are coming soon"
panel using existing card/border tokens. Add `metadata` with a title. No data
access, so the authenticated layout still guards the route.

### 4. Move New project onto the projects page

`ProjectsListClient` stops passing the button through `AppHeader.actions`.
Instead, pass `onCreate` to `ProjectList`, which renders a page-level row:

```
All projects                         [+ New project]
```

The button keeps the existing default variant and opens `ProjectOnboard`. While
the onboarding form is open the button is not rendered, matching today's header
behaviour.

### 5. Dropdown primitive

Add a small `components/ui/dropdown-menu.tsx` wrapper around Base UI Menu with
styled `Trigger`, `Content`, `Item`, `LinkItem`, and `Separator`. Keeping the
popup styling in `components/ui` matches the existing primitives and keeps
`AccountMenu` focused on session logic. Styling uses the app's existing tokens
(`bg-popover`, `border-border`, `rounded-2xl`, `shadow-lg`, `data-highlighted`).

## Alternatives considered

- **Keep the current per-page header and only swap the right-side controls.**
  Rejected: it leaves project pages without the Maison wordmark, so the "global
  menu bar" still changes shape per route and the header remains a mix of global
  and page-specific chrome.
- **Put the account menu inside `ProjectShell` / each page.** Rejected: the
  account menu is application-wide; duplicating it would let pages drift.
- **Keep New project in the header but hide it outside `/projects`.** Rejected:
  it is still page content living in global chrome; the user asked for it on the
  projects page.
- **Use a custom popover instead of Base UI Menu.** Rejected: Base UI already
  provides keyboard navigation, outside-click dismissal, focus return, and
  screen-reader semantics. Hand-rolling those would add code and bugs.
- **Show a disabled Sign out while impersonating.** Rejected: a dead control is
  worse than omitting it; the banner already provides the correct action.

## Files and modules affected

- `components/layout/AppHeader.tsx` — global brand, remove `brand`; keep
  contextual `actions`.
- `components/layout/ProjectShell.tsx` — keep `actions` passthrough, update
  header usage.
- `components/features/auth/AccountMenu.tsx` — new session-aware menu.
- `components/features/auth/UserMenu.tsx` — delete.
- `lib/auth/session-provider.tsx` — expose the verified server session via
  `useServerSession()`.
- `app/(app)/layout.tsx` — pass the session shape to `SessionProvider`.
- `components/ui/dropdown-menu.tsx` — new Base UI menu primitive.
- `app/(app)/settings/page.tsx` — new placeholder route.
- `components/features/projects/ProjectsListClient.tsx` — remove header action.
- `components/features/projects/ProjectList.tsx` — page-level New project button.
- `app/(app)/admin/page.tsx` — header no longer passes a back link that replaces
  the brand (it can keep "Accounts" as the title, or use "Admin").
- `.agents/plans/2026-11-08-app-header-account-menu.md` — this plan.

## Acceptance criteria

- Every authenticated page shows the Maison wordmark at the top left, and it
  links to `/projects`.
- The top right shows one person-icon trigger on every authenticated page.
- The menu shows Settings for everyone, Admin Dashboard only for admins, and
  Sign out for non-impersonated sessions.
- The account icon renders on the server (no pop-in after hydration) and stays
  visible under the `IMPERSONATE_USER` dev override.
- Settings opens a placeholder page; Admin opens `/admin`; Sign out returns to
  `/sign-in` and clears cached account data.
- The header no longer contains Accounts, Sign out, or New project controls.
- New project appears on the projects page and still opens the onboarding form.
- Impersonation still shows the banner, and the account menu does not offer
  admin access or a no-op sign-out.
- Project pages remain navigable back to their parent and keep their title and
  client context.
- `npx tsc --noEmit` and `pnpm build` pass.
- Manually verify the header at mobile and desktop widths, including keyboard
  open/close of the menu, Escape, and the impersonation state.

## Risks and open questions

- **Header density on mobile.** Adding the brand to project pages while keeping
  the back link, title, and account icon can crowd small screens. Mitigation:
  hide context below `sm`, truncate the title, and keep the back link compact.
- **Back-link duplication.** If the back label ("All projects") plus the brand
  feels redundant, a follow-up can turn the back link into an icon-only control
  on mobile or a breadcrumb in content.
- **Settings scope.** The placeholder intentionally has no fields yet; the route
  exists so the menu has a real destination.
- **Impersonation menu.** Hiding Admin and Sign out is deliberate; if the user
  wants an in-menu "Return to admin" action, it can be added in a follow-up.
