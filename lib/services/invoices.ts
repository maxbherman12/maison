import { basename } from 'node:path';
import type { Invoice, GenerateInvoiceInput } from '../types';
import type { InvoiceRepository, ProjectRepository } from '../repository/memory';
import type { BlobStore } from '../storage/blob-store';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface InvoicePdfRenderer {
  render(input: GenerateInvoiceInput): Promise<Buffer>;
}

export class PdfInvoiceRenderer implements InvoicePdfRenderer {
  async render(input: GenerateInvoiceInput): Promise<Buffer> {
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

  async generateInvoice(input: GenerateInvoiceInput): Promise<Invoice> {
    if (!input.client.trim()) {
      throw new Error('Client name is required');
    }
    if (!input.project.trim()) {
      throw new Error('Project name is required');
    }
    if (!input.items.length) {
      throw new Error('Invoice must have at least one line item');
    }

    // The server is the source of truth for the total, so a client cannot
    // inflate or deflate what the PDF says is due.
    const total = input.items.reduce((sum, item) => sum + item.amount, 0);
    if (total <= 0) {
      throw new Error('Total must be greater than zero');
    }

    const bytes = await this.renderer.render({ ...input, total });

    const slug = input.project.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const { pathname } = await this.blobs.put(
      `invoices/${Date.now()}-${slug}.pdf`,
      bytes,
      { contentType: 'application/pdf' }
    );

    const invoice = await this.invoices.create({
      projectId: input.projectId,
      number: '', // set by repository
      createdAt: new Date().toISOString(),
      total,
      paid: false,
      pathname,
    } as Omit<Invoice, 'id'>);

    // Tie the billed items to the invoice so they stop showing as outstanding.
    await this.projects.markItemsInvoiced(
      input.projectId,
      invoice.id,
      input.items.map((item) => ({ id: item.id, source: item.source }))
    );

    return invoice;
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

  async markPaid(id: string): Promise<Invoice | null> {
    return this.invoices.markPaid(id);
  }
}
