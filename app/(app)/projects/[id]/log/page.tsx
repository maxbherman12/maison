import { notFound } from 'next/navigation';
import { getPageServices } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { ProjectLogClient } from '@/components/features/projects/ProjectLogClient';
import { ProjectShell } from '@/components/layout/ProjectShell';

export default async function ProjectLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { projectService } = await getPageServices();

  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <ProjectShell project={project}>
      <ProjectLogClient project={project} />
    </ProjectShell>
  );
}
