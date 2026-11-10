import { FURNITURE_STATUSES, type FurnitureStatus } from './furniture';
import { sumCents } from './money';
import type { Charge, FurnitureItem } from './types';

export const BILLABLE_KINDS = ['hours', 'charge', 'furniture'] as const;

export type BillableKind = (typeof BILLABLE_KINDS)[number];

export const BILLABLE_KIND_LABELS: Record<BillableKind, string> = {
  hours: 'Hours',
  charge: 'Charge',
  furniture: 'Furniture',
};

interface BillableBase {
  id: string;
  title: string;
  amountCents: number;
}

export interface HoursBillable extends BillableBase {
  kind: 'hours';
  date: string;
  hours: number;
}

export interface ChargeBillable extends BillableBase {
  kind: 'charge';
  date: string;
}

export interface FurnitureBillable extends BillableBase {
  kind: 'furniture';
  vendor: string;
  status: FurnitureStatus;
}

export type BillableItem = HoursBillable | ChargeBillable | FurnitureBillable;

function chargeToBillable(charge: Charge): HoursBillable | ChargeBillable {
  const base = {
    id: charge.id,
    title: charge.title,
    amountCents: charge.amountCents,
    date: charge.date,
  };

  return charge.hours === null
    ? { ...base, kind: 'charge' }
    : { ...base, kind: 'hours', hours: charge.hours };
}

function furnitureToBillable(item: FurnitureItem): FurnitureBillable {
  return {
    kind: 'furniture',
    id: item.id,
    title: item.name,
    amountCents: item.tradeCents,
    vendor: item.vendor,
    status: item.status,
  };
}

/**
 * The not-yet-invoiced items among the given rows, in display order: the most
 * recent work first, then furniture by fulfilment stage. The pending list, the
 * invoice composer, and generated invoices all use this, so they cannot
 * disagree about what is billed or in what order.
 */
export function buildBillableItems(rows: {
  charges: readonly Charge[];
  furniture: readonly FurnitureItem[];
}): BillableItem[] {
  const work = rows.charges
    .filter((charge) => charge.invoiceId === null)
    .map(chargeToBillable)
    .sort((a, b) => b.date.localeCompare(a.date));

  const furniture = rows.furniture
    .filter((item) => item.invoiceId === null)
    .map(furnitureToBillable)
    .sort(
      (a, b) =>
        FURNITURE_STATUSES.indexOf(a.status) -
          FURNITURE_STATUSES.indexOf(b.status) ||
        a.title.localeCompare(b.title)
    );

  return [...work, ...furniture];
}

export function totalCents(items: readonly { amountCents: number }[]): number {
  return sumCents(items, (item) => item.amountCents);
}
