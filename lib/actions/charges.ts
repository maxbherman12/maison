'use server';

import {
  EditHoursSchema,
  FlatChargeSchema,
  LogHoursSchema,
} from '@/lib/validators/charges';
import { IdSchema } from '@/lib/validators/fields';
import type { ActionResult } from './result';
import { runAction } from './run-action';

export async function logHours(
  projectId: unknown,
  input: unknown
): Promise<ActionResult> {
  return runAction(({ charges }) =>
    charges.logHours(IdSchema.parse(projectId), LogHoursSchema.parse(input))
  );
}

export async function addFlatCharge(
  projectId: unknown,
  input: unknown
): Promise<ActionResult> {
  return runAction(({ charges }) =>
    charges.addFlat(IdSchema.parse(projectId), FlatChargeSchema.parse(input))
  );
}

export async function updateHours(
  id: unknown,
  input: unknown
): Promise<ActionResult> {
  return runAction(({ charges }) =>
    charges.update(IdSchema.parse(id), EditHoursSchema.parse(input))
  );
}

export async function updateFlatCharge(
  id: unknown,
  input: unknown
): Promise<ActionResult> {
  return runAction(({ charges }) =>
    charges.update(IdSchema.parse(id), FlatChargeSchema.parse(input))
  );
}

export async function deleteCharge(id: unknown): Promise<ActionResult> {
  return runAction(({ charges }) => charges.delete(IdSchema.parse(id)));
}
