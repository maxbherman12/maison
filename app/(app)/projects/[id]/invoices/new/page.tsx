import { InvoiceComposer } from '@/components/features/invoices/InvoiceComposer';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { loadProject } from '../../load-project';

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project } = await loadProject(params);

  return (
    <FlowPanel
      title="New invoice"
      closeHref={`/projects/${project.id}`}
      paint={project.paint}
    >
      <InvoiceComposer project={project} issueDate={new Date()} />
    </FlowPanel>
  );
}
