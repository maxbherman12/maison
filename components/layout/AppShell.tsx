import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppHeader } from './AppHeader';

interface AppShellProps {
  children: ReactNode;
  contentClassName?: string;
  /**
   * Fill the viewport instead of letting `<main>` scroll. Use for routes whose
   * panels own their internal scroll (project detail, invoices, composer).
   * Every `overflow-y-auto` child must be inside a `min-h-0` flex chain.
   */
  fill?: boolean;
}

/**
 * The single page frame for the app. It renders the uniform menu bar itself,
 * so no route can add controls to the header. By default everything below it
 * scrolls inside one `<main>`; fill routes instead give that height to their
 * own panels. Routes must not add full-height page wrappers.
 */
export function AppShell({
  children,
  contentClassName,
  fill = false,
}: AppShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <AppHeader />
      <main
        data-app-scroll
        className={cn(
          'relative min-h-0 flex-1',
          fill
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto overscroll-contain'
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-[1380px] px-4 pt-8 pb-[calc(2rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:px-8',
            fill && 'flex min-h-0 flex-1 flex-col',
            contentClassName
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
