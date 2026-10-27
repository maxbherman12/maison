import type {
  Project,
  Invoice,
  CreateProjectInput,
  LogHoursInput,
  AddFurnitureInput,
  FurnitureStatus,
  UpdateHourEntryInput,
  UpdateFurnitureInput,
  InvoiceLineItemSnapshot,
  HourEntry,
  FurnitureItem,
} from '@/lib/types';
import 'server-only';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  projects,
  hourEntries,
  furnitureItems,
  invoices,
  invoiceLineItems,
} from '@/lib/db/schema';
import type {
  BillableItemRef,
  CreateInvoiceWithItemsInput,
  ProjectRepository,
  InvoiceRepository,
} from './memory';

export type { BillableItemRef, ProjectRepository, InvoiceRepository };

export class PostgresProjectRepository implements ProjectRepository {
  private toProject(row: typeof projects.$inferSelect): Project {
    return {
      id: row.id,
      client: row.client,
      project: row.name,
      address: row.address ?? '',
      hourlyRate: Number(row.hourlyRate),
      outstanding: row.outstanding,
      color: row.color,
      initials: row.initials,
      furniture: [],
      hours: [],
    };
  }

  async list(): Promise<Project[]> {
    const rows = await db.select().from(projects).orderBy(projects.createdAt);
    const projectMap = new Map<string, Project>();

    for (const row of rows) {
      projectMap.set(row.id, this.toProject(row));
    }

    // Load hours
    const hoursRows = await db.select().from(hourEntries);
    for (const h of hoursRows) {
      const project = projectMap.get(h.projectId);
      if (project) {
        project.hours.push({
          id: h.id,
          title: h.title,
          date: h.date,
          hours: Number(h.hours),
          amount: Number(h.amount),
          invoiceId: h.invoiceId,
        });
      }
    }

    // Load furniture
    const furnitureRows = await db.select().from(furnitureItems);
    for (const f of furnitureRows) {
      const project = projectMap.get(f.projectId);
      if (project) {
        project.furniture.push({
          id: f.id,
          name: f.name,
          vendor: f.vendor ?? '',
          retail: Number(f.retail),
          trade: Number(f.trade),
          link: f.link ?? '',
          tags: f.tags ?? [],
          notes: f.notes ?? '',
          status: f.status as FurnitureStatus,
          invoiceId: f.invoiceId,
        });
      }
    }

    // Recompute outstanding
    for (const project of projectMap.values()) {
      project.outstanding = this.computeOutstanding(project.hours, project.furniture);
    }

    return Array.from(projectMap.values());
  }

  async get(id: string): Promise<Project | null> {
    const row = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!row[0]) return null;

    const project = this.toProject(row[0]);

    const hoursRows = await db.select().from(hourEntries).where(eq(hourEntries.projectId, id));
    project.hours = hoursRows.map((h) => ({
      id: h.id,
      title: h.title,
      date: h.date,
      hours: Number(h.hours),
      amount: Number(h.amount),
      invoiceId: h.invoiceId,
    }));

    const furnitureRows = await db.select().from(furnitureItems).where(eq(furnitureItems.projectId, id));
    project.furniture = furnitureRows.map((f) => ({
      id: f.id,
      name: f.name,
      vendor: f.vendor ?? '',
      retail: Number(f.retail),
      trade: Number(f.trade),
      link: f.link ?? '',
      tags: f.tags ?? [],
      notes: f.notes ?? '',
      status: f.status as FurnitureStatus,
      invoiceId: f.invoiceId,
    }));

    project.outstanding = this.computeOutstanding(project.hours, project.furniture);
    return project;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const id = crypto.randomUUID();
    const initials = input.client
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    await db.insert(projects).values({
      id,
      client: input.client,
      name: input.project,
      address: input.address ?? null,
      hourlyRate: input.hourlyRate,
      initials,
    });

    return this.get(id) as Promise<Project>;
  }

  async update(id: string, patch: Partial<Project>): Promise<Project | null> {
    const updateData: Record<string, unknown> = {};
    if (patch.client !== undefined) updateData.client = patch.client;
    if (patch.project !== undefined) updateData.name = patch.project;
    if (patch.address !== undefined) updateData.address = patch.address ?? null;
    if (patch.hourlyRate !== undefined) updateData.hourlyRate = patch.hourlyRate;
    if (patch.color !== undefined) updateData.color = patch.color;
    if (patch.initials !== undefined) updateData.initials = patch.initials;

    if (Object.keys(updateData).length > 0) {
      await db.update(projects).set(updateData).where(eq(projects.id, id));
    }

    return this.get(id);
  }

  async logHours(projectId: string, input: LogHoursInput): Promise<Project | null> {
    const project = await this.get(projectId);
    if (!project) return null;

    const entryId = crypto.randomUUID();
    const amount = input.amount ?? input.hours * project.hourlyRate;

    await db.insert(hourEntries).values({
      id: entryId,
      projectId,
      title: input.title,
      date: input.date,
      hours: input.hours,
      amount,
    });

    return this.get(projectId);
  }

  async addFurniture(
    projectId: string,
    input: AddFurnitureInput
  ): Promise<Project | null> {
    const itemId = crypto.randomUUID();

    await db.insert(furnitureItems).values({
      id: itemId,
      projectId,
      name: input.name,
      vendor: input.vendor ?? null,
      retail: input.retail,
      trade: input.trade,
      link: input.link ?? null,
      tags: input.tags,
      notes: input.notes ?? null,
      status: 'Pending',
    });

    return this.get(projectId);
  }

  async updateFurnitureStatus(
    projectId: string,
    furnitureId: string,
    status: FurnitureStatus
  ): Promise<Project | null> {
    return this.updateFurniture(projectId, furnitureId, { status });
  }

  async updateFurniture(
    projectId: string,
    furnitureId: string,
    patch: UpdateFurnitureInput
  ): Promise<Project | null> {
    const updateData: Partial<typeof furnitureItems.$inferInsert> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.vendor !== undefined) updateData.vendor = patch.vendor || null;
    if (patch.retail !== undefined) updateData.retail = patch.retail;
    if (patch.trade !== undefined) updateData.trade = patch.trade;
    if (patch.link !== undefined) updateData.link = patch.link || null;
    if (patch.tags !== undefined) updateData.tags = patch.tags;
    if (patch.notes !== undefined) updateData.notes = patch.notes || null;
    if (patch.status !== undefined) updateData.status = patch.status;

    if (Object.keys(updateData).length === 0) {
      return this.get(projectId);
    }

    const updated = await db
      .update(furnitureItems)
      .set(updateData)
      .where(
        and(
          eq(furnitureItems.id, furnitureId),
          eq(furnitureItems.projectId, projectId)
        )
      )
      .returning({ id: furnitureItems.id });

    if (updated.length === 0) return null;
    return this.get(projectId);
  }

  async deleteFurniture(
    projectId: string,
    furnitureId: string
  ): Promise<Project | null> {
    const deleted = await db
      .delete(furnitureItems)
      .where(
        and(
          eq(furnitureItems.id, furnitureId),
          eq(furnitureItems.projectId, projectId)
        )
      )
      .returning({ id: furnitureItems.id });

    if (deleted.length === 0) return null;
    return this.get(projectId);
  }

  async updateHourEntry(
    projectId: string,
    hourId: string,
    patch: UpdateHourEntryInput
  ): Promise<Project | null> {
    const updateData: Partial<typeof hourEntries.$inferInsert> = {};
    if (patch.title !== undefined) updateData.title = patch.title;
    if (patch.date !== undefined) updateData.date = patch.date;
    if (patch.hours !== undefined) updateData.hours = patch.hours;
    if (patch.amount !== undefined) updateData.amount = patch.amount;

    if (Object.keys(updateData).length === 0) {
      return this.get(projectId);
    }

    const updated = await db
      .update(hourEntries)
      .set(updateData)
      .where(
        and(eq(hourEntries.id, hourId), eq(hourEntries.projectId, projectId))
      )
      .returning({ id: hourEntries.id });

    if (updated.length === 0) return null;
    return this.get(projectId);
  }

  async deleteHourEntry(
    projectId: string,
    hourId: string
  ): Promise<Project | null> {
    const deleted = await db
      .delete(hourEntries)
      .where(
        and(eq(hourEntries.id, hourId), eq(hourEntries.projectId, projectId))
      )
      .returning({ id: hourEntries.id });

    if (deleted.length === 0) return null;
    return this.get(projectId);
  }

  async markItemsInvoiced(
    projectId: string,
    invoiceId: string,
    items: BillableItemRef[]
  ): Promise<void> {
    const hourIds = items.filter((i) => i.source === 'hours').map((i) => i.id);
    const furnitureIds = items.filter((i) => i.source === 'furniture').map((i) => i.id);

    if (hourIds.length) {
      await db
        .update(hourEntries)
        .set({ invoiceId })
        .where(
          and(
            inArray(hourEntries.id, hourIds),
            eq(hourEntries.projectId, projectId)
          )
        );
    }

    if (furnitureIds.length) {
      await db
        .update(furnitureItems)
        .set({ invoiceId })
        .where(
          and(
            inArray(furnitureItems.id, furnitureIds),
            eq(furnitureItems.projectId, projectId)
          )
        );
    }
  }

  private computeOutstanding(hours: HourEntry[], furniture: FurnitureItem[]): number {
    const labor = hours
      .filter((entry) => entry.invoiceId === null)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const purchases = furniture
      .filter((item) => item.invoiceId === null)
      .reduce((sum, item) => sum + item.trade, 0);
    return labor + purchases;
  }
}

export class PostgresInvoiceRepository implements InvoiceRepository {
  private toInvoice(row: typeof invoices.$inferSelect): Invoice {
    return {
      id: row.id,
      projectId: row.projectId,
      number: row.number,
      createdAt: row.createdAt.toISOString(),
      total: row.total,
      paid: row.paid,
      pathname: row.pathname ?? undefined,
      sentAt: row.sentAt?.toISOString(),
      dueAt: row.dueAt?.toISOString(),
      paidAt: row.paidAt?.toISOString(),
    };
  }

  private toLineItem(
    row: typeof invoiceLineItems.$inferSelect
  ): InvoiceLineItemSnapshot {
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      source: row.source as InvoiceLineItemSnapshot['source'],
      sourceId: row.sourceId,
      title: row.title,
      amount: row.amount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(projectId: string): Promise<Invoice[]> {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .orderBy(desc(invoices.createdAt));

    return this.withLineItemCounts(rows.map((row) => this.toInvoice(row)));
  }

  async listAll(): Promise<Invoice[]> {
    const rows = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt));

    return this.withLineItemCounts(rows.map((row) => this.toInvoice(row)));
  }

  async get(id: string): Promise<Invoice | null> {
    const [row] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    if (!row) return null;

    const items = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(invoiceLineItems.createdAt, invoiceLineItems.id);

    return {
      ...this.toInvoice(row),
      lineItems: items.map((item) => this.toLineItem(item)),
    };
  }

  async createWithItems(
    input: CreateInvoiceWithItemsInput
  ): Promise<Invoice> {
    return db.transaction(async (tx) => {
      // Serialise number allocation for the duration of the transaction so two
      // concurrent generations cannot pick the same `max + 1`.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('invoice_number'))`
      );

      const result = await tx
        .select({ max: sql<number>`max(substring(number from '[0-9]+')::int)` })
        .from(invoices);
      const max = result[0]?.max;
      const counter = max != null && !isNaN(max) ? Number(max) + 1 : 1042;
      const id = crypto.randomUUID();
      const number = `#${counter}`;
      const now = new Date();

      const [row] = await tx
        .insert(invoices)
        .values({
          id,
          projectId: input.projectId,
          number,
          createdAt: now,
          total: input.total,
          paid: false,
          pathname: input.pathname ?? null,
        })
        .returning();

      const items = input.items.map((item) => ({
        id: crypto.randomUUID(),
        invoiceId: id,
        source: item.source,
        sourceId: item.sourceId,
        title: item.title,
        amount: item.amount,
        createdAt: now,
      }));

      await tx.insert(invoiceLineItems).values(items);

      // Only attach rows that are still pending on this project. If another
      // tab invoiced one in the meantime the count will not match and the
      // whole transaction rolls back.
      const hourIds = input.items
        .filter((item) => item.source === 'hours')
        .map((item) => item.sourceId);
      const furnitureIds = input.items
        .filter((item) => item.source === 'furniture')
        .map((item) => item.sourceId);

      if (hourIds.length) {
        const updated = await tx
          .update(hourEntries)
          .set({ invoiceId: id })
          .where(
            and(
              inArray(hourEntries.id, hourIds),
              eq(hourEntries.projectId, input.projectId),
              isNull(hourEntries.invoiceId)
            )
          )
          .returning({ id: hourEntries.id });

        if (updated.length !== hourIds.length) {
          throw new Error('One or more hour entries are no longer pending');
        }
      }

      if (furnitureIds.length) {
        const updated = await tx
          .update(furnitureItems)
          .set({ invoiceId: id })
          .where(
            and(
              inArray(furnitureItems.id, furnitureIds),
              eq(furnitureItems.projectId, input.projectId),
              isNull(furnitureItems.invoiceId)
            )
          )
          .returning({ id: furnitureItems.id });

        if (updated.length !== furnitureIds.length) {
          throw new Error('One or more furniture items are no longer pending');
        }
      }

      return {
        ...this.toInvoice(row),
        lineItems: items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      };
    });
  }

  async markSent(
    id: string,
    sentAt: Date,
    dueAt: Date
  ): Promise<Invoice | null> {
    const [row] = await db
      .update(invoices)
      .set({ sentAt, dueAt })
      .where(eq(invoices.id, id))
      .returning();
    if (!row) return null;
    return this.get(row.id);
  }

  async markPaid(id: string, paidAt: Date): Promise<Invoice | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const [row] = await db
      .update(invoices)
      .set({
        paid: true,
        paidAt,
        sentAt: existing.sentAt ? new Date(existing.sentAt) : paidAt,
      })
      .where(eq(invoices.id, id))
      .returning();
    if (!row) return null;
    return this.get(row.id);
  }

  private async withLineItemCounts(
    rows: Invoice[]
  ): Promise<Invoice[]> {
    if (rows.length === 0) return [];

    const counts = await db
      .select({
        invoiceId: invoiceLineItems.invoiceId,
        value: count(),
      })
      .from(invoiceLineItems)
      .where(
        inArray(
          invoiceLineItems.invoiceId,
          rows.map((row) => row.id)
        )
      )
      .groupBy(invoiceLineItems.invoiceId);

    const countMap = new Map(
      counts.map((entry) => [entry.invoiceId, Number(entry.value)])
    );

    return rows.map((row) => ({
      ...row,
      lineItemCount: countMap.get(row.id) ?? 0,
    }));
  }
}
