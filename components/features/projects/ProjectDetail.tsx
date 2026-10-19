'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProjectSummary } from './ProjectSummary';
import { ProjectLog } from './ProjectLog';
import { ProjectStatus } from './ProjectStatus';
import { ProjectInvoice } from './ProjectInvoice';
import { ProjectOnboard } from './ProjectOnboard';

type View = 'summary' | 'log' | 'status' | 'invoice';

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
          onLog={() => setView('log')}
          onStatus={() => setView('status')}
          onInvoice={() => setView('invoice')}
        />
      )}
      {view === 'log' && <ProjectLog project={project} onBack={() => setView('summary')} />}
      {view === 'status' && (
        <ProjectStatus project={project} onBack={() => setView('summary')} />
      )}
      {view === 'invoice' && (
        <ProjectInvoice project={project} onBack={() => setView('summary')} />
      )}
    </div>
  );
}
