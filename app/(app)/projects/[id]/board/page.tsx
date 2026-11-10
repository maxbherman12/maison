import { FurnitureBoard } from '@/components/features/furniture/FurnitureBoard';
import { AppShell } from '@/components/layout/AppShell';
import { loadProject } from '../load-project';

export default async function FurnitureBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project } = await loadProject(params);

  return (
    <AppShell>
      <FurnitureBoard project={project} />
    </AppShell>
  );
}
