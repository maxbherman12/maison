import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { AppError } from '@/lib/errors';

/**
 * Reads the session and rejects identities that are no longer authorized.
 * The allowlist is re-checked here (not only at account creation) so removing
 * an email from the environment locks out existing cookies immediately.
 */
export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;
  if (session.user.banned) return null;
  if (!isAllowedEmail(session.user.email)) return null;

  // The session deliberately has no cookie cache, so `role` is re-read from
  // the database on every request. A promotion or demotion takes effect
  // immediately.
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  return session;
}

export async function requireUser() {
  const { user: currentUser } = await requireSession();
  return currentUser;
}

/** Route-handler variant: throws instead of redirecting. */
export async function requireApiUser() {
  const session = await getSession();
  if (!session) throw new AppError('Unauthorized', 401);
  return session.user;
}

/**
 * Admin-only entry points. Impersonation is refused here so an impersonated
 * session cannot start another impersonation.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.session.impersonatedBy) redirect('/projects');
  if (session.user.role !== 'admin') redirect('/projects');

  return session.user;
}
