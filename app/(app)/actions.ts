'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth/session';
import { user } from '@/lib/db/auth-schema';
import { db } from '@/lib/db/client';

/**
 * Starts a one-hour impersonation session. The plugin swaps the active session
 * cookie and keeps the admin session in a signed cookie so it can be restored.
 */
export async function impersonate(
  userId: string
): Promise<{ error: string } | undefined> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { error: 'You are already signed in as this account.' };
  }

  const [target] = await db
    .select({
      id: user.id,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!target) return { error: 'Account not found.' };
  if (target.role === 'admin') {
    return { error: 'Admin accounts cannot be impersonated.' };
  }
  if (target.banned) return { error: 'Banned accounts cannot be impersonated.' };

  await auth.api.impersonateUser({
    body: { userId },
    headers: await headers(),
  });

  revalidatePath('/', 'layout');
  redirect('/projects');
}

export async function stopImpersonating(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.session.impersonatedBy) {
    redirect('/projects');
  }

  await auth.api.stopImpersonating({ headers: await headers() });

  revalidatePath('/', 'layout');
  redirect('/projects');
}
