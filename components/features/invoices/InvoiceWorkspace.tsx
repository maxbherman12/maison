'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import type { Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import {
  billableRowKey,
  buildBillableRows,
  buildSelectedLineItems,
} from '@/lib/billing';
import { useProject } from '@/lib/query/projects';
import { useGenerateInvoice } from '@/lib/query/invoices';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InvoicePreview } from './InvoicePreview';
import { InvoiceItemSidebar } from './InvoiceItemSidebar';
import {
  InvoiceMobileTabs,
  type InvoiceMobileTab,
} from './InvoiceMobileTabs';
import { EditBillableItemSheet } from './EditBillableItemSheet';

interface InvoiceWorkspaceProps {
  project: Project;
  issueDate: string;
}

export function InvoiceWorkspace({
  project,
  issueDate,
}: InvoiceWorkspaceProps) {
  const router = useRouter();
  const { data: liveProject = project } = useProject(project.id, project);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState<InvoiceMobileTab>('preview');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const rows = useMemo(() => buildBillableRows(liveProject), [liveProject]);

  const includedKeys = useMemo(
    () =>
      new Set(
        rows.filter((row) => !excluded.has(billableRowKey(row))).map((row) =>
          billableRowKey(row)
        )
      ),
    [excluded, rows]
  );

  const lineItems = useMemo(
    () => buildSelectedLineItems(liveProject, includedKeys),
    [includedKeys, liveProject]
  );
  const total = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.amount, 0),
    [lineItems]
  );

  const generate = useGenerateInvoice({
    onSuccess: (invoice) => {
      router.push(`/projects/${project.id}/invoices/${invoice.id}`);
    },
  });

  const editingRow = editingKey
    ? rows.find((row) => billableRowKey(row) === editingKey)
    : undefined;

  useEffect(() => {
    if (editingKey && !editingRow) setEditingKey(null);
  }, [editingKey, editingRow]);

  const toggleRow = (key: string) => {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerate = () => {
    generate.mutate({
      projectId: project.id,
      items: lineItems.map((item) => ({ id: item.id, source: item.source })),
    });
  };

  const error =
    generate.error instanceof Error ? generate.error.message : null;

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-dashed border-[#deddd5] bg-[#fbfaf7] p-8 text-center sm:p-12">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
            {project.client}
          </p>
          <h1 className="mt-2 font-serif text-3xl">Nothing to invoice</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-[#85857a]">
            Every logged hour and furniture item on this project has already
            been invoiced.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/projects/${project.id}/log`}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 rounded-xl px-4'
              )}
            >
              Log work
            </Link>
            <Link
              href={`/projects/${project.id}/invoices`}
              className={cn(
                buttonVariants(),
                'h-11 rounded-xl bg-[#bd765b] px-4 text-white hover:bg-[#a9573d]'
              )}
            >
              Invoice history
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1380px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
            {project.client}
          </p>
          <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
            New invoice
          </h1>
          <p className="mt-2 text-sm text-[#85857a]">
            Preview the invoice and choose what to bill for{' '}
            <strong>{project.project}</strong>.
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/invoices`}
          className="inline-flex items-center gap-1.5 text-sm text-[#bd765b] hover:underline"
        >
          Invoice history <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-6 lg:hidden">
        <InvoiceMobileTabs value={tab} onChange={setTab} />
      </div>

      {error && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#c98973] bg-[#fbf0eb] px-4 py-3 text-sm text-[#a9573d] sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending || lineItems.length === 0}
            className="shrink-0 text-left font-medium underline disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-6 pb-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section
          id="invoice-panel-preview"
          role="tabpanel"
          aria-labelledby="invoice-tab-preview"
          className={cn(tab === 'preview' ? 'block' : 'hidden', 'lg:block')}
        >
          <InvoicePreview
            project={liveProject}
            lineItems={lineItems}
            issueDate={issueDate}
          />
        </section>

        <aside
          id="invoice-panel-items"
          role="tabpanel"
          aria-labelledby="invoice-tab-items"
          className={cn(tab === 'items' ? 'block' : 'hidden', 'lg:block')}
        >
          <InvoiceItemSidebar
            rows={rows}
            includedKeys={includedKeys}
            total={total}
            onToggle={toggleRow}
            onSelectAll={() => setExcluded(new Set())}
            onClearAll={() =>
              setExcluded(new Set(rows.map((row) => billableRowKey(row))))
            }
            onEdit={(row) => setEditingKey(billableRowKey(row))}
          />
        </aside>
      </div>

      {lineItems.length === 0 && (
        <p className="mb-4 text-center text-sm text-[#85857a]">
          Select at least one item to generate an invoice.
        </p>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-[#deddd5] bg-[#f7f6f2]/95 px-4 py-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-2xl lg:border lg:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
              Included
            </p>
            <p className="text-sm font-medium">
              {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'} ·{' '}
              <span className="font-serif text-lg">{formatMoney(total)}</span>
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending || lineItems.length === 0}
            className="h-11 w-full rounded-xl bg-[#bd765b] px-5 text-white hover:bg-[#a9573d] sm:w-auto"
          >
            {generate.isPending ? 'Generating...' : 'Generate invoice'}
          </Button>
        </div>
      </div>

      {editingRow && (
        <EditBillableItemSheet
          project={liveProject}
          row={editingRow}
          onClose={() => setEditingKey(null)}
        />
      )}
    </div>
  );
}
