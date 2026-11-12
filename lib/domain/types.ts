import type {
  accountSettings,
  charges,
  furnitureItems,
  invoiceLineItems,
  invoices,
  projects,
} from '../db/schema';

export type Project = typeof projects.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type FurnitureItem = typeof furnitureItems.$inferSelect;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

/** An account's settings as the UI sees them: never the owner or timestamps. */
export type AccountSettings = Omit<
  typeof accountSettings.$inferSelect,
  'ownerId' | 'updatedAt'
>;

/** An invoice as the UI sees it: never the storage key or owner. */
export type Invoice = Omit<typeof invoices.$inferSelect, 'pathname' | 'ownerId'>;

export interface ProjectListItem extends Project {
  outstandingCents: number;
}

export interface ProjectDetail extends Project {
  charges: Charge[];
  furniture: FurnitureItem[];
}

export interface InvoiceListItem extends Invoice {
  lineItemCount: number;
}

export interface InvoiceDetail extends Invoice {
  lineItems: InvoiceLineItem[];
}
