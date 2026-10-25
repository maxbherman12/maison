import 'server-only';
import { PostgresProjectRepository, PostgresInvoiceRepository } from '@/lib/repository/postgres';
import { ProjectService } from '@/lib/services/projects';
import { InvoiceService, PdfInvoiceRenderer } from '@/lib/services/invoices';
import { createBlobStore } from '@/lib/storage';

// Singleton container for dependency injection.
// Postgres repositories are used in all environments; swap implementations here
// to connect a different database or external service without touching service
// or UI code.
const projectRepository = new PostgresProjectRepository();
const invoiceRepository = new PostgresInvoiceRepository();
const invoiceRenderer = new PdfInvoiceRenderer();
const blobStore = createBlobStore();

export const projectService = new ProjectService(projectRepository);
export const invoiceService = new InvoiceService(
  invoiceRepository,
  invoiceRenderer,
  projectRepository,
  blobStore
);

// Re-exported for direct access when needed (e.g. in API routes)
export { projectRepository, invoiceRepository, invoiceRenderer, blobStore };
