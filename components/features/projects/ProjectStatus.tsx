'use client';

import { useState } from 'react';
import { Package, Timer, X } from 'lucide-react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/types';
import {
  useUpdateFurnitureStatus,
  useDeleteFurniture,
} from '@/lib/query/projects';

interface ProjectStatusProps {
  project: Project;
  onBack: () => void;
}

export function ProjectStatus({ project, onBack }: ProjectStatusProps) {
  const [selectedItem, setSelectedItem] = useState<
    Project['furniture'][number] | null
  >(null);
  const [editingItem, setEditingItem] = useState<
    Project['furniture'][number] | null
  >(null);

  const updateFurnitureStatus = useUpdateFurnitureStatus();
  const deleteFurniture = useDeleteFurniture();

  const handleStatusChange = (id: string, status: string) => {
    updateFurnitureStatus.mutate({
      projectId: project.id,
      furnitureId: id,
      status: status as 'Pending' | 'Ordered' | 'In transit' | 'Delivered',
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this furniture entry?')) {
      deleteFurniture.mutate({ projectId: project.id, furnitureId: id });
      setSelectedItem(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mt-8 flex items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.18em] text-[#99998e]">Project status</span>
          <h1 className="mt-2 font-serif text-4xl">What's happening</h1>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-2xl">Furniture</h2>
        <div className="rounded-xl border border-[#deddd5] bg-[#fbfaf7] overflow-hidden">
          {project.furniture.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="flex w-full items-center justify-between gap-3 border-b border-[#e9e7df] p-4 text-left last:border-0 hover:bg-[#f1e6df] transition-colors"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Package className="size-5 shrink-0 text-[#bd765b]" />
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{item.name}</strong>
                  <span className="block truncate text-xs text-[#85857a]">
                    {item.vendor || 'No vendor'} · {item.tags.join(', ') || 'No tags'}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <select
                  aria-label={`Status for ${item.name}`}
                  value={item.status}
                  onChange={(event) => handleStatusChange(item.id, event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-full border border-[#deddd5] bg-[#fffefa] px-2 py-1 text-xs"
                >
                  <option>Pending</option>
                  <option>Ordered</option>
                  <option>In transit</option>
                  <option>Delivered</option>
                </select>
              </span>
            </button>
          ))}
          {project.furniture.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-[#85857a]">No furniture items yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 font-serif text-2xl">Hours log</h2>
        <div className="rounded-xl border border-[#deddd5] bg-[#fbfaf7] overflow-hidden">
          {project.hours.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between border-b border-[#e9e7df] p-4 text-left last:border-0"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Timer className="size-5 shrink-0 text-[#bd765b]" />
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{entry.title}</strong>
                  <span className="block text-xs text-[#85857a]">
                    {entry.date} · {entry.hours > 0 ? `${entry.hours} hrs` : 'Flat charge'}
                  </span>
                </span>
              </span>
              <span className="font-serif text-sm">{formatMoney(entry.amount)}</span>
            </div>
          ))}
          {project.hours.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-[#85857a]">No hours logged yet.</p>
            </div>
          )}
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-[#292923]/25 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#fffefa] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <FurnitureModal
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onEdit={(item) => setEditingItem(item)}
              onDelete={() => handleDelete(selectedItem.id)}
            />
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-[#292923]/25 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#fffefa] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <FurnitureEditModal
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onStatusChange={(status) =>
                handleStatusChange(editingItem.id, status)
              }
              onDelete={() => handleDelete(editingItem.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FurnitureModal({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: Project['furniture'][number];
  onClose: () => void;
  onEdit: (item: Project['furniture'][number]) => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-3xl">Furniture details</h2>
        <button onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="grid gap-4">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Item name</span>
          <p className="text-sm">{item.name}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Vendor</span>
          <p className="text-sm">{item.vendor || 'No vendor'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Tags</span>
          <p className="text-sm">{item.tags.join(', ') || 'No tags'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Notes</span>
          <p className="text-sm">{item.notes || 'No notes'}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Status</span>
          <span className="text-sm font-medium">{item.status}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-6">
        <Button onClick={() => onEdit(item)} className="rounded-xl bg-[#bd765b] text-white">
          Edit details
        </Button>
        <Button variant="outline" onClick={onDelete} className="rounded-xl border-[#c98973] text-[#a9573d]">
          Delete furniture entry
        </Button>
      </div>
    </div>
  );
}

function FurnitureEditModal({
  item,
  onClose,
  onStatusChange,
  onDelete,
}: {
  item: Project['furniture'][number];
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-3xl">Edit furniture</h2>
        <button onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="grid gap-4">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Status</span>
          <select
            value={item.status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#deddd5] bg-[#fffefa] px-3 text-sm"
          >
            <option>Pending</option>
            <option>Ordered</option>
            <option>In transit</option>
            <option>Delivered</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-3 mt-6">
        <Button onClick={onClose} className="rounded-xl bg-[#bd765b] text-white">
          Save changes
        </Button>
        <Button variant="outline" onClick={onDelete} className="rounded-xl border-[#c98973] text-[#a9573d]">
          Delete furniture entry
        </Button>
      </div>
    </div>
  );
}
