import { Request, Response } from 'express';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IClientRepository } from '../../domain/repositories/IClientRepository';
import { IOrganizationRoleRepository } from '../../domain/repositories/IOrganizationRoleRepository';
import { PERMISSIONS } from '../../domain/entities/Role';

export class ProjectController {
  constructor(
    private projectRepository: IProjectRepository,
    private userRepository: IUserRepository,
    private clientRepository: IClientRepository,
    private organizationRoleRepository: IOrganizationRoleRepository
  ) {}

  // Update project progress based on task completion
  updateProjectProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      // Verify project exists and user has access
      const project = await this.projectRepository.findById(projectId);
      if (!project || project.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
        return;
      }

      // This would typically be called by TaskController when task status changes
      // For now, we'll calculate progress from request or use a default calculation
      const { progress } = req.body;
      
      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        res.status(400).json({
          success: false,
          error: 'Progress must be a number between 0 and 100'
        });
        return;
      }

      const updatedProject = await this.projectRepository.update(projectId, { progress });

      if (!updatedProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedProject,
        message: 'Project progress updated successfully'
      });
    } catch (error) {
      console.error('Error updating project progress:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get projects with role-based filtering
  getProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, status, riskLevel, projectType } = req.query;
      
      // Get organization ID from authenticated admin
      // This will be set by auth middleware
      const organizationId = (req as any).admin?.organizationId;
      const userId = (req as any).admin?.adminId;
      const userRole = (req as any).admin?.role;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const filters = {
        organizationId,
        search: search as string,
        status: status as string,
        riskLevel: riskLevel as string,
        projectType: projectType as string,
        userId,
        role: userRole
      };

      const projects = await this.projectRepository.findByFilters(filters);

      // Populate user and client details
      const populatedProjects = await Promise.all(
        projects.map(async (project) => {
          const [assignedAM, assignedDesignLead, projectLead, client] = await Promise.all([
            this.userRepository.findById(project.assignedAM),
            project.assignedDesignLead ? this.userRepository.findById(project.assignedDesignLead) : null,
            this.userRepository.findById(project.projectLead),
            this.clientRepository.findById(project.clientId)
          ]);

          return {
            ...project,
            assignedAM: assignedAM ? {
              _id: assignedAM.userId,
              fullName: assignedAM.fullName
            } : null,
            assignedDesignLead: assignedDesignLead ? {
              _id: assignedDesignLead.userId,
              fullName: assignedDesignLead.fullName
            } : null,
            projectLead: projectLead ? {
              _id: projectLead.userId,
              fullName: projectLead.fullName
            } : null,
            client: client ? {
              clientId: client.clientId,
              clientName: client.clientName,
              companyName: client.companyName,
              clientType: client.clientType
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: populatedProjects,
        message: 'Projects retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get individual project details for user
  getUserProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.userId;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId || !userId || !projectId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID, User ID, and Project ID are required'
        });
        return;
      }

      // Find the project
      const project = await this.projectRepository.findById(projectId);
      
      if (!project || project.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Populate client data
      let populatedProject: any = { ...project };
      if (project.clientId) {
        try {
          const client = await this.clientRepository.findById(project.clientId);
          if (client) {
            (populatedProject as any).client = {
              clientId: client.clientId,
              clientName: client.clientName,
              companyName: client.companyName,
              clientType: client.clientType
            };
          }
        } catch (error) {
          console.error('Error populating client data:', error);
        }
      }

      res.status(200).json({
        success: true,
        data: populatedProject
      });
    } catch (error) {
      console.error('Error fetching user project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get projects for user dashboard (role-based)
  getUserProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search, status } = req.query;
      
      // Get user info from userAuthMiddleware
      const user = (req as any).user;
      const organizationId = user?.organizationId;
      const userId = user?.userId;
      const role = user?.role;

      if (!organizationId || !userId || !role) {
        res.status(400).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const filters = {
        organizationId,
        search: search as string,
        status: status as string,
        userId,
        role
      };

      const projects = await this.projectRepository.findByFilters(filters);

      // Populate user and client details
      const populatedProjects = await Promise.all(
        projects.map(async (project) => {
          const [assignedAM, assignedDesignLead, projectLead, client] = await Promise.all([
            this.userRepository.findById(project.assignedAM),
            project.assignedDesignLead ? this.userRepository.findById(project.assignedDesignLead) : null,
            this.userRepository.findById(project.projectLead),
            this.clientRepository.findById(project.clientId)
          ]);

          return {
            ...project,
            assignedAM: assignedAM ? {
              _id: assignedAM.userId,
              fullName: assignedAM.fullName
            } : null,
            assignedDesignLead: assignedDesignLead ? {
              _id: assignedDesignLead.userId,
              fullName: assignedDesignLead.fullName
            } : null,
            projectLead: projectLead ? {
              _id: projectLead.userId,
              fullName: projectLead.fullName
            } : null,
            client: client ? {
              clientId: client.clientId,
              clientName: client.clientName,
              companyName: client.companyName,
              clientType: client.clientType
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: populatedProjects,
        message: 'User projects retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting user projects:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get single project by ID
  getProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const organizationId = (req as any).admin?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const project = await this.projectRepository.findById(projectId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Check if project belongs to the same organization
      if (project.organizationId !== organizationId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Populate user details
      const [assignedAM, assignedDesignLead, projectLead] = await Promise.all([
        this.userRepository.findById(project.assignedAM),
        project.assignedDesignLead ? this.userRepository.findById(project.assignedDesignLead) : null,
        this.userRepository.findById(project.projectLead)
      ]);

      const populatedProject = {
        ...project,
        assignedAM: assignedAM ? {
          _id: assignedAM.userId,
          fullName: assignedAM.fullName
        } : null,
        assignedDesignLead: assignedDesignLead ? {
          _id: assignedDesignLead.userId,
          fullName: assignedDesignLead.fullName
        } : null,
        projectLead: projectLead ? {
          _id: projectLead.userId,
          fullName: projectLead.fullName
        } : null
      };

      res.json({
        success: true,
        data: populatedProject,
        message: 'Project retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Create sample projects for testing (temporary method)
  createSampleProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID and User ID are required'
        });
        return;
      }

      // Get users from the organization to assign as project leads and AMs
      const users = await this.userRepository.findByOrganizationId(organizationId);
      const amUser = users.find(u => u.role?.toLowerCase().includes('am')) || users[0];
      const designUser = users.find(u => u.role?.toLowerCase().includes('design')) || users[1] || users[0];
      const projectLeadUser = users.find(u => u.role?.toLowerCase().includes('gm')) || users[0];

      // Get clients from the organization to assign to projects
      const clients = await this.clientRepository.getActiveClients(organizationId);
      const nikeClient = clients.find(c => c.clientName.toLowerCase().includes('nike'));
      const cokeClient = clients.find(c => c.clientName.toLowerCase().includes('coca'));
      const appleClient = clients.find(c => c.clientName.toLowerCase().includes('apple'));
      const teslaClient = clients.find(c => c.clientName.toLowerCase().includes('tesla'));
      const googleClient = clients.find(c => c.clientName.toLowerCase().includes('google'));
      
      // Use Legacy Client as fallback if specific clients don't exist
      const legacyClient = clients.find(c => c.clientName === 'Legacy Client') || clients[0];

      const sampleProjects = [
        {
          organizationId,
          projectName: "Nike Air Max Campaign",
          clientId: nikeClient?.clientId || legacyClient?.clientId,
          campaignName: "Summer Collection 2024",
          projectType: "marketing_campaign",
          dueDate: new Date('2024-12-15'),
          poNumber: "PO-NIKE-2024-001",
          estimateNumber: "EST-NIKE-001",
          assignedAM: amUser?.userId || userId,
          assignedDesignLead: designUser?.userId || userId,
          priority: "HIGH" as const,
          riskStatus: "MEDIUM" as const,
          progress: 75,
          budget: 150000,
          description: "Complete marketing campaign for Nike's summer collection including digital assets and print materials",
          brief: "Create comprehensive marketing campaign for Nike's summer collection including digital assets, print materials, and social media content.",
          assets: [],
          status: "ACTIVE" as const,
          projectLead: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId,
          createdBy: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId
        },
        {
          organizationId,
          projectName: "Coca-Cola Website Redesign",
          clientId: cokeClient?.clientId || legacyClient?.clientId,
          campaignName: "Digital Transformation 2024",
          projectType: "website_design",
          dueDate: new Date('2024-11-30'),
          estimateNumber: "EST-COCA-002",
          assignedAM: amUser?.userId || userId,
          assignedDesignLead: designUser?.userId || userId,
          priority: "URGENT" as const,
          riskStatus: "LOW" as const,
          progress: 45,
          budget: 250000,
          description: "Complete website redesign with modern UI/UX and improved user experience",
          brief: "Redesign Coca-Cola's website with modern UI/UX, improve user experience, and implement responsive design for all devices.",
          assets: [],
          status: "REVIEW" as const,
          projectLead: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId,
          createdBy: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId
        },
        {
          organizationId,
          projectName: "Apple Product Launch",
          clientId: appleClient?.clientId || legacyClient?.clientId,
          campaignName: "iPhone 16 Launch",
          projectType: "branding_identity",
          dueDate: new Date('2025-01-20'),
          poNumber: "PO-APPLE-2024-003",
          assignedAM: amUser?.userId || userId,
          priority: "MEDIUM" as const,
          riskStatus: "HIGH" as const,
          progress: 20,
          budget: 500000,
          description: "Branding and identity design for the new iPhone 16 product launch campaign",
          brief: "Design comprehensive branding and identity materials for the iPhone 16 product launch including logo variations, packaging, and marketing materials.",
          assets: [],
          status: "ACTIVE" as const,
          projectLead: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId,
          createdBy: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId
        },
        {
          organizationId,
          projectName: "Tesla Mobile App",
          clientId: teslaClient?.clientId || legacyClient?.clientId,
          campaignName: "Mobile Experience Enhancement",
          projectType: "mobile_app_design",
          dueDate: new Date('2024-10-31'),
          estimateNumber: "EST-TESLA-004",
          assignedAM: amUser?.userId || userId,
          assignedDesignLead: designUser?.userId || userId,
          priority: "LOW" as const,
          riskStatus: "LOW" as const,
          progress: 90,
          budget: 80000,
          description: "Mobile app design improvements for Tesla's customer experience platform",
          brief: "Improve Tesla mobile app UX/UI design for better customer experience, including charging station finder and vehicle controls.",
          assets: [],
          status: "ONHOLD" as const,
          projectLead: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId,
          createdBy: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId
        },
        {
          organizationId,
          projectName: "Google Ad Campaign",
          clientId: googleClient?.clientId || legacyClient?.clientId,
          campaignName: "Pixel Phone Marketing",
          projectType: "video_production",
          dueDate: new Date('2024-09-15'),
          poNumber: "PO-GOOGLE-2024-005",
          estimateNumber: "EST-GOOGLE-005",
          assignedAM: amUser?.userId || userId,
          priority: "HIGH" as const,
          riskStatus: "LOW" as const,
          progress: 100,
          budget: 200000,
          description: "Video production for Google Pixel phone advertising campaign",
          brief: "Create video content for Google Pixel phone advertising campaign including product demos, lifestyle shots, and social media content.",
          assets: [],
          status: "COMPLETED" as const,
          projectLead: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId,
          createdBy: projectLeadUser?.userId || amUser?.userId || users[0]?.userId || userId
        }
      ];

      const createdProjects = [];
      for (const projectData of sampleProjects) {
        if (projectData.clientId) { // Only create project if we have a valid clientId
          const project = await this.projectRepository.create(projectData);
          createdProjects.push(project);
        }
      }

      res.json({
        success: true,
        data: createdProjects,
        message: `${createdProjects.length} sample projects created successfully`
      });
    } catch (error) {
      console.error('Error creating sample projects:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Create new project (Phase 3)
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID and User ID are required'
        });
        return;
      }

      // Check if user has permission to create projects (for regular users, not admins)
      if ((req as any).user && !(req as any).admin) {
        const user = (req as any).user;
        try {
          const organizationRoles = await this.organizationRoleRepository.findByOrganizationId(organizationId);
          const userRole = organizationRoles.find(role => role.roleName === user.role);
          
          if (!userRole || !userRole.permissions.includes(PERMISSIONS.CREATE_PROJECT)) {
            res.status(403).json({
              success: false,
              error: 'You do not have permission to create projects'
            });
            return;
          }
        } catch (error) {
          console.error('Error checking user permissions:', error);
          res.status(500).json({
            success: false,
            error: 'Error checking permissions'
          });
          return;
        }
      }

      const {
        projectName,
        clientId,
        campaignName,
        brief,
        dueDate,
        poNumber,
        estimateNumber,
        assignedAM,
        assignedDesignLead,
        priority = 'MEDIUM',
        riskStatus = 'LOW',
        budget,
        projectType,
        assets = []
      } = req.body;

      // Validation
      const errors = [];

      // Required fields
      if (!projectName?.trim()) errors.push('Project name is required');
      if (!brief?.trim()) errors.push('Brief is required');
      if (!dueDate) errors.push('Due date is required');
      if (!clientId?.trim()) errors.push('Client ID is required');
      
      // At least one of PO or Estimate required
      if (!poNumber?.trim() && !estimateNumber?.trim()) {
        errors.push('Either PO Number or Estimate Number is required');
      }

      // Budget validation
      if (budget === undefined || budget === null || budget < 0) {
        errors.push('Budget is required and must be non-negative');
      }

      // Validate client exists
      if (clientId) {
        const client = await this.clientRepository.findById(clientId);
        if (!client || client.organizationId !== organizationId) {
          errors.push('Client not found or access denied');
        }
      }

      // Validate assigned users exist
      if (assignedAM) {
        const amUser = await this.userRepository.findById(assignedAM);
        if (!amUser) errors.push('Assigned Account Manager not found');
      }

      if (assignedDesignLead) {
        const designUser = await this.userRepository.findById(assignedDesignLead);
        if (!designUser) errors.push('Assigned Design Lead not found');
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors
        });
        return;
      }

      // Get organization users to assign defaults if not provided
      const orgUsers = await this.userRepository.findByOrganizationId(organizationId);
      const defaultAM = orgUsers.find(u => u.role?.toLowerCase().includes('am')) || orgUsers[0];

      const projectData = {
        organizationId,
        projectName: projectName.trim(),
        clientId: clientId.trim(),
        campaignName: campaignName?.trim(),
        brief: brief.trim(),
        description: brief.trim(), // Use brief as description
        dueDate: new Date(dueDate),
        poNumber: poNumber?.trim(),
        estimateNumber: estimateNumber?.trim(),
        assignedAM: assignedAM || defaultAM?.userId || userId,
        assignedDesignLead: assignedDesignLead,
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        riskStatus: riskStatus as 'LOW' | 'MEDIUM' | 'HIGH',
        progress: 0,
        budget: parseFloat(budget),
        projectType: projectType?.trim(),
        assets: Array.isArray(assets) ? assets : [],
        status: 'ACTIVE' as const,
        projectLead: userId,
        createdBy: userId
      };

      const project = await this.projectRepository.create(projectData);

      // Populate user and client details for response
      const [assignedAMUser, assignedDesignLeadUser, projectLeadUser, client] = await Promise.all([
        this.userRepository.findById(project.assignedAM),
        project.assignedDesignLead ? this.userRepository.findById(project.assignedDesignLead) : null,
        this.userRepository.findById(project.projectLead),
        this.clientRepository.findById(project.clientId)
      ]);

      const populatedProject = {
        ...project,
        assignedAM: assignedAMUser ? {
          _id: assignedAMUser.userId,
          fullName: assignedAMUser.fullName
        } : null,
        assignedDesignLead: assignedDesignLeadUser ? {
          _id: assignedDesignLeadUser.userId,
          fullName: assignedDesignLeadUser.fullName
        } : null,
        projectLead: projectLeadUser ? {
          _id: projectLeadUser.userId,
          fullName: projectLeadUser.fullName
        } : null,
        client: client ? {
          clientId: client.clientId,
          clientName: client.clientName,
          companyName: client.companyName,
          clientType: client.clientType
        } : null
      };

      res.status(201).json({
        success: true,
        data: populatedProject,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Update project
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      // This will be implemented in later phases
      res.status(501).json({
        success: false,
        error: 'Project update will be implemented in later phases'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };
}