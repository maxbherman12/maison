import { InvoiceIndex } from '@/components/features/invoices/InvoiceIndex';
import { AppShell } from '@/components/layout/AppShell';
import { loadProject } from '../load-project';

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project, services } = await loadProject(params);
  const invoices = await services.invoices.list(project.id);

  return (
    <AppShell fill>
      <InvoiceIndex project={project} invoices={invoices} />
    </AppShell>
  );
}
