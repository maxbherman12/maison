import { projectService } from '@/lib/services/container';
import { CreateProjectSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function GET() {
  const projects = await projectService.listProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = CreateProjectSchema.parse(body);

    const project = await projectService.createProject({
      client: input.client,
      project: input.project,
      address: input.address ?? '',
      hourlyRate: input.hourlyRate,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('[projects] create failed', error);
    return NextResponse.json({ error: 'Unable to create project' }, { status: 500 });
  }
}
