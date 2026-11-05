import { requireApiUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/api/errors';
import { servicesFor } from '@/lib/services/container';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { invoiceService } = servicesFor(user.id);

    const { invoiceId } = await params;

    const pdf = await invoiceService.getInvoicePdf(invoiceId);
    if (!pdf) {
      return NextResponse.json(
        { error: 'Invoice PDF not found' },
        { status: 404 }
      );
    }

    return new NextResponse(pdf.stream, {
      headers: {
        'Content-Type': pdf.contentType,
        // The pathname is generated from a slug, but sanitise it before putting
        // it in a response header anyway.
        'Content-Disposition': `inline; filename="${pdf.filename.replace(/["\\\r\n]/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return errorResponse(error, 'Unable to load invoice PDF');
  }
}
