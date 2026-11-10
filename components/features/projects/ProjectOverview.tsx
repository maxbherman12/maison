'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { Columns3, FileText, Pencil, Plus } from 'lucide-react';
import { moveFurniture } from '@/lib/actions/furniture';
import { buildBillableItems } from '@/lib/domain/billing';
import type { FurnitureStatus } from '@/lib/domain/furniture';
import type { InvoiceListItem, ProjectDetail } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Toast, useNotice } from '@/components/ui/toast';
import { EditItemSheet } from '@/components/features/billing/EditItemSheet';
import { FurnitureDetailSheet } from '@/components/features/furniture/FurnitureDetailSheet';
import { PendingItemsTable } from './PendingItemsTable';
import { ProjectEditForm } from './ProjectEditForm';
import { ProjectInvoicesPanel } from './ProjectInvoicesPanel';

type ProjectTab = 'pending' | 'invoices';

interface ProjectOverviewProps {
  project: ProjectDetail;
  invoices: InvoiceListItem[];
}

export function ProjectOverview({ project, invoices }: ProjectOverviewProps) {
  const items = useMemo(() => buildBillableItems(project), [project]);
  const hasPendingItems = items.length > 0;

  const [editingProject, setEditingProject] = useState(false);
  const [tab, setTab] = useState<ProjectTab>(() =>
    !hasPendingItems && invoices.length > 0 ? 'invoices' : 'pending'
  );
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState(false);
  const [notice, setNotice] = useNotice();
  const [, startTransition] = useTransition();

  // Derived from fresh server data, so a sheet closes itself if its item goes.
  const openItem = items.find((item) => item.id === openItemId);
  const openFurniture =
    openItem?.kind === 'furniture'
      ? project.furniture.find((item) => item.id === openItem.id)
      : undefined;

  const closeItem = () => {
    setOpenItemId(null);
    setEditingItem(false);
  };

  const move = (id: string, status: FurnitureStatus) => {
    closeItem();
    startTransition(async () => {
      const result = await moveFurniture(id, status);
      setNotice(
        result.ok
          ? { tone: 'success', text: `Moved to ${status}` }
          : { tone: 'error', text: result.error }
      );
    });
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
      <div className="flex items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {project.client}
          </p>
          <h1 className="mt-1 truncate font-serif text-2xl leading-tight sm:text-3xl">
            {project.name}
          </h1>
        </div>
        {!editingProject && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setEditingProject(true)}
            className="rounded-full text-primary"
            aria-label="Edit project details"
            title="Edit project details"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {editingProject ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ProjectEditForm
            project={project}
            onClose={() => setEditingProject(false)}
          />
        </div>
      ) : (
        <>
          <div className="grid w-full grid-cols-3 gap-2 pb-3 sm:ml-auto sm:w-[360px]">
            <ActionLink
              icon={<Plus className="size-4" />}
              title="Log"
              href={`/projects/${project.id}/log`}
              primary
            />
            <ActionLink
              icon={<Columns3 className="size-4" />}
              title="Board"
              href={`/projects/${project.id}/board`}
            />
            <ActionLink
              icon={<FileText className="size-4" />}
              title="Invoice"
              href={`/projects/${project.id}/invoices${hasPendingItems ? '/new' : ''}`}
            />
          </div>

          <SegmentedTabs
            ariaLabel="Project items"
            value={tab}
            onChange={setTab}
            idPrefix="project"
            items={[
              { value: 'pending', label: 'Pending', count: items.length },
              { value: 'invoices', label: 'Invoices', count: invoices.length },
            ]}
            className="mb-3"
          />

          <div
            id={`project-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`project-tab-${tab}`}
            className="flex min-h-0 flex-1 flex-col"
          >
            {tab === 'pending' ? (
              <PendingItemsTable
                items={items}
                onOpen={(item) => setOpenItemId(item.id)}
              />
            ) : (
              <ProjectInvoicesPanel
                projectId={project.id}
                invoices={invoices}
                hasPendingItems={hasPendingItems}
              />
            )}
          </div>
        </>
      )}

      {openFurniture && !editingItem && (
        <FurnitureDetailSheet
          key={openFurniture.id}
          item={openFurniture}
          onClose={closeItem}
          onMove={(status) => move(openFurniture.id, status)}
          onEdit={() => setEditingItem(true)}
          onDeleted={() => {
            closeItem();
            setNotice({ tone: 'success', text: 'Furniture entry deleted' });
          }}
        />
      )}

      {openItem && (openItem.kind !== 'furniture' || editingItem) && (
        <EditItemSheet
          project={project}
          itemId={openItem.id}
          onClose={closeItem}
        />
      )}

      <Toast notice={notice} />
    </div>
  );
}

function ActionLink({
  icon,
  title,
  href,
  primary = false,
}: {
  icon: ReactNode;
  title: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: primary ? 'default' : 'outline' }),
        'h-11 gap-1.5 px-2 text-xs sm:h-10'
      )}
    >
      {icon}
      {title}
    </Link>
  );
}
