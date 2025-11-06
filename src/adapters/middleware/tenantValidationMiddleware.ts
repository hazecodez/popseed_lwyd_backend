import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@/infrastructure/services/JwtService';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { ApiResponse } from '@/shared/types';

interface TenantValidatedRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
    organizationId: string;
    role: string;
  };
  organization?: {
    organizationId: string;
    subdomain: string;
    name: string;
  };
}

export function createTenantValidationMiddleware(
  jwtService: JwtService,
  organizationRepository: IOrganizationRepository
) {
  return async (req: TenantValidatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract tenant subdomain from request
      // This could come from subdomain, headers, or request parameters
      let requestedSubdomain: string | null = null;

      // Check for subdomain in various places
      const tenantHeader = req.headers['x-tenant-subdomain'] as string;
      const subdomainParam = req.params.subdomain;
      const hostHeader = req.headers.host;

      if (tenantHeader) {
        requestedSubdomain = tenantHeader;
      } else if (subdomainParam) {
        requestedSubdomain = subdomainParam;
      } else if (hostHeader && hostHeader.includes('.')) {
        // Extract subdomain from host header (for production)
        const parts = hostHeader.split('.');
        if (parts.length > 2) {
          requestedSubdomain = parts[0];
        }
      }

      // If no tenant context found, proceed without tenant validation
      if (!requestedSubdomain) {
        next();
        return;
      }

      // Get admin from previous auth middleware
      const admin = req.admin;
      if (!admin || !admin.organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Admin context not found'
        };
        res.status(401).json(response);
        return;
      }

      // Get admin's organization details
      const organization = await organizationRepository.findById(admin.organizationId);
      if (!organization) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found'
        };
        res.status(403).json(response);
        return;
      }

      // Validate that admin belongs to the requested tenant
      if (organization.subdomain !== requestedSubdomain) {
        console.error('Tenant access denied:', {
          adminId: admin.adminId,
          adminOrgSubdomain: organization.subdomain,
          requestedSubdomain: requestedSubdomain
        });

        const response: ApiResponse = {
          success: false,
          error: 'Access denied: You do not have permission to access this organization'
        };
        res.status(403).json(response);
        return;
      }

      // Add organization context to request
      req.organization = {
        organizationId: organization.organizationId,
        subdomain: organization.subdomain,
        name: organization.name
      };

      console.log('✅ Tenant access validated:', {
        adminId: admin.adminId,
        subdomain: organization.subdomain
      });

      next();
    } catch (error) {
      console.error('Tenant validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Tenant validation failed'
      };
      res.status(500).json(response);
    }
  };
}