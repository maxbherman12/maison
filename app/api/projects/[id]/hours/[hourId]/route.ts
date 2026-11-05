import { requireApiUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/api/errors';
import { servicesFor } from '@/lib/services/container';
import { UpdateHourEntrySchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; hourId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { projectService } = servicesFor(user.id);

    const { id, hourId } = await params;
    const body = await request.json();
    const input = UpdateHourEntrySchema.parse(body);

    const project = await projectService.updateHourEntry(id, hourId, input);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error, 'Unable to update hour entry');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; hourId: string }> }
) {
  try {
    const user = await requireApiUser();
    const { projectService } = servicesFor(user.id);

    const { id, hourId } = await params;

    const project = await projectService.deleteHourEntry(id, hourId);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error, 'Unable to delete hour entry');
  }
}
