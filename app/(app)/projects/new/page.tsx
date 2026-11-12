import { ProjectForm } from '@/components/features/projects/ProjectForm';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { centsToInput } from '@/lib/domain/money';
import { nextPaint } from '@/lib/domain/paints';
import { getServices } from '@/lib/services';

export default async function NewProjectPage() {
  const { projects, settings } = await getServices();
  const [existing, { defaultHourlyRateCents }] = await Promise.all([
    projects.list(),
    settings.get(),
  ]);

  return (
    <FlowPanel title="New project" closeHref="/projects">
      <ProjectForm
        closeHref="/projects"
        initialPaint={nextPaint(existing.map((project) => project.paint))}
        initialHourlyRate={
          defaultHourlyRateCents === null ? '' : centsToInput(defaultHourlyRateCents)
        }
      />
    </FlowPanel>
  );
}
