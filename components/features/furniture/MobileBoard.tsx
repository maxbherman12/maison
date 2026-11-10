'use client';

import { FURNITURE_STATUSES, type FurnitureStatus } from '@/lib/domain/furniture';
import type { FurnitureItem } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FurnitureCard } from './FurnitureCard';
import { FURNITURE_STATUS_META } from './furniture-status';

interface MobileBoardProps {
  grouped: Record<FurnitureStatus, FurnitureItem[]>;
  status: FurnitureStatus;
  onStatusChange: (status: FurnitureStatus) => void;
  onOpen: (id: string) => void;
}

/** On phones the board is one lane at a time, chosen from a status grid. */
export function MobileBoard({
  grouped,
  status,
  onStatusChange,
  onOpen,
}: MobileBoardProps) {
  const lane = grouped[status];
  const laneMeta = FURNITURE_STATUS_META[status];

  return (
    <div className="mt-8 lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        {FURNITURE_STATUSES.map((option) => {
          const meta = FURNITURE_STATUS_META[option];
          const Icon = meta.icon;
          const isSelected = status === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onStatusChange(option)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
                isSelected
                  ? cn(meta.border, 'bg-card')
                  : 'border-border bg-secondary hover:bg-accent'
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    isSelected ? 'bg-card' : meta.tint,
                    meta.text
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="truncate text-sm font-medium">{option}</span>
              </span>
              <Badge
                tone={meta.tone}
                className={cn(
                  'shrink-0 text-xs',
                  isSelected && 'bg-card text-foreground'
                )}
              >
                {grouped[option].length}
              </Badge>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', laneMeta.dot)} />
            <h2 className="font-serif text-2xl">{status}</h2>
          </div>
          <Badge tone={laneMeta.tone} className="text-xs">
            {lane.length} {lane.length === 1 ? 'piece' : 'pieces'}
          </Badge>
        </div>

        <div key={status} className="grid animate-in gap-2 fade-in duration-200">
          {lane.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              aria-label={`${item.name}, ${item.status}. Open details.`}
              className="group/card w-full text-left"
            >
              <FurnitureCard item={item} affordance="open" />
            </button>
          ))}
          {lane.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
