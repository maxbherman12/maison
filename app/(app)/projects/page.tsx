import { ProjectList } from '@/components/features/projects/ProjectList';
import { AppShell } from '@/components/layout/AppShell';
import { getServices } from '@/lib/services';

export default async function ProjectsPage() {
  const { projects } = await getServices();

  return (
    <AppShell>
      <ProjectList projects={await projects.list()} />
    </AppShell>
  );
}
