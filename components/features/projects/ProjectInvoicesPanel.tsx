import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { totalCents } from '@/lib/domain/billing';
import { formatMoneyWhole } from '@/lib/domain/money';
import type { InvoiceListItem } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { InvoicesTable } from '@/components/features/invoices/InvoicesTable';

export function ProjectInvoicesPanel({
  projectId,
  invoices,
  hasPendingItems,
}: {
  projectId: string;
  invoices: InvoiceListItem[];
  hasPendingItems: boolean;
}) {
  const newInvoiceHref = `/projects/${projectId}/invoices/new`;
  const invoiced = invoices.map((invoice) => ({
    amountCents: invoice.totalCents,
  }));

  if (invoices.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="font-serif text-xl">No invoices yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Generated invoices appear here with their status, total, and dates.
        </p>
        <Link
          href={hasPendingItems ? newInvoiceHref : `/projects/${projectId}/log`}
          className={cn(buttonVariants(), 'mt-4')}
        >
          {hasPendingItems ? 'Create invoice' : 'Log work'}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} ·{' '}
          <span className="text-foreground">
            {formatMoneyWhole(totalCents(invoiced))}
          </span>
          <span className="hidden sm:inline"> invoiced</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/invoices`}
            className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-xs text-primary transition-colors hover:bg-accent sm:text-sm"
          >
            All invoices
            <ArrowUpRight className="size-3.5" />
          </Link>
          {hasPendingItems && (
            <Link
              href={newInvoiceHref}
              className={cn(buttonVariants(), 'px-3 text-xs sm:text-sm')}
            >
              New invoice
            </Link>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <InvoicesTable invoices={invoices} projectId={projectId} />
      </div>
    </div>
  );
}
