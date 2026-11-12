import 'server-only';
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  charges,
  furnitureItems,
  invoiceLineItems,
  invoices,
  projects,
} from '@/lib/db/schema';
import { buildBillableItems, totalCents } from '@/lib/domain/billing';
import { addDays } from '@/lib/domain/dates';
import type { PaidInvoice } from '@/lib/domain/earnings';
import { isUuid } from '@/lib/domain/ids';
import { PAINTS } from '@/lib/domain/paints';
import { invoiceIssuer } from '@/lib/domain/settings';
import type {
  InvoiceDetail,
  InvoiceListItem,
} from '@/lib/domain/types';
import { AppError } from '@/lib/errors';
import { renderInvoicePdf } from '@/lib/invoices/pdf';
import type { BlobContent, BlobStore } from '@/lib/storage/blob-store';
import type { GenerateInvoiceInput } from '@/lib/validators/invoices';
import type { SettingsService } from './settings';

const FIRST_INVOICE_NUMBER = 1042;

// The storage key and owner never leave the server.
const { pathname: _pathname, ownerId: _ownerId, ...publicColumns } =
  getTableColumns(invoices);

const lineItemCount = sql<number>`(
  select count(*) from ${invoiceLineItems}
  where ${invoiceLineItems.invoiceId} = ${invoices.id}
)`.mapWith(Number);

export class InvoiceService {
  constructor(
    private readonly ownerId: string,
    private readonly blobs: BlobStore,
    private readonly settings: SettingsService,
    /** The letterhead when the account has no company name. */
    private readonly ownerName: string
  ) {}

  list(projectId: string): Promise<InvoiceListItem[]> {
    return db
      .select({ ...publicColumns, lineItemCount })
      .from(invoices)
      .where(
        and(eq(invoices.projectId, projectId), eq(invoices.ownerId, this.ownerId))
      )
      .orderBy(desc(invoices.number));
  }

  async paidSince(since: Date): Promise<PaidInvoice[]> {
    const rows = await db
      .select({
        projectId: invoices.projectId,
        client: projects.client,
        paint: projects.paint,
        totalCents: invoices.totalCents,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .innerJoin(projects, eq(invoices.projectId, projects.id))
      .where(and(eq(invoices.ownerId, this.ownerId), gte(invoices.paidAt, since)));

    return rows.flatMap(({ paidAt, ...row }) =>
      paidAt ? [{ ...row, paidAt }] : []
    );
  }

  async get(id: string): Promise<InvoiceDetail | null> {
    if (!isUuid(id)) return null;

    const [invoice] = await db
      .select(publicColumns)
      .from(invoices)
      .where(this.isOwned(id))
      .limit(1);
    if (!invoice) return null;

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(asc(invoiceLineItems.position));

    return { ...invoice, lineItems };
  }

  /**
   * Bills the selected pending items in one transaction. The PDF is uploaded
   * before commit, so an invoice exists exactly when its document does: an
   * upload failure rolls everything back, and an item already invoiced by
   * another tab fails the whole attempt.
   */
  async generate({ projectId, itemIds }: GenerateInvoiceInput): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    const pathname = `invoices/${this.ownerId}/${id}.pdf`;
    let uploaded = false;
    const settings = await this.settings.get();
    const issuer = invoiceIssuer(settings, this.ownerName);

    try {
      await db.transaction(async (tx) => {
        // Serialises number allocation for this account.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`invoice_number:${this.ownerId}`}))`
        );

        const [project] = await tx
          .select()
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
          .limit(1);
        if (!project) throw new AppError('Project not found', 404);

        // Row locks hold these amounts steady until the invoice commits.
        const pendingCharges = await tx
          .select()
          .from(charges)
          .where(
            and(
              inArray(charges.id, itemIds),
              eq(charges.projectId, projectId),
              isNull(charges.invoiceId)
            )
          )
          .for('update');
        const pendingFurniture = await tx
          .select()
          .from(furnitureItems)
          .where(
            and(
              inArray(furnitureItems.id, itemIds),
              eq(furnitureItems.projectId, projectId),
              isNull(furnitureItems.invoiceId)
            )
          )
          .for('update');

        const items = buildBillableItems({
          charges: pendingCharges,
          furniture: pendingFurniture,
        });
        if (items.length !== itemIds.length) {
          throw new AppError(
            'One or more items are no longer pending. Refresh and try again.',
            409
          );
        }

        const total = totalCents(items);
        if (total <= 0) throw new AppError('Total must be greater than zero');

        const [{ max }] = await tx
          .select({ max: sql<number | null>`max(${invoices.number})` })
          .from(invoices)
          .where(eq(invoices.ownerId, this.ownerId));
        const number = max === null ? FIRST_INVOICE_NUMBER : max + 1;
        const createdAt = new Date();

        await tx.insert(invoices).values({
          id,
          ownerId: this.ownerId,
          projectId,
          number,
          clientName: project.client,
          projectName: project.name,
          address: project.address,
          style: settings.invoiceStyle,
          fromName: issuer.name,
          fromDetails: issuer.details,
          paymentNote: settings.paymentNote,
          totalCents: total,
          pathname,
          createdAt,
        });

        await tx.insert(invoiceLineItems).values(
          items.map((item, position) => ({
            invoiceId: id,
            kind: item.kind,
            sourceId: item.id,
            title: item.title,
            amountCents: item.amountCents,
            position,
          }))
        );

        if (pendingCharges.length > 0) {
          await tx
            .update(charges)
            .set({ invoiceId: id })
            .where(inArray(charges.id, pendingCharges.map((row) => row.id)));
        }
        if (pendingFurniture.length > 0) {
          await tx
            .update(furnitureItems)
            .set({ invoiceId: id })
            .where(inArray(furnitureItems.id, pendingFurniture.map((row) => row.id)));
        }

        const pdf = await renderInvoicePdf({
          number,
          issuedAt: createdAt,
          clientName: project.client,
          projectName: project.name,
          address: project.address,
          style: settings.invoiceStyle,
          from: issuer,
          paymentNote: settings.paymentNote,
          accentColor: PAINTS[project.paint].color,
          totalCents: total,
          lineItems: items,
        });
        await this.blobs.put(pathname, pdf, { contentType: 'application/pdf' });
        uploaded = true;
      });
    } catch (error) {
      if (uploaded) await this.discardBlob(pathname);
      throw error;
    }

    return { id };
  }

  async markSent(id: string): Promise<void> {
    const sentAt = new Date();
    const { paymentTermsDays } = await this.settings.get();
    const updated = await db
      .update(invoices)
      .set({ sentAt, dueAt: addDays(sentAt, paymentTermsDays) })
      .where(and(this.isOwned(id), isNull(invoices.sentAt), isNull(invoices.paidAt)))
      .returning({ id: invoices.id });
    if (updated.length > 0) return;

    // Nothing changed: already sent is a no-op, anything else is an error.
    const [invoice] = await this.findState(id);
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.paidAt) {
      throw new AppError('Paid invoices cannot be marked as sent', 409);
    }
  }

  async markPaid(id: string): Promise<void> {
    const paidAt = new Date();
    const updated = await db
      .update(invoices)
      .set({ paidAt, sentAt: sql`coalesce(${invoices.sentAt}, ${paidAt})` })
      .where(and(this.isOwned(id), isNull(invoices.paidAt)))
      .returning({ id: invoices.id });
    if (updated.length > 0) return;

    const [invoice] = await this.findState(id);
    if (!invoice) throw new AppError('Invoice not found', 404);
  }

  async getPdf(id: string): Promise<(BlobContent & { filename: string }) | null> {
    if (!isUuid(id)) return null;

    const [invoice] = await db
      .select({ number: invoices.number, pathname: invoices.pathname })
      .from(invoices)
      .where(this.isOwned(id))
      .limit(1);
    if (!invoice) return null;

    const blob = await this.blobs.get(invoice.pathname);
    return blob && { ...blob, filename: `invoice-${invoice.number}.pdf` };
  }

  private findState(id: string) {
    return db
      .select({ paidAt: invoices.paidAt })
      .from(invoices)
      .where(this.isOwned(id))
      .limit(1);
  }

  private isOwned(id: string) {
    return and(eq(invoices.id, id), eq(invoices.ownerId, this.ownerId));
  }

  private async discardBlob(pathname: string): Promise<void> {
    try {
      await this.blobs.delete(pathname);
    } catch (error) {
      console.error('[invoice] failed to delete orphaned blob', error);
    }
  }
}
