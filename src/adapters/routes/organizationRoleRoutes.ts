import { Router } from 'express';
import { OrganizationRoleController } from '@/adapters/controllers/OrganizationRoleController';

export function createOrganizationRoleRoutes(organizationRoleController: OrganizationRoleController): Router {
  const router = Router();

// Get organization roles (auto-create if needed)
router.get('/organization/:organizationId/roles', (req, res) => 
  organizationRoleController.getOrganizationRoles(req, res)
);

// Get specific organization role by ID
router.get('/role/:organizationRoleId', (req, res) => 
  organizationRoleController.getRoleById(req, res)
);

// Update role permissions
router.put('/role/:organizationRoleId/permissions', (req, res) => 
  organizationRoleController.updateRolePermissions(req, res)
);

// Reset role to master permissions
router.put('/role/:organizationRoleId/reset', (req, res) => 
  organizationRoleController.resetRoleToMaster(req, res)
);

  // Initialize organization roles (manual trigger)
  router.post('/organization/:organizationId/roles/initialize', (req, res) => 
    organizationRoleController.initializeOrganizationRoles(req, res)
  );

  return router;
}