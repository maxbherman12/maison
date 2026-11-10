'use server';

import { IdSchema } from '@/lib/validators/fields';
import { ProjectSchema } from '@/lib/validators/projects';
import type { ActionResult } from './result';
import { runAction } from './run-action';

export async function createProject(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  return runAction(({ projects }) => projects.create(ProjectSchema.parse(input)));
}

export async function updateProject(
  id: unknown,
  input: unknown
): Promise<ActionResult> {
  return runAction(({ projects }) =>
    projects.update(IdSchema.parse(id), ProjectSchema.parse(input))
  );
}
