import 'server-only';
import {
  PostgresProjectRepository,
  PostgresInvoiceRepository,
} from '@/lib/repository/postgres';
import { ProjectService } from '@/lib/services/projects';
import { InvoiceService, PdfInvoiceRenderer } from '@/lib/services/invoices';
import { createBlobStore } from '@/lib/storage';

// Stateless collaborators shared across requests.
const invoiceRenderer = new PdfInvoiceRenderer();
const blobStore = createBlobStore();

/**
 * Builds services bound to one account. Repositories take the owner in their
 * constructor, so it is impossible to query or write without a scope.
 *
 * Call this with an authenticated user id, never a client-supplied value.
 */
export function servicesFor(ownerId: string) {
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

// Re-exported for direct access when needed (e.g. in API routes).
export { invoiceRenderer, blobStore };
