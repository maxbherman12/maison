'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Check,
  ChevronRight,
  GripVertical,
  Package,
  Plus,
  X,
} from 'lucide-react';
import type { FurnitureItem, FurnitureStatus, Project } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FurnitureSheet } from './FurnitureSheet';
import {
  FURNITURE_STATUS_META,
  FURNITURE_STATUS_ORDER,
} from './furniture-status';

interface FurnitureBoardProps {
  project: Project;
}

interface Notice {
  tone: 'success' | 'error';
  text: string;
}

export function FurnitureBoard({ project }: FurnitureBoardProps) {
  const [items, setItems] = useState<FurnitureItem[]>(project.furniture);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mobileStatus, setMobileStatus] = useState<FurnitureStatus>(() => {
    return (
      FURNITURE_STATUS_ORDER.find((status) =>
        project.furniture.some((item) => item.status === status)
      ) ?? 'Pending'
    );
  });

  const inFlight = useRef(new Set<string>());
  const suppressClickUntil = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const grouped = useMemo(() => {
    const next = Object.fromEntries(
      FURNITURE_STATUS_ORDER.map((status) => [status, [] as FurnitureItem[]])
    ) as Record<FurnitureStatus, FurnitureItem[]>;

    for (const item of items) {
      next[item.status].push(item);
    }

    return next;
  }, [items]);

  const delivered = items.filter((item) => item.status === 'Delivered').length;
  const progress =
    items.length > 0 ? Math.round((delivered / items.length) * 100) : 0;
  const selectedItem = selectedId
    ? items.find((item) => item.id === selectedId)
    : undefined;
  const activeItem = activeId
    ? items.find((item) => item.id === activeId)
    : undefined;

  const moveItem = useCallback(
    async (id: string, nextStatus: FurnitureStatus) => {
      const item = items.find((entry) => entry.id === id);
      if (!item) return;

      if (item.status === nextStatus) {
        setSelectedId(null);
        return;
      }

      if (inFlight.current.has(id)) return;
      inFlight.current.add(id);

      const previousStatus = item.status;
      const isLastInLane =
        items.filter(
          (entry) => entry.id !== id && entry.status === previousStatus
        ).length === 0;

      setItems((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, status: nextStatus } : entry
        )
      );
      setSelectedId(null);
      setNotice({ tone: 'success', text: `Moved to ${nextStatus}` });
      if (isLastInLane) setMobileStatus(nextStatus);

      try {
        const response = await fetch(
          `/api/projects/${project.id}/furniture/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus }),
          }
        );

        if (!response.ok) {
          throw new Error('Unable to update furniture status');
        }
      } catch {
        setItems((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, status: previousStatus } : entry
          )
        );
        if (isLastInLane) {
          setMobileStatus((current) =>
            current === nextStatus ? previousStatus : current
          );
        }
        setNotice({
          tone: 'error',
          text: "Couldn't move that piece. Please try again.",
        });
      } finally {
        inFlight.current.delete(id);
      }
    },
    [items, project.id]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const item = items.find((entry) => entry.id === id);
      if (!item) return;

      if (!window.confirm('Delete this furniture entry?')) return;

      setSelectedId(null);
      setItems((current) => current.filter((entry) => entry.id !== id));

      if (mobileStatus === item.status) {
        const remaining = items.filter(
          (entry) => entry.id !== id && entry.status === item.status
        );
        if (remaining.length === 0) {
          const nextStatus = FURNITURE_STATUS_ORDER.find((status) =>
            items.some(
              (entry) => entry.id !== id && entry.status === status
            )
          );
          if (nextStatus) setMobileStatus(nextStatus);
        }
      }

      try {
        const response = await fetch(
          `/api/projects/${project.id}/furniture/${id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw new Error('Unable to delete furniture');
        }
        setNotice({ tone: 'success', text: 'Furniture entry deleted' });
      } catch {
        setItems((current) =>
          current.some((entry) => entry.id === item.id)
            ? current
            : [...current, item]
        );
        setNotice({
          tone: 'error',
          text: "Couldn't delete that piece. Please try again.",
        });
      }
    },
    [items, mobileStatus, project.id]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    suppressClickUntil.current = Date.now() + 300;
    setActiveId(null);

    const overId = event.over?.id;
    if (typeof overId !== 'string') return;

    const nextStatus = overId as FurnitureStatus;
    if (!FURNITURE_STATUS_ORDER.includes(nextStatus)) return;

    void moveItem(String(event.active.id), nextStatus);
  };

  const handleDragCancel = () => {
    suppressClickUntil.current = Date.now() + 300;
    setActiveId(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
            Furniture board
          </span>
          <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">
            Piece by piece
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#85857a]">
            Drag a piece between columns, or tap it to move it along.
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-sm text-[#85857a]">
            {items.length > 0 ? (
              <>
                <strong className="font-serif text-2xl font-normal text-[#292923]">
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
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e8e5dc] sm:w-52"
          >
            <div
              className="h-full rounded-full bg-[#7f8f72] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyBoard projectId={project.id} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-8 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {FURNITURE_STATUS_ORDER.map((status) => {
                const meta = FURNITURE_STATUS_META[status];
                const Icon = meta.icon;
                const isSelected = mobileStatus === status;
                const count = grouped[status].length;

                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setMobileStatus(status)}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
                      isSelected
                        ? cn(meta.border, meta.tint)
                        : 'border-[#deddd5] bg-[#fbfaf7] hover:bg-[#f1efe8]'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-full',
                          isSelected ? 'bg-[#fffefa]' : meta.tint,
                          meta.text
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="truncate text-sm font-medium">
                        {status}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs',
                        isSelected
                          ? 'bg-[#fffefa] text-[#292923]'
                          : cn(meta.tint, meta.text)
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      FURNITURE_STATUS_META[mobileStatus].dot
                    )}
                  />
                  <h2 className="font-serif text-2xl">{mobileStatus}</h2>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs',
                    FURNITURE_STATUS_META[mobileStatus].tint,
                    FURNITURE_STATUS_META[mobileStatus].text
                  )}
                >
                  {grouped[mobileStatus].length}{' '}
                  {grouped[mobileStatus].length === 1 ? 'piece' : 'pieces'}
                </span>
              </div>

              <div
                key={mobileStatus}
                className="grid animate-in gap-2 fade-in duration-200"
              >
                {grouped[mobileStatus].map((item) => (
                  <MobileCard
                    key={item.id}
                    item={item}
                    onOpen={() => setSelectedId(item.id)}
                  />
                ))}
                {grouped[mobileStatus].length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#d5d1c6] px-5 py-10 text-center text-sm text-[#85857a]">
                    Nothing here yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 hidden gap-3 lg:grid lg:grid-cols-4">
            {FURNITURE_STATUS_ORDER.map((status) => (
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
            {activeItem ? (
              <div className="w-[270px] rotate-2 cursor-grabbing">
                <FurnitureCardContent item={activeItem} affordance="overlay" />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {selectedItem && (
        <FurnitureSheet
          key={selectedItem.id}
          item={selectedItem}
          onClose={() => setSelectedId(null)}
          onMove={(status) => void moveItem(selectedItem.id, status)}
          onDelete={() => void deleteItem(selectedItem.id)}
        />
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-white shadow-lg',
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

function BoardColumn({
  status,
  items,
  onOpen,
  suppressClickUntil,
}: {
  status: FurnitureStatus;
  items: FurnitureItem[];
  onOpen: (id: string) => void;
  suppressClickUntil: RefObject<number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = FURNITURE_STATUS_META[status];

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${status} column, ${items.length} ${
        items.length === 1 ? 'piece' : 'pieces'
      }`}
      className={cn(
        'flex min-h-[240px] flex-col rounded-2xl border p-2.5 transition-colors',
        isOver
          ? 'border-[#bd765b] bg-[#f5e7e0]/70'
          : 'border-[#deddd5] bg-[#ece9e0]/60'
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1.5 pb-2.5 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} />
          <h2 className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b6b60]">
            {status}
          </h2>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px]',
            meta.tint,
            meta.text
          )}
        >
          {items.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <DraggableCard
            key={item.id}
            item={item}
            onOpen={() => onOpen(item.id)}
            suppressClickUntil={suppressClickUntil}
          />
        ))}

        {items.length === 0 && (
          <div className="pointer-events-none flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#d5d1c6] px-3 py-8 text-center text-xs text-[#99998e]">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  item,
  onOpen,
  suppressClickUntil,
}: {
  item: FurnitureItem;
  onOpen: () => void;
  suppressClickUntil: RefObject<number>;
}) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      onClick={() => {
        if (Date.now() < suppressClickUntil.current) return;
        onOpen();
      }}
      title="Drag to another column"
      aria-label={`${item.name}, ${item.status}. Open details.`}
      className={cn(
        'group/card w-full touch-manipulation text-left',
        isDragging ? 'cursor-grabbing opacity-40' : 'cursor-grab'
      )}
    >
      <FurnitureCardContent item={item} affordance="drag" />
    </button>
  );
}

function MobileCard({
  item,
  onOpen,
}: {
  item: FurnitureItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${item.name}, ${item.status}. Open details.`}
      className="group/card w-full text-left"
    >
      <FurnitureCardContent item={item} affordance="open" />
    </button>
  );
}

function FurnitureCardContent({
  item,
  affordance,
}: {
  item: FurnitureItem;
  affordance: 'drag' | 'open' | 'overlay';
}) {
  const tags = item.tags.slice(0, 2);
  const extraTags = item.tags.length - tags.length;

  return (
    <span
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border border-[#deddd5] bg-[#fffefa] p-3 shadow-[0_1px_0_rgba(41,41,35,0.04)] transition-colors',
        affordance !== 'overlay' && 'group-hover/card:border-[#c9c6bb]'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#292923]">
          {item.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[#85857a]">
          {item.vendor || 'No vendor'}
        </span>
        {(tags.length > 0 || extraTags > 0) && (
          <span className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-full bg-[#f1efe8] px-2 py-0.5 text-[10px] text-[#6b6b60]"
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="rounded-full bg-[#f1efe8] px-2 py-0.5 text-[10px] text-[#99998e]">
                +{extraTags}
              </span>
            )}
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-serif text-sm text-[#292923]">
          {formatMoney(item.trade)}
        </span>
        {affordance === 'drag' && (
          <GripVertical className="size-3.5 text-[#c9c6bb] opacity-0 transition-opacity group-hover/card:opacity-100" />
        )}
        {affordance === 'open' && (
          <ChevronRight className="size-4 text-[#c9c6bb]" />
        )}
      </span>
    </span>
  );
}

function EmptyBoard({ projectId }: { projectId: string }) {
  return (
    <div className="mt-8 rounded-3xl border border-[#deddd5] bg-[#fbfaf7] px-6 py-14 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#f1efe8]">
        <Package className="size-6 text-[#bd765b]" />
      </span>
      <h2 className="mt-5 font-serif text-3xl">Nothing to arrange yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#85857a]">
        Furniture you log for this project will show up here as cards you can
        move from column to column.
      </p>
      <Link
        href={`/projects/${projectId}/log`}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#bd765b] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#a9573d]"
      >
        <Plus className="size-4" /> Log furniture
      </Link>
    </div>
  );
}
