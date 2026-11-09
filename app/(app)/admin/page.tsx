import type { Metadata } from 'next';
import { AdminUsers } from '@/components/features/admin/AdminUsers';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppShell } from '@/components/layout/AppShell';
import { listAccounts } from '@/lib/auth/accounts';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Accounts · Maison',
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  const users = await listAccounts();

  const rows = users.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role ?? 'user',
    banned: Boolean(account.banned),
  }));

  return (
    <AppShell
      header={
        <AppHeader
          back={{ href: '/projects', label: 'Projects' }}
          title="Accounts"
        />
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-4 text-sm text-muted-foreground">
          View another account to see exactly what they see. Impersonation lasts
          up to one hour; use “Return to admin” to come back.
        </p>
        <AdminUsers users={rows} currentUserId={admin.id} />
      </div>
    </AppShell>
  );
}
