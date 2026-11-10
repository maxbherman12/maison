import { InvoiceComposer } from '@/components/features/invoices/InvoiceComposer';
import { AppShell } from '@/components/layout/AppShell';
import { loadProject } from '../../load-project';

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project } = await loadProject(params);

  return (
    <AppShell fill contentClassName="pb-0 sm:pb-0">
      <InvoiceComposer project={project} issueDate={new Date()} />
    </AppShell>
  );
}
