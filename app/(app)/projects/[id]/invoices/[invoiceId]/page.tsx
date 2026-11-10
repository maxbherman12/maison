import { notFound } from 'next/navigation';
import { getPageServices } from '@/lib/services/container';
import type { Invoice, Project } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
import { InvoiceDetail } from '@/components/features/invoices/InvoiceDetail';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await params;
  const { projectService, invoiceService } = await getPageServices();

  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  const invoice: Invoice | null = await invoiceService.getInvoice(invoiceId);

  if (!invoice || invoice.projectId !== project.id) {
    notFound();
  }

  return (
    <AppShell
      fill
      contentClassName="pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6"
    >
      <InvoiceDetail project={project} invoice={invoice} />
    </AppShell>
  );
}
