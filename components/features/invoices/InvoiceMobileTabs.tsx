'use client';

import { Eye, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InvoiceMobileTab = 'preview' | 'items';

interface InvoiceMobileTabsProps {
  value: InvoiceMobileTab;
  onChange: (value: InvoiceMobileTab) => void;
}

const TABS: {
  value: InvoiceMobileTab;
  label: string;
  icon: typeof Eye;
}[] = [
  { value: 'preview', label: 'Preview', icon: Eye },
  { value: 'items', label: 'Items', icon: ListChecks },
];

export function InvoiceMobileTabs({
  value,
  onChange,
}: InvoiceMobileTabsProps) {
  const move = (direction: -1 | 1) => {
    const index = TABS.findIndex((tab) => tab.value === value);
    const next = TABS[(index + direction + TABS.length) % TABS.length];
    onChange(next.value);
  };

  return (
    <div
      role="tablist"
      aria-label="Invoice workspace"
      className="grid grid-cols-2 gap-1 rounded-xl border border-[#deddd5] bg-[#ece9e0] p-1 lg:hidden"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`invoice-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`invoice-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                move(1);
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                move(-1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                onChange('preview');
              } else if (event.key === 'End') {
                event.preventDefault();
                onChange('items');
              }
            }}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors',
              selected
                ? 'bg-[#fffefa] text-[#292923] shadow-sm'
                : 'text-[#85857a] hover:text-[#292923]'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
