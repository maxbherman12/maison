'use client';

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Package, Plus } from 'lucide-react';
import { moveFurniture } from '@/lib/actions/furniture';
import {
  FURNITURE_STATUSES,
  isFurnitureStatus,
  type FurnitureStatus,
} from '@/lib/domain/furniture';
import type { FurnitureItem, ProjectDetail } from '@/lib/domain/types';
import { BackLink } from '@/components/layout/BackLink';
import { Toast, useNotice } from '@/components/ui/toast';
import { BoardColumn } from './BoardColumn';
import { FurnitureCard } from './FurnitureCard';
import { FurnitureDetailSheet } from './FurnitureDetailSheet';
import { MobileBoard } from './MobileBoard';

/** A drag ends with a stray click on the card; ignore clicks for this long. */
const CLICK_SUPPRESSION_MS = 300;

function groupByStatus(items: FurnitureItem[]) {
  const groups = Object.fromEntries(
    FURNITURE_STATUSES.map((status) => [status, [] as FurnitureItem[]])
  ) as Record<FurnitureStatus, FurnitureItem[]>;

  for (const item of items) groups[item.status].push(item);
  return groups;
}

export function FurnitureBoard({ project }: { project: ProjectDetail }) {
  // Follows the server's data; a move shows instantly and is replaced by the
  // server's result, or reverts by itself if the action fails.
  const [items, showMove] = useOptimistic(
    project.furniture,
    (current, move: { id: string; status: FurnitureStatus }) =>
      current.map((item) =>
        item.id === move.id ? { ...item, status: move.status } : item
      )
  );
  const [, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [notice, setNotice] = useNotice();
  const [mobileStatus, setMobileStatus] = useState<FurnitureStatus>(
    () =>
      FURNITURE_STATUSES.find((status) =>
        project.furniture.some((item) => item.status === status)
      ) ?? 'Pending'
  );
  const suppressClickUntil = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = useMemo(() => groupByStatus(items), [items]);
  const selectedItem = items.find((item) => item.id === selectedId);
  const draggingItem = items.find((item) => item.id === draggingId);
  const delivered = grouped.Delivered.length;
  const progress = items.length > 0 ? Math.round((delivered / items.length) * 100) : 0;

  const moveItem = (item: FurnitureItem, status: FurnitureStatus) => {
    setSelectedId(null);
    if (item.status === status) return;

    // On phones, follow a piece that empties the lane being viewed.
    if (grouped[item.status].length === 1) setMobileStatus(status);

    startTransition(async () => {
      showMove({ id: item.id, status });
      const result = await moveFurniture(item.id, status);
      setNotice(
        result.ok
          ? { tone: 'success', text: `Moved to ${status}` }
          : { tone: 'error', text: result.error }
      );
    });
  };

  const endDrag = () => {
    suppressClickUntil.current = Date.now() + CLICK_SUPPRESSION_MS;
    setDraggingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    endDrag();
    const target = event.over?.id;
    const item = items.find((candidate) => candidate.id === event.active.id);
    if (item && isFurnitureStatus(target)) moveItem(item, target);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink href={`/projects/${project.id}`} label={project.name} />

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Furniture board
          </span>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
            Piece by piece
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Drag a piece between columns, or tap it to move it along.
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-sm text-muted-foreground">
            {items.length > 0 ? (
              <>
                <strong className="font-serif text-2xl font-normal text-foreground">
                  {delivered}
                </strong>{' '}
                of {items.length} delivered
              </>
            ) : (
              'No pieces yet'
            )}
          </p>
          <div
            role="progressbar"
            aria-label="Furniture delivered"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted sm:w-52"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyBoard projectId={project.id} />
      ) : (
        <>
          <MobileBoard
            grouped={grouped}
            status={mobileStatus}
            onStatusChange={setMobileStatus}
            onOpen={setSelectedId}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={(event) => setDraggingId(String(event.active.id))}
            onDragEnd={handleDragEnd}
            onDragCancel={endDrag}
          >
            <div className="mt-8 hidden gap-3 lg:grid lg:grid-cols-4">
              {FURNITURE_STATUSES.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  items={grouped[status]}
                  onOpen={setSelectedId}
                  suppressClickUntil={suppressClickUntil}
                />
              ))}
            </div>

            <DragOverlay>
              {draggingItem && (
                <div className="w-[270px] rotate-2 cursor-grabbing">
                  <FurnitureCard item={draggingItem} affordance="overlay" />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {selectedItem && (
        <FurnitureDetailSheet
          key={selectedItem.id}
          item={selectedItem}
          onClose={() => setSelectedId(null)}
          onMove={(status) => moveItem(selectedItem, status)}
          onDeleted={() => {
            setSelectedId(null);
            setNotice({ tone: 'success', text: 'Furniture entry deleted' });
          }}
        />
      )}

      <Toast notice={notice} />
    </div>
  );
}

function EmptyBoard({ projectId }: { projectId: string }) {
  return (
    <div className="mt-8 rounded-3xl border border-border bg-secondary px-6 py-14 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
        <Package className="size-6 text-primary" />
      </span>
      <h2 className="mt-5 font-serif text-3xl">Nothing to arrange yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Furniture you log for this project will show up here as cards you can
        move from column to column.
      </p>
      <Link
        href={`/projects/${projectId}/log`}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <Plus className="size-4" /> Log furniture
      </Link>
    </div>
  );
}
