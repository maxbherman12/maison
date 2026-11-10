import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * The in-page way back on sub-routes. The menu bar is uniform across the app,
 * so pages own their own navigation instead of putting it in the header.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft
        className="size-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
