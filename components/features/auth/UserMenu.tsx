'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Users } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending || !session) return null;

  // The impersonation banner owns the header in this state.
  if (session.session.impersonatedBy) return null;

  const isAdmin = session.user.role === 'admin';

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      {isAdmin ? (
        <Link
          href="/admin"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <Users className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Accounts</span>
        </Link>
      ) : null}

      <span className="hidden max-w-[18ch] truncate text-sm text-muted-foreground lg:block">
        {session.user.name}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        title="Sign out"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
