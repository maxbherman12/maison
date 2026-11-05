import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { servicesFor } from '@/lib/services/container';
import type { Invoice, Project } from '@/lib/types';
import { ProjectShell } from '@/components/layout/ProjectShell';
import { InvoiceDetail } from '@/components/features/invoices/InvoiceDetail';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const { id, invoiceId } = await params;
  const user = await requireUser();
  const { projectService, invoiceService } = servicesFor(user.id);

  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  const invoice: Invoice | null = await invoiceService.getInvoice(invoiceId);

  if (!invoice || invoice.projectId !== project.id) {
    notFound();
  }

  return (
    <ProjectShell
      project={project}
      title={invoice.number}
      backHref={`/projects/${project.id}/invoices`}
      backLabel="Invoices"
      fill
      contentClassName="pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6"
    >
      <InvoiceDetail project={project} invoice={invoice} />
    </ProjectShell>
  );
}
