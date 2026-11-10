'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Settings, UserRound } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { useClientSession } from '@/lib/auth/session-provider';
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
 * The single account entry point in the app header. While impersonating, the
 * banner owns returning to the admin account, so this menu does not offer a
 * sign-out.
 */
export function AccountMenu() {
  const router = useRouter();
  const { isAdmin, isImpersonating } = useClientSession();

  async function handleSignOut() {
    await authClient.signOut();
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

        {isAdmin && (
          <DropdownMenuLinkItem href="/admin" render={<Link href="/admin" />}>
            <LayoutDashboard aria-hidden="true" />
            Admin Dashboard
          </DropdownMenuLinkItem>
        )}

        {!isImpersonating && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
