import type { ReactNode } from 'react';
import { ProjectOverview } from '@/components/features/projects/ProjectOverview';
import { loadProject } from './load-project';

/** The project stays mounted here while flow pages open over it as `children`. */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { project, services } = await loadProject(params);

  return (
    <>
      <ProjectOverview
        project={project}
        invoices={await services.invoices.list(project.id)}
      />
      {children}
    </>
  );
}
