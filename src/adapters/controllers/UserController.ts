import { Request, Response } from 'express';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IRoleRepository } from '@/domain/repositories/IRoleRepository';
import { EmployeeSignupRequest, UserRole, UserStatus, User } from '@/domain/entities/User';

export class UserController {
  constructor(
    private userRepository: IUserRepository,
    private organizationRepository: IOrganizationRepository,
    private roleRepository: IRoleRepository
  ) {}

  async employeeSignup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, confirmPassword, fullName, organizationId }: EmployeeSignupRequest = req.body;

      // Validation
      if (!email || !password || !confirmPassword || !fullName || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'All fields are required'
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
        return;
      }

      // Password validation
      if (password.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long'
        });
        return;
      }

      // Password confirmation
      if (password !== confirmPassword) {
        res.status(400).json({
          success: false,
          error: 'Passwords do not match'
        });
        return;
      }

      // Full name validation
      if (fullName.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Full name must be at least 2 characters long'
        });
        return;
      }

      // Check if organization exists
      const organization = await this.organizationRepository.findById(organizationId);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email, organizationId);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'An account with this email already exists in this organization'
        });
        return;
      }

      // Create user with default values
      const userData = {
        email: email.toLowerCase().trim(),
        password,
        fullName: fullName.trim(),
        organizationId,
        role: UserRole.NOT_DEFINED,
        status: UserStatus.NOT_APPROVED
      };

      const newUser = await this.userRepository.create(userData);

      res.status(201).json({
        success: true,
        message: 'Account created successfully! Please wait for admin approval.',
        data: {
          userId: newUser.userId,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          status: newUser.status,
          organizationId: newUser.organizationId,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      console.error('Employee signup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async getOrganizationUsers(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { status } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      let users = await this.userRepository.findByOrganizationId(organizationId);

      // Filter by status if provided
      if (status) {
        users = users.filter(user => user.status === status);
      }

      res.status(200).json({
        success: true,
        data: users.map(user => ({
          userId: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          invitedBy: user.invitedBy,
          approvedBy: user.approvedBy,
          approvedAt: user.approvedAt
        }))
      });
    } catch (error) {
      console.error('Get organization users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async approveUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { roleId, adminId } = req.body;

      if (!userId || !roleId || !adminId) {
        res.status(400).json({
          success: false,
          error: 'User ID, Role ID, and Admin ID are required'
        });
        return;
      }

      // Get the role details
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found'
        });
        return;
      }

      // Get the user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      if (user.status !== UserStatus.NOT_APPROVED) {
        res.status(400).json({
          success: false,
          error: 'User is not in pending approval status'
        });
        return;
      }

      // Determine team based on role name
      const team = this.determineTeamFromRole(role.roleName);

      // Update user with approved status, role, and team
      const updatedUser = await this.userRepository.update(userId, {
        status: UserStatus.APPROVED,
        role: role.roleName,
        team: team,
        approvedBy: adminId,
        approvedAt: new Date()
      });

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to update user'
        });
        return;
      }

      // TODO: Send approval email to user
      // This will be implemented with email service integration

      res.status(200).json({
        success: true,
        message: 'User approved successfully',
        data: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          team: updatedUser.team,
          status: updatedUser.status,
          approvedBy: updatedUser.approvedBy,
          approvedAt: updatedUser.approvedAt
        }
      });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  // Helper method to determine team from role name
  private determineTeamFromRole(roleName: string): string {
    const roleNameLower = roleName.toLowerCase();
    
    // Design Team
    if (roleNameLower.includes('design')) {
      return 'Design';
    }
    
    // Account Management Team
    if (roleNameLower.includes('am') || roleNameLower.includes('account')) {
      return 'AM';
    }
    
    // Accounts/Finance Team
    if (roleNameLower.includes('accountant') || roleNameLower.includes('finance')) {
      return 'Accounts';
    }
    
    // Creative Strategy Team
    if (roleNameLower.includes('creative') || roleNameLower.includes('strategy') || roleNameLower.includes('copy')) {
      return 'Creative';
    }
    
    // Management Team
    if (roleNameLower.includes('gm') || roleNameLower.includes('general manager') || roleNameLower.includes('ceo')) {
      return 'Management';
    }
    
    // Default to Management for unrecognized roles
    return 'Management';
  }

  async rejectUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { adminId } = req.body;

      if (!userId || !adminId) {
        res.status(400).json({
          success: false,
          error: 'User ID and Admin ID are required'
        });
        return;
      }

      // Get the user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      if (user.status !== UserStatus.NOT_APPROVED) {
        res.status(400).json({
          success: false,
          error: 'User is not in pending approval status'
        });
        return;
      }

      // Update user with rejected status
      const updatedUser = await this.userRepository.update(userId, {
        status: UserStatus.REJECTED,
        approvedBy: adminId,
        approvedAt: new Date()
      });

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to update user'
        });
        return;
      }

      // TODO: Send rejection email to user
      // This will be implemented with email service integration

      res.status(200).json({
        success: true,
        message: 'User rejected successfully',
        data: {
          userId: updatedUser.userId,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          status: updatedUser.status
        }
      });
    } catch (error) {
      console.error('Reject user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async getAllRoles(req: Request, res: Response): Promise<void> {
    try {
      // For backwards compatibility, return master roles
      // In Phase 3, this will be updated to use organization-specific roles
      const roles = await this.roleRepository.findAll();

      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async getOrganizationRoles(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      // This will be used by frontend for role selection in user approvals
      const roles = await this.roleRepository.findAll(); // Will be updated to organization roles in Phase 3

      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Get organization roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async userLogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, organizationId } = req.body;

      if (!email || !password || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'Email, password, and organization ID are required'
        });
        return;
      }

      // Find user by email and organization
      const user = await this.userRepository.findByEmail(email, organizationId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Check if user is approved
      if (user.status !== UserStatus.APPROVED) {
        let message = 'Your account is not approved yet. Please contact your administrator.';
        if (user.status === UserStatus.REJECTED) {
          message = 'Your account has been rejected. Please contact your administrator.';
        }
        
        res.status(403).json({
          success: false,
          error: message,
          userStatus: user.status
        });
        return;
      }

      // Verify password (assuming password is already hashed)
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          userId: user.userId,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      );

      // Update last login time
      await this.userRepository.update(user.userId, {
        lastLoginAt: new Date()
      });

      // Get organization details
      const organization = await this.organizationRepository.findById(organizationId);

      // Get role details
      const roleDetails = await this.roleRepository.findByName(user.role);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            organizationId: user.organizationId,
            lastLoginAt: user.lastLoginAt
          },
          organization: organization ? {
            organizationId: organization.organizationId,
            name: organization.name,
            subdomain: organization.subdomain
          } : null,
          roleDetails: roleDetails ? {
            roleName: roleDetails.roleName,
            displayName: roleDetails.displayName,
            team: roleDetails.team,
            level: roleDetails.level,
            permissions: roleDetails.permissions
          } : null
        }
      });
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      // This will be called by authenticated users to get their profile
      // The user info comes from JWT middleware
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      const organization = await this.organizationRepository.findById(user.organizationId);
      const roleDetails = await this.roleRepository.findByName(user.role);

      res.status(200).json({
        success: true,
        data: {
          user: {
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            organizationId: user.organizationId,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          },
          organization: organization ? {
            organizationId: organization.organizationId,
            name: organization.name,
            subdomain: organization.subdomain
          } : null,
          roleDetails: roleDetails ? {
            roleName: roleDetails.roleName,
            displayName: roleDetails.displayName,
            team: roleDetails.team,
            level: roleDetails.level,
            permissions: roleDetails.permissions
          } : null
        }
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
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

      // Get all users in organization
      const allUsers = await this.userRepository.findByOrganizationId(organizationId);
      
      // Count AM team members (where team="AM")
      const amCount = allUsers.filter((u: any) => u.team === 'AM').length;

      // Get projects and tasks based on role
      const ProjectModel = require('@/infrastructure/database/models/ProjectModel').ProjectModel;
      const TaskModel = require('@/infrastructure/database/models/TaskModel').TaskModel;

      // Get all AM user IDs (users with team="AM")
      const amUserIds = allUsers
        .filter((u: any) => u.team === 'AM')
        .map((u: any) => u.userId);

      // Count ongoing projects (status = "ACTIVE" AND createdBy is an AM)
      const ongoingProjects = await ProjectModel.countDocuments({
        organizationId,
        status: 'ACTIVE',
        createdBy: { $in: amUserIds }
      });

      // Count ongoing tasks (status != "client_approved" AND createdBy is an AM)
      const ongoingTasks = await TaskModel.countDocuments({
        organizationId,
        status: { $ne: 'client_approved' },
        createdBy: { $in: amUserIds }
      });

      // Get project list for dashboard table (latest active projects created by AMs)
      const projects = await ProjectModel.find({
        organizationId,
        status: 'ACTIVE',
        createdBy: { $in: amUserIds }
      })
        .sort({ createdAt: -1 })
        .limit(10);

      res.json({
        success: true,
        data: {
          amCount,
          ongoingProjects,
          ongoingTasks,
          projects
        }
      });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
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

      // Get all users in organization
      const allUsers = await this.userRepository.findByOrganizationId(organizationId);
      
      // Filter AM team members based on role
      let teamMembers;
      if (role === 'AM Head' || role === 'AM Lead') {
        // AM Head and AM Lead see ALL AM team members
        teamMembers = allUsers.filter((u: any) => u.team === 'AM');
      } else {
        // Regular AM sees only themselves
        teamMembers = allUsers.filter((u: any) => u.userId === userId);
      }

      // Get projects and tasks for calculating workload and overdue tasks
      const ProjectModel = require('@/infrastructure/database/models/ProjectModel').ProjectModel;
      const TaskModel = require('@/infrastructure/database/models/TaskModel').TaskModel;
      const now = new Date();
      
      const enrichedTeamMembers = await Promise.all(teamMembers.map(async (u: User) => {
        // Get projects where this AM is assignedAM
        const amProjects = await ProjectModel.find({
          organizationId,
          assignedAM: u.userId
        });
        
        const projectIds = amProjects.map((p: any) => p.projectId);
        
        // Get ongoing tasks from these projects (status != "client_approved")
        const ongoingTasks = await TaskModel.find({
          organizationId,
          projectId: { $in: projectIds },
          status: { $ne: 'client_approved' }
        });
        
        // Calculate overdue tasks (deadline exceeded but not completed)
        const overdueTasks = ongoingTasks.filter((task: any) => {
          if (!task.dueDate) return false;
          
          const dueDate = new Date(task.dueDate);
          if (task.dueTime) {
            const [hours, minutes] = task.dueTime.split(':');
            dueDate.setHours(parseInt(hours), parseInt(minutes));
          }
          
          return dueDate < now;
        }).length;
        
        return {
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          status: u.status,
          team: u.team,
          workloadScore: ongoingTasks.length, // For AMs, workload is just count of ongoing tasks
          overdueTasks
        };
      }));

      res.json({
        success: true,
        data: enrichedTeamMembers
      });
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getDesignTeamMembers(req: Request, res: Response): Promise<void> {
    try {
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

      // Get all users in organization
      const allUsers = await this.userRepository.findByOrganizationId(organizationId);
      
      // Filter Design team members (team = "Design")
      const teamMembers = allUsers.filter((u: any) => u.team === 'Design');

      // Get tasks for calculating workload and overdue tasks
      const TaskModel = require('@/infrastructure/database/models/TaskModel').TaskModel;
      const now = new Date();
      
      // Design task types
      const designTaskTypes = ['graphic_design', 'motion_graphic_design', '3d_design', 'ai_generation', 'web_design'];
      
      const enrichedTeamMembers = await Promise.all(teamMembers.map(async (u: User) => {
        // Get active design tasks for this user (status != "client_approved" AND design task types)
        const activeTasks = await TaskModel.find({
          organizationId,
          assignedDesigner: u.userId,
          status: { $nin: ['draft_submitted', 'internal_approved', 'sent_to_client', 'client_approved'] },  // ← Match frontend
          taskType: { $in: designTaskTypes }
        });
        
        // Calculate workload score based on star ratings
        const workloadScore = activeTasks.reduce((sum: number, task: any) => {
          return sum + (task.starRate || 3);
        }, 0);
        
        // Calculate overdue tasks
        const overdueTasks = activeTasks.filter((task: any) => {
          if (!task.dueDate) return false;
          
          const dueDate = new Date(task.dueDate);
          if (task.dueTime) {
            const [hours, minutes] = task.dueTime.split(':');
            dueDate.setHours(parseInt(hours), parseInt(minutes));
          }
          
          return dueDate < now;
        }).length;
        
        return {
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          status: u.status,
          team: u.team,
          workloadScore,
          overdueTasks
        };
      }));

      res.json({
        success: true,
        data: enrichedTeamMembers
      });
    } catch (error) {
      console.error('Get design team members error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}