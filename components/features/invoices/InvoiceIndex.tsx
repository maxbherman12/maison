import Link from 'next/link';
import { FilePlus2 } from 'lucide-react';
import { buildBillableItems, totalCents } from '@/lib/domain/billing';
import { formatMoneyWhole, sumCents } from '@/lib/domain/money';
import type { InvoiceListItem, ProjectDetail } from '@/lib/domain/types';
import { BackLink } from '@/components/layout/BackLink';
import { buttonVariants } from '@/components/ui/button';
import { StatTile } from '@/components/ui/stat-tile';
import { cn } from '@/lib/utils';
import { InvoicesTable } from './InvoicesTable';

export function InvoiceIndex({
  project,
  invoices,
}: {
  project: ProjectDetail;
  invoices: InvoiceListItem[];
}) {
  const pending = buildBillableItems(project);
  const canInvoice = pending.length > 0;
  const newInvoiceHref = `/projects/${project.id}/invoices/new`;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <BackLink href={`/projects/${project.id}`} label={project.name} />
        {canInvoice ? (
          <Link
            href={newInvoiceHref}
            className={cn(buttonVariants(), 'h-10 shrink-0 px-3')}
          >
            <FilePlus2 className="size-4" />
            New invoice
          </Link>
        ) : invoices.length > 0 ? (
          <span className="shrink-0 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
            Everything invoiced
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Pending" value={formatMoneyWhole(totalCents(pending))} />
        <StatTile label="Invoices" value={String(invoices.length)} />
        <StatTile
          label="Invoiced"
          value={formatMoneyWhole(sumCents(invoices, (invoice) => invoice.totalCents))}
        />
      </div>

      {invoices.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="font-serif text-xl">No invoices yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Generated invoices appear here with their status, total, and dates.
          </p>
          <Link
            href={canInvoice ? newInvoiceHref : `/projects/${project.id}/log`}
            className={cn(buttonVariants(), 'mt-4 h-10 px-4')}
          >
            {canInvoice ? 'Create invoice' : 'Log work'}
          </Link>
        </div>
      ) : (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <InvoicesTable invoices={invoices} projectId={project.id} />
        </div>
      )}
    </div>
  );
}
