import { ProjectLog } from '@/components/features/projects/log/ProjectLog';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { loadProject } from '../load-project';

export default async function ProjectLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { project } = await loadProject(params);
  const { type } = await searchParams;

  return (
    <FlowPanel
      title="Log"
      closeHref={`/projects/${project.id}`}
      paint={project.paint}
    >
      <ProjectLog project={project} furnitureOnly={type === 'furniture'} />
    </FlowPanel>
  );
}
