'use client';

import { useState, useTransition } from 'react';
import { impersonate } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
}

interface AdminUsersProps {
  users: AdminUserRow[];
  currentUserId: string;
}

export function AdminUsers({ users, currentUserId }: AdminUsersProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleImpersonate(userId: string) {
    setError(null);
    setPendingId(userId);

    startTransition(async () => {
      const result = await impersonate(userId);
      if (result?.error) {
        setError(result.error);
        setPendingId(null);
      }
    });
  }

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        No accounts yet. The first person to sign in with an allowed email will
        appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {users.map((account) => {
          const isSelf = account.id === currentUserId;
          const isAdmin = account.role === 'admin';
          const disabled =
            isSelf || isAdmin || account.banned || pendingId !== null;

          return (
            <li
              key={account.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
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
