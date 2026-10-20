import type {
  BillableSource,
  FurnitureStatus,
  InvoiceLineItem,
  Project,
} from './types';

export type BillableRowType = 'Hours' | 'Furniture' | '';

/**
 * A single row of the "pending items" grid: one hour entry or one furniture
 * item that has not been invoiced yet.
 */
export interface BillableRow {
  /** Row key. Namespaced by source so hours and furniture ids cannot collide. */
  id: string;
  itemId: string;
  source: BillableSource;
  type: BillableRowType;
  /** Hour title, or furniture name. */
  description: string;
  /** Work date for hours, vendor for furniture. */
  secondary: string;
  /** Furniture fulfilment status. `null` for hours. */
  status: FurnitureStatus | null;
  /** Hours worked. `null` for furniture. */
  hours: number | null;
  /** Billable amount — the hour rate charge, or the furniture trade price. */
  amount: number;
}

const FURNITURE_STATUS_ORDER: FurnitureStatus[] = [
  'Pending',
  'Ordered',
  'In transit',
  'Delivered',
];

/**
 * Every hour entry and furniture item on a project that has not been attached
 * to an invoice yet, ordered for display.
 */
export function buildBillableRows(project: Project): BillableRow[] {
  const hourRows: BillableRow[] = project.hours
    .filter((entry) => entry.invoiceId === null)
    .map((entry) => ({
      id: `hours:${entry.id}`,
      itemId: entry.id,
      source: 'hours',
      type: 'Hours',
      description: entry.title,
      secondary: entry.date,
      status: null,
      hours: entry.hours,
      amount: entry.amount,
    }));

  const furnitureRows: BillableRow[] = project.furniture
    .filter((item) => item.invoiceId === null)
    .map((item) => ({
      id: `furniture:${item.id}`,
      itemId: item.id,
      source: 'furniture',
      type: 'Furniture',
      description: item.name,
      secondary: item.vendor,
      status: item.status,
      hours: null,
      amount: item.trade,
    }));

  return [...hourRows, ...furnitureRows].sort(compareRows);
}

function compareRows(a: BillableRow, b: BillableRow): number {
  if (a.source !== b.source) return a.source === 'hours' ? -1 : 1;

  if (a.source === 'hours') {
    // Most recent work first.
    return timestamp(b.secondary) - timestamp(a.secondary);
  }

  const statusDiff =
    FURNITURE_STATUS_ORDER.indexOf(a.status as FurnitureStatus) -
    FURNITURE_STATUS_ORDER.indexOf(b.status as FurnitureStatus);
  if (statusDiff !== 0) return statusDiff;

  return a.description.localeCompare(b.description);
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Line items for an invoice. Derived from the same rows the pending grid
 * shows, so what you see is exactly what gets billed.
 */
export function buildInvoiceLineItems(project: Project): InvoiceLineItem[] {
  return buildBillableRows(project).map((row) => ({
    id: row.itemId,
    source: row.source,
    title: row.description,
    amount: row.amount,
  }));
}

/** Total value of everything still waiting to be billed. */
export function buildPendingTotal(project: Project): number {
  return buildBillableRows(project).reduce((sum, row) => sum + row.amount, 0);
}
