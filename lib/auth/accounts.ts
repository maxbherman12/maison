import 'server-only';
import { headers } from 'next/headers';
import { asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { devImpersonationUserId } from '@/lib/auth/dev-mode';
import { user as userTable } from '@/lib/db/auth-schema';
import { db } from '@/lib/db/client';

export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
}

/**
 * Lists accounts for `/admin`. In dev-impersonation mode there is no real
 * Better Auth session for the admin endpoints to authorize, so read the same
 * rows directly. The page remains read-only because the impersonation action
 * is disabled in that mode.
 */
export async function listAccounts(): Promise<AccountSummary[]> {
  if (devImpersonationUserId()) {
    return db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        banned: userTable.banned,
      })
      .from(userTable)
      .orderBy(asc(userTable.createdAt));
  }

  const { users } = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: 100,
      sortBy: 'createdAt',
      sortDirection: 'asc',
    },
  });

  return users;
}
