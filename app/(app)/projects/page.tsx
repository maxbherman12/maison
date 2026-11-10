import { ClientList } from '@/components/features/projects/ClientList';
import { ProjectOverview } from '@/components/features/projects/ProjectOverview';
import { getServices } from '@/lib/services';

/** The client list on phones. On desktop the sidebar has it, so open the first project. */
export default async function ProjectsPage() {
  const services = await getServices();
  const projects = await services.projects.list();

  const first = projects[0] && (await services.projects.get(projects[0].id));
  const invoices = first ? await services.invoices.list(first.id) : [];

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <ClientList projects={projects} />
      </div>
      {first && (
        <div className="hidden min-h-0 flex-1 flex-col md:flex">
          <ProjectOverview project={first} invoices={invoices} />
        </div>
      )}
    </>
  );
}
