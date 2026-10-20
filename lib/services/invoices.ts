import type { Invoice, GenerateInvoiceInput } from '../types';
import type { InvoiceRepository, ProjectRepository } from '../repository/memory';
import { put } from '@vercel/blob';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface InvoiceGenerator {
  generate(input: GenerateInvoiceInput): Promise<{ pathname: string; bytes: Buffer }>;
}

export class PdfInvoiceGenerator implements InvoiceGenerator {
  async generate(input: GenerateInvoiceInput): Promise<{ pathname: string; bytes: Buffer }> {
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
    const buffer = Buffer.from(bytes);

    const slug = input.project.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const blob = await put(`invoices/${Date.now()}-${slug}.pdf`, buffer, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false,
    });

    return { pathname: blob.pathname, bytes: buffer };
  }
}

export class InvoiceService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly generator: InvoiceGenerator,
    private readonly projects: ProjectRepository
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

    const { pathname } = await this.generator.generate({ ...input, total });

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

  async markPaid(id: string): Promise<Invoice | null> {
    return this.invoices.markPaid(id);
  }
}
