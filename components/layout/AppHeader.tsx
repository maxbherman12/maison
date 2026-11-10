import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AccountMenu } from '@/components/features/auth/AccountMenu';

interface AppHeaderProps {
  back?: {
    href: string;
    label: string;
  };
  title?: string;
  /** Right-aligned context, e.g. "Client — Project". */
  context?: string;
  /** A page-specific action, such as a link to invoice history. */
  actions?: ReactNode;
}

/**
 * The application's single menu bar. The Maison wordmark always links home;
 * page-specific back links, titles, and context sit beside it rather than
 * replacing it. The account menu is the only global action.
 */
export function AppHeader({ back, title, context, actions }: AppHeaderProps) {
  const hasPageContext = Boolean(back || title);

  return (
    <header className="shrink-0 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/projects"
            className="shrink-0 font-serif text-2xl tracking-tight transition-colors hover:text-primary"
          >
            Maison
          </Link>

          {hasPageContext ? (
            <span
              aria-hidden="true"
              className="hidden h-5 w-px shrink-0 bg-border sm:block"
            />
          ) : null}

          {back ? (
            <Link
              href={back.href}
              aria-label={back.label}
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft
                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              <span className={title ? 'hidden truncate sm:inline' : 'truncate'}>
                {back.label}
              </span>
            </Link>
          ) : null}

          {title ? (
            <h1 className="truncate font-serif text-lg leading-tight sm:text-xl">
              {title}
            </h1>
          ) : null}
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {context ? (
            <span className="hidden max-w-[30ch] truncate text-sm text-muted-foreground lg:block">
              {context}
            </span>
          ) : null}
          {actions}
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
