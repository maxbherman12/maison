import { projectService } from '@/lib/services/container';
import { LogHoursSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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
