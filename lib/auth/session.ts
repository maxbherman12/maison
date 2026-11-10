import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { getDevImpersonationSession } from '@/lib/auth/dev-impersonation';
import { auth } from '@/lib/auth/server';

/**
 * Reads the session and rejects identities that are no longer authorized. The
 * allowlist is re-checked here, not only at account creation, so removing an
 * email locks out existing cookies on their next request. There is no cookie
 * cache, so `role` is always read fresh.
 *
 * Memoised per request: the layout and the page both need it.
 *
 * `IMPERSONATE_USER` is a development-only override that skips these checks;
 * production ignores the variable entirely.
 */
export const getSession = cache(async () => {
  const devSession = await getDevImpersonationSession();
  if (devSession) return devSession;

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;
  if (session.user.banned) return null;
  if (!isAllowedEmail(session.user.email)) return null;

  return session;
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  return session;
}

export async function requireUser() {
  const { user } = await requireSession();
  return user;
}

/**
 * Admin-only entry points. Impersonation is refused here so an impersonated
 * session cannot start another impersonation.
 */
export async function requireAdmin() {
  const { user, session } = await requireSession();
  if (session.impersonatedBy || user.role !== 'admin') redirect('/projects');
  return user;
}
