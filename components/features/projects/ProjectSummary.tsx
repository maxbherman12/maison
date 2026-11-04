'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  Columns3,
  FileText,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import type { FurnitureStatus, Invoice, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import type { BillableRow } from '@/lib/billing';
import { buildBillableRows } from '@/lib/billing';
import { Button, buttonVariants } from '@/components/ui/button';
import { useInvoices } from '@/lib/query/invoices';
import {
  useDeleteFurniture,
  useUpdateFurnitureStatus,
  useUpdateProject,
} from '@/lib/query/projects';
import { cn } from '@/lib/utils';
import { FurnitureSheet } from '@/components/features/furniture/FurnitureSheet';
import { EditBillableItemSheet } from '@/components/features/invoices/EditBillableItemSheet';
import { InvoicesGrid } from '@/components/features/invoices/InvoicesGrid';
import { ProjectItemsGrid } from './ProjectItemsGrid';

interface ProjectSummaryProps {
  project: Project;
  invoices: Invoice[];
}

interface Notice {
  tone: 'success' | 'error';
  text: string;
}

type ProjectTab = 'pending' | 'invoices';

const TABS: { value: ProjectTab; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'invoices', label: 'Invoices' },
];

export function ProjectSummary({ project, invoices }: ProjectSummaryProps) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<ProjectTab>('pending');
  const [openFurnitureId, setOpenFurnitureId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<BillableRow | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const tabRefs = useRef<Record<ProjectTab, HTMLButtonElement | null>>({
    pending: null,
    invoices: null,
  });

  const { data: liveInvoices = invoices } = useInvoices(project.id, invoices);
  const updateFurnitureStatus = useUpdateFurnitureStatus();
  const deleteFurniture = useDeleteFurniture();

  const rows = useMemo(() => buildBillableRows(project), [project]);
  const hasPendingItems = rows.length > 0;

  const openFurniture = openFurnitureId
    ? project.furniture.find((item) => item.id === openFurnitureId)
    : undefined;

  const invoiceHref = hasPendingItems
    ? `/projects/${project.id}/invoices/new`
    : `/projects/${project.id}/invoices`;

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!hasPendingItems && liveInvoices.length > 0) {
      setTab('invoices');
    }
  }, [hasPendingItems, liveInvoices.length]);

  useEffect(() => {
    if (
      openFurnitureId &&
      !rows.some(
        (row) =>
          row.source === 'furniture' && row.itemId === openFurnitureId
      )
    ) {
      setOpenFurnitureId(null);
    }
  }, [openFurnitureId, rows]);

  useEffect(() => {
    if (editingRow && !rows.some((row) => row.id === editingRow.id)) {
      setEditingRow(null);
    }
  }, [editingRow, rows]);

  const openRow = (row: BillableRow) => {
    if (!row.itemId) return;

    if (row.source === 'furniture') {
      setEditingRow(null);
      setOpenFurnitureId(row.itemId);
      return;
    }

    setOpenFurnitureId(null);
    setEditingRow(row);
  };

  const editOpenFurniture = () => {
    if (!openFurniture) return;

    const row = rows.find(
      (candidate) =>
        candidate.source === 'furniture' &&
        candidate.itemId === openFurniture.id
    );

    if (!row) return;

    setOpenFurnitureId(null);
    setEditingRow(row);
  };

  const moveFurniture = (status: FurnitureStatus) => {
    if (!openFurniture) return;

    updateFurnitureStatus.mutate(
      {
        projectId: project.id,
        furnitureId: openFurniture.id,
        status,
      },
      {
        onSuccess: () => {
          setOpenFurnitureId(null);
          setNotice({ tone: 'success', text: `Moved to ${status}` });
        },
        onError: (error) => {
          setNotice({
            tone: 'error',
            text:
              error instanceof Error
                ? error.message
                : "Couldn't move that piece. Please try again.",
          });
        },
      }
    );
  };

  const removeFurniture = () => {
    if (!openFurniture) return;
    if (!window.confirm('Delete this furniture entry?')) return;

    deleteFurniture.mutate(
      { projectId: project.id, furnitureId: openFurniture.id },
      {
        onSuccess: () => {
          setOpenFurnitureId(null);
          setNotice({ tone: 'success', text: 'Furniture entry deleted' });
        },
        onError: (error) => {
          setNotice({
            tone: 'error',
            text:
              error instanceof Error
                ? error.message
                : "Couldn't delete that piece. Please try again.",
          });
        },
      }
    );
  };

  const selectTab = (value: ProjectTab, focus = false) => {
    setTab(value);
    if (focus) {
      requestAnimationFrame(() => tabRefs.current[value]?.focus());
    }
  };

  const moveTab = (direction: -1 | 1) => {
    const index = TABS.findIndex((candidate) => candidate.value === tab);
    const next = TABS[(index + direction + TABS.length) % TABS.length];
    selectTab(next.value, true);
  };

  const counts: Record<ProjectTab, number> = {
    pending: rows.length,
    invoices: liveInvoices.length,
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <p className="min-w-0 truncate text-[10px] uppercase tracking-[0.16em] text-[#99998e]">
          {project.client}
        </p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#deddd5] bg-[#fbfaf7] text-[#bd765b] transition-colors hover:bg-[#f1e6df]"
            aria-label="Edit project details"
            title="Edit project details"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ProjectEditForm
            project={project}
            onSave={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="grid w-full grid-cols-3 gap-2 pb-3 sm:ml-auto sm:w-[360px]">
            <ActionButton
              icon={<Plus className="size-4" />}
              title="Log"
              href={`/projects/${project.id}/log`}
              variant="primary"
            />
            <ActionButton
              icon={<Columns3 className="size-4" />}
              title="Board"
              href={`/projects/${project.id}/board`}
            />
            <ActionButton
              icon={<FileText className="size-4" />}
              title="Invoice"
              href={invoiceHref}
            />
          </div>

          <div
            role="tablist"
            aria-label="Project items"
            className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-[#deddd5] bg-[#ece9e0] p-1"
          >
            {TABS.map((candidate) => {
              const selected = candidate.value === tab;

              return (
                <button
                  key={candidate.value}
                  ref={(node) => {
                    tabRefs.current[candidate.value] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`project-tab-${candidate.value}`}
                  aria-selected={selected}
                  aria-controls={`project-panel-${candidate.value}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(candidate.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      moveTab(1);
                    } else if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      moveTab(-1);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      selectTab(TABS[0].value, true);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      selectTab(TABS[TABS.length - 1].value, true);
                    }
                  }}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors sm:h-10',
                    selected
                      ? 'bg-[#fffefa] text-[#292923] shadow-sm'
                      : 'text-[#85857a] hover:text-[#292923]'
                  )}
                >
                  {candidate.label}
                  <span
                    className={cn(
                      'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] leading-5 tabular-nums',
                      selected
                        ? 'bg-[#f1e6df] text-[#a9573d]'
                        : 'bg-[#deddd5] text-[#6b564a]'
                    )}
                  >
                    {counts[candidate.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {tab === 'pending' ? (
            <div
              id="project-panel-pending"
              role="tabpanel"
              aria-labelledby="project-tab-pending"
              className="flex min-h-0 flex-1 flex-col"
            >
              <ProjectItemsGrid
                project={project}
                onOpenItem={openRow}
                fill
              />
            </div>
          ) : (
            <div
              id="project-panel-invoices"
              role="tabpanel"
              aria-labelledby="project-tab-invoices"
              className="flex min-h-0 flex-1 flex-col"
            >
              <ProjectInvoicesPanel
                projectId={project.id}
                invoices={liveInvoices}
                hasPendingItems={hasPendingItems}
              />
            </div>
          )}
        </>
      )}

      {openFurniture && (
        <FurnitureSheet
          key={openFurniture.id}
          item={openFurniture}
          onClose={() => setOpenFurnitureId(null)}
          onMove={moveFurniture}
          onDelete={removeFurniture}
          onEdit={editOpenFurniture}
        />
      )}

      {editingRow && (
        <EditBillableItemSheet
          project={project}
          row={editingRow}
          onClose={() => setEditingRow(null)}
        />
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white shadow-lg',
            notice.tone === 'error' ? 'bg-[#a9573d]' : 'bg-[#292923]'
          )}
        >
          {notice.tone === 'success' ? (
            <Check className="size-4" />
          ) : (
            <X className="size-4" />
          )}
          {notice.text}
        </div>
      )}
    </div>
  );
}

function ProjectInvoicesPanel({
  projectId,
  invoices,
  hasPendingItems,
}: {
  projectId: string;
  invoices: Invoice[];
  hasPendingItems: boolean;
}) {
  const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const newInvoiceHref = `/projects/${projectId}/invoices/new`;

  if (invoices.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="font-serif text-xl">No invoices yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#85857a]">
          Generated invoices appear here with their status, total, and dates.
        </p>
        <Link
          href={hasPendingItems ? newInvoiceHref : `/projects/${projectId}/log`}
          className={cn(
            buttonVariants(),
            'mt-4 h-10 rounded-xl bg-[#bd765b] px-4 text-white hover:bg-[#a9573d]'
          )}
        >
          {hasPendingItems ? 'Create invoice' : 'Log work'}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <p className="text-xs text-[#85857a] sm:text-sm">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} ·{' '}
          <span className="text-[#292923]">{formatMoney(total)}</span>
          <span className="hidden sm:inline"> invoiced</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/invoices`}
            className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-xs text-[#bd765b] transition-colors hover:bg-[#f1e6df] sm:text-sm"
          >
            All invoices
            <ArrowUpRight className="size-3.5" />
          </Link>
          {hasPendingItems && (
            <Link
              href={newInvoiceHref}
              className={cn(
                buttonVariants(),
                'h-10 rounded-xl bg-[#bd765b] px-3 text-xs text-white hover:bg-[#a9573d] sm:text-sm'
              )}
            >
              New invoice
            </Link>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <InvoicesGrid invoices={invoices} projectId={projectId} />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  title,
  href,
  variant = 'default',
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  variant?: 'default' | 'primary';
}) {
  const className = `flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-medium transition-colors sm:h-10 ${
    variant === 'primary'
      ? 'border-[#bd765b] bg-[#bd765b] text-white hover:bg-[#a9573d]'
      : 'border-[#deddd5] bg-[#fbfaf7] text-[#bd765b] hover:border-[#bd765b] hover:bg-[#f1e6df]'
  }`;

  return (
    <Link href={href} className={className} title={title} aria-label={title}>
      <span className="flex items-center justify-center">{icon}</span>
      <span>{title}</span>
    </Link>
  );
}

function ProjectEditForm({
  project,
  onSave,
  onCancel,
}: {
  project: Project;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateProject = useUpdateProject();
  const [client, setClient] = useState(project.client);
  const [name, setName] = useState(project.project);
  const [address, setAddress] = useState(project.address);
  const [rate, setRate] = useState(String(project.hourlyRate));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const nextRate = Number(rate);

    if (!client.trim() || !name.trim()) {
      setError('Client and project names are required.');
      return;
    }

    if (!Number.isFinite(nextRate) || nextRate <= 0) {
      setError('Hourly rate must be greater than zero.');
      return;
    }

    setError(null);
    updateProject.mutate(
      {
        id: project.id,
        patch: {
          client: client.trim(),
          project: name.trim(),
          address: address.trim(),
          hourlyRate: nextRate,
        },
      },
      {
        onSuccess: onSave,
        onError: (mutationError) => {
          setError(
            mutationError instanceof Error
              ? mutationError.message
              : 'Unable to save project details.'
          );
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client name" value={client} onChange={setClient} />
        <Field label="Project name" value={name} onChange={setName} />
        <Field label="Address" value={address} onChange={setAddress} />
        <Field label="Hourly rate" value={rate} prefix="$" onChange={setRate} />
      </div>
      {error && (
        <p className="mt-4 rounded-xl border border-[#c98973] bg-[#fbf0eb] px-4 py-3 text-sm text-[#a9573d]">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleSave}
          disabled={updateProject.isPending}
          className="w-full rounded-xl bg-[#bd765b] text-white sm:w-auto"
        >
          {updateProject.isPending ? 'Saving...' : 'Save details'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={updateProject.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#85857a]">
        {label}
      </span>
      <span className="flex items-center rounded-xl border border-[#deddd5] bg-[#fffefa] focus-within:border-[#bd765b]">
        {prefix && <span className="px-3 text-sm text-[#99998e]">{prefix}</span>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full bg-transparent px-1 text-sm outline-none"
        />
      </span>
    </label>
  );
}
