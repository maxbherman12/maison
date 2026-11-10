import 'server-only';
import { notFound } from 'next/navigation';
import { getServices } from '@/lib/services';

/** The route's project and the account's services, or the not-found page. */
export async function loadProject(params: Promise<{ id: string }>) {
  const { id } = await params;
  const services = await getServices();

  const project = await services.projects.get(id);
  if (!project) notFound();

  return { project, services };
}
