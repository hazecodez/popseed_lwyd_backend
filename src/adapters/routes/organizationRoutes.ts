import { Router } from 'express';
import { OrganizationController } from '@/adapters/controllers/OrganizationController';

export function createOrganizationRoutes(
  organizationController: OrganizationController
): Router {
  const router = Router();

  // Organization routes
  router.get('/organization/:organizationId', organizationController.getOrganizationById);
  router.get('/organization/subdomain/:subdomain', organizationController.getOrganizationBySubdomain);

  return router;
}