import { notFound } from 'next/navigation';
import { InvoiceDetailView } from '@/components/features/invoices/InvoiceDetailView';
import { AppShell } from '@/components/layout/AppShell';
import { getServices } from '@/lib/services';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await params;
  const { invoices } = await getServices();

  const invoice = await invoices.get(invoiceId);
  if (!invoice || invoice.projectId !== id) notFound();

  return (
    <AppShell fill>
      <InvoiceDetailView invoice={invoice} />
    </AppShell>
  );
}
