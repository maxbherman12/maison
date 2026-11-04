import { notFound } from 'next/navigation';
import { invoiceService, projectService } from '@/lib/services/container';
import type { Invoice, Project } from '@/lib/types';
import { ProjectClient } from '@/components/features/projects/ProjectClient';
import { ProjectShell } from '@/components/layout/ProjectShell';

export default async function ProjectPage({
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
      backHref="/projects"
      backLabel="All projects"
      title={project.project}
    >
      <ProjectClient project={project} invoices={invoices} />
    </ProjectShell>
  );
}
