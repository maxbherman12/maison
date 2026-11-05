import { requireApiUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/api/errors';
import { servicesFor } from '@/lib/services/container';
import { CreateProjectSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await requireApiUser();
    const { projectService } = servicesFor(user.id);

    const projects = await projectService.listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return errorResponse(error, 'Unable to list projects');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const { projectService } = servicesFor(user.id);

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
    return errorResponse(error, 'Unable to create project');
  }
}
