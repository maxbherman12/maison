'use client';

import Link from 'next/link';
import { FilePlus2 } from 'lucide-react';
import type { Invoice, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { buildBillableRows, buildPendingTotal } from '@/lib/billing';
import { useProject } from '@/lib/query/projects';
import { useInvoices } from '@/lib/query/invoices';
import { buttonVariants } from '@/components/ui/button';
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
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
            {project.client}
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-[#85857a]">
            History for <strong>{project.project}</strong>.
          </p>
        </div>
        {canInvoice ? (
          <Link
            href={newInvoiceHref}
            className={cn(
              buttonVariants(),
              'h-11 rounded-xl bg-[#bd765b] px-4 text-white hover:bg-[#a9573d]'
            )}
          >
            <FilePlus2 className="size-4" />
            New invoice
          </Link>
        ) : (
          <span className="rounded-xl border border-[#deddd5] bg-[#fbfaf7] px-4 py-3 text-sm text-[#85857a]">
            Everything is invoiced
          </span>
        )}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Summary label="Pending work" value={formatMoney(pendingTotal)} />
        <Summary label="Invoices" value={String(liveInvoices.length)} />
        <Summary label="Invoiced total" value={formatMoney(invoicedTotal)} />
      </div>

      <div className="mt-8">
        <InvoicesGrid
          invoices={liveInvoices}
          projectId={project.id}
          emptyAction={
            canInvoice ? (
              <Link
                href={newInvoiceHref}
                className={cn(
                  buttonVariants(),
                  'h-11 rounded-xl bg-[#bd765b] px-4 text-white hover:bg-[#a9573d]'
                )}
              >
                Create invoice
              </Link>
            ) : (
              <Link
                href={`/projects/${project.id}/log`}
                className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-xl')}
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
    <div className="rounded-2xl bg-[#ece9e0] px-4 py-4">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-[#99998e]">
        {label}
      </span>
      <strong className="mt-1.5 block font-serif text-2xl font-normal">
        {value}
      </strong>
    </div>
  );
}
