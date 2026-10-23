import { notFound } from 'next/navigation';
import { projectService } from '@/lib/services/container';
import type { Project } from '@/lib/types';
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

  return (
    <ProjectShell
      project={project}
      backHref="/projects"
      backLabel="All projects"
      title={project.project}
    >
      <ProjectClient project={project} />
    </ProjectShell>
  );
}
