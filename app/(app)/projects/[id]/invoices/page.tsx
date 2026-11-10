import { notFound } from 'next/navigation';
import { getPageServices } from '@/lib/services/container';
import type { Invoice, Project } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
import { InvoiceIndex } from '@/components/features/invoices/InvoiceIndex';

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { projectService, invoiceService } = await getPageServices();

  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  const invoices: Invoice[] = await invoiceService.listInvoices(project.id);

  return (
    <AppShell
      fill
      contentClassName="pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6"
    >
      <InvoiceIndex project={project} invoices={invoices} />
    </AppShell>
  );
}
