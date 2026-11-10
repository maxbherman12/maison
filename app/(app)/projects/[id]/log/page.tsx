import { notFound } from 'next/navigation';
import { getPageServices } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { ProjectLogClient } from '@/components/features/projects/ProjectLogClient';
import { AppShell } from '@/components/layout/AppShell';

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
    <AppShell>
      <ProjectLogClient project={project} />
    </AppShell>
  );
}
