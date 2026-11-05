import { requireApiUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/api/errors';
import { servicesFor } from '@/lib/services/container';
import { MarkInvoiceSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { invoiceService } = servicesFor(user.id);

    const { invoiceId } = await params;

    const invoice = await invoiceService.getInvoice(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    return errorResponse(error, 'Unable to load invoice');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { invoiceService } = servicesFor(user.id);

    const { invoiceId } = await params;
    const body = await request.json();
    const input = MarkInvoiceSchema.parse(body);

    const invoice =
      input.action === 'send'
        ? await invoiceService.markSent(invoiceId)
        : await invoiceService.markPaid(invoiceId);

    return NextResponse.json(invoice);
  } catch (error) {
    return errorResponse(error, 'Unable to update invoice');
  }
}
