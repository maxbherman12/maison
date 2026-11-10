import { notFound } from 'next/navigation';
import { getPageServices } from '@/lib/services/container';
import type { Project } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
import { InvoiceWorkspace } from '@/components/features/invoices/InvoiceWorkspace';

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { projectService } = await getPageServices();

  const project: Project | null = await projectService.getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <AppShell fill contentClassName="pt-4 pb-0 sm:pt-6">
      <InvoiceWorkspace project={project} issueDate={new Date().toISOString()} />
    </AppShell>
  );
}
