import { pgTable, serial, text, integer, boolean, timestamp, real, jsonb } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  client: text('client').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  hourlyRate: real('hourly_rate').notNull(),
  color: text('color').notNull().default('sage'),
  initials: text('initials').notNull(),
  outstanding: integer('outstanding').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const hourEntries = pgTable('hour_entries', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  date: text('date').notNull(),
  hours: real('hours').notNull(),
  amount: real('amount').notNull(),
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
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  number: text('number').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  total: integer('total').notNull(),
  paid: boolean('paid').notNull().default(false),
  pathname: text('pathname'),
});
