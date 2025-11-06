import { Project } from '../entities/Project';

export interface ProjectFilters {
  organizationId: string;
  search?: string;
  status?: string;
  riskLevel?: string;
  projectType?: string;
  userId?: string;
  role?: string;
}

export interface IProjectRepository {
  create(project: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  findById(projectId: string): Promise<Project | null>;
  findByOrganization(organizationId: string): Promise<Project[]>;
  findByFilters(filters: ProjectFilters): Promise<Project[]>;
  findByAssignedUser(userId: string, organizationId: string): Promise<Project[]>;
  findByTeam(team: string, organizationId: string): Promise<Project[]>;
  update(projectId: string, updates: Partial<Project>): Promise<Project | null>;
  delete(projectId: string): Promise<boolean>;
}