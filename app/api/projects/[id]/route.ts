import { projectService } from '@/lib/services/container';
import { CreateProjectSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await projectService.getProject(id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const input = CreateProjectSchema.partial().parse(body);

  const patch: Record<string, unknown> = {};
  if (input.client !== undefined) patch.client = input.client;
  if (input.project !== undefined) patch.project = input.project;
  if (input.address !== undefined) patch.address = input.address;
  if (input.hourlyRate !== undefined) patch.hourlyRate = input.hourlyRate;

  const project = await projectService.updateProject(id, patch as never);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(project);
}
