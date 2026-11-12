import 'server-only';
import { requireUser } from '@/lib/auth/session';
import { createBlobStore } from '@/lib/storage';
import { ChargeService } from './charges';
import { FurnitureService } from './furniture';
import { InvoiceService } from './invoices';
import { ProjectService } from './projects';
import { SettingsService } from './settings';

const blobStore = createBlobStore();

/** Private on purpose: only the authenticated entry point may supply an owner id. */
function createServices(ownerId: string, ownerName: string) {
  const settings = new SettingsService(ownerId);
  return {
    projects: new ProjectService(ownerId),
    charges: new ChargeService(ownerId),
    furniture: new FurnitureService(ownerId),
    invoices: new InvoiceService(ownerId, blobStore, settings, ownerName),
    settings,
  };
}

export type Services = ReturnType<typeof createServices>;

/**
 * The signed-in account's services. The only way to reach business logic, so
 * every read and write is scoped to the session. Redirects to sign-in without
 * a valid session.
 */
export async function getServices(): Promise<Services> {
  const user = await requireUser();
  return createServices(user.id, user.name);
}
