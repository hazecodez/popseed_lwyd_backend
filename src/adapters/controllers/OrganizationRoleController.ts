import { Request, Response } from 'express';
import { IOrganizationRoleRepository } from '@/domain/repositories/IOrganizationRoleRepository';
import { UpdateOrganizationRolePermissionsRequest } from '@/domain/entities/OrganizationRole';

export class OrganizationRoleController {
  constructor(private organizationRoleRepository: IOrganizationRoleRepository) {}

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

      // Check if roles exist for organization, if not create them
      const rolesExist = await this.organizationRoleRepository.existsForOrganization(organizationId);
      
      if (!rolesExist) {
        console.log(`🔄 Auto-creating organization roles for: ${organizationId}`);
        await this.organizationRoleRepository.copyMasterRolesToOrganization(organizationId);
      }

      const roles = await this.organizationRoleRepository.findActiveByOrganizationId(organizationId);

      res.status(200).json({
        success: true,
        data: roles,
        message: 'Organization roles retrieved successfully'
      });
    } catch (error) {
      console.error('Get organization roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { organizationRoleId } = req.params;

      if (!organizationRoleId) {
        res.status(400).json({
          success: false,
          error: 'Organization role ID is required'
        });
        return;
      }

      const role = await this.organizationRoleRepository.findById(organizationRoleId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Organization role not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role,
        message: 'Organization role retrieved successfully'
      });
    } catch (error) {
      console.error('Get organization role by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationRoleId } = req.params;
      const { permissions, customizedBy }: UpdateOrganizationRolePermissionsRequest = req.body;

      if (!organizationRoleId) {
        res.status(400).json({
          success: false,
          error: 'Organization role ID is required'
        });
        return;
      }

      if (!permissions || !Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          error: 'Permissions array is required'
        });
        return;
      }

      if (!customizedBy) {
        res.status(400).json({
          success: false,
          error: 'CustomizedBy (admin ID) is required'
        });
        return;
      }

      const updatedRole = await this.organizationRoleRepository.updatePermissions(
        organizationRoleId,
        { permissions, customizedBy }
      );

      if (!updatedRole) {
        res.status(404).json({
          success: false,
          error: 'Organization role not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedRole,
        message: 'Role permissions updated successfully'
      });
    } catch (error) {
      console.error('Update role permissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async resetRoleToMaster(req: Request, res: Response): Promise<void> {
    try {
      const { organizationRoleId } = req.params;
      const { resetBy } = req.body;

      if (!organizationRoleId) {
        res.status(400).json({
          success: false,
          error: 'Organization role ID is required'
        });
        return;
      }

      if (!resetBy) {
        res.status(400).json({
          success: false,
          error: 'ResetBy (admin ID) is required'
        });
        return;
      }

      const resetRole = await this.organizationRoleRepository.resetToMasterRole(organizationRoleId, resetBy);

      if (!resetRole) {
        res.status(404).json({
          success: false,
          error: 'Organization role not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: resetRole,
        message: 'Role reset to master permissions successfully'
      });
    } catch (error) {
      console.error('Reset role to master error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }

  async initializeOrganizationRoles(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const roles = await this.organizationRoleRepository.copyMasterRolesToOrganization(organizationId);

      res.status(200).json({
        success: true,
        data: roles,
        message: 'Organization roles initialized successfully'
      });
    } catch (error) {
      console.error('Initialize organization roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  }
}