import type {
  Project,
  Invoice,
  CreateProjectInput,
  LogHoursInput,
  AddFurnitureInput,
  FurnitureStatus,
  HourEntry,
  FurnitureItem,
} from '@/lib/types';
import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  projects,
  hourEntries,
  furnitureItems,
  invoices,
} from '@/lib/db/schema';

export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  update(id: string, patch: Partial<Project>): Promise<Project | null>;
  logHours(projectId: string, input: LogHoursInput): Promise<Project | null>;
  addFurniture(projectId: string, input: AddFurnitureInput): Promise<Project | null>;
  updateFurnitureStatus(
    projectId: string,
    furnitureId: string,
    status: FurnitureStatus
  ): Promise<Project | null>;
  deleteFurniture(projectId: string, furnitureId: string): Promise<Project | null>;
}

export interface InvoiceRepository {
  list(projectId: string): Promise<Invoice[]>;
  create(invoice: Omit<Invoice, 'id'>): Promise<Invoice>;
  markPaid(id: string): Promise<Invoice | null>;
}

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
    await db
      .update(furnitureItems)
      .set({ status })
      .where(eq(furnitureItems.id, furnitureId));
    return this.get(projectId);
  }

  async deleteFurniture(
    projectId: string,
    furnitureId: string
  ): Promise<Project | null> {
    await db.delete(furnitureItems).where(eq(furnitureItems.id, furnitureId));
    return this.get(projectId);
  }

  private computeOutstanding(hours: HourEntry[], furniture: FurnitureItem[]): number {
    const labor = hours.reduce((sum, entry) => sum + entry.amount, 0);
    const purchases = furniture.reduce((sum, item) => sum + item.trade, 0);
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
    };
  }

  async list(projectId: string): Promise<Invoice[]> {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, projectId))
      .orderBy(invoices.createdAt);
    return rows.map((row) => this.toInvoice(row));
  }

  async create(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    const id = crypto.randomUUID();
    const counter = await this.nextCounter();
    const number = `#${counter}`;

    const [row] = await db
      .insert(invoices)
      .values({
        id,
        projectId: invoice.projectId,
        number,
        createdAt: new Date(),
        total: invoice.total,
        paid: invoice.paid,
        pathname: invoice.pathname ?? null,
      })
      .returning();

    return this.toInvoice(row);
  }

  async markPaid(id: string): Promise<Invoice | null> {
    const [row] = await db
      .update(invoices)
      .set({ paid: true })
      .where(eq(invoices.id, id))
      .returning();
    if (!row) return null;
    return this.toInvoice(row);
  }

  private async nextCounter(): Promise<number> {
    const result = await db
      .select({ max: sql<number>`max(substring(number from '[0-9]+')::int)` })
      .from(invoices);
    const max = result[0]?.max;
    return max != null && !isNaN(max) ? max + 1 : 1042;
  }
}
