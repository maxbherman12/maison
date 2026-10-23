import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  header: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

/**
 * The single page frame for the app.
 *
 * The header lives outside the scroll container, so it stays put without
 * `position: fixed`. Everything below it scrolls inside one `<main>`; routes
 * must not add their own `overflow-y-auto` or full-height wrappers.
 */
export function AppShell({ header, children, contentClassName }: AppShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f7f6f2] text-[#292923]">
      {header}
      <main
        data-app-scroll
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div
          className={cn(
            'mx-auto w-full max-w-[1380px] px-4 pt-8 pb-[calc(2rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:px-8',
            contentClassName
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
