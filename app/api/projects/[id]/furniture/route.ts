import { projectService } from '@/lib/services/container';
import { AddFurnitureSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const input = AddFurnitureSchema.parse(body);

  const project = await projectService.addFurniture(id, {
    name: input.name,
    vendor: input.vendor ?? '',
    retail: Number(input.retail ?? 0),
    trade: Number(input.trade ?? 0),
    link: input.link ?? '',
    tags: input.tags ?? [],
    notes: input.notes ?? '',
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}
