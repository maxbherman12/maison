import 'server-only';
import { PostgresProjectRepository, PostgresInvoiceRepository } from '@/lib/repository/postgres';
import { ProjectService } from '@/lib/services/projects';
import { InvoiceService } from '@/lib/services/invoices';
import { PdfInvoiceGenerator } from '@/lib/services/invoices';

// Singleton container for dependency injection.
// Postgres repositories are used in all environments; swap implementations here
// to connect a different database or external service without touching service
// or UI code.
const projectRepository = new PostgresProjectRepository();
const invoiceRepository = new PostgresInvoiceRepository();
const invoiceGenerator = new PdfInvoiceGenerator();

export const projectService = new ProjectService(projectRepository);
export const invoiceService = new InvoiceService(invoiceRepository, invoiceGenerator);

// Re-exported for direct access when needed (e.g. in API routes)
export { projectRepository, invoiceRepository, invoiceGenerator };
