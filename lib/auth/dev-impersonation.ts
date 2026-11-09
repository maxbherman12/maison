import 'server-only';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { devImpersonationUserId, isUuid } from '@/lib/auth/dev-mode';
import { user as userTable } from '@/lib/db/auth-schema';
import { db } from '@/lib/db/client';

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

/**
 * Builds the same `{ session, user }` shape Better Auth returns, without
 * creating a session row or requiring an OAuth cookie.
 *
 * This is an explicit development override, so the allowlist and ban checks
 * are intentionally not applied here. Real sessions still go through them in
 * `getSession`.
 */
export async function getDevImpersonationSession(): Promise<BetterAuthSession | null> {
  const userId = devImpersonationUserId();
  if (!userId) return null;

  if (!isUuid(userId)) {
    throw new Error(
      `IMPERSONATE_USER must be a UUID. Received: ${userId}`
    );
  }

  const [account] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!account) {
    throw new Error(
      `IMPERSONATE_USER points to an unknown user id: ${userId}`
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);

  return {
    session: {
      id: crypto.randomUUID(),
      token: `dev-${account.id}`,
      userId: account.id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
      impersonatedBy: null,
    },
    user: account,
  } as BetterAuthSession;
}
