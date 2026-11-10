'use server';

import { IdSchema } from '@/lib/validators/fields';
import { FurnitureSchema, FurnitureStatusSchema } from '@/lib/validators/furniture';
import type { ActionResult } from './result';
import { runAction } from './run-action';

export async function addFurniture(
  projectId: unknown,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(({ furniture }) =>
    furniture.add(IdSchema.parse(projectId), FurnitureSchema.parse(input))
  );
}

export async function updateFurniture(
  id: unknown,
  input: unknown
): Promise<ActionResult> {
  return runAction(({ furniture }) =>
    furniture.update(IdSchema.parse(id), FurnitureSchema.parse(input))
  );
}

export async function moveFurniture(
  id: unknown,
  status: unknown
): Promise<ActionResult> {
  return runAction(({ furniture }) =>
    furniture.move(IdSchema.parse(id), FurnitureStatusSchema.parse(status))
  );
}

export async function deleteFurniture(id: unknown): Promise<ActionResult> {
  return runAction(({ furniture }) => furniture.delete(IdSchema.parse(id)));
}
