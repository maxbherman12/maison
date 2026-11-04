'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, ListChecks } from 'lucide-react';
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
import { Alert } from '@/components/ui/alert';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { cn } from '@/lib/utils';
import { InvoicePreview } from './InvoicePreview';
import { InvoiceItemSidebar } from './InvoiceItemSidebar';
import { EditBillableItemSheet } from './EditBillableItemSheet';

type InvoiceMobileTab = 'preview' | 'items';

const TABS = [
  { value: 'preview', label: 'Preview', icon: <Eye className="size-4" /> },
  {
    value: 'items',
    label: 'Items',
    icon: <ListChecks className="size-4" />,
  },
] as const satisfies readonly {
  value: InvoiceMobileTab;
  label: string;
  icon: ReactNode;
}[];

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
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center">
        <div className="w-full p-6 text-center sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {project.client}
          </p>
          <h2 className="mt-2 font-serif text-2xl">Nothing to invoice</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Every logged hour and furniture item on this project has already
            been invoiced.
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
      <div className="shrink-0 lg:hidden">
        <SegmentedTabs
          ariaLabel="Invoice workspace"
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
            disabled={generate.isPending || lineItems.length === 0}
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
          className={cn(
            'min-h-0 overflow-y-auto overscroll-contain pr-1',
            tab === 'preview' ? 'block' : 'hidden',
            'lg:block'
          )}
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
          className={cn(
            'min-h-0 overflow-y-auto overscroll-contain pr-1',
            tab === 'items' ? 'block' : 'hidden',
            'lg:block'
          )}
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
        <p className="shrink-0 pb-2 text-center text-sm text-muted-foreground">
          Select at least one item to generate an invoice.
        </p>
      )}

      <div className="shrink-0 border-t border-border bg-background pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
            size="lg"
            className="w-full sm:w-auto"
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
