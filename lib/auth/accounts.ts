import 'server-only';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/session';
import { user } from '@/lib/db/auth-schema';
import { db } from '@/lib/db/client';

export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
}

/** Every account, for the admin page. */
export async function listAccounts(): Promise<AccountSummary[]> {
  await requireAdmin();

  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .orderBy(asc(user.createdAt));
}
