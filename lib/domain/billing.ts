import { FURNITURE_STATUSES, type FurnitureStatus } from './furniture';
import { sumCents } from './money';
import { furniturePricing } from './pricing';
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
  /** What the designer paid (trade, or 0 if the client paid the vendor). Snapshotted on the invoice line, never printed. */
  costCents: number;
  /** The full client price, frozen on the piece at invoicing. Never printed. */
  priceCents: number;
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

function furnitureToBillable(
  item: FurnitureItem,
  markupBps: number
): FurnitureBillable {
  const pricing = furniturePricing(item, markupBps);
  return {
    kind: 'furniture',
    id: item.id,
    title: item.name,
    amountCents: pricing.billedCents,
    costCents: pricing.costCents,
    priceCents: pricing.priceCents,
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
  /** The project's markup, applied to pieces without their own price. */
  markupBps: number;
}): BillableItem[] {
  const work = rows.charges
    .filter((charge) => charge.invoiceId === null)
    .map(chargeToBillable)
    .sort((a, b) => b.date.localeCompare(a.date));

  const furniture = rows.furniture
    .filter((item) => item.invoiceId === null)
    .map((item) => furnitureToBillable(item, rows.markupBps))
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
