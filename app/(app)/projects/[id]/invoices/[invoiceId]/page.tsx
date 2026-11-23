import { notFound } from 'next/navigation';
import { InvoiceDetailView } from '@/components/features/invoices/InvoiceDetailView';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { loadProject } from '../../load-project';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { project, services } = await loadProject(params);
  const { invoiceId } = await params;

  const [invoice, settings] = await Promise.all([
    services.invoices.get(invoiceId),
    services.settings.get(),
  ]);
  if (!invoice || invoice.projectId !== project.id) notFound();

  const closeHref = `/projects/${project.id}`;

  return (
    <FlowPanel title="Invoice" closeHref={closeHref} paint={project.paint}>
      <InvoiceDetailView
        invoice={invoice}
        clientEmail={project.clientEmail}
        paymentTermsDays={settings.paymentTermsDays}
        editProjectHref={`/projects/${project.id}/edit?invoice=${invoice.id}`}
        closeHref={closeHref}
      />
    </FlowPanel>
  );
}
