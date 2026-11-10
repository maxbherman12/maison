import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-serif text-heading font-normal">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn&apos;t exist, or it belongs to another account.
        </p>
        <Link href="/projects" className={buttonVariants({ className: 'mt-6' })}>
          Back to projects
        </Link>
      </div>
    </AppShell>
  );
}
