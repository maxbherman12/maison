'use client';

import Link from 'next/link';
import { FilePlus2 } from 'lucide-react';
import type { Invoice, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { buildBillableRows, buildPendingTotal } from '@/lib/billing';
import { useProject } from '@/lib/query/projects';
import { useInvoices } from '@/lib/query/invoices';
import { buttonVariants } from '@/components/ui/button';
import { BackLink } from '@/components/layout/BackLink';
import { cn } from '@/lib/utils';
import { InvoicesGrid } from './InvoicesGrid';

interface InvoiceIndexProps {
  project: Project;
  invoices: Invoice[];
}

export function InvoiceIndex({ project, invoices }: InvoiceIndexProps) {
  const { data: liveProject = project } = useProject(project.id, project);
  const { data: liveInvoices = invoices } = useInvoices(project.id, invoices);

  const pendingRows = buildBillableRows(liveProject);
  const pendingTotal = buildPendingTotal(liveProject);
  const invoicedTotal = liveInvoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0
  );

  const newInvoiceHref = `/projects/${project.id}/invoices/new`;
  const canInvoice = pendingRows.length > 0;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <BackLink href={`/projects/${project.id}`} label={project.project} />
        {canInvoice ? (
          <Link
            href={newInvoiceHref}
            className={cn(buttonVariants(), 'h-10 shrink-0 px-3')}
          >
            <FilePlus2 className="size-4" />
            New invoice
          </Link>
        ) : liveInvoices.length > 0 ? (
          <span className="shrink-0 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
            Everything invoiced
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl bg-muted">
        <Summary label="Pending" value={formatMoney(pendingTotal)} />
        <Summary label="Invoices" value={String(liveInvoices.length)} />
        <Summary label="Invoiced" value={formatMoney(invoicedTotal)} />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <InvoicesGrid
          compact
          fill
          invoices={liveInvoices}
          projectId={project.id}
          emptyAction={
            canInvoice ? (
              <Link
                href={newInvoiceHref}
                className={cn(buttonVariants(), 'h-10 px-4')}
              >
                Create invoice
              </Link>
            ) : (
              <Link
                href={`/projects/${project.id}/log`}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-10'
                )}
              >
                Log work
              </Link>
            )
          }
        />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <span className="block truncate text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <strong className="mt-1 block truncate font-serif text-lg font-normal sm:text-xl">
        {value}
      </strong>
    </div>
  );
}
