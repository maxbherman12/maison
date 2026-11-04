'use client';

import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedTabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  ariaLabel: string;
  value: T;
  items: readonly SegmentedTabItem<T>[];
  onChange: (value: T) => void;
  /** When set, tabs and panels get `{idPrefix}-tab-{value}` / `{idPrefix}-panel-{value}` ids. */
  idPrefix?: string;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  ariaLabel,
  value,
  items,
  onChange,
  idPrefix,
  className,
}: SegmentedTabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (next: T, focus = false) => {
    onChange(next);
    if (focus) {
      requestAnimationFrame(() => refs.current[next]?.focus());
    }
  };

  const move = (direction: -1 | 1) => {
    const index = items.findIndex((item) => item.value === value);
    const next = items[(index + direction + items.length) % items.length];
    if (next) select(next.value, true);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'grid gap-1 rounded-xl border border-border bg-muted p-1',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[item.value] = node;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${item.value}` : undefined}
            aria-selected={selected}
            aria-controls={
              idPrefix ? `${idPrefix}-panel-${item.value}` : undefined
            }
            tabIndex={selected ? 0 : -1}
            onClick={() => select(item.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                move(1);
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                move(-1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                const first = items[0];
                if (first) select(first.value, true);
              } else if (event.key === 'End') {
                event.preventDefault();
                const last = items[items.length - 1];
                if (last) select(last.value, true);
              }
            }}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors sm:h-10',
              selected
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] leading-5 tabular-nums',
                  selected
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-border text-muted-foreground'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
