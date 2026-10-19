import { MemoryProjectRepository, MemoryInvoiceRepository } from '@/lib/repository/memory';
import { ProjectService } from '@/lib/services/projects';
import { InvoiceService } from '@/lib/services/invoices';
import { PdfInvoiceGenerator } from '@/lib/services/invoices';

// Singleton container for dependency injection.
// Repositories are in-memory by default; swap implementations here to connect
// a real database or external service without touching service or UI code.
const projectRepository = new MemoryProjectRepository();
const invoiceRepository = new MemoryInvoiceRepository();
const invoiceGenerator = new PdfInvoiceGenerator();

export const projectService = new ProjectService(projectRepository);
export const invoiceService = new InvoiceService(invoiceRepository, invoiceGenerator);

// Re-exported for direct access when needed (e.g. in API routes)
export { projectRepository, invoiceRepository, invoiceGenerator };
