import Link from 'next/link';
import { AccountMenu } from '@/components/features/auth/AccountMenu';

/**
 * The application's single menu bar, identical on every page: the Maison
 * wordmark on the left, the account menu on the right. Nothing page-specific
 * lives here — routes own their back links, headings, and context. Only
 * `AppShell` renders this component.
 */
export function AppHeader() {
  return (
    <header className="shrink-0 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link
          href="/projects"
          className="font-serif text-2xl tracking-tight transition-colors hover:text-primary"
        >
          Maison
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
