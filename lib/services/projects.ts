import 'server-only';
import { and, asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { charges, furnitureItems, projects } from '@/lib/db/schema';
import { isUuid } from '@/lib/domain/ids';
import type { ProjectDetail, ProjectListItem } from '@/lib/domain/types';
import { AppError } from '@/lib/errors';
import type { ProjectInput } from '@/lib/validators/projects';

/** Everything on a project that has not been billed yet. */
const outstandingCents = sql<number>`(
  coalesce((
    select sum(${charges.amountCents}) from ${charges}
    where ${charges.projectId} = ${projects.id} and ${charges.invoiceId} is null
  ), 0) + coalesce((
    select sum(${furnitureItems.tradeCents}) from ${furnitureItems}
    where ${furnitureItems.projectId} = ${projects.id} and ${furnitureItems.invoiceId} is null
  ), 0)
)`.mapWith(Number);

export class ProjectService {
  constructor(private readonly ownerId: string) {}

  list(): Promise<ProjectListItem[]> {
    return db
      .select({ ...getTableColumns(projects), outstandingCents })
      .from(projects)
      .where(eq(projects.ownerId, this.ownerId))
      .orderBy(asc(projects.createdAt));
  }

  async get(id: string): Promise<ProjectDetail | null> {
    if (!isUuid(id)) return null;

    const [project] = await db
      .select()
      .from(projects)
      .where(this.isOwned(id))
      .limit(1);
    if (!project) return null;

    const [projectCharges, furniture] = await Promise.all([
      db.select().from(charges).where(eq(charges.projectId, id)),
      db
        .select()
        .from(furnitureItems)
        .where(eq(furnitureItems.projectId, id))
        .orderBy(asc(furnitureItems.createdAt)),
    ]);

    return { ...project, charges: projectCharges, furniture };
  }

  async create(input: ProjectInput): Promise<{ id: string }> {
    const [project] = await db
      .insert(projects)
      .values({ ...input, ownerId: this.ownerId })
      .returning({ id: projects.id });
    return project;
  }

  async update(id: string, input: ProjectInput): Promise<void> {
    const updated = await db
      .update(projects)
      .set(input)
      .where(this.isOwned(id))
      .returning({ id: projects.id });

    if (updated.length === 0) throw new AppError('Project not found', 404);
  }

  private isOwned(id: string) {
    return and(eq(projects.id, id), eq(projects.ownerId, this.ownerId));
  }
}
