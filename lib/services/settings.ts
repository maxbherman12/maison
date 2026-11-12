import 'server-only';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { user } from '@/lib/db/auth-schema';
import { accountSettings } from '@/lib/db/schema';
import type { InvoiceStyle } from '@/lib/domain/invoice-styles';
import { DEFAULT_SETTINGS } from '@/lib/domain/settings';
import type { AccountSettings } from '@/lib/domain/types';
import type { SettingsInput } from '@/lib/validators/settings';

const { ownerId: _ownerId, updatedAt: _updatedAt, ...publicColumns } =
  getTableColumns(accountSettings);

export class SettingsService {
  constructor(private readonly ownerId: string) {}

  /** The account's settings, or the defaults if it has never saved any. */
  async get(): Promise<AccountSettings> {
    const [row] = await db
      .select(publicColumns)
      .from(accountSettings)
      .where(eq(accountSettings.ownerId, this.ownerId))
      .limit(1);
    return row ?? DEFAULT_SETTINGS;
  }

  /** Saves the profile name and settings together. */
  async update({ name, settings }: SettingsInput): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(user).set({ name }).where(eq(user.id, this.ownerId));
      await tx
        .insert(accountSettings)
        .values({ ownerId: this.ownerId, ...settings })
        .onConflictDoUpdate({ target: accountSettings.ownerId, set: settings });
    });
  }

  async setInvoiceStyle(invoiceStyle: InvoiceStyle): Promise<void> {
    await db
      .insert(accountSettings)
      .values({ ownerId: this.ownerId, invoiceStyle })
      .onConflictDoUpdate({
        target: accountSettings.ownerId,
        set: { invoiceStyle },
      });
  }
}
