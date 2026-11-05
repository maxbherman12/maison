import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { servicesFor } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { FurnitureBoard } from '@/components/features/furniture/FurnitureBoard';
import { ProjectShell } from '@/components/layout/ProjectShell';

export default async function FurnitureBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const { projectService } = servicesFor(user.id);

  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <ProjectShell project={project}>
      <FurnitureBoard project={project} />
    </ProjectShell>
  );
}
