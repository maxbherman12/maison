import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectService } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { ProjectShell } from '@/components/layout/ProjectShell';
import { InvoiceWorkspace } from '@/components/features/invoices/InvoiceWorkspace';

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <ProjectShell
      project={project}
      title="New invoice"
      backHref={`/projects/${project.id}`}
      backLabel="Project"
      actions={
        <Link
          href={`/projects/${project.id}/invoices`}
          className="text-sm text-[#bd765b] hover:underline"
        >
          History
        </Link>
      }
    >
      <InvoiceWorkspace project={project} issueDate={new Date().toISOString()} />
    </ProjectShell>
  );
}
