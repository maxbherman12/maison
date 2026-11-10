import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { furnitureItems } from '@/lib/db/schema';
import type { FurnitureStatus } from '@/lib/domain/furniture';
import { AppError } from '@/lib/errors';
import type { FurnitureInput } from '@/lib/validators/furniture';
import {
  ITEM_LOCKED_MESSAGE,
  ownedProjectIds,
  requireOwnedProject,
} from './scope';

export class FurnitureService {
  constructor(private readonly ownerId: string) {}

  async add(projectId: string, input: FurnitureInput): Promise<{ id: string }> {
    await requireOwnedProject(this.ownerId, projectId);
    const [item] = await db
      .insert(furnitureItems)
      .values({ ...input, projectId })
      .returning({ id: furnitureItems.id });
    return item;
  }

  async update(id: string, input: FurnitureInput): Promise<void> {
    const updated = await db
      .update(furnitureItems)
      .set(input)
      .where(and(this.isOwned(id), isNull(furnitureItems.invoiceId)))
      .returning({ id: furnitureItems.id });

    if (updated.length === 0) throw new AppError(ITEM_LOCKED_MESSAGE, 409);
  }

  /** Delivery continues after billing, so status can change on invoiced items. */
  async move(id: string, status: FurnitureStatus): Promise<void> {
    const updated = await db
      .update(furnitureItems)
      .set({ status })
      .where(this.isOwned(id))
      .returning({ id: furnitureItems.id });

    if (updated.length === 0) throw new AppError('Item not found', 404);
  }

  async delete(id: string): Promise<void> {
    const deleted = await db
      .delete(furnitureItems)
      .where(and(this.isOwned(id), isNull(furnitureItems.invoiceId)))
      .returning({ id: furnitureItems.id });

    if (deleted.length === 0) throw new AppError(ITEM_LOCKED_MESSAGE, 409);
  }

  private isOwned(id: string) {
    return and(
      eq(furnitureItems.id, id),
      inArray(furnitureItems.projectId, ownedProjectIds(this.ownerId))
    );
  }
}
