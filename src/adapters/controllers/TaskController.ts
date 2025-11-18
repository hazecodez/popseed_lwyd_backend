import { Request, Response } from 'express';
import { ITaskRepository } from '../../domain/repositories/ITaskRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { ActivityComment } from '../../domain/entities/Task';
import { NotificationService } from '../../infrastructure/services/NotificationService';

export class TaskController {
  constructor(
    private taskRepository: ITaskRepository,
    private userRepository: IUserRepository,
    private projectRepository: IProjectRepository,
    private notificationService?: NotificationService
  ) {}

  // Get tasks visible to current user based on their role
  getAssignedTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;
      const userRole = (req as any).user?.role || (req as any).admin?.role;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      let taskQuery: any;

      // Check if user is Design Head or Design Lead
      const isDesignHead = userRole?.toLowerCase().includes('design head') || userRole?.toLowerCase().includes('design_head');
      const isDesignLead = userRole?.toLowerCase().includes('design lead') || userRole?.toLowerCase().includes('design_lead');

      if (isDesignHead || isDesignLead) {
        // Design Head sees ALL tasks in organization
        taskQuery = {
          organizationId
        };
      // } 
      // else if (isDesignLead) {
      //   // Design Leads see:
      //   // 1. Unassigned tasks (status = brief_submitted)
      //   // 2. Tasks where they are assigned lead
      //   // 3. Tasks where they are assigned designer
      //   taskQuery = {
      //     organizationId,
      //     $or: [
      //       // Tasks assigned to them as lead
      //       { designLead: userId },
      //       // Tasks assigned to them as designer
      //       { assignedDesigner: userId },
      //       // All unassigned design tasks (no assignedDesigner set)
      //       { assignedDesigner: { $exists: false } },
      //       { assignedDesigner: null }
      //     ]
      //   };
      } else {
        // Regular users only see tasks assigned to them
        taskQuery = {
          organizationId,
          $or: [
            { assignedDesigner: userId },
            { designLead: userId }
          ]
        };
      }

      const assignedTasks = await this.taskRepository.findByFilters(taskQuery);

      // Populate project details for each task
      const tasksWithProjects = await Promise.all(
        assignedTasks.map(async (task) => {
          const project = await this.projectRepository.findById(task.projectId);
          return {
            ...task,
            project: project ? {
              projectId: project.projectId,
              projectName: project.projectName,
              clientId: project.clientId
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: tasksWithProjects,
        message: 'Tasks retrieved successfully',
        meta: {
          total: tasksWithProjects.length,
          userRole: userRole,
          isDesignHead: isDesignHead,
          isDesignLead: isDesignLead
        }
      });

    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get unassigned tasks (for Design Head/Lead filters)
  getUnassignedTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;
      const userRole = (req as any).user?.role || (req as any).admin?.role;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Only Design Head and Design Leads can see unassigned tasks
      const isDesignHead = userRole?.toLowerCase().includes('design head') || userRole?.toLowerCase().includes('design_head');
      const isDesignLead = userRole?.toLowerCase().includes('design lead') || userRole?.toLowerCase().includes('design_lead');

      if (!isDesignHead && !isDesignLead) {
        res.status(403).json({
          success: false,
          error: 'Access denied. Only Design Head and Design Leads can view unassigned tasks.'
        });
        return;
      }

      // Get all tasks that are not assigned to any designer
      const unassignedTasks = await this.taskRepository.findByFilters({
        organizationId,
        $or: [
          { assignedDesigner: { $exists: false } },
          { assignedDesigner: null }
        ]
      });

      // Populate project details for each task
      const tasksWithProjects = await Promise.all(
        unassignedTasks.map(async (task) => {
          const project = await this.projectRepository.findById(task.projectId);
          return {
            ...task,
            project: project ? {
              projectId: project.projectId,
              projectName: project.projectName,
              clientId: project.clientId
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: tasksWithProjects,
        message: 'Unassigned tasks retrieved successfully',
        meta: {
          total: tasksWithProjects.length,
          userRole: userRole
        }
      });

    } catch (error) {
      console.error('Error fetching unassigned tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get completed tasks for rework dropdown
  getCompletedTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      if (!organizationId || !projectId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID and Project ID are required'
        });
        return;
      }

      // Verify project exists and user has access
      const project = await this.projectRepository.findById(projectId);
      if (!project || project.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // Get completed tasks for this project
      const completedTasks = await this.taskRepository.findByProjectId(projectId, {
        status: 'client_approved',
        organizationId
      });

      // Return simplified task data for dropdown
      const taskOptions = completedTasks.map(task => ({
        taskId: task.taskId,
        taskName: task.taskName,
        taskType: task.taskType,
        assignedDesigner: task.assignedDesigner,
        designLead: task.designLead,
        assets: task.assets
      }));

      res.status(200).json({
        success: true,
        data: taskOptions
      });
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get tasks for a specific project
  getProjectTasks = async (req: Request, res: Response): Promise<void> => {
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

      const { status, priority, search, assignedDesigner } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (search) filters.search = search as string;
      if (assignedDesigner) filters.assignedDesigner = assignedDesigner;

      const tasks = await this.taskRepository.findByProjectId(projectId, filters);

      // Populate user details for assigned users and creators
      const populatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const [assignedDesignerUser, designLeadUser, createdByUser] = await Promise.all([
            task.assignedDesigner ? this.userRepository.findById(task.assignedDesigner) : null,
            task.designLead ? this.userRepository.findById(task.designLead) : null,
            this.userRepository.findById(task.createdBy)
          ]);

          return {
            ...task,
            assignedDesignerUser: assignedDesignerUser ? {
              userId: assignedDesignerUser.userId,
              fullName: assignedDesignerUser.fullName,
              role: assignedDesignerUser.role
            } : null,
            designLeadUser: designLeadUser ? {
              userId: designLeadUser.userId,
              fullName: designLeadUser.fullName,
              role: designLeadUser.role
            } : null,
            createdByUser: createdByUser ? {
              userId: createdByUser.userId,
              fullName: createdByUser.fullName,
              role: createdByUser.role
            } : null
          };
        })
      );

      // Get project progress
      const progress = await this.taskRepository.getProjectProgress(projectId);

      res.json({
        success: true,
        data: {
          tasks: populatedTasks,
          progress,
          total: tasks.length
        }
      });
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get tasks assigned to current user
  getUserTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'User ID and Organization ID are required'
        });
        return;
      }

      const { status, priority, search, projectId } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (search) filters.search = search as string;
      if (projectId) filters.projectId = projectId;

      const tasks = await this.taskRepository.findByAssignedUser(userId, organizationId, filters);

      // Populate project and user details
      const populatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const [project, createdByUser] = await Promise.all([
            this.projectRepository.findById(task.projectId),
            this.userRepository.findById(task.createdBy)
          ]);

          return {
            ...task,
            project: project ? {
              projectId: project.projectId,
              projectName: project.projectName,
              clientId: project.clientId,
              campaignName: project.campaignName
            } : null,
            createdByUser: createdByUser ? {
              userId: createdByUser.userId,
              fullName: createdByUser.fullName,
              role: createdByUser.role
            } : null
          };
        })
      );

      res.json({
        success: true,
        data: {
          tasks: populatedTasks,
          total: tasks.length
        }
      });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get single task by ID
  getTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      const task = await this.taskRepository.findById(taskId);
      
      if (!task || task.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Task not found or access denied'
        });
        return;
      }

      // Populate related data
      const [project, assignedDesignerUser, designLeadUser, createdByUser] = await Promise.all([
        this.projectRepository.findById(task.projectId),
        task.assignedDesigner ? this.userRepository.findById(task.assignedDesigner) : null,
        task.designLead ? this.userRepository.findById(task.designLead) : null,
        this.userRepository.findById(task.createdBy)
      ]);

      // Populate status history with user names
      const populatedStatusHistory = await Promise.all(
        task.statusHistory.map(async (change) => {
          const user = await this.userRepository.findById(change.changedBy);
          return {
            ...change,
            changedByUser: user ? {
              userId: user.userId,
              fullName: user.fullName
            } : null
          };
        })
      );

      const populatedTask = {
        ...task,
        project: project ? {
          projectId: project.projectId,
          projectName: project.projectName,
          clientId: project.clientId,
          campaignName: project.campaignName
        } : null,
        assignedDesignerUser: assignedDesignerUser ? {
          userId: assignedDesignerUser.userId,
          fullName: assignedDesignerUser.fullName,
          role: assignedDesignerUser.role
        } : null,
        designLeadUser: designLeadUser ? {
          userId: designLeadUser.userId,
          fullName: designLeadUser.fullName,
          role: designLeadUser.role
        } : null,
        createdByUser: createdByUser ? {
          userId: createdByUser.userId,
          fullName: createdByUser.fullName,
          role: createdByUser.role
        } : null,
        statusHistory: populatedStatusHistory
      };

      res.json({
        success: true,
        data: populatedTask
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Create new task
  createTask = async (req: Request, res: Response): Promise<void> => {
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

      // Get projectId from URL parameters
      const { projectId } = req.params;
      
      const {
        taskName,
        brief,
        taskType,
        priority = 'medium',
        dueDate,
        dueTime,
        assets = [],
        references = [],
        // Rework fields
        isRework = false,
        originalTaskId,
        reworkSuggestions
      } = req.body;

      // Validation
      const errors = [];
      if (!projectId?.trim()) errors.push('Project ID is required');
      if (!taskName?.trim()) errors.push('Task name is required');
      if (!brief?.trim()) errors.push('Task brief is required');
      if (!taskType?.trim()) errors.push('Task type is required');
      if (!dueDate) errors.push('Due date is required');

      // Validate task type
      const validTaskTypes = ['graphic_design', 'motion_graphic_design', '3d_design', 'ai_generation', 'web_design', 'copy_writing', 'strategy_thinking'];
      if (!validTaskTypes.includes(taskType)) {
        errors.push('Invalid task type');
      }

      // Validate priority
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        errors.push('Invalid priority');
      }

      // Risk level removed - will be set via star rating when Head/Lead assigns task

      // Rework validation
      if (isRework) {
        if (!originalTaskId?.trim()) errors.push('Original task ID is required for rework tasks');
        if (!reworkSuggestions?.trim()) errors.push('Rework suggestions are required for rework tasks');
      }

      // Return early if basic validation fails
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }

      // Verify project exists and user has access
      const project = await this.projectRepository.findById(projectId);
      if (!project || project.organizationId !== organizationId) {
        errors.push('Project not found or access denied');
      }

      // Task will be available to Design Head and Design Leads automatically
      // No specific assignment needed at creation time

      // If rework, verify original task exists
      let originalTask = null;
      if (isRework && originalTaskId) {
        originalTask = await this.taskRepository.findById(originalTaskId);
        if (!originalTask || originalTask.projectId !== projectId) {
          errors.push('Original task not found or not in same project');
        }
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }

      // Create initial activity comment
      const initialComment = {
        byWho: userId,
        comment: isRework ? `Rework task created: ${reworkSuggestions}` : 'Task created',
        time: new Date(),
        type: isRework ? 'rework_requested' as const : 'brief_submitted' as const
      };

      // Create task data
      const taskData = {
        projectId: projectId.trim(),
        organizationId,
        taskName: taskName.trim(),
        description: '', // Keep empty for backward compatibility
        brief: brief.trim(),
        taskType,
        // riskLevel removed - will be determined via star rating when assigned
        assignedDesigner: undefined, // Will be set when Head/Lead assigns to designer
        designLead: undefined, // Will be set when Head/Lead assigns the task
        createdBy: userId,
        priority,
        status: isRework ? 'rework_requested' as const : 'brief_submitted' as const,
        statusHistory: [], // Will be populated by repository
        dueDate: new Date(dueDate),
        dueTime: dueTime || undefined, // Optional time in HH:MM format
        assets: Array.isArray(assets) ? assets : [],
        references: Array.isArray(references) ? references : [],
        attachments: [], // Keep for backward compatibility
        dependencies: [],
        tags: [],
        
        // Rework fields
        isRework,
        originalTaskId: originalTask?.taskId,
        reworkSuggestions: reworkSuggestions?.trim(),
        
        // Activity and comments
        activityAndComments: [initialComment],
        
        // Other fields
        deliverables: [],
        completedAt: undefined
      };

      const task = await this.taskRepository.create(taskData);

      // Populate user details for response
      const createdByUser = await this.userRepository.findById(task.createdBy);

      const responseData = {
        ...task,
        assignedDesignerUser: null, // Will be populated when task is assigned
        designLeadUser: null, // Will be populated when task is assigned
        createdByUser: createdByUser ? {
          userId: createdByUser.userId,
          fullName: createdByUser.fullName,
          email: createdByUser.email,
          role: createdByUser.role
        } : null,
        project: project ? {
          projectId: project.projectId,
          projectName: project.projectName
        } : null
      };

      res.status(201).json({
        success: true,
        data: responseData,
        message: `${isRework ? 'Rework task' : 'Task'} created successfully`
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Update task
  updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      const task = await this.taskRepository.findById(taskId);
      
      if (!task || task.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Task not found or access denied'
        });
        return;
      }

      const {
        taskName,
        description,
        brief,
        assignedDesigner,
        designLead,
        priority,
        dueDate,
        estimatedHours,
        actualHours,
        tags,
        assets,
        references,
        attachments,
        dependencies,
        deliverables,
        starRate,
        status
      } = req.body;

      const updateData: any = {};
      
      // Store assignment info for later processing (declare outside to be accessible later)
      let isNewAssignment = false;
      let isReassignment = false;
      let oldDesignerId = null;
      let assignmentActivity: any = null;
      
      // Handle assignment and reassignment
      if (assignedDesigner !== undefined) {
        // REMOVED THE BLOCKING CHECK - Allow reassignment
        
        if (!task.assignedDesigner && assignedDesigner) {
          // NEW ASSIGNMENT
          isNewAssignment = true;
          const starRating = parseInt(starRate) || 0;
          
          // Update designer workload
          try {
            await this.userRepository.updateWorkload(assignedDesigner, {
              $inc: { 
                ongoingTasks: 1,
                workloadScore: starRating 
              },
              $push: {
                taskDifficulties: {
                  taskId: taskId,
                  starRating: starRating
                }
              }
            });
          } catch (error) {
            console.error('Error updating designer workload:', error);
          }

          // Send notification for task assignment
          if (this.notificationService) {
            try {
              const project = await this.projectRepository.findById(task.projectId);
              await this.notificationService.notifyTaskAssigned(
                taskId,
                task.taskName,
                project?.projectName || 'Unknown Project',
                assignedDesigner,
                designLead || null,
                userId,
                organizationId
              );
            } catch (error) {
              console.error('Error sending task assignment notification:', error);
            }
          }

          // Prepare assignment activity
          try {
            const designer = await this.userRepository.findById(assignedDesigner);
            const assigner = await this.userRepository.findById(userId);
            assignmentActivity = {
              byWho: userId,
              comment: `Task assigned to ${designer?.fullName || 'Designer'} by ${assigner?.fullName || 'Lead'}`,
              time: new Date().toISOString(),
              type: 'designer_assigned'
            };
          } catch (error) {
            console.error('Error preparing assignment activity:', error);
          }

        } else if (task.assignedDesigner && assignedDesigner && task.assignedDesigner !== assignedDesigner) {
          // REASSIGNMENT
          isReassignment = true;
          oldDesignerId = task.assignedDesigner;
          const starRating = parseInt(starRate) || task.starRate || 0;
          
          // Decrease old designer's workload
          try {
            await this.userRepository.updateWorkload(oldDesignerId, {
              $inc: { 
                ongoingTasks: -1,
                workloadScore: -starRating 
              },
              $pull: {
                taskDifficulties: { taskId: taskId }
              }
            });
          } catch (error) {
            console.error('Error decreasing old designer workload:', error);
          }

          // Increase new designer's workload
          try {
            await this.userRepository.updateWorkload(assignedDesigner, {
              $inc: { 
                ongoingTasks: 1,
                workloadScore: starRating 
              },
              $push: {
                taskDifficulties: {
                  taskId: taskId,
                  starRating: starRating
                }
              }
            });
          } catch (error) {
            console.error('Error increasing new designer workload:', error);
          }

          // Send reassignment notifications
          if (this.notificationService) {
            try {
              const project = await this.projectRepository.findById(task.projectId);
              await this.notificationService.notifyDesignerChange(
                taskId,
                task.taskName,
                project?.projectName || 'Unknown Project',
                oldDesignerId,
                assignedDesigner,
                designLead || null,
                userId,
                organizationId
              );
            } catch (error) {
              console.error('Error sending reassignment notification:', error);
            }
          }

          // Prepare reassignment activity
          try {
            const oldDesigner = await this.userRepository.findById(oldDesignerId);
            const newDesigner = await this.userRepository.findById(assignedDesigner);
            
            assignmentActivity = {
              byWho: userId,
              comment: `Task reassigned from ${oldDesigner?.fullName || 'Designer'} to ${newDesigner?.fullName || 'Designer'}`,
              time: new Date().toISOString(),
              type: 'designer_changed'
            };
          } catch (error) {
            console.error('Error preparing reassignment activity:', error);
          }
        }
        
        updateData.assignedDesigner = assignedDesigner;
      }
      
      if (taskName !== undefined) updateData.taskName = taskName.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (brief !== undefined) updateData.brief = brief.trim();
      if (designLead !== undefined) updateData.designLead = designLead;
      if (priority !== undefined) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (estimatedHours !== undefined) updateData.estimatedHours = parseFloat(estimatedHours);
      if (actualHours !== undefined) updateData.actualHours = parseFloat(actualHours);
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
      if (assets !== undefined) updateData.assets = Array.isArray(assets) ? assets : [];
      if (references !== undefined) updateData.references = Array.isArray(references) ? references : [];
      if (attachments !== undefined) updateData.attachments = Array.isArray(attachments) ? attachments : [];
      if (dependencies !== undefined) updateData.dependencies = Array.isArray(dependencies) ? dependencies : [];
      if (deliverables !== undefined) updateData.deliverables = Array.isArray(deliverables) ? deliverables : [];
      if (starRate !== undefined) updateData.starRate = parseInt(starRate);
      if (status !== undefined) updateData.status = status;

      // CONSOLIDATED SINGLE ATOMIC UPDATE - Combine ALL updates into ONE MongoDB operation
      const TaskModel = require('@/infrastructure/database/models/TaskModel').TaskModel;
      
      // Build the complete MongoDB update operation
      const mongoUpdate: any = {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      };
      
      // Add designers array and activity log for assignments/reassignments
      if (isNewAssignment || isReassignment) {
        // Use $addToSet to add designer to array (creates array if it doesn't exist)
        mongoUpdate.$addToSet = { designers: assignedDesigner };
        
        if (assignmentActivity) {
          mongoUpdate.$push = { activityAndComments: assignmentActivity };
        }
      }
      
      // SINGLE atomic update operation with ALL changes
      try {
        const updateResult = await TaskModel.findOneAndUpdate(
          { taskId: taskId },
          mongoUpdate,
          { new: true, runValidators: true }
        );
        // MongoDB update completed successfully
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      // Fetch the FINAL updated task with ALL changes
      const finalTask = await this.taskRepository.findById(taskId);

      if (!finalTask) {
        res.status(404).json({
          success: false,
          error: 'Task not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: finalTask,
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Add comment to task
  // addComment = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const { taskId } = req.params;
  //     const { comment, type } = req.body;
  //     const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
  //     const userId = (req as any).admin?.adminId || (req as any).user?.userId;

  //     if (!organizationId || !userId) {
  //       res.status(400).json({
  //         success: false,
  //         error: 'Authentication required'
  //       });
  //       return;
  //     }

  //     if (!comment?.trim()) {
  //       res.status(400).json({
  //         success: false,
  //         error: 'Comment is required'
  //       });
  //       return;
  //     }

  //     if (!type?.trim()) {
  //       res.status(400).json({
  //         success: false,
  //         error: 'Comment type is required'
  //       });
  //       return;
  //     }

  //     // Find task
  //     const task = await this.taskRepository.findById(taskId);
  //     if (!task || task.organizationId !== organizationId) {
  //       res.status(404).json({
  //         success: false,
  //         error: 'Task not found'
  //       });
  //       return;
  //     }

  //     // Map comment types to allowed enum values
  //     const typeMapping: { [key: string]: string } = {
  //       'client_feedback': 'client_feedback',
  //       'internal_feedback': 'internal_feedback',
  //       'brief_rework': 'brief_rework',
  //       'design_rework': 'design_rework',
  //       'designer_feedback': 'designer_feedback',
  //       'rework_requested': 'rework_requested',
  //       'brief_submitted': 'brief_submitted',
  //       'onhold': 'onhold',
  //       'reactivate': 'reactivate',
  //       'need_clarity': 'need_clarity',
  //       'clarification': 'clarification',
  //       'designer_assigned': 'designer_assigned',
  //       'picked_up': 'picked_up',
  //       'draft_submitted': 'draft_submitted',
  //       'am_feedback': 'am_feedback',
  //       'feedback_response': 'feedback_response',
  //       'internal_approved': 'internal_approved',
  //       'sent_to_client': 'sent_to_client',
  //       'client_approved': 'client_approved',
  //       'internal_review': 'internal_review',
  //       'accept_feedback': 'accept_feedback',
  //       'reject_feedback': 'reject_feedback',
  //       'approve_rework': 'approve_rework',
  //       'reject_rework': 'reject_rework'
  //     };

  //     // Create comment activity
  //     const newActivity: ActivityComment = {
  //       byWho: userId,
  //       comment: comment.trim(),
  //       time: new Date(),
  //       type: (typeMapping[type] || 'internal_feedback') as 'brief_submitted' | 'brief_rework' | 'design_rework' | 'designer_feedback' | 'client_feedback' | 'internal_feedback' | 'rework_requested'
  //     };

  //     // Determine if status should be updated based on comment type
  //     let statusUpdate: any = {
  //       activityAndComments: [...(task.activityAndComments || []), newActivity],
  //       updatedAt: new Date()
  //     };

  //     // Update task status based on comment type (some comments only add activity, don't change status)
  //     if (type === 'brief_rework') {
  //       statusUpdate.status = 'brief_rework';
  //     } else if (type === 'client_feedback') {
  //       statusUpdate.status = 'client_feedback';
  //     } else if (type === 'internal_feedback') {
  //       statusUpdate.status = 'internal_feedback';
  //     } else if (type === 'onhold') {
  //       statusUpdate.status = 'onhold';
  //     } else if (type === 'reactivate') {
  //       // Conditional reactivate: If task has assigned designer, go to designer_assigned, else go to brief_submitted
  //       if (task.assignedDesigner) {
  //         statusUpdate.status = 'designer_assigned'; // Designer can pick up again
  //       } else {
  //         statusUpdate.status = 'brief_submitted'; // Head/Lead can assign
  //       }
  //     } else if (type === 'brief_submitted') {
  //       statusUpdate.status = 'brief_submitted';
  //     } else if (type === 'picked_up') {
  //       statusUpdate.status = 'picked_up';
  //     } else if (type === 'draft_submitted') {
  //       statusUpdate.status = 'draft_submitted';
  //     } else if (type === 'internal_approved') {
  //       statusUpdate.status = 'internal_approved';
  //     } else if (type === 'sent_to_client') {
  //       statusUpdate.status = 'sent_to_client';
  //     } else if (type === 'client_approved') {
  //       statusUpdate.status = 'client_approved';
  //     } else if (type === 'am_feedback') {
  //       statusUpdate.status = 'internal_review';
  //     } else if (type === 'accept_feedback') {
  //       statusUpdate.status = 'internal_feedback';
  //     } else if (type === 'reject_feedback') {
  //       statusUpdate.status = 'internal_approved'; // Go back to previous state
  //     } else if (type === 'rework_requested') {
  //       statusUpdate.status = 'rework_requested';
  //     } else if (type === 'approve_rework') {
  //       statusUpdate.status = 'internal_feedback';
  //     } else if (type === 'reject_rework') {
  //       statusUpdate.status = 'client_approved'; // Go back to previous state
  //     }
  //     // Note: 'feedback_response', 'need_clarity' only add activity, don't change status

  //     // Handle workload reduction for completed tasks
  //     if ((type === 'client_approved' || type === 'internal_approved') && task.assignedDesigner && task.starRate) {
  //       try {
  //         await this.userRepository.updateWorkload(task.assignedDesigner, {
  //           $inc: { 
  //             ongoingTasks: -1,
  //             workloadScore: -task.starRate 
  //           },
  //           $pull: {
  //             taskDifficulties: { taskId: taskId }
  //           }
  //         });
  //       } catch (error) {
  //         console.error('Error updating designer workload on completion:', error);
  //       }
  //     }

  //     // Update task with new comment and potentially new status
  //     const updatedTask = await this.taskRepository.update(taskId, statusUpdate);

  //     // Send notifications for status change or comment
  //     if (this.notificationService && updatedTask) {
  //       try {
  //         const project = await this.projectRepository.findById(updatedTask.projectId);
          
  //         // If status changed, notify about status change
  //         if (statusUpdate.status && statusUpdate.status !== task.status) {
  //           await this.notificationService.notifyStatusChange(
  //             taskId,
  //             updatedTask.taskName,
  //             project?.projectName || 'Unknown Project',
  //             task.status,
  //             statusUpdate.status,
  //             userId,
  //             updatedTask.assignedDesigner || null,
  //             updatedTask.designLead || null,
  //             project?.assignedAM || null,
  //             organizationId
  //           );
  //         }
          
  //         // If comment was added (not just status change), notify about comment
  //         if (comment && comment.trim()) {
  //           await this.notificationService.notifyCommentAdded(
  //             taskId,
  //             updatedTask.taskName,
  //             comment,
  //             type,
  //             userId,
  //             updatedTask.assignedDesigner || null,
  //             updatedTask.designLead || null,
  //             project?.assignedAM || null,
  //             organizationId
  //           );
  //         }
  //       } catch (error) {
  //         console.error('Error sending notifications:', error);
  //       }
  //     }

  //     res.json({
  //       success: true,
  //       data: updatedTask,
  //       message: 'Comment added successfully'
  //     });

  //   } catch (error) {
  //     console.error('Error adding comment:', error);
  //     res.status(500).json({
  //       success: false,
  //       error: 'Internal server error'
  //     });
  //   }
  // };
  // Add comment to task
addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { comment, type, asset } = req.body; // Add asset to destructuring
    const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
    const userId = (req as any).admin?.adminId || (req as any).user?.userId;

    if (!organizationId || !userId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Allow either comment or asset (or both)
    if (!comment?.trim() && !asset) {
      res.status(400).json({
        success: false,
        error: 'Comment text or image is required'
      });
      return;
    }

    if (!type?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Comment type is required'
      });
      return;
    }

    // Find task
    const task = await this.taskRepository.findById(taskId);
    if (!task || task.organizationId !== organizationId) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }

    // Map comment types to allowed enum values
    const typeMapping: { [key: string]: string } = {
      'client_feedback': 'client_feedback',
      'internal_feedback': 'internal_feedback',
      'brief_rework': 'brief_rework',
      'design_rework': 'design_rework',
      'designer_feedback': 'designer_feedback',
      'rework_requested': 'rework_requested',
      'brief_submitted': 'brief_submitted',
      'onhold': 'onhold',
      'reactivate': 'reactivate',
      'need_clarity': 'need_clarity',
      'clarification': 'clarification',
      'designer_assigned': 'designer_assigned',
      'picked_up': 'picked_up',
      'draft_submitted': 'draft_submitted',
      'am_feedback': 'am_feedback',
      'feedback_response': 'feedback_response',
      'internal_approved': 'internal_approved',
      'sent_to_client': 'sent_to_client',
      'client_approved': 'client_approved',
      'internal_review': 'internal_review',
      'accept_feedback': 'accept_feedback',
      'reject_feedback': 'reject_feedback',
      'approve_rework': 'approve_rework',
      'reject_rework': 'reject_rework'
    };

    // Create comment activity with optional asset
    const newActivity: ActivityComment = {
      byWho: userId,
      comment: comment?.trim() || '', // Empty string if no comment text
      time: new Date(),
      type: (typeMapping[type] || 'internal_feedback') as any,
      asset: asset || undefined // Add optional asset field
    };

    // Determine if status should be updated based on comment type
    let statusUpdate: any = {
      activityAndComments: [...(task.activityAndComments || []), newActivity],
      updatedAt: new Date()
    };

    // Update task status based on comment type (some comments only add activity, don't change status)
    if (type === 'brief_rework') {
      statusUpdate.status = 'brief_rework';
    } else if (type === 'client_feedback') {
      statusUpdate.status = 'client_feedback';
    } else if (type === 'internal_feedback') {
      statusUpdate.status = 'internal_feedback';
    } else if (type === 'onhold') {
      statusUpdate.status = 'onhold';
    } else if (type === 'reactivate') {
      // Conditional reactivate: If task has assigned designer, go to designer_assigned, else go to brief_submitted
      if (task.assignedDesigner) {
        statusUpdate.status = 'designer_assigned'; // Designer can pick up again
      } else {
        statusUpdate.status = 'brief_submitted'; // Head/Lead can assign
      }
    } else if (type === 'brief_submitted') {
      statusUpdate.status = 'brief_submitted';
    } else if (type === 'picked_up') {
      statusUpdate.status = 'picked_up';
    } else if (type === 'draft_submitted') {
      statusUpdate.status = 'draft_submitted';
    } else if (type === 'internal_approved') {
      statusUpdate.status = 'internal_approved';
    } else if (type === 'sent_to_client') {
      statusUpdate.status = 'sent_to_client';
    } else if (type === 'client_approved') {
      statusUpdate.status = 'client_approved';
    } else if (type === 'am_feedback') {
      statusUpdate.status = 'internal_review';
    } else if (type === 'accept_feedback') {
      statusUpdate.status = 'internal_feedback';
    } else if (type === 'reject_feedback') {
      statusUpdate.status = 'internal_approved'; // Go back to previous state
    } else if (type === 'rework_requested') {
      statusUpdate.status = 'rework_requested';
    } else if (type === 'approve_rework') {
      statusUpdate.status = 'internal_feedback';
    } else if (type === 'reject_rework') {
      statusUpdate.status = 'client_approved'; // Go back to previous state
    }
    // Note: 'feedback_response', 'need_clarity' only add activity, don't change status

    // Handle workload reduction for completed tasks
    if ((type === 'client_approved' || type === 'internal_approved') && task.assignedDesigner && task.starRate) {
      try {
        await this.userRepository.updateWorkload(task.assignedDesigner, {
          $inc: { 
            ongoingTasks: -1,
            workloadScore: -task.starRate 
          },
          $pull: {
            taskDifficulties: { taskId: taskId }
          }
        });
      } catch (error) {
        console.error('Error updating designer workload on completion:', error);
      }
    }
    
    // Update task with new comment and potentially new status
    const updatedTask = await this.taskRepository.update(taskId, statusUpdate);

    // Send notifications for status change or comment
    if (this.notificationService && updatedTask) {
      try {
        const project = await this.projectRepository.findById(updatedTask.projectId);
        
        // If status changed, notify about status change
        if (statusUpdate.status && statusUpdate.status !== task.status) {
          await this.notificationService.notifyStatusChange(
            taskId,
            updatedTask.taskName,
            project?.projectName || 'Unknown Project',
            task.status,
            statusUpdate.status,
            userId,
            updatedTask.assignedDesigner || null,
            updatedTask.designLead || null,
            project?.assignedAM || null,
            organizationId
          );
        }
        
        // If comment was added (not just status change), notify about comment
        if (comment?.trim()) { // Only notify if there's actual comment text
          await this.notificationService.notifyCommentAdded(
            taskId,
            updatedTask.taskName,
            comment,
            type,
            userId,
            updatedTask.assignedDesigner || null,
            updatedTask.designLead || null,
            project?.assignedAM || null,
            organizationId
          );
        }
      } catch (error) {
        console.error('Error sending notifications:', error);
      }
    }

    res.json({
      success: true,
      data: updatedTask,
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

  // Update task status with time tracking
  updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { status, notes } = req.body;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      const task = await this.taskRepository.findById(taskId);
      
      if (!task || task.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Task not found or access denied'
        });
        return;
      }

      const validStatuses = ['brief_submitted', 'rework_requested', 'designer_assigned', 'picked_up', 'draft_submitted', 'internal_approved', 'sent_to_client', 'client_approved', 'client_feedback'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Valid status is required: ' + validStatuses.join(', ')
        });
        return;
      }

      const updatedTask = await this.taskRepository.updateStatus(taskId, status, userId, notes);

      if (!updatedTask) {
        res.status(404).json({
          success: false,
          error: 'Task not found'
        });
        return;
      }

      // Update project progress if task is in this project
      const progress = await this.taskRepository.getProjectProgress(updatedTask.projectId);

      res.json({
        success: true,
        data: {
          task: updatedTask,
          projectProgress: progress
        },
        message: 'Task status updated successfully'
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Delete task
  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      const task = await this.taskRepository.findById(taskId);
      
      if (!task || task.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Task not found or access denied'
        });
        return;
      }

      const deleted = await this.taskRepository.delete(taskId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Task not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Create sample tasks for testing
  createSampleTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID and User ID are required'
        });
        return;
      }

      // Verify project exists
      const project = await this.projectRepository.findById(projectId);
      if (!project || project.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
        return;
      }

      // Get organization users
      const users = await this.userRepository.findByOrganizationId(organizationId);
      const designUser = users.find(u => u.role?.toLowerCase().includes('design')) || users[0];
      const copyUser = users.find(u => u.role?.toLowerCase().includes('copy')) || users[1] || users[0];
      const devUser = users.find(u => u.role?.toLowerCase().includes('dev')) || users[2] || users[0];

      const sampleTasks = [
        {
          projectId,
          organizationId,
          taskName: 'Design Homepage Layout',
          description: 'Create wireframes and mockups for the homepage layout including hero section, navigation, and footer',
          brief: 'Create wireframes and mockups for the homepage layout including hero section, navigation, and footer',
          taskType: 'graphic_design' as const,
          riskLevel: 'MEDIUM' as const,
          assignedDesigner: designUser?.userId || userId,
          createdBy: userId,
          priority: 'high' as const,
          status: 'picked_up' as const,
          statusHistory: [],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          estimatedHours: 16,
          tags: ['design', 'homepage', 'ui'],
          assets: [],
          references: [],
          attachments: [],
          dependencies: [],
          isRework: false,
          activityAndComments: [],
          deliverables: [],
          completedAt: undefined
        },
        {
          projectId,
          organizationId,
          taskName: 'Write Homepage Copy',
          description: 'Create compelling copy for homepage including headlines, descriptions, and call-to-action text',
          brief: 'Create compelling copy for homepage including headlines, descriptions, and call-to-action text',
          taskType: 'copy_writing' as const,
          riskLevel: 'LOW' as const,
          assignedDesigner: copyUser?.userId || userId,
          createdBy: userId,
          priority: 'medium' as const,
          status: 'brief_submitted' as const,
          statusHistory: [],
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          estimatedHours: 8,
          tags: ['copywriting', 'homepage', 'content'],
          assets: [],
          references: [],
          attachments: [],
          dependencies: [],
          isRework: false,
          activityAndComments: [],
          deliverables: [],
          completedAt: undefined
        },
        {
          projectId,
          organizationId,
          taskName: 'Develop Responsive Layout',
          description: 'Implement responsive design for homepage across desktop, tablet, and mobile devices',
          brief: 'Implement responsive design for homepage across desktop, tablet, and mobile devices',
          taskType: 'web_design' as const,
          riskLevel: 'HIGH' as const,
          assignedDesigner: devUser?.userId || userId,
          createdBy: userId,
          priority: 'high' as const,
          status: 'brief_submitted' as const,
          statusHistory: [],
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          estimatedHours: 24,
          tags: ['development', 'responsive', 'frontend'],
          assets: [],
          references: [],
          attachments: [],
          dependencies: [],
          isRework: false,
          activityAndComments: [],
          deliverables: [],
          completedAt: undefined
        },
        {
          projectId,
          organizationId,
          taskName: 'Design Brand Guidelines',
          description: 'Create comprehensive brand guidelines including color palette, typography, and logo usage',
          brief: 'Create comprehensive brand guidelines including color palette, typography, and logo usage',
          taskType: 'graphic_design' as const,
          riskLevel: 'MEDIUM' as const,
          assignedDesigner: designUser?.userId || userId,
          createdBy: userId,
          priority: 'medium' as const,
          status: 'internal_approved' as const,
          statusHistory: [],
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          estimatedHours: 12,
          tags: ['branding', 'guidelines', 'design'],
          assets: [],
          references: [],
          attachments: [],
          dependencies: [],
          isRework: false,
          activityAndComments: [],
          deliverables: [],
          completedAt: undefined
        },
        {
          projectId,
          organizationId,
          taskName: 'Content Strategy Review',
          description: 'Review and finalize content strategy for the entire campaign including messaging and tone',
          brief: 'Review and finalize content strategy for the entire campaign including messaging and tone',
          taskType: 'strategy_thinking' as const,
          riskLevel: 'LOW' as const,
          assignedDesigner: copyUser?.userId || userId,
          createdBy: userId,
          priority: 'urgent' as const,
          status: 'client_approved' as const,
          statusHistory: [],
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (completed)
          estimatedHours: 6,
          actualHours: 5.5,
          tags: ['strategy', 'content', 'planning'],
          assets: [],
          references: [],
          attachments: [],
          dependencies: [],
          isRework: false,
          activityAndComments: [],
          deliverables: [],
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];

      const createdTasks = [];
      for (const taskData of sampleTasks) {
        const task = await this.taskRepository.create(taskData);
        createdTasks.push(task);
      }

      res.json({
        success: true,
        data: createdTasks,
        message: `${createdTasks.length} sample tasks created successfully for project ${project.projectName}`
      });
    } catch (error) {
      console.error('Error creating sample tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get designers sorted by workload for dashboard
  getDesignerWorkload = async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const { team = 'DESIGN' } = req.query;

      // Get all users in the organization
      const allUsers = await this.userRepository.findByOrganizationId(organizationId);
      
      // Filter designers by team field = "Design"
      const designers = allUsers.filter((user: any) => user.team === 'Design');
      
      // Design task types
      const designTaskTypes = ['graphic_design', 'motion_graphic_design', '3d_design', 'ai_generation', 'web_design'];
      
      // Get all active design tasks (status != "client_approved" AND taskType in design types)
      const tasks = await this.taskRepository.findByOrganizationId(organizationId);
      const activeDesignTasks = tasks.filter((task: any) => 
        task.status !== 'client_approved' && 
        designTaskTypes.includes(task.taskType)
      );
      
      // Calculate workload for each designer
      const designerWorkloads = designers
        .map((designer: any) => {
          // Count tasks assigned to this designer
          const designerTasks = activeDesignTasks.filter((task: any) => 
            task.assignedDesigner === designer.userId
          );
          
          const ongoingTasks = designerTasks.length;
          
          // Calculate workload score based on star ratings
          const workloadScore = designerTasks.reduce((sum: number, task: any) => {
            return sum + (task.starRate || 3); // Default star rate of 3 if not set
          }, 0);
          
          let capacity: 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED';
          if (workloadScore <= 5) capacity = 'LOW';
          else if (workloadScore <= 10) capacity = 'MEDIUM';
          else if (workloadScore <= 20) capacity = 'HIGH';
          else capacity = 'OVERLOADED';
          
          // Extract task difficulties
          const taskDifficulties = designerTasks.map((task: any) => ({
            taskId: task.taskId,
            starRating: task.starRate || 3
          }));

          return {
            designerId: designer.userId,
            name: designer.fullName,
            role: designer.role,
            ongoingTasks,
            workloadScore,
            capacity,
            taskDifficulties
          };
        })
        .sort((a, b) => b.workloadScore - a.workloadScore); // Highest workload first

      res.json({
        success: true,
        data: designerWorkloads
      });

    } catch (error) {
      console.error('Error fetching designer workload:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}