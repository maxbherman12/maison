'use client';

import type { RefObject } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { FurnitureStatus } from '@/lib/domain/furniture';
import type { FurnitureItem } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { FurnitureCard } from './FurnitureCard';
import { FURNITURE_STATUS_META } from './furniture-status';

interface BoardColumnProps {
  status: FurnitureStatus;
  items: FurnitureItem[];
  onOpen: (id: string) => void;
  /** Timestamp until which clicks are the tail end of a drag, not a tap. */
  suppressClickUntil: RefObject<number>;
}

export function BoardColumn({
  status,
  items,
  onOpen,
  suppressClickUntil,
}: BoardColumnProps) {
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
        isOver ? 'border-primary bg-accent/70' : 'border-border bg-muted/60'
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1.5 pb-2.5 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} />
          <h2 className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
          <div className="pointer-events-none flex flex-1 items-center justify-center rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
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
        if (Date.now() >= suppressClickUntil.current) onOpen();
      }}
      title="Drag to another column"
      aria-label={`${item.name}, ${item.status}. Open details.`}
      className={cn(
        'group/card w-full touch-manipulation text-left',
        isDragging ? 'cursor-grabbing opacity-40' : 'cursor-grab'
      )}
    >
      <FurnitureCard item={item} affordance="drag" />
    </button>
  );
}
