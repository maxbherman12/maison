import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { isAdminEmail, isAllowedEmail } from '@/lib/auth/allowlist';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/auth-schema';
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

  // Keep the database role aligned with `ADMIN_EMAILS`, in both directions.
  // Better Auth's admin plugin authorizes its own endpoints against this
  // column, so a promotion must take effect without waiting for a new sign-in
  // and a demotion must remove the privilege. This only writes on a change.
  const shouldBeAdmin = isAdminEmail(session.user.email);
  if (shouldBeAdmin && session.user.role !== 'admin') {
    await db
      .update(user)
      .set({ role: 'admin' })
      .where(eq(user.id, session.user.id));
  } else if (!shouldBeAdmin && session.user.role === 'admin') {
    await db
      .update(user)
      .set({ role: 'user' })
      .where(eq(user.id, session.user.id));
  }

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
  if (!isAdminEmail(session.user.email)) redirect('/projects');

  return session.user;
}
