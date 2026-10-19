import { projectService } from '@/lib/services/container';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const StatusSchema = z.object({
  status: z.enum(['Pending', 'Ordered', 'In transit', 'Delivered']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; furnitureId: string }> }
) {
  const { id, furnitureId } = await params;
  const body = await request.json();
  const input = StatusSchema.parse(body);

  const project = await projectService.updateFurnitureStatus(
    id,
    furnitureId,
    input.status
  );

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; furnitureId: string }> }
) {
  const { id, furnitureId } = await params;

  const project = await projectService.deleteFurniture(id, furnitureId);

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}
