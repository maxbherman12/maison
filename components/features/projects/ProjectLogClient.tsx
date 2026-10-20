'use client';

import type { Project } from '@/lib/types';
import { useProject } from '@/lib/query/projects';
import { ProjectLog } from '@/components/features/projects/ProjectLog';

interface ProjectLogClientProps {
  project: Project;
}

export function ProjectLogClient({ project }: ProjectLogClientProps) {
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

  return <ProjectLog project={data} />;
}
