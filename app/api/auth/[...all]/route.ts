import { toNextJsHandler } from 'better-auth/next-js';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/auth/allowlist';

const handlers = toNextJsHandler(auth);

/**
 * Better Auth authorizes its `/admin/*` endpoints against the database role,
 * not against `ADMIN_EMAILS`. The server actions already gate on the env list,
 * but without this wrapper a session whose email was removed from
 * `ADMIN_EMAILS` could still call the endpoints directly with a stale admin
 * role. Re-check the env here, and refuse while impersonating so sessions
 * cannot chain.
 */
async function blockUnauthorizedAdminCall(
  request: Request
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/api/auth/admin/')) return null;
  // Restoring the admin session is safe (it needs the saved admin cookie) and
  // is the one admin call an impersonated session must be allowed to make.
  if (pathname.endsWith('/stop-impersonating')) return null;

  const session = await auth.api.getSession({ headers: request.headers });

  if (
    !session ||
    session.session.impersonatedBy ||
    !isAdminEmail(session.user.email)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function GET(request: Request) {
  return (await blockUnauthorizedAdminCall(request)) ?? handlers.GET(request);
}

export async function POST(request: Request) {
  return (await blockUnauthorizedAdminCall(request)) ?? handlers.POST(request);
}
