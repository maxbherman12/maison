'use client';

import type { Project } from '@/lib/types';
import { useProject } from '@/lib/query/projects';
import { ProjectView } from '@/components/features/projects/ProjectView';

interface ProjectClientProps {
  project: Project;
}

export function ProjectClient({ project }: ProjectClientProps) {
  const { data, isLoading, error } = useProject(project.id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl py-10 flex items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl py-10 text-center">
        <p className="text-destructive">Unable to load project.</p>
      </div>
    );
  }

  return <ProjectView project={data} />;
}
