'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AccountSummary } from '@/lib/auth/accounts';
import { authClient } from '@/lib/auth/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AdminUsersProps {
  users: AccountSummary[];
  currentUserId: string;
  /** False while IMPERSONATE_USER controls the dev session. */
  impersonationEnabled?: boolean;
}

export function AdminUsers({
  users,
  currentUserId,
  impersonationEnabled = true,
}: AdminUsersProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleImpersonate(userId: string) {
    setError(null);
    setPendingId(userId);

    startTransition(async () => {
      const { error: impersonationError } =
        await authClient.admin.impersonateUser({ userId });

      if (impersonationError) {
        setError(
          impersonationError.message ?? 'Unable to impersonate this account.'
        );
        setPendingId(null);
        return;
      }

      router.push('/projects');
      router.refresh();
    });
  }

  if (users.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No accounts yet. The first person to sign in with an allowed email will
        appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}

      <ul className="divide-y divide-border border-y border-border">
        {users.map((account) => {
          const isSelf = account.id === currentUserId;
          const isAdmin = account.role === 'admin';
          const disabled =
            !impersonationEnabled ||
            isSelf ||
            isAdmin ||
            account.banned ||
            pendingId !== null;

          return (
            <li
              key={account.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {account.name}
                  {isSelf ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      you
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {account.email}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isAdmin ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Admin
                  </span>
                ) : null}
                {account.banned ? (
                  <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    Banned
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  title={
                    !impersonationEnabled
                      ? 'IMPERSONATE_USER controls the active account in this environment.'
                      : undefined
                  }
                  onClick={() => handleImpersonate(account.id)}
                >
                  {pendingId === account.id ? 'Opening…' : 'View as'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
