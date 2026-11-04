'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Columns3,
  FileText,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import type {
  FurnitureStatus,
  Invoice,
  Project,
} from '@/lib/types';
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

export function ProjectSummary({ project, invoices }: ProjectSummaryProps) {
  const [editing, setEditing] = useState(false);
  const [openFurnitureId, setOpenFurnitureId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<BillableRow | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#99998e] block mt-1">
            {project.client}
          </span>
          <h1 className="mt-1 truncate font-serif text-3xl leading-tight sm:text-4xl">
            {project.project}
          </h1>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#deddd5] bg-[#fbfaf7] text-[#bd765b] hover:bg-[#f1e6df] transition-colors"
          aria-label="Edit project details"
          title="Edit project details"
        >
          <Pencil className="size-5" />
        </button>
      </div>

      {editing ? (
        <ProjectEditForm
          project={project}
          onSave={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="mb-6 flex justify-end">
            <div className="grid w-full grid-cols-3 gap-2 sm:w-[360px]">
              <ActionButton
                icon={<Plus className="size-5" />}
                title="Log"
                href={`/projects/${project.id}/log`}
                variant="primary"
              />
              <ActionButton
                icon={<Columns3 className="size-5" />}
                title="Board"
                href={`/projects/${project.id}/board`}
              />
              <ActionButton
                icon={<FileText className="size-5" />}
                title="Invoice"
                href={invoiceHref}
              />
            </div>
          </div>

          <ProjectItemsGrid project={project} onOpenItem={openRow} />

          <section className="mt-10">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">Invoices</h2>
                <p className="mt-1 text-sm text-[#85857a]">
                  Issued invoices for this project.
                </p>
              </div>
              <Link
                href={`/projects/${project.id}/invoices`}
                className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[#bd765b] hover:underline"
              >
                All invoices <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <InvoicesGrid
              invoices={liveInvoices}
              projectId={project.id}
              emptyAction={
                hasPendingItems ? (
                  <Link
                    href={`/projects/${project.id}/invoices/new`}
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
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'h-11 rounded-xl px-4'
                    )}
                  >
                    Log work
                  </Link>
                )
              }
            />
          </section>
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
  const className = `flex h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm transition-colors sm:h-11 sm:flex-1 sm:px-3 ${
    variant === 'primary'
      ? 'border-[#bd765b] bg-[#bd765b] text-white hover:bg-[#a9573d]'
      : 'border-[#deddd5] bg-[#fbfaf7] text-[#bd765b] hover:border-[#bd765b] hover:bg-[#f1e6df]'
  }`;

  return (
    <Link href={href} className={className} title={title} aria-label={title}>
      <span className="flex size-8 items-center justify-center">{icon}</span>
      <span className="text-xs font-medium">{title}</span>
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
    <div className="mt-7 rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-5">
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
        {prefix && <span className="text-sm text-[#99998e] px-3">{prefix}</span>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full bg-transparent px-1 text-sm outline-none"
        />
      </span>
    </label>
  );
}
