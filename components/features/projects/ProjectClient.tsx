'use client';

import type { Invoice, Project } from '@/lib/types';
import { useProject } from '@/lib/query/projects';
import { ProjectSummary } from '@/components/features/projects/ProjectSummary';

interface ProjectClientProps {
  project: Project;
  invoices: Invoice[];
}

export function ProjectClient({ project, invoices }: ProjectClientProps) {
  const { data, isLoading, error } = useProject(project.id, project);

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

  return <ProjectSummary project={data} invoices={invoices} />;
}
