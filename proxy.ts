import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Fast page-level gate. This only checks that a session cookie exists; the
 * real verification (signature, expiry, allowlist, ban) happens in
 * `lib/auth/session.ts` on the server.
 *
 * API routes are deliberately excluded: they return JSON 401s themselves
 * instead of redirecting a fetch to an HTML sign-in page.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }

  const signInUrl = new URL('/sign-in', request.url);
  signInUrl.searchParams.set(
    'next',
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ['/projects/:path*', '/admin/:path*'],
};
