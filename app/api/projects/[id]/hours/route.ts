import { projectService } from '@/lib/services/container';
import { LogHoursSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const input = LogHoursSchema.parse(body);

  const project = await projectService.logHours(id, {
    title: input.title,
    date: input.date,
    hours: input.hours,
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}
