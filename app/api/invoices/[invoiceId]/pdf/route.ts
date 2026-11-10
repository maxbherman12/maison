import { NextResponse } from 'next/server';
import { getServices } from '@/lib/services';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoices } = await getServices();
  const { invoiceId } = await params;

  const pdf = await invoices.getPdf(invoiceId);
  if (!pdf) {
    return NextResponse.json({ error: 'Invoice PDF not found' }, { status: 404 });
  }

  return new NextResponse(pdf.stream, {
    headers: {
      'Content-Type': pdf.contentType,
      'Content-Disposition': `inline; filename="${pdf.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
