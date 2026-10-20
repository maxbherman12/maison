'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { ProjectSummary } from './ProjectSummary';
import { ProjectStatus } from './ProjectStatus';
import { ProjectInvoice } from './ProjectInvoice';
import { ProjectOnboard } from './ProjectOnboard';

type View = 'summary' | 'status' | 'invoice';

interface ProjectDetailProps {
  project: Project;
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const [view, setView] = useState<View>('summary');

  return (
    <div className="mx-auto max-w-4xl">
      {view === 'summary' && (
        <ProjectSummary
          project={project}
          onStatus={() => setView('status')}
          onInvoice={() => setView('invoice')}
        />
      )}
      {view === 'status' && (
        <ProjectStatus project={project} onBack={() => setView('summary')} />
      )}
      {view === 'invoice' && (
        <ProjectInvoice project={project} onBack={() => setView('summary')} />
      )}
    </div>
  );
}
