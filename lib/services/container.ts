import 'server-only';
import {
  PostgresProjectRepository,
  PostgresInvoiceRepository,
} from '@/lib/repository/postgres';
import { ProjectService } from '@/lib/services/projects';
import { InvoiceService, PdfInvoiceRenderer } from '@/lib/services/invoices';
import { createBlobStore } from '@/lib/storage';
import { requireApiUser, requireUser } from '@/lib/auth/session';

// Stateless collaborators shared across requests.
const invoiceRenderer = new PdfInvoiceRenderer();
const blobStore = createBlobStore();

/**
 * Wires the services to one account. Private on purpose: only the authenticated
 * entry points below may supply an owner id.
 */
function createServices(ownerId: string) {
  const projectRepository = new PostgresProjectRepository(ownerId);
  const invoiceRepository = new PostgresInvoiceRepository(ownerId);

  return {
    projectService: new ProjectService(projectRepository),
    invoiceService: new InvoiceService(
      invoiceRepository,
      invoiceRenderer,
      projectRepository,
      blobStore
    ),
  };
}

/**
 * Services for a page or Server Component. Redirects to sign-in when the
 * request has no valid session.
 */
export async function getPageServices() {
  const user = await requireUser();
  return createServices(user.id);
}

/**
 * Services for a route handler. Throws `AppError(401)` instead of redirecting.
 */
export async function getApiServices() {
  const user = await requireApiUser();
  return createServices(user.id);
}
