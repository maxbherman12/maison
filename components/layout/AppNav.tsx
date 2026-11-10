'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** The app's main pages. Add a page here and it appears on phone and desktop. */
const PAGES = [
  { href: '/projects', label: 'Clients' },
  { href: '/earnings', label: 'Earnings' },
];

/** On phones a project's painted wall replaces the header and the menu. */
export function useHidesPhoneChrome(): boolean {
  return usePathname().startsWith('/projects/');
}

function usePages() {
  const pathname = usePathname();
  return PAGES.map((page) => ({
    ...page,
    current: pathname.startsWith(page.href),
  }));
}

/** Text links beside the wordmark on desktop. */
export function HeaderNav() {
  return (
    <nav aria-label="Main" className="hidden gap-6 md:flex">
      {usePages().map(({ href, label, current }) => (
        <Link
          key={href}
          href={href}
          aria-current={current ? 'page' : undefined}
          className={cn(
            'transition-colors hover:text-foreground',
            current
              ? 'underline underline-offset-[6px]'
              : 'text-muted-foreground'
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** The bottom menu on phones. */
export function BottomNav() {
  const pages = usePages();
  const hidden = useHidesPhoneChrome();
  if (hidden) return null;

  return (
    <nav
      aria-label="Main"
      className="grid shrink-0 border-t border-border px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}
    >
      {pages.map(({ href, label, current }) => (
        <Link
          key={href}
          href={href}
          aria-current={current ? 'page' : undefined}
          className={cn(
            'flex h-14 items-center justify-center border-t-2 transition-colors',
            current
              ? 'border-foreground'
              : 'border-transparent text-muted-foreground'
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
