import { projectService } from '@/lib/services/container';
import { UpdateFurnitureSchema } from '@/lib/validators/invoices';
import { errorResponse } from '@/lib/api/errors';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; furnitureId: string }> }
) {
  try {
    const { id, furnitureId } = await params;
    const body = await request.json();
    const input = UpdateFurnitureSchema.parse(body);

    const project = await projectService.updateFurniture(id, furnitureId, input);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error, 'Unable to update furniture');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; furnitureId: string }> }
) {
  try {
    const { id, furnitureId } = await params;

    const project = await projectService.deleteFurniture(id, furnitureId);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error, 'Unable to delete furniture');
  }
}
