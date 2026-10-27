import { basename } from 'node:path';
import type {
  Invoice,
  InvoiceLineItem,
  GenerateInvoiceInput,
} from '../types';
import type {
  InvoiceRepository,
  ProjectRepository,
} from '../repository/memory';
import type { BlobStore } from '../storage/blob-store';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { billableRowKey, buildBillableRows } from '../billing';
import { getInvoiceDueDays } from '../invoices/config';
import { AppError } from '../errors';

interface InvoicePdfInput {
  client: string;
  project: string;
  total: number;
  items: InvoiceLineItem[];
}

interface InvoicePdfRenderer {
  render(input: InvoicePdfInput): Promise<Buffer>;
}

export class PdfInvoiceRenderer implements InvoicePdfRenderer {
  async render(input: InvoicePdfInput): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Maison', {
      x: 54,
      y: 720,
      size: 22,
      font: bold,
      color: rgb(0.2, 0.23, 0.2),
    });
    page.drawText(`Invoice for ${input.project}`, {
      x: 54,
      y: 680,
      size: 14,
      font: bold,
    });
    page.drawText(`Bill to: ${input.client}`, {
      x: 54,
      y: 655,
      size: 12,
      font,
    });

    let y = 600;
    for (const item of input.items) {
      page.drawText(item.title.slice(0, 70), {
        x: 54,
        y,
        size: 11,
        font,
      });
      page.drawText(`$${item.amount.toFixed(2)}`, {
        x: 470,
        y,
        size: 11,
        font,
      });
      y -= 24;
    }

    page.drawText(`Total due: $${input.total.toFixed(2)}`, {
      x: 360,
      y: y - 12,
      size: 15,
      font: bold,
    });

    const bytes = await pdf.save();

    return Buffer.from(bytes);
  }
}

export class InvoiceService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly renderer: InvoicePdfRenderer,
    private readonly projects: ProjectRepository,
    private readonly blobs: BlobStore
  ) {}

  async listInvoices(projectId: string): Promise<Invoice[]> {
    return this.invoices.list(projectId);
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    return this.invoices.get(id);
  }

  async generateInvoice(input: GenerateInvoiceInput): Promise<Invoice> {
    const project = await this.projects.get(input.projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (!input.items.length) {
      throw new AppError('Invoice must have at least one line item');
    }

    const seen = new Set<string>();
    for (const item of input.items) {
      const key = `${item.source}:${item.id}`;
      if (seen.has(key)) {
        throw new AppError('Invoice contains duplicate line items');
      }
      seen.add(key);
    }

    // Derive titles and amounts from the project rows. The client only ever
    // sends source references, so it cannot rewrite what was billed.
    const pending = new Map(
      buildBillableRows(project).map((row) => [billableRowKey(row), row])
    );

    const rows = input.items.map((item) => {
      const row = pending.get(`${item.source}:${item.id}`);
      if (!row) {
        throw new AppError(
          'One or more items are no longer pending on this project'
        );
      }
      return row;
    });

    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    if (total <= 0) {
      throw new AppError('Total must be greater than zero');
    }

    const bytes = await this.renderer.render({
      client: project.client,
      project: project.project,
      total,
      items: rows.map((row) => ({
        id: row.itemId,
        source: row.source,
        title: row.description,
        amount: row.amount,
      })),
    });

    const slug = project.project.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const { pathname } = await this.blobs.put(
      `invoices/${Date.now()}-${slug}.pdf`,
      bytes,
      { contentType: 'application/pdf' }
    );

    try {
      return await this.invoices.createWithItems({
        projectId: project.id,
        total,
        pathname,
        items: rows.map((row) => ({
          source: row.source,
          sourceId: row.itemId,
          title: row.description,
          amount: row.amount,
        })),
      });
    } catch (error) {
      // The PDF is already uploaded; remove it so a failed transaction does
      // not leave an orphan blob behind.
      try {
        await this.blobs.delete(pathname);
      } catch (cleanupError) {
        console.error('[invoice] failed to delete orphaned blob', cleanupError);
      }
      throw error;
    }
  }

  async markSent(id: string): Promise<Invoice> {
    const invoice = await this.invoices.get(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (invoice.paid) {
      throw new AppError('Paid invoices cannot be marked as sent', 409);
    }
    if (invoice.sentAt) {
      return invoice;
    }

    const sentAt = new Date();
    const dueAt = addDays(sentAt, getInvoiceDueDays());
    const updated = await this.invoices.markSent(id, sentAt, dueAt);

    if (!updated) {
      throw new AppError('Invoice not found', 404);
    }
    return updated;
  }

  async markPaid(id: string): Promise<Invoice> {
    const invoice = await this.invoices.get(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (invoice.paid) {
      return invoice;
    }

    const updated = await this.invoices.markPaid(id, new Date());
    if (!updated) {
      throw new AppError('Invoice not found', 404);
    }
    return updated;
  }

  async getInvoicePdf(id: string): Promise<{
    stream: ReadableStream<Uint8Array>;
    contentType: string;
    filename: string;
  } | null> {
    const invoice = await this.invoices.get(id);
    if (!invoice?.pathname) return null;

    const blob = await this.blobs.get(invoice.pathname);
    if (!blob) return null;

    return {
      ...blob,
      filename: basename(invoice.pathname),
    };
  }
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
