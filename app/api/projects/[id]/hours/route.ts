import { errorResponse } from '@/lib/api/errors';
import { AppError } from '@/lib/errors';
import { getApiServices } from '@/lib/services/container';
import { LogHoursSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { projectService } = await getApiServices();

    const { id } = await params;
    const body = await request.json();
    const input = LogHoursSchema.parse(body);

    const project = await projectService.logHours(id, {
      title: input.title,
      date: input.date,
      hours: input.hours,
      amount: input.amount,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error, 'Unable to log hours');
    }

    console.error('[projects] log hours failed', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid entry' },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Unable to log hours';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
