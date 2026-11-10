import { ProjectLog } from '@/components/features/projects/log/ProjectLog';
import { AppShell } from '@/components/layout/AppShell';
import { loadProject } from '../load-project';

export default async function ProjectLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project } = await loadProject(params);

  return (
    <AppShell>
      <ProjectLog project={project} />
    </AppShell>
  );
}
