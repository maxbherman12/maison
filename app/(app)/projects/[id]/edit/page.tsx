import { ProjectForm } from '@/components/features/projects/ProjectForm';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { loadProject } from '../load-project';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project } = await loadProject(params);
  const closeHref = `/projects/${project.id}`;

  return (
    <FlowPanel title="Edit project" closeHref={closeHref}>
      <ProjectForm project={project} closeHref={closeHref} />
    </FlowPanel>
  );
}
