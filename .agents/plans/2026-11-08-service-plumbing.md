# Request-scoped service plumbing

**Status:** Draft for review

## Problem

Every page and route handler that needs a service repeats the same two lines:

```ts
const user = await requireUser();            // or requireApiUser()
const { projectService } = servicesFor(user.id);
```

That is 15 files and 19 call sites. The repetition is noisy, and the pattern
makes it easy to pass something other than the authenticated id into
`servicesFor`. It also exports a factory that accepts any string, even though
the only safe caller is authenticated request code.

## Desired outcome

A caller asks for the services it needs and gets request-scoped, owner-bound
instances back:

```ts
const { projectService } = await getPageServices();   // pages / RSC
const { projectService } = await getApiServices();    // route handlers
```

Authentication and owner scoping happen inside the helper. Pages keep the
redirect-to-sign-in behaviour; route handlers keep the `AppError(401)`
behaviour. No app code constructs services from a raw id.

## Approach

1. **Make construction private.**
   - `lib/services/container.ts`: keep the existing `createServices(ownerId)`
     wiring, but stop exporting it. Only the two authenticated entry points are
     public.
2. **Add two entry points with the right failure modes.**
   - `getPageServices()` calls `requireUser()` and returns the services. Missing
     or revoked sessions redirect to `/sign-in`, exactly as today.
   - `getApiServices()` calls `requireApiUser()` and returns the services.
     Missing sessions throw `AppError(401)`, which the route handlers already
     pass to `errorResponse`.
   - Both build a fresh repository/service pair from the authenticated
     `user.id`. No unscoped path remains.
3. **Update call sites.**
   - Pages: replace `requireUser()` + `servicesFor(user.id)` with
     `await getPageServices()`.
   - Route handlers: replace `requireApiUser()` + `servicesFor(user.id)` with
     `await getApiServices()`.
   - Remove the now-unused `requireUser` / `requireApiUser` imports.
4. **Drop dead exports.**
   - `invoiceRenderer` and `blobStore` are re-exported from the container but
     used nowhere outside it; keep them module-private.
5. **Docs.** Update the architecture note in `AGENTS.md` so it describes the
   authenticated helpers rather than `servicesFor`.

## Alternative considered

**Keep `servicesFor(ownerId)` and only rename it.** Rejected: it does not remove
the per-file plumbing or the exported raw-id factory, which is the actual
complaint.

**One `getServices()` helper for both contexts.** Rejected: a route handler
must return 401 JSON, not a redirect. Detecting the context or catching a
Next.js redirect inside `errorResponse` would make the failure path implicit.

**AsyncLocalStorage request context.** Rejected: it hides the owner id behind
ambient state, adds lifecycle/debugging complexity, and does not buy anything
over an explicit helper called at the top of a request.

## Files affected

- `lib/services/container.ts`
- `app/(app)/projects/[id]/page.tsx`
- `app/(app)/projects/[id]/board/page.tsx`
- `app/(app)/projects/[id]/log/page.tsx`
- `app/(app)/projects/[id]/invoices/page.tsx`
- `app/(app)/projects/[id]/invoices/new/page.tsx`
- `app/(app)/projects/[id]/invoices/[invoiceId]/page.tsx`
- `app/api/projects/route.ts`
- `app/api/projects/[id]/route.ts`
- `app/api/projects/[id]/furniture/route.ts`
- `app/api/projects/[id]/furniture/[furnitureId]/route.ts`
- `app/api/projects/[id]/hours/route.ts`
- `app/api/projects/[id]/hours/[hourId]/route.ts`
- `app/api/invoices/route.ts`
- `app/api/invoices/[invoiceId]/route.ts`
- `app/api/invoices/[invoiceId]/pdf/route.ts`
- `AGENTS.md`

## Acceptance criteria

- No app code imports `servicesFor` or constructs a repository/service with a
  raw owner id.
- Pages and route handlers only call `getPageServices()` / `getApiServices()`;
  they no longer import `requireUser` / `requireApiUser`.
- Unauthenticated API calls still return 401 JSON; unauthenticated page loads
  still redirect to `/sign-in`.
- Data isolation is unchanged: each request's services are bound to the session
  user id.
- `npx tsc --noEmit` and `pnpm build` pass.

## Risks and open questions

- **Two entry points.** The page/API split mirrors the existing auth split. A
  future Server Action should use `getPageServices()` (redirect behaviour is
  acceptable there); if actions ever need a JSON failure, add a third variant
  rather than overloading the existing ones.
- **No per-request memoisation.** Each call constructs lightweight repositories
  and services; today every request calls it once.
- **Admin tooling.** `/admin` still uses `requireAdmin()` directly and does not
  need services, so it is untouched.
