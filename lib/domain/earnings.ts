import type { Paint } from './paints';

export interface PaidInvoice {
  projectId: string;
  client: string;
  paint: Paint;
  totalCents: number;
  paidAt: Date;
}

export interface EarningsByClient {
  projectId: string;
  client: string;
  paint: Paint;
  totalCents: number;
}

export interface EarningsMonth {
  key: string;
  label: string;
  totalCents: number;
  clients: EarningsByClient[];
}

const monthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
});

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** The first moment of the month `count - 1` months before `now`, in UTC. */
export function earningsWindowStart(now: Date, count: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + 1, 1));
}

/** Adds up clients across any set of invoices or months, largest first. */
export function totalByClient(
  rows: readonly EarningsByClient[]
): EarningsByClient[] {
  const clients = new Map<string, EarningsByClient>();

  for (const row of rows) {
    const existing = clients.get(row.projectId);
    if (existing) existing.totalCents += row.totalCents;
    else
      clients.set(row.projectId, {
        projectId: row.projectId,
        client: row.client,
        paint: row.paint,
        totalCents: row.totalCents,
      });
  }

  return [...clients.values()].sort((a, b) => b.totalCents - a.totalCents);
}

/** One entry per month, oldest first, including months with nothing paid. */
export function buildEarningsMonths(
  paid: readonly PaidInvoice[],
  now: Date,
  count: number
): EarningsMonth[] {
  const start = earningsWindowStart(now, count);

  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
    const key = monthKey(month);
    const inMonth = paid.filter((invoice) => monthKey(invoice.paidAt) === key);

    return {
      key,
      label: monthLabel.format(month),
      totalCents: inMonth.reduce((total, invoice) => total + invoice.totalCents, 0),
      clients: totalByClient(inMonth),
    };
  });
}
