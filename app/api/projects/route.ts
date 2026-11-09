import { errorResponse } from '@/lib/api/errors';
import { getApiServices } from '@/lib/services/container';
import { CreateProjectSchema } from '@/lib/validators/invoices';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { projectService } = await getApiServices();

    const projects = await projectService.listProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return errorResponse(error, 'Unable to list projects');
  }
}

export async function POST(request: Request) {
  try {
    const { projectService } = await getApiServices();

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
