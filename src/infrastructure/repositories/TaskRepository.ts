import { ITaskRepository, TaskFilters } from '../../domain/repositories/ITaskRepository';
import { Task, StatusChange } from '../../domain/entities/Task';
import { TaskModel, ITaskDocument } from '../database/models/TaskModel';
import { v4 as uuidv4 } from 'uuid';

export class TaskRepository implements ITaskRepository {
  async create(taskData: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const taskId = uuidv4();
    
    // Create initial status history entry
    const initialStatusHistory: StatusChange[] = [{
      status: taskData.status || 'brief_submitted',
      changedAt: new Date(),
      changedBy: taskData.createdBy,
      notes: 'Task created'
    }];

    const taskDoc = new TaskModel({
      ...taskData,
      taskId,
      statusHistory: initialStatusHistory
    });

    const savedTask = await taskDoc.save();
    return this.mapToEntity(savedTask);
  }

  async findById(taskId: string): Promise<Task | null> {
    const task = await TaskModel.findOne({ taskId });
    return task ? this.mapToEntity(task) : null;
  }

  async findByProjectId(projectId: string, filters?: TaskFilters): Promise<Task[]> {
    const query: any = { projectId };
    
    this.applyFilters(query, filters);
    
    const tasks = await TaskModel.find(query).sort({ createdAt: -1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async findByAssignedUser(userId: string, organizationId: string, filters?: TaskFilters): Promise<Task[]> {
    const query: any = { 
      $or: [
        { assignedDesigner: userId },
        { designLead: userId }
      ],
      organizationId 
    };
    
    this.applyFilters(query, filters);
    
    const tasks = await TaskModel.find(query).sort({ dueDate: 1, priority: -1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async findByOrganizationId(organizationId: string, filters?: TaskFilters): Promise<Task[]> {
    const query: any = { organizationId };
    
    this.applyFilters(query, filters);
    
    const tasks = await TaskModel.find(query).sort({ createdAt: -1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async update(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    // Remove fields that shouldn't be directly updated
    const { taskId: _, createdAt, updatedAt, statusHistory, ...updateData } = updates;
    
    const updatedTask = await TaskModel.findOneAndUpdate(
      { taskId },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    return updatedTask ? this.mapToEntity(updatedTask) : null;
  }

  async updateStatus(taskId: string, status: Task['status'], changedBy: string, notes?: string): Promise<Task | null> {
    const task = await TaskModel.findOne({ taskId });
    if (!task) return null;

    // Add new status change to history
    const statusChange: StatusChange = {
      status,
      changedAt: new Date(),
      changedBy,
      notes
    };

    task.status = status;
    task.statusHistory.push(statusChange);
    task.updatedAt = new Date();

    // Set completedAt if status is client_approved (final completion)
    if (status === 'client_approved') {
      task.completedAt = new Date();
    } else {
      task.completedAt = undefined;
    }

    const savedTask = await task.save();
    return this.mapToEntity(savedTask);
  }

  async delete(taskId: string): Promise<boolean> {
    const result = await TaskModel.deleteOne({ taskId });
    return result.deletedCount === 1;
  }

  async getProjectProgress(projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  }> {
    const totalTasks = await TaskModel.countDocuments({ projectId });
    const completedTasks = await TaskModel.countDocuments({ 
      projectId, 
      status: 'client_approved' 
    });

    const progressPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    return {
      totalTasks,
      completedTasks,
      progressPercentage
    };
  }

  async findByFilters(query: any): Promise<Task[]> {
    const tasks = await TaskModel.find(query).sort({ createdAt: -1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  private applyFilters(query: any, filters?: TaskFilters): void {
    if (!filters) return;

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.search) {
      query.$or = [
        { taskName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.dueDate) {
      const dateQuery: any = {};
      if (filters.dueDate.from) {
        dateQuery.$gte = filters.dueDate.from;
      }
      if (filters.dueDate.to) {
        dateQuery.$lte = filters.dueDate.to;
      }
      if (Object.keys(dateQuery).length > 0) {
        query.dueDate = dateQuery;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
  }

  private mapToEntity(doc: ITaskDocument): Task {
    return {
      taskId: doc.taskId,
      projectId: doc.projectId,
      organizationId: doc.organizationId,
      taskName: doc.taskName,
      description: doc.description || '',
      brief: doc.brief || '',
      taskType: doc.taskType || 'graphic_design',
      riskLevel: doc.riskLevel, // Optional - will be set via star rating when assigned
      assignedDesigner: doc.assignedDesigner,
      designers: doc.designers || [], // Array of all designers who worked on this task
      designLead: doc.designLead,
      reworkDesigner: doc.reworkDesigner,
      createdBy: doc.createdBy,
      priority: doc.priority,
      starRate: doc.starRate,
      status: doc.status,
      statusHistory: doc.statusHistory || [],
      dueDate: doc.dueDate,
      dueTime: doc.dueTime, // Time in HH:MM format
      estimatedHours: doc.estimatedHours,
      actualHours: doc.actualHours,
      tags: doc.tags || [],
      assets: doc.assets || [],
      references: doc.references || [],
      attachments: doc.attachments || [],
      dependencies: doc.dependencies || [],
      
      // Rework fields
      isRework: doc.isRework || false,
      originalTaskId: doc.originalTaskId,
      reworkSuggestions: doc.reworkSuggestions,
      
      // Activity and comments
      activityAndComments: doc.activityAndComments || [],
      
      // Client review
      clientEmail: doc.clientEmail,
      deliverables: doc.deliverables || [],
      
      completedAt: doc.completedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}