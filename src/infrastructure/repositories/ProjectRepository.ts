import { IProjectRepository, ProjectFilters } from '../../domain/repositories/IProjectRepository';
import { Project } from '../../domain/entities/Project';
import { ProjectModel, IProjectDocument } from '../database/models/ProjectModel';
import { v4 as uuidv4 } from 'uuid';

export class ProjectRepository implements IProjectRepository {
  async create(project: Omit<Project, 'projectId' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const projectDoc = new ProjectModel({
        ...project,
        projectId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedProject = await projectDoc.save();
      return this.mapToEntity(savedProject);
    } catch (error) {
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(projectId: string): Promise<Project | null> {
    try {
      const project = await ProjectModel.findOne({ projectId });
      return project ? this.mapToEntity(project) : null;
    } catch (error) {
      throw new Error(`Failed to find project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOrganization(organizationId: string): Promise<Project[]> {
    try {
      const projects = await ProjectModel.find({ organizationId })
        .sort({ createdAt: -1 });
      return projects.map(project => this.mapToEntity(project));
    } catch (error) {
      throw new Error(`Failed to find projects by organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByFilters(filters: ProjectFilters): Promise<Project[]> {
    try {
      const query: any = { organizationId: filters.organizationId };

      // Add search filter
      if (filters.search) {
        query.$or = [
          { projectName: { $regex: filters.search, $options: 'i' } },
          { clientName: { $regex: filters.search, $options: 'i' } },
          { campaignName: { $regex: filters.search, $options: 'i' } }
        ];
      }

      // Add status filter
      if (filters.status && filters.status !== 'ALL') {
        query.status = filters.status;
      }

      // Add risk level filter
      if (filters.riskLevel && filters.riskLevel !== 'ALL') {
        query.riskStatus = filters.riskLevel;
      }

      // Add project type filter
      if (filters.projectType && filters.projectType !== 'ALL') {
        query.projectType = filters.projectType;
      }

      // Role-based filtering
      if (filters.userId && filters.role) {
        const role = filters.role;
        
        if (role === 'GM') {
          // GM sees all projects - no additional filter needed
        } else if (role === 'AM Head' || role === 'AM Lead') {
          // AM Head and AM Lead see ALL projects in organization - no additional filter
        } else if (role.includes('AM') && !role.includes('Head') && !role.includes('Lead')) {
          // Regular AM sees projects where they are assignedAM OR projectLead
          query.$or = [
            { assignedAM: filters.userId },
            { projectLead: filters.userId }
          ];
        } else if (role.includes('Design Head') || role.includes('Design_Head')) {
          // Design Head sees all Design team projects
          query.$or = [
            { assignedDesignLead: filters.userId },
            { assignedDesignLead: { $exists: true } } // All design projects
          ];
        } else if (role.includes('Design Lead') || role.includes('Design_Lead')) {
          // Design Lead sees projects assigned to them
          query.assignedDesignLead = filters.userId;
        } else if (role.includes('Design')) {
          // Individual designers see only assigned projects
          query.assignedDesignLead = filters.userId;
        }
      }
      
      const projects = await ProjectModel.find(query)
        .sort({ createdAt: -1 });
      
      return projects.map(project => this.mapToEntity(project));
    } catch (error) {
      throw new Error(`Failed to find projects with filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByAssignedUser(userId: string, organizationId: string): Promise<Project[]> {
    try {
      const projects = await ProjectModel.find({
        organizationId,
        $or: [
          { assignedAM: userId },
          { assignedDesignLead: userId }
        ]
      }).sort({ createdAt: -1 });
      
      return projects.map(project => this.mapToEntity(project));
    } catch (error) {
      throw new Error(`Failed to find projects by assigned user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByTeam(team: string, organizationId: string): Promise<Project[]> {
    try {
      // This would require more complex logic to determine team-based projects
      // For now, returning all organization projects
      const projects = await ProjectModel.find({ organizationId })
        .sort({ createdAt: -1 });
      return projects.map(project => this.mapToEntity(project));
    } catch (error) {
      throw new Error(`Failed to find projects by team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      const project = await ProjectModel.findOneAndUpdate(
        { projectId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      return project ? this.mapToEntity(project) : null;
    } catch (error) {
      throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(projectId: string): Promise<boolean> {
    try {
      const result = await ProjectModel.deleteOne({ projectId });
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(doc: IProjectDocument): Project {
    return {
      projectId: doc.projectId,
      organizationId: doc.organizationId,
      projectName: doc.projectName,
      clientId: doc.clientId,
      campaignName: doc.campaignName,
      projectType: doc.projectType,
      dueDate: doc.dueDate,
      poNumber: doc.poNumber,
      estimateNumber: doc.estimateNumber,
      assignedAM: doc.assignedAM,
      assignedDesignLead: doc.assignedDesignLead,
      priority: doc.priority,
      riskStatus: doc.riskStatus,
      progress: doc.progress,
      budget: doc.budget,
      description: doc.description,
      brief: doc.brief,
      assets: doc.assets || [],
      status: doc.status,
      projectLead: doc.projectLead,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}