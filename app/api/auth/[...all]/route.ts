import { toNextJsHandler } from 'better-auth/next-js';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDevImpersonationSession } from '@/lib/auth/dev-impersonation';
import { devImpersonationUserId } from '@/lib/auth/dev-mode';

const handlers = toNextJsHandler(auth);

/**
 * `authClient.useSession()` reads the synthetic dev identity from the same
 * endpoint Better Auth uses, so the client menu agrees with the server.
 */
async function devSessionResponse(request: Request): Promise<Response | null> {
  if (!devImpersonationUserId()) return null;
  if (request.method !== 'GET' && request.method !== 'POST') return null;

  const { pathname } = new URL(request.url);
  if (pathname !== '/api/auth/get-session') return null;

  const session = await getDevImpersonationSession();
  if (!session) return null;

  return NextResponse.json(session, {
    headers: { 'cache-control': 'no-store' },
  });
}

/**
 * Better Auth's admin plugin already authorizes `/admin/*` against the
 * database `role`. This wrapper adds the one rule the plugin cannot express:
 * an impersonated session must not start another impersonation. Restoring the
 * admin session needs the saved admin cookie, so it is allowed through.
 */
async function blockImpersonatedAdminCall(
  request: Request
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/api/auth/admin/')) return null;
  if (pathname.endsWith('/stop-impersonating')) return null;

  const session = await auth.api.getSession({ headers: request.headers });

  if (
    !session ||
    session.session.impersonatedBy ||
    session.user.role !== 'admin'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  return (
    (await devSessionResponse(request)) ??
    (await blockImpersonatedAdminCall(request)) ??
    handlers.GET(request)
  );
}

export async function POST(request: Request) {
  return (
    (await devSessionResponse(request)) ??
    (await blockImpersonatedAdminCall(request)) ??
    handlers.POST(request)
  );
}
