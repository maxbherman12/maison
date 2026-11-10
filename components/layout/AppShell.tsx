import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppHeader } from './AppHeader';
import { BottomNav } from './AppNav';

interface AppShellProps {
  children: ReactNode;
  /**
   * Fill the viewport edge to edge instead of letting `<main>` scroll. Use for
   * routes whose panels own their internal scroll. Every `overflow-y-auto`
   * child must be inside a `min-h-0` flex chain.
   */
  fill?: boolean;
}

/** The single page frame. Routes must not add full-height page wrappers. */
export function AppShell({ children, fill = false }: AppShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
      <AppHeader />
      <main
        data-app-scroll
        className={cn(
          'relative min-h-0 flex-1',
          fill
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto overscroll-contain px-6 py-8'
        )}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
