import type {
  Project,
  Invoice,
  CreateProjectInput,
  LogHoursInput,
  AddFurnitureInput,
  FurnitureStatus,
  BillableSource,
  HourEntry,
  FurnitureItem,
} from '../types';
import { computeOutstanding } from '../types';

/** Reference to a billable item that can be attached to an invoice. */
export interface BillableItemRef {
  id: string;
  source: BillableSource;
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
  deleteFurniture(projectId: string, furnitureId: string): Promise<Project | null>;
  /** Attach billable items to an invoice so they stop counting as outstanding. */
  markItemsInvoiced(
    projectId: string,
    invoiceId: string,
    items: BillableItemRef[]
  ): Promise<void>;
}

export interface InvoiceRepository {
  list(projectId: string): Promise<Invoice[]>;
  get(id: string): Promise<Invoice | null>;
  create(invoice: Omit<Invoice, 'id'>): Promise<Invoice>;
  markPaid(id: string): Promise<Invoice | null>;
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
    const project = this.projects.get(projectId);
    if (!project) return null;

    const updated: Project = {
      ...project,
      furniture: project.furniture.map((item) =>
        item.id === furnitureId ? { ...item, status } : item
      ),
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
  private counter = 1042;

  async list(projectId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((inv) => inv.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) ?? null;
  }

  async create(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    const id = crypto.randomUUID();
    const number = `#${this.counter++}`;
    const created: Invoice = { ...invoice, id, number };
    this.invoices.set(id, created);
    return created;
  }

  async markPaid(id: string): Promise<Invoice | null> {
    const existing = this.invoices.get(id);
    if (!existing) return null;

    const updated: Invoice = { ...existing, paid: true };
    this.invoices.set(id, updated);
    return updated;
  }
}
