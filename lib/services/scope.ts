import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { AppError } from '@/lib/errors';

/**
 * Subquery of an account's project ids. Charges and furniture inherit ownership
 * through their project, so every write to them filters on this and is scoped
 * in a single statement.
 */
export function ownedProjectIds(ownerId: string) {
  return db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, ownerId));
}

/** The owned project an insert is about to reference, or a 404. */
export async function requireOwnedProject(ownerId: string, projectId: string) {
  const [project] = await db
    .select({ hourlyRateCents: projects.hourlyRateCents })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);

  if (!project) throw new AppError('Project not found', 404);
  return project;
}

export const ITEM_LOCKED_MESSAGE =
  'This item no longer exists or has already been invoiced.';
