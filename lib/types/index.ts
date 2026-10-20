export type FurnitureStatus = 'Pending' | 'Ordered' | 'In transit' | 'Delivered';

export interface HourEntry {
  id: string;
  title: string;
  date: string;
  hours: number;
  amount: number;
}

export interface FurnitureItem {
  id: string;
  name: string;
  vendor: string;
  retail: number;
  trade: number;
  link: string;
  tags: string[];
  notes: string;
  status: FurnitureStatus;
}

export interface Project {
  id: string;
  client: string;
  project: string;
  address: string;
  hourlyRate: number;
  outstanding: number;
  color: string;
  initials: string;
  furniture: FurnitureItem[];
  hours: HourEntry[];
}

export interface Invoice {
  id: string;
  projectId: string;
  number: string;
  createdAt: string;
  total: number;
  paid: boolean;
  pathname?: string;
}

export interface CreateProjectInput {
  client: string;
  project: string;
  address: string;
  hourlyRate: number;
}

export interface LogHoursInput {
  title: string;
  date: string;
  hours: number;
  /** Explicit dollar amount. Overrides hours * hourlyRate when provided. */
  amount?: number;
}

export interface AddFurnitureInput {
  name: string;
  vendor: string;
  retail: number;
  trade: number;
  link: string;
  tags: string[];
  notes: string;
}

export interface GenerateInvoiceInput {
  projectId: string;
  client: string;
  project: string;
  total: number;
  items: { title: string; amount: number }[];
}

export interface Money {
  value: number;
  currency: string;
}

export function formatMoney(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function computeOutstanding(hours: HourEntry[], furniture: FurnitureItem[]): number {
  const labor = hours.reduce((sum, entry) => sum + entry.amount, 0);
  const purchases = furniture.reduce((sum, item) => sum + item.trade, 0);
  return labor + purchases;
}
