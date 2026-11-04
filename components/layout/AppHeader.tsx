import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AppHeaderProps {
  /** Show the Maison wordmark instead of a back link. */
  brand?: boolean;
  back?: {
    href: string;
    label: string;
  };
  title?: string;
  /** Right-aligned context, e.g. "Client — Project". */
  context?: string;
  actions?: ReactNode;
}

export function AppHeader({
  brand,
  back,
  title,
  context,
  actions,
}: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <Link
              href={back.href}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-primary transition-colors hover:underline"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span className="truncate">{back.label}</span>
            </Link>
          )}

          {brand && (
            <Link
              href="/projects"
              className="font-serif text-2xl tracking-tight transition-colors hover:text-primary"
            >
              Maison
            </Link>
          )}

          {title && (
            <h1 className="truncate font-serif text-xl leading-tight sm:text-2xl">
              {title}
            </h1>
          )}
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {context && (
            <span className="hidden max-w-[42ch] truncate text-sm text-muted-foreground sm:block">
              {context}
            </span>
          )}
          {actions}
        </div>
      </div>
    </header>
  );
}
