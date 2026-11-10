'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, ListChecks } from 'lucide-react';
import { generateInvoice } from '@/lib/actions/invoices';
import { useAction } from '@/lib/actions/use-action';
import { buildBillableItems, totalCents } from '@/lib/domain/billing';
import { formatDate } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import type { ProjectDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { BackLink } from '@/components/layout/BackLink';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { EditItemSheet } from '@/components/features/billing/EditItemSheet';
import { InvoiceDocument } from './InvoiceDocument';
import { InvoiceItemSidebar } from './InvoiceItemSidebar';

type ComposerTab = 'preview' | 'items';

const TABS: { value: ComposerTab; label: string; icon: ReactNode }[] = [
  { value: 'preview', label: 'Preview', icon: <Eye className="size-4" /> },
  { value: 'items', label: 'Items', icon: <ListChecks className="size-4" /> },
];

const PANEL_CLASS = 'min-h-0 overflow-y-auto overscroll-contain pr-1 lg:block';

export function InvoiceComposer({
  project,
  issueDate,
}: {
  project: ProjectDetail;
  issueDate: Date;
}) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [excludedIds, setExcludedIds] = useState<ReadonlySet<string>>(new Set());
  const [tab, setTab] = useState<ComposerTab>('preview');
  const [editingId, setEditingId] = useState<string | null>(null);

  const items = useMemo(() => buildBillableItems(project), [project]);
  const included = items.filter((item) => !excludedIds.has(item.id));
  const excluded = new Set(
    items.filter((item) => excludedIds.has(item.id)).map((item) => item.id)
  );
  const total = totalCents(included);
  const canGenerate = !pending && included.length > 0;

  const toggle = (id: string) =>
    setExcludedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const handleGenerate = () =>
    run(
      () =>
        generateInvoice({
          projectId: project.id,
          itemIds: included.map((item) => item.id),
        }),
      ({ id }) => router.push(`/projects/${project.id}/invoices/${id}`)
    );

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center">
        <div className="w-full p-6 text-center sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {project.client}
          </p>
          <h1 className="mt-2 font-serif text-2xl">Nothing to invoice</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Everything logged on this project has already been invoiced.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/projects/${project.id}/log`}
              className={cn(buttonVariants({ variant: 'outline' }), 'h-10')}
            >
              Log work
            </Link>
            <Link
              href={`/projects/${project.id}/invoices`}
              className={cn(buttonVariants(), 'h-10')}
            >
              Invoice history
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1380px] flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <BackLink href={`/projects/${project.id}`} label={project.name} />
        <Link
          href={`/projects/${project.id}/invoices`}
          className="shrink-0 text-sm text-primary transition-colors hover:underline"
        >
          History
        </Link>
      </div>

      <div className="mt-3 shrink-0 lg:hidden">
        <SegmentedTabs
          ariaLabel="Invoice composer"
          idPrefix="invoice"
          value={tab}
          items={TABS}
          onChange={setTab}
        />
      </div>

      {error && (
        <Alert className="mt-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="shrink-0 text-left font-medium underline disabled:opacity-50"
          >
            Try again
          </button>
        </Alert>
      )}

      <div className="mt-3 grid min-h-0 flex-1 gap-4 pb-3 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <section
          id="invoice-panel-preview"
          role="tabpanel"
          aria-labelledby="invoice-tab-preview"
          className={cn(PANEL_CLASS, tab === 'preview' ? 'block' : 'hidden')}
        >
          <InvoiceDocument
            label="Draft invoice preview"
            meta={
              <>
                <Badge tone="brand">Draft</Badge>
                <p className="mt-2 text-sm font-medium">New invoice</p>
                <p className="text-xs text-muted-foreground">
                  Issued {formatDate(issueDate)}
                </p>
              </>
            }
            billTo={{
              client: project.client,
              project: project.name,
              address: project.address,
            }}
            summary={
              <>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Payment terms
                </p>
                <p className="mt-2 text-sm text-foreground">
                  Due date is set when the invoice is marked sent.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The final number is assigned on generation.
                </p>
              </>
            }
            lineItems={included}
            emptyState={
              <div className="rounded-2xl border border-dashed border-border bg-secondary px-5 py-10 text-center">
                <p className="font-serif text-xl">No items selected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose at least one pending item to preview an invoice.
                </p>
              </div>
            }
            footnote="Amounts are confirmed from the selected items when this invoice is generated."
            totalLabel="Total due"
            totalCents={total}
          />
        </section>

        <aside
          id="invoice-panel-items"
          role="tabpanel"
          aria-labelledby="invoice-tab-items"
          className={cn(PANEL_CLASS, tab === 'items' ? 'block' : 'hidden')}
        >
          <InvoiceItemSidebar
            items={items}
            excluded={excluded}
            totalCents={total}
            onToggle={toggle}
            onSelectAll={() => setExcludedIds(new Set())}
            onClearAll={() =>
              setExcludedIds(new Set(items.map((item) => item.id)))
            }
            onEdit={setEditingId}
          />
        </aside>
      </div>

      <div className="shrink-0 border-t border-border bg-background pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Included
            </p>
            <p className="text-sm font-medium">
              {included.length} {included.length === 1 ? 'item' : 'items'} ·{' '}
              <span className="font-serif text-lg">{formatMoney(total)}</span>
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            size="lg"
            className="w-full sm:w-auto"
          >
            {pending ? 'Generating…' : 'Generate invoice'}
          </Button>
        </div>
      </div>

      {editingId && (
        <EditItemSheet
          project={project}
          itemId={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
