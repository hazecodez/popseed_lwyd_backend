import { Task } from '../entities/Task';

export interface TaskFilters {
  projectId?: string;
  assignedTo?: string;
  status?: 'brief_submitted' | 'rework_requested' | 'designer_assigned' | 'picked_up' | 'draft_submitted' | 'internal_approved' | 'sent_to_client' | 'client_approved' | 'client_feedback';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  tags?: string[];
  organizationId?: string;
}

export interface ITaskRepository {
  create(task: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  findById(taskId: string): Promise<Task | null>;
  findByProjectId(projectId: string, filters?: TaskFilters): Promise<Task[]>;
  findByAssignedUser(userId: string, organizationId: string, filters?: TaskFilters): Promise<Task[]>;
  findByOrganizationId(organizationId: string, filters?: TaskFilters): Promise<Task[]>;
  findByFilters(query: any): Promise<Task[]>;
  update(taskId: string, updates: Partial<Task>): Promise<Task | null>;
  updateStatus(taskId: string, status: Task['status'], changedBy: string, notes?: string): Promise<Task | null>;
  delete(taskId: string): Promise<boolean>;
  getProjectProgress(projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  }>;
}