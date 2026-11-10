import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { charges } from '@/lib/db/schema';
import { chargeForHours } from '@/lib/domain/money';
import { AppError } from '@/lib/errors';
import type {
  EditHoursInput,
  FlatChargeInput,
  LogHoursInput,
} from '@/lib/validators/charges';
import {
  ITEM_LOCKED_MESSAGE,
  ownedProjectIds,
  requireOwnedProject,
} from './scope';

export class ChargeService {
  constructor(private readonly ownerId: string) {}

  async logHours(projectId: string, input: LogHoursInput): Promise<{ id: string }> {
    const project = await requireOwnedProject(this.ownerId, projectId);

    const [charge] = await db
      .insert(charges)
      .values({
        ...input,
        projectId,
        amountCents: chargeForHours(input.hours, project.hourlyRateCents),
      })
      .returning({ id: charges.id });
    return charge;
  }

  async addFlat(projectId: string, input: FlatChargeInput): Promise<{ id: string }> {
    await requireOwnedProject(this.ownerId, projectId);
    const [charge] = await db
      .insert(charges)
      .values({ ...input, projectId })
      .returning({ id: charges.id });
    return charge;
  }

  async update(id: string, input: EditHoursInput | FlatChargeInput): Promise<void> {
    const updated = await db
      .update(charges)
      .set(input)
      .where(this.isEditable(id))
      .returning({ id: charges.id });

    if (updated.length === 0) throw new AppError(ITEM_LOCKED_MESSAGE, 409);
  }

  async delete(id: string): Promise<void> {
    const deleted = await db
      .delete(charges)
      .where(this.isEditable(id))
      .returning({ id: charges.id });

    if (deleted.length === 0) throw new AppError(ITEM_LOCKED_MESSAGE, 409);
  }

  private isEditable(id: string) {
    return and(
      eq(charges.id, id),
      isNull(charges.invoiceId),
      inArray(charges.projectId, ownedProjectIds(this.ownerId))
    );
  }
}
