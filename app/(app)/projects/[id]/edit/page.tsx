import { ProjectForm } from '@/components/features/projects/ProjectForm';
import { FlowPanel } from '@/components/layout/FlowPanel';
import { isUuid } from '@/lib/domain/ids';
import { loadProject } from '../load-project';

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** `invoice` returns there after saving, e.g. from "Add one" on an invoice. */
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { project } = await loadProject(params);
  const { invoice } = await searchParams;

  // A typed id, not a free-form path, so the return stays inside this project.
  // An invoice id from another project just renders that page's not-found.
  const fromInvoice = typeof invoice === 'string' && isUuid(invoice);
  const closeHref = fromInvoice
    ? `/projects/${project.id}/invoices/${invoice}`
    : `/projects/${project.id}`;

  return (
    <FlowPanel title="Edit project" closeHref={closeHref}>
      <ProjectForm
        project={project}
        closeHref={closeHref}
        focusEmail={fromInvoice}
      />
    </FlowPanel>
  );
}
