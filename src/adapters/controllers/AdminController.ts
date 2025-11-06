import { Request, Response } from 'express';
import { AdminLoginUseCase } from '@/usecases/AdminLoginUseCase';
import { ApiResponse } from '@/shared/types';

export class AdminController {
  constructor(
    private adminLoginUseCase: AdminLoginUseCase
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, organizationId } = req.body;

      if (!email || !password) {
        const response: ApiResponse = {
          success: false,
          error: 'Email and password are required'
        };
        res.status(400).json(response);
        return;
      }

      console.log('🔐 Admin login attempt:', { email, organizationId: organizationId || 'auto-detect' });

      const result = await this.adminLoginUseCase.execute({
        email,
        password,
        organizationId
      });

      const response: ApiResponse = {
        success: true,
        data: {
          admin: {
            adminId: result.adminId,
            email: result.email,
            name: result.name,
            role: result.role,
            organizationId: result.organizationId
          },
          token: result.token
        },
        message: 'Login successful'
      };

      console.log(`✅ Admin login successful: ${result.email} (${result.role})`);
      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Admin login error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
      res.status(401).json(response);
    }
  }

  logout = async (req: Request, res: Response): Promise<void> => {
    // For JWT, logout is handled client-side by removing the token
    // In production, you might want to implement token blacklisting
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };
    res.status(200).json(response);
  }

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // This will be populated by auth middleware
      const admin = (req as any).admin;
      const organization = (req as any).organization;
      
      const response: ApiResponse = {
        success: true,
        data: {
          admin,
          organization
        },
        message: 'Profile retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to get profile'
      };
      res.status(500).json(response);
    }
  }

  validateTenantAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subdomain } = req.body;
      const admin = (req as any).admin;
      
      if (!subdomain) {
        const response: ApiResponse = {
          success: false,
          error: 'Subdomain is required'
        };
        res.status(400).json(response);
        return;
      }

      if (!admin) {
        const response: ApiResponse = {
          success: false,
          error: 'Admin context not found'
        };
        res.status(401).json(response);
        return;
      }

      // This validation will be handled by tenant validation middleware
      // If we reach here, access is granted
      const response: ApiResponse = {
        success: true,
        data: {
          hasAccess: true,
          adminOrganization: (req as any).organization
        },
        message: 'Tenant access validated'
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: 'Tenant validation failed'
      };
      res.status(500).json(response);
    }
  }
}