import type { Metadata } from 'next';
import { EarningsView } from '@/components/features/earnings/EarningsView';
import { AppShell } from '@/components/layout/AppShell';
import {
  buildEarningsMonths,
  earningsWindowStart,
} from '@/lib/domain/earnings';
import { getServices } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Earnings · Maison',
};

const MONTHS_SHOWN = 6;

export default async function EarningsPage() {
  const { invoices } = await getServices();
  const now = new Date();
  const paid = await invoices.paidSince(earningsWindowStart(now, MONTHS_SHOWN));

  return (
    <AppShell fill>
      <EarningsView months={buildEarningsMonths(paid, now, MONTHS_SHOWN)} />
    </AppShell>
  );
}
