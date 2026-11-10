import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { BILLABLE_KINDS } from '../domain/billing';
import { FURNITURE_STATUSES } from '../domain/furniture';
import { user } from './auth-schema';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => timestamptz('created_at').notNull().defaultNow();

export const furnitureStatus = pgEnum('furniture_status', FURNITURE_STATUSES);
export const billableKind = pgEnum('billable_kind', BILLABLE_KINDS);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    client: text('client').notNull(),
    name: text('name').notNull(),
    address: text('address').notNull().default(''),
    hourlyRateCents: integer('hourly_rate_cents').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('projects_owner_id_idx').on(table.ownerId),
    check('projects_hourly_rate_positive', sql`${table.hourlyRateCents} > 0`),
  ]
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Denormalised from the project so invoice lookups, including the PDF
    // route, are scoped without a join.
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    number: integer('number').notNull(),
    // Bill-to details as printed on the PDF, so later project edits cannot
    // make the invoice page disagree with the document that was sent.
    clientName: text('client_name').notNull(),
    projectName: text('project_name').notNull(),
    address: text('address').notNull(),
    totalCents: integer('total_cents').notNull(),
    pathname: text('pathname').notNull(),
    createdAt: createdAt(),
    sentAt: timestamptz('sent_at'),
    dueAt: timestamptz('due_at'),
    paidAt: timestamptz('paid_at'),
  },
  (table) => [
    index('invoices_project_id_idx').on(table.projectId),
    uniqueIndex('invoices_owner_number_unique').on(table.ownerId, table.number),
    check('invoices_total_positive', sql`${table.totalCents} > 0`),
  ]
);

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    kind: billableKind('kind').notNull(),
    sourceId: uuid('source_id').notNull(),
    title: text('title').notNull(),
    amountCents: integer('amount_cents').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    uniqueIndex('invoice_line_items_source_unique').on(
      table.invoiceId,
      table.sourceId
    ),
    check('invoice_line_items_amount_valid', sql`${table.amountCents} >= 0`),
  ]
);

/**
 * Billable work on a project. `hours` is set for logged time and null for a
 * flat one-off charge. `invoice_id` is null until the charge is billed.
 */
export const charges = pgTable(
  'charges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    hours: numeric('hours', { precision: 7, scale: 2, mode: 'number' }),
    amountCents: integer('amount_cents').notNull(),
    invoiceId: uuid('invoice_id').references(() => invoices.id, {
      onDelete: 'restrict',
    }),
    createdAt: createdAt(),
  },
  (table) => [
    index('charges_project_id_idx').on(table.projectId),
    index('charges_invoice_id_idx').on(table.invoiceId),
    check('charges_hours_positive', sql`${table.hours} is null or ${table.hours} > 0`),
    check('charges_amount_valid', sql`${table.amountCents} >= 0`),
  ]
);

export const furnitureItems = pgTable(
  'furniture_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    vendor: text('vendor').notNull().default(''),
    retailCents: integer('retail_cents').notNull(),
    tradeCents: integer('trade_cents').notNull(),
    link: text('link').notNull().default(''),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    notes: text('notes').notNull().default(''),
    status: furnitureStatus('status').notNull().default('Pending'),
    invoiceId: uuid('invoice_id').references(() => invoices.id, {
      onDelete: 'restrict',
    }),
    createdAt: createdAt(),
  },
  (table) => [
    index('furniture_items_project_id_idx').on(table.projectId),
    index('furniture_items_invoice_id_idx').on(table.invoiceId),
    check(
      'furniture_items_prices_valid',
      sql`${table.retailCents} >= 0 and ${table.tradeCents} >= 0`
    ),
  ]
);
