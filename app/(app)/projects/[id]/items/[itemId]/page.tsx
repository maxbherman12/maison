import { notFound } from 'next/navigation';
import {
  EditChargeForm,
  EditFurnitureForm,
  EditHoursForm,
  InvoicedFurnitureForm,
} from '@/components/features/billing/EditItemForm';
import { FlowPanel } from '@/components/layout/FlowPanel';
import type { ProjectDetail } from '@/lib/domain/types';
import { loadProject } from '../../load-project';

function itemForm(project: ProjectDetail, itemId: string) {
  const closeHref = `/projects/${project.id}`;

  const charge = project.charges.find((row) => row.id === itemId);
  if (charge && !charge.invoiceId) {
    return charge.hours === null ? (
      <EditChargeForm charge={charge} closeHref={closeHref} />
    ) : (
      <EditHoursForm charge={charge} closeHref={closeHref} />
    );
  }

  const item = project.furniture.find((row) => row.id === itemId);
  if (!item) notFound();

  return item.invoiceId ? (
    <InvoicedFurnitureForm item={item} closeHref={closeHref} />
  ) : (
    <EditFurnitureForm item={item} closeHref={closeHref} />
  );
}

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { project } = await loadProject(params);
  const { itemId } = await params;

  return (
    <FlowPanel
      title="Edit entry"
      closeHref={`/projects/${project.id}`}
      paint={project.paint}
    >
      {itemForm(project, itemId)}
    </FlowPanel>
  );
}
