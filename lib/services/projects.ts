import type {
  Project,
  CreateProjectInput,
  LogHoursInput,
  AddFurnitureInput,
  FurnitureStatus,
} from '../types';
import type { ProjectRepository } from '../repository/memory';

export class ProjectService {
  constructor(private readonly projects: ProjectRepository) {}

  async listProjects(): Promise<Project[]> {
    return this.projects.list();
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    if (!input.client.trim()) {
      throw new Error('Client name is required');
    }
    if (!input.project.trim()) {
      throw new Error('Project name is required');
    }
    if (input.hourlyRate <= 0) {
      throw new Error('Hourly rate must be greater than zero');
    }

    return this.projects.create(input);
  }

  async updateProject(id: string, patch: Partial<Project>): Promise<Project | null> {
    return this.projects.update(id, patch);
  }

  async logHours(projectId: string, input: LogHoursInput): Promise<Project | null> {
    if (!input.title.trim()) {
      throw new Error('Log title is required');
    }
    const hasAmount = typeof input.amount === 'number' && input.amount > 0;
    if (input.hours <= 0 && !hasAmount) {
      throw new Error('Hours must be greater than zero');
    }
    return this.projects.logHours(projectId, input);
  }

  async addFurniture(
    projectId: string,
    input: AddFurnitureInput
  ): Promise<Project | null> {
    if (!input.name.trim()) {
      throw new Error('Furniture name is required');
    }
    if (input.retail < 0 || input.trade < 0) {
      throw new Error('Prices must be non-negative');
    }
    return this.projects.addFurniture(projectId, input);
  }

  async updateFurnitureStatus(
    projectId: string,
    furnitureId: string,
    status: FurnitureStatus
  ): Promise<Project | null> {
    return this.projects.updateFurnitureStatus(projectId, furnitureId, status);
  }

  async deleteFurniture(projectId: string, furnitureId: string): Promise<Project | null> {
    return this.projects.deleteFurniture(projectId, furnitureId);
  }
}
