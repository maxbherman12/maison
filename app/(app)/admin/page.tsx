import type { Metadata } from 'next';
import { AdminUsers } from '@/components/features/admin/AdminUsers';
import { AppShell } from '@/components/layout/AppShell';
import { listAccounts } from '@/lib/auth/accounts';
import { devImpersonationUserId } from '@/lib/auth/dev-mode';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Accounts · Maison',
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = await listAccounts();
  const impersonationEnabled = !devImpersonationUserId();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Admin
        </span>
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
          Accounts
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {impersonationEnabled
            ? 'View another account to see exactly what they see. Impersonation lasts up to one hour; use “Return to admin” to come back.'
            : 'IMPERSONATE_USER controls the active account in this environment. Change it and restart the dev server to switch accounts.'}
        </p>
        <div className="mt-8">
          <AdminUsers
            users={users}
            currentUserId={admin.id}
            impersonationEnabled={impersonationEnabled}
          />
        </div>
      </div>
    </AppShell>
  );
}
