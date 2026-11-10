'use client';

import Link from 'next/link';
import { AccountMenu } from '@/components/features/auth/AccountMenu';
import { cn } from '@/lib/utils';
import { HeaderNav, useHidesPhoneChrome } from './AppNav';

/** The wordmark, main pages, and account menu. Only `AppShell` renders this. */
export function AppHeader() {
  const hiddenOnPhone = useHidesPhoneChrome();

  return (
    <header
      className={cn(
        'shrink-0 pt-[env(safe-area-inset-top)] md:border-b md:border-border',
        hiddenOnPhone && 'max-md:hidden'
      )}
    >
      <div className="flex h-14 items-center justify-between pr-3 pl-6 md:h-15 md:pr-4.5 md:pl-7">
        <div className="flex items-center gap-9">
          <Link href="/projects" className="font-serif text-[1.625rem]">
            Maison
          </Link>
          <HeaderNav />
        </div>
        <AccountMenu />
      </div>
    </header>
  );
}
