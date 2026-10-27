import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  client: text('client').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  hourlyRate: real('hourly_rate').notNull(),
  color: text('color').notNull().default('sage'),
  initials: text('initials').notNull(),
  outstanding: real('outstanding').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    number: text('number').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    total: real('total').notNull(),
    paid: boolean('paid').notNull().default(false),
    pathname: text('pathname'),
    sentAt: timestamp('sent_at'),
    dueAt: timestamp('due_at'),
    paidAt: timestamp('paid_at'),
  },
  (table) => [
    index('invoices_project_id_idx').on(table.projectId),
    index('invoices_created_at_idx').on(table.createdAt),
    uniqueIndex('invoices_number_unique').on(table.number),
  ]
);

export const invoiceLineItems = pgTable(
  'invoice_line_items',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    source: text('source', { enum: ['hours', 'furniture'] }).notNull(),
    sourceId: text('source_id').notNull(),
    title: text('title').notNull(),
    amount: real('amount').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('invoice_line_items_invoice_id_idx').on(table.invoiceId),
    uniqueIndex('invoice_line_items_source_unique').on(
      table.invoiceId,
      table.source,
      table.sourceId
    ),
  ]
);

export const hourEntries = pgTable('hour_entries', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  date: text('date').notNull(),
  hours: real('hours').notNull(),
  amount: real('amount').notNull(),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const furnitureItems = pgTable('furniture_items', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  vendor: text('vendor'),
  retail: real('retail').notNull(),
  trade: real('trade').notNull(),
  link: text('link'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  notes: text('notes'),
  status: text('status', { enum: ['Pending', 'Ordered', 'In transit', 'Delivered'] }).notNull().default('Pending'),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
