import { ProjectForm } from '@/components/features/projects/ProjectForm';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { nextPaint } from '@/lib/domain/paints';
import { getServices } from '@/lib/services';

export default async function NewProjectPage() {
  const { projects } = await getServices();
  const existing = await projects.list();

  return (
    <FlowPanel title="New project" closeHref="/projects">
      <ProjectForm
        closeHref="/projects"
        initialPaint={nextPaint(existing.map((project) => project.paint))}
      />
    </FlowPanel>
  );
}
