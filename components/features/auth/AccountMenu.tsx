'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, LogOut, Settings, UserRound } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useServerSession } from '@/lib/auth/session-provider';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * The single account entry point in the app header. Settings is always
 * available; admin access and sign-out depend on the current session. While
 * impersonating, the banner owns returning to the admin account, so this menu
 * deliberately does not offer a no-op sign-out.
 *
 * The session comes from Better Auth's client atom, falling back to the
 * verified server session until that loads — which also keeps the menu visible
 * under the `IMPERSONATE_USER` dev override, where no client session exists.
 */
export function AccountMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const serverSession = useServerSession();
  const [signedOut, setSignedOut] = useState(false);

  const user = session?.user ?? serverSession?.user;
  const impersonatedBy =
    session?.session.impersonatedBy ?? serverSession?.session.impersonatedBy;

  if (signedOut || !user) return null;

  const isAdmin = user.role === 'admin' && !impersonatedBy;

  async function handleSignOut() {
    setSignedOut(true);
    await authClient.signOut();
    queryClient.clear();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        title="Account"
        className={buttonVariants({ variant: 'ghost', size: 'icon' })}
      >
        <UserRound className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLinkItem
          href="/settings"
          render={<Link href="/settings" />}
        >
          <Settings aria-hidden="true" />
          Settings
        </DropdownMenuLinkItem>

        {isAdmin ? (
          <DropdownMenuLinkItem href="/admin" render={<Link href="/admin" />}>
            <LayoutDashboard aria-hidden="true" />
            Admin Dashboard
          </DropdownMenuLinkItem>
        ) : null}

        {!impersonatedBy ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
