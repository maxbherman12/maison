import { invoiceService } from '@/lib/services/container';
import { GenerateInvoiceSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input = GenerateInvoiceSchema.parse(body);

    const invoice = await invoiceService.generateInvoice(input);

    return NextResponse.json({ pathname: invoice.pathname, number: invoice.number });
  } catch (error) {
    console.error('[invoice] generation failed', error);
    return NextResponse.json({ error: 'Unable to generate invoice' }, { status: 500 });
  }
}
