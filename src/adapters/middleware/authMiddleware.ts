import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@/infrastructure/services/JwtService';
import { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import { ApiResponse } from '@/shared/types';

interface AuthenticatedRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

export function createAuthMiddleware(
  jwtService: JwtService, 
  adminRepository: IAdminRepository
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = jwtService.extractTokenFromHeader(authHeader);

      if (!token) {
        const response: ApiResponse = {
          success: false,
          error: 'Access token is required'
        };
        res.status(401).json(response);
        return;
      }

      // Verify and decode token
      const payload = jwtService.verifyToken(token);

      // Verify admin still exists and is active
      const admin = await adminRepository.findById(payload.adminId);
      if (!admin || !admin.isActive) {
        const response: ApiResponse = {
          success: false,
          error: 'Admin account not found or inactive'
        };
        res.status(401).json(response);
        return;
      }

      // Add admin info to request
      req.admin = {
        adminId: admin.adminId,
        email: admin.email,
        organizationId: admin.organizationId,
        role: admin.role
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
      res.status(401).json(response);
    }
  };
}