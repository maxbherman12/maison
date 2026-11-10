import { ProjectOverview } from '@/components/features/projects/ProjectOverview';
import { AppShell } from '@/components/layout/AppShell';
import { loadProject } from './load-project';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project, services } = await loadProject(params);
  const invoices = await services.invoices.list(project.id);

  return (
    <AppShell fill>
      <ProjectOverview project={project} invoices={invoices} />
    </AppShell>
  );
}
