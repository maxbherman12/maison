import { notFound } from 'next/navigation';
import { getPageServices } from '@/lib/services/container';
import type { Invoice, Project } from '@/lib/types';
import { ProjectClient } from '@/components/features/projects/ProjectClient';
import { ProjectShell } from '@/components/layout/ProjectShell';

export default async function ProjectPage({
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
    <ProjectShell
      project={project}
      backHref="/projects"
      backLabel="All projects"
      title={project.project}
      fill
      contentClassName="pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6"
    >
      <ProjectClient project={project} invoices={invoices} />
    </ProjectShell>
  );
}
