import { invoiceService } from '@/lib/services/container';
import {
  GenerateInvoiceSchema,
  InvoiceListQuerySchema,
} from '@/lib/validators/invoices';
import { errorResponse } from '@/lib/api/errors';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = InvoiceListQuerySchema.parse({
      projectId: searchParams.get('projectId') ?? undefined,
    });

    const invoices = await invoiceService.listInvoices(query.projectId);
    return NextResponse.json(invoices);
  } catch (error) {
    return errorResponse(error, 'Unable to list invoices');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = GenerateInvoiceSchema.parse(body);

    const invoice = await invoiceService.generateInvoice(input);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to generate invoice');
  }
}
