import type {
  Project,
  Invoice,
  CreateProjectInput,
  LogHoursInput,
  AddFurnitureInput,
  FurnitureStatus,
  BillableItemRef,
  UpdateHourEntryInput,
  UpdateFurnitureInput,
  InvoiceLineItemSnapshot,
  HourEntry,
  FurnitureItem,
} from '../types';
import { computeOutstanding } from '../types';

export type { BillableItemRef } from '../types';

/** A line item derived by the service, ready to be snapshotted. */
export interface InvoiceLineItemInput {
  source: 'hours' | 'furniture';
  sourceId: string;
  title: string;
  amount: number;
}

export interface CreateInvoiceWithItemsInput {
  projectId: string;
  total: number;
  pathname?: string;
  items: InvoiceLineItemInput[];
}

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
  updateFurniture(
    projectId: string,
    furnitureId: string,
    patch: UpdateFurnitureInput
  ): Promise<Project | null>;
  deleteFurniture(projectId: string, furnitureId: string): Promise<Project | null>;
  updateHourEntry(
    projectId: string,
    hourId: string,
    patch: UpdateHourEntryInput
  ): Promise<Project | null>;
  deleteHourEntry(projectId: string, hourId: string): Promise<Project | null>;
  /** Attach billable items to an invoice so they stop counting as outstanding. */
  markItemsInvoiced(
    projectId: string,
    invoiceId: string,
    items: BillableItemRef[]
  ): Promise<void>;
}

export interface InvoiceRepository {
  list(projectId: string): Promise<Invoice[]>;
  listAll(): Promise<Invoice[]>;
  get(id: string): Promise<Invoice | null>;
  createWithItems(input: CreateInvoiceWithItemsInput): Promise<Invoice>;
  markSent(id: string, sentAt: Date, dueAt: Date): Promise<Invoice | null>;
  markPaid(id: string, paidAt: Date): Promise<Invoice | null>;
}

export class MemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  async list(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => b.id.localeCompare(a.id)
    );
  }

  async get(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const id = crypto.randomUUID();
    const initials = input.client
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const project: Project = {
      id,
      client: input.client,
      project: input.project,
      address: input.address,
      hourlyRate: input.hourlyRate,
      outstanding: 0,
      color: 'sage',
      initials,
      furniture: [],
      hours: [],
    };

    this.projects.set(id, project);
    return project;
  }

  async update(id: string, patch: Partial<Project>): Promise<Project | null> {
    const existing = this.projects.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...patch };
    this.projects.set(id, updated);
    return updated;
  }

  async logHours(projectId: string, input: LogHoursInput): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const entry: HourEntry = {
      id: crypto.randomUUID(),
      title: input.title || 'Design work',
      date: input.date,
      hours: input.hours,
      amount: input.amount ?? input.hours * project.hourlyRate,
      invoiceId: null,
    };

    const updated: Project = {
      ...project,
      hours: [...project.hours, entry],
      outstanding: computeOutstanding(
        [...project.hours, entry],
        project.furniture
      ),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async addFurniture(
    projectId: string,
    input: AddFurnitureInput
  ): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const item: FurnitureItem = {
      id: crypto.randomUUID(),
      name: input.name,
      vendor: input.vendor,
      retail: input.retail,
      trade: input.trade,
      link: input.link,
      tags: input.tags,
      notes: input.notes,
      status: 'Pending',
      invoiceId: null,
    };

    const updated: Project = {
      ...project,
      furniture: [...project.furniture, item],
      outstanding: computeOutstanding(project.hours, [
        ...project.furniture,
        item,
      ]),
    };

    this.projects.set(projectId, updated);
    return updated;
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
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.furniture.some((item) => item.id === furnitureId)) {
      return null;
    }

    const furniture = project.furniture.map((item) =>
      item.id === furnitureId ? { ...item, ...patch } : item
    );

    const updated: Project = {
      ...project,
      furniture,
      outstanding: computeOutstanding(project.hours, furniture),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async updateHourEntry(
    projectId: string,
    hourId: string,
    patch: UpdateHourEntryInput
  ): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.hours.some((entry) => entry.id === hourId)) {
      return null;
    }

    const hours = project.hours.map((entry) =>
      entry.id === hourId ? { ...entry, ...patch } : entry
    );

    const updated: Project = {
      ...project,
      hours,
      outstanding: computeOutstanding(hours, project.furniture),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async deleteHourEntry(
    projectId: string,
    hourId: string
  ): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    if (!project.hours.some((entry) => entry.id === hourId)) {
      return null;
    }

    const hours = project.hours.filter((entry) => entry.id !== hourId);

    const updated: Project = {
      ...project,
      hours,
      outstanding: computeOutstanding(hours, project.furniture),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async deleteFurniture(
    projectId: string,
    furnitureId: string
  ): Promise<Project | null> {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const updated: Project = {
      ...project,
      furniture: project.furniture.filter((item) => item.id !== furnitureId),
      outstanding: computeOutstanding(
        project.hours,
        project.furniture.filter((item) => item.id !== furnitureId)
      ),
    };

    this.projects.set(projectId, updated);
    return updated;
  }

  async markItemsInvoiced(
    projectId: string,
    invoiceId: string,
    items: BillableItemRef[]
  ): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    const hourIds = new Set(
      items.filter((i) => i.source === 'hours').map((i) => i.id)
    );
    const furnitureIds = new Set(
      items.filter((i) => i.source === 'furniture').map((i) => i.id)
    );

    const hours = project.hours.map((entry) =>
      hourIds.has(entry.id) ? { ...entry, invoiceId } : entry
    );
    const furniture = project.furniture.map((item) =>
      furnitureIds.has(item.id) ? { ...item, invoiceId } : item
    );

    this.projects.set(projectId, {
      ...project,
      hours,
      furniture,
      outstanding: computeOutstanding(hours, furniture),
    });
  }
}

export class MemoryInvoiceRepository implements InvoiceRepository {
  private invoices: Map<string, Invoice> = new Map();
  private lineItems: Map<string, InvoiceLineItemSnapshot[]> = new Map();
  private counter = 1042;

  async list(projectId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((inv) => inv.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((invoice) => this.withLineItemCount(invoice));
  }

  async listAll(): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((invoice) => this.withLineItemCount(invoice));
  }

  async get(id: string): Promise<Invoice | null> {
    const invoice = this.invoices.get(id);
    if (!invoice) return null;

    return { ...invoice, lineItems: this.lineItems.get(id) ?? [] };
  }

  async createWithItems(input: CreateInvoiceWithItemsInput): Promise<Invoice> {
    const id = crypto.randomUUID();
    const number = `#${this.counter++}`;
    const createdAt = new Date().toISOString();

    const invoice: Invoice = {
      id,
      projectId: input.projectId,
      number,
      createdAt,
      total: input.total,
      paid: false,
      pathname: input.pathname,
    };

    const items: InvoiceLineItemSnapshot[] = input.items.map((item) => ({
      id: crypto.randomUUID(),
      invoiceId: id,
      source: item.source,
      sourceId: item.sourceId,
      title: item.title,
      amount: item.amount,
      createdAt,
    }));

    this.invoices.set(id, invoice);
    this.lineItems.set(id, items);

    return { ...invoice, lineItems: items };
  }

  async markSent(
    id: string,
    sentAt: Date,
    dueAt: Date
  ): Promise<Invoice | null> {
    return this.update(id, {
      sentAt: sentAt.toISOString(),
      dueAt: dueAt.toISOString(),
    });
  }

  async markPaid(id: string, paidAt: Date): Promise<Invoice | null> {
    const existing = this.invoices.get(id);
    if (!existing) return null;

    return this.update(id, {
      paid: true,
      paidAt: paidAt.toISOString(),
      sentAt: existing.sentAt ?? paidAt.toISOString(),
    });
  }

  private update(id: string, patch: Partial<Invoice>): Invoice | null {
    const existing = this.invoices.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...patch };
    this.invoices.set(id, updated);
    return updated;
  }

  private withLineItemCount(invoice: Invoice): Invoice {
    return {
      ...invoice,
      lineItemCount: this.lineItems.get(invoice.id)?.length ?? 0,
    };
  }
}
