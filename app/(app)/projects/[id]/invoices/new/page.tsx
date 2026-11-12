import { InvoiceComposer } from '@/components/features/invoices/InvoiceComposer';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { requireUser } from '@/lib/auth/session';
import { invoiceIssuer } from '@/lib/domain/settings';
import { loadProject } from '../../load-project';

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project, services } = await loadProject(params);
  const [settings, user] = await Promise.all([services.settings.get(), requireUser()]);

  return (
    <FlowPanel
      title="New invoice"
      closeHref={`/projects/${project.id}`}
      paint={project.paint}
    >
      <InvoiceComposer
        project={project}
        issueDate={new Date()}
        settings={settings}
        issuer={invoiceIssuer(settings, user.name)}
      />
    </FlowPanel>
  );
}
