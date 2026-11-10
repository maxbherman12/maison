'use client';

import { useState } from 'react';
import { totalByClient, type EarningsMonth } from '@/lib/domain/earnings';
import { formatMoneyWhole, sumCents } from '@/lib/domain/money';
import { PAINTS } from '@/lib/domain/paints';
import { cn } from '@/lib/utils';

/** Money received by month and by client. Tap a month to focus on it. */
export function EarningsView({ months }: { months: EarningsMonth[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const shown = months.filter((month) => !selectedKey || month.key === selectedKey);
  const total = sumCents(shown, (month) => month.totalCents);
  const clients = totalByClient(shown.flatMap((month) => month.clients));

  const peak = Math.max(...months.map((month) => month.totalCents));
  const latest = months[months.length - 1].key;
  const showsValue = (month: EarningsMonth) =>
    selectedKey
      ? month.key === selectedKey
      : month.totalCents === peak || month.key === latest;

  const heading = selectedKey
    ? `Received in ${shown[0].label}`
    : `Received, ${months[0].label} to ${months[months.length - 1].label}`;

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
      <section className="px-6 pt-1.5 md:p-8">
        <p className="text-label text-muted-foreground">{heading}</p>
        <p className="font-serif text-amount tabular-nums">{formatMoneyWhole(total)}</p>

        <div
          role="group"
          aria-label="Money received each month"
          className="mt-1.5 grid grid-cols-6 items-end gap-2 md:mt-7 md:gap-4"
        >
          {months.map((month, index) => (
            <button
              key={month.key}
              type="button"
              aria-pressed={month.key === selectedKey}
              aria-label={`${month.label}: ${formatMoneyWhole(month.totalCents)}`}
              title={`${month.label}: ${formatMoneyWhole(month.totalCents)}`}
              onClick={() =>
                setSelectedKey(month.key === selectedKey ? null : month.key)
              }
              className={cn(
                'flex min-h-11 flex-col items-center gap-1 transition-opacity',
                selectedKey && month.key !== selectedKey && 'opacity-30'
              )}
            >
              <span className="flex h-[136px] flex-col items-center justify-end gap-1 md:h-[324px]">
                <span className="text-label whitespace-nowrap tabular-nums">
                  {showsValue(month) ? formatMoneyWhole(month.totalCents) : ' '}
                </span>
                <span
                  className="block w-7 origin-bottom rounded-t-[4px] bg-foreground [--tallest:112px] motion-safe:animate-bar-grow md:w-11 md:[--tallest:300px]"
                  style={{
                    height: `calc(var(--tallest) * ${peak ? Math.max(month.totalCents / peak, 0.02) : 0.02})`,
                    animationDelay: `${index * 50}ms`,
                  }}
                />
              </span>
              <span className="text-label text-muted-foreground">{month.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col px-6 pt-2.5 md:border-l md:border-border md:p-8">
        <div className="flex shrink-0 justify-between pb-1 text-label text-muted-foreground">
          <h2 className="font-normal">By client</h2>
          <span className="md:hidden">Tap a month to focus on it</span>
        </div>

        {clients.length === 0 ? (
          <p className="py-3.5 text-muted-foreground">
            {selectedKey
              ? 'Nothing received this month.'
              : 'Mark an invoice paid and it will appear here.'}
          </p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {clients.map((row) => (
              <li key={row.projectId} className="flex min-h-[42px] items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-7 w-2.5 shrink-0"
                  style={{ background: PAINTS[row.paint].color }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{row.client}</span>
                <span className="shrink-0 tabular-nums">
                  {formatMoneyWhole(row.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
