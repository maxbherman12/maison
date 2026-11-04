'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Columns3,
  FileText,
  Pencil,
  Plus,
} from 'lucide-react';
import type { FurnitureStatus, Invoice, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import type { BillableRow } from '@/lib/billing';
import { buildBillableRows } from '@/lib/billing';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { TextField } from '@/components/ui/form-field';
import { Toast, useNotice } from '@/components/ui/toast';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useNotice();

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

    deleteFurniture.mutate(
      { projectId: project.id, furnitureId: openFurniture.id },
      {
        onSuccess: () => {
          setConfirmDelete(false);
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

  const counts: Record<ProjectTab, number> = {
    pending: rows.length,
    invoices: liveInvoices.length,
  };

  const tabItems = TABS.map((item) => ({
    ...item,
    count: counts[item.value],
  }));

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <p className="min-w-0 truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {project.client}
        </p>
        {!editing && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setEditing(true)}
            className="rounded-full text-primary"
            aria-label="Edit project details"
            title="Edit project details"
          >
            <Pencil className="size-4" />
          </Button>
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

          <SegmentedTabs
            ariaLabel="Project items"
            value={tab}
            onChange={setTab}
            idPrefix="project"
            items={tabItems}
            className="mb-3"
          />

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

      {openFurniture && !confirmDelete && (
        <FurnitureSheet
          key={openFurniture.id}
          item={openFurniture}
          onClose={() => setOpenFurnitureId(null)}
          onMove={moveFurniture}
          onDelete={() => setConfirmDelete(true)}
          onEdit={editOpenFurniture}
        />
      )}

      {openFurniture && confirmDelete && (
        <ConfirmDialog
          title="Delete furniture entry?"
          description={`This will remove ${openFurniture.name} from the project. This cannot be undone.`}
          confirmLabel="Delete entry"
          tone="destructive"
          pending={deleteFurniture.isPending}
          onClose={() => setConfirmDelete(false)}
          onConfirm={removeFurniture}
        />
      )}

      {editingRow && (
        <EditBillableItemSheet
          project={project}
          row={editingRow}
          onClose={() => setEditingRow(null)}
        />
      )}

      <Toast notice={notice} />
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
          <span className="text-foreground">{formatMoney(total)}</span>
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
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          variant: variant === 'primary' ? 'default' : 'outline',
        }),
        'h-11 gap-1.5 px-2 text-xs sm:h-10'
      )}
      title={title}
      aria-label={title}
    >
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
    <div className="rounded-2xl border border-border bg-secondary p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Client name"
          value={client}
          onChange={(event) => setClient(event.target.value)}
        />
        <TextField
          label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <TextField
          label="Hourly rate"
          value={rate}
          prefix="$"
          onChange={(event) => setRate(event.target.value)}
        />
      </div>
      {error && <Alert className="mt-4">{error}</Alert>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleSave}
          disabled={updateProject.isPending}
          className="w-full sm:w-auto"
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
