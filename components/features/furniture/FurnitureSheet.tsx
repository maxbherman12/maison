'use client';

import { useEffect, useRef } from 'react';
import { Check, ExternalLink, Trash2, X } from 'lucide-react';
import type { FurnitureItem, FurnitureStatus } from '@/lib/types';
import { formatMoney } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  FURNITURE_STATUS_META,
  FURNITURE_STATUS_ORDER,
} from './furniture-status';

interface FurnitureSheetProps {
  item: FurnitureItem;
  onClose: () => void;
  onMove: (status: FurnitureStatus) => void;
  onDelete: () => void;
}

export function FurnitureSheet({
  item,
  onClose,
  onMove,
  onDelete,
}: FurnitureSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#292923]/30 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="furniture-sheet-title"
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#fffefa] p-6 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
              Furniture
            </span>
            <h2
              id="furniture-sheet-title"
              className="mt-1 font-serif text-3xl leading-tight"
            >
              {item.name}
            </h2>
            <p className="mt-1 text-sm text-[#85857a]">
              {item.vendor || 'No vendor'}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close furniture details"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#deddd5] text-[#85857a] transition-colors hover:bg-[#f1efe8] hover:text-[#292923]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#99998e]">
            Move to
          </p>
          <div className="grid gap-2">
            {FURNITURE_STATUS_ORDER.map((status) => {
              const meta = FURNITURE_STATUS_META[status];
              const Icon = meta.icon;
              const isCurrent = item.status === status;

              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={isCurrent}
                  onClick={() => onMove(status)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                    isCurrent
                      ? 'border-[#292923]/15 bg-[#f7f6f2]'
                      : 'border-[#deddd5] bg-[#fffefa] hover:border-[#c9c6bb] hover:bg-[#f7f6f2]'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      meta.tint,
                      meta.text
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{status}</span>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#7f8f72]">
                      <Check className="size-3.5" /> Now
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-[#e9e7df] pt-5">
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Retail" value={formatMoney(item.retail)} />
            <Detail label="Trade" value={formatMoney(item.trade)} />
          </div>
          <Detail label="Tags" value={item.tags.join(', ') || 'No tags'} />
          <Detail label="Notes" value={item.notes || 'No notes'} />
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-[#bd765b] hover:underline"
            >
              Open product link <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e3c9bf] px-4 py-3 text-sm text-[#a9573d] transition-colors hover:bg-[#fbf0eb]"
        >
          <Trash2 className="size-4" /> Delete furniture entry
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-[0.1em] text-[#99998e]">
        {label}
      </span>
      <p className="mt-1 whitespace-pre-wrap text-sm text-[#292923]">{value}</p>
    </div>
  );
}
