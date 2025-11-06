import { Router } from 'express';
import { AdminController } from '@/adapters/controllers/AdminController';
import { createAuthMiddleware } from '@/adapters/middleware/authMiddleware';
import { createTenantValidationMiddleware } from '@/adapters/middleware/tenantValidationMiddleware';
import { JwtService } from '@/infrastructure/services/JwtService';
import { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';

export function createAdminRoutes(
  adminController: AdminController,
  jwtService: JwtService,
  adminRepository: IAdminRepository,
  organizationRepository: IOrganizationRepository
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(jwtService, adminRepository);
  const tenantValidationMiddleware = createTenantValidationMiddleware(jwtService, organizationRepository);

  // Public admin routes (no auth required)
  router.post('/admin/login', adminController.login);
  router.post('/admin/logout', adminController.logout);

  // Protected admin routes (auth required)
  router.get('/admin/profile', authMiddleware, adminController.getProfile);

  // Tenant-protected routes (auth + tenant validation required)
  router.post('/admin/validate-tenant', authMiddleware, tenantValidationMiddleware, adminController.validateTenantAccess);

  return router;
}