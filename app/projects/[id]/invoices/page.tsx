import { notFound } from 'next/navigation';
import { invoiceService, projectService } from '@/lib/services/container';
import type { Invoice, Project } from '@/lib/types';
import { ProjectShell } from '@/components/layout/ProjectShell';
import { InvoiceIndex } from '@/components/features/invoices/InvoiceIndex';

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  const invoices: Invoice[] = await invoiceService.listInvoices(project.id);

  return (
    <ProjectShell
      project={project}
      title="Invoices"
      backHref={`/projects/${project.id}`}
      backLabel="Project"
    >
      <InvoiceIndex project={project} invoices={invoices} />
    </ProjectShell>
  );
}
