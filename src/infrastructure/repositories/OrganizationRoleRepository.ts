import { IOrganizationRoleRepository } from '@/domain/repositories/IOrganizationRoleRepository';
import { OrganizationRole, CreateOrganizationRoleRequest, UpdateOrganizationRolePermissionsRequest } from '@/domain/entities/OrganizationRole';
import { IRoleRepository } from '@/domain/repositories/IRoleRepository';
import { OrganizationRoleModel } from '@/infrastructure/database/models/OrganizationRoleModel';

export class OrganizationRoleRepository implements IOrganizationRoleRepository {
  constructor(private roleRepository: IRoleRepository) {}

  async create(roleData: CreateOrganizationRoleRequest): Promise<OrganizationRole> {
    try {
      const organizationRole = new OrganizationRoleModel(roleData);
      const savedRole = await organizationRole.save();
      return this.mapToEntity(savedRole);
    } catch (error) {
      throw new Error(`Failed to create organization role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(organizationRoleId: string): Promise<OrganizationRole | null> {
    try {
      const role = await OrganizationRoleModel.findById(organizationRoleId);
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to find organization role by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOrganizationId(organizationId: string): Promise<OrganizationRole[]> {
    try {
      const roles = await OrganizationRoleModel.find({ organizationId }).sort({ team: 1, level: 1 });
      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      throw new Error(`Failed to find roles by organization ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOrganizationAndRoleId(organizationId: string, roleId: string): Promise<OrganizationRole | null> {
    try {
      const role = await OrganizationRoleModel.findOne({ organizationId, roleId });
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to find organization role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findActiveByOrganizationId(organizationId: string): Promise<OrganizationRole[]> {
    try {
      const roles = await OrganizationRoleModel.find({ organizationId, isActive: true }).sort({ team: 1, level: 1 });
      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      throw new Error(`Failed to find active roles by organization ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(organizationRoleId: string, updates: Partial<OrganizationRole>): Promise<OrganizationRole | null> {
    try {
      const role = await OrganizationRoleModel.findByIdAndUpdate(
        organizationRoleId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to update organization role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePermissions(organizationRoleId: string, updates: UpdateOrganizationRolePermissionsRequest): Promise<OrganizationRole | null> {
    try {
      // First get the organization role to find the master role
      const orgRole = await this.findById(organizationRoleId);
      if (!orgRole) {
        throw new Error('Organization role not found');
      }

      // Get the master role to validate permissions
      const masterRole = await this.roleRepository.findById(orgRole.roleId);
      if (!masterRole) {
        throw new Error('Master role not found');
      }

      // Validate permissions: ensure all requested permissions exist in master role
      const masterPermissions = masterRole.permissions;
      const invalidPermissions = updates.permissions.filter(permission => !masterPermissions.includes(permission));
      
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions detected. The following permissions are not allowed for this role: ${invalidPermissions.join(', ')}. Allowed permissions: ${masterPermissions.join(', ')}`);
      }

      // Validate permissions are unique (no duplicates)
      const uniquePermissions = [...new Set(updates.permissions)];
      if (uniquePermissions.length !== updates.permissions.length) {
        throw new Error('Duplicate permissions detected in the request');
      }

      const role = await OrganizationRoleModel.findByIdAndUpdate(
        organizationRoleId,
        { 
          permissions: uniquePermissions, // Use deduplicated permissions
          isCustomized: true,
          customizedAt: new Date(),
          customizedBy: updates.customizedBy,
          updatedAt: new Date()
        },
        { new: true }
      );
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to update organization role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(organizationRoleId: string): Promise<boolean> {
    try {
      const result = await OrganizationRoleModel.findByIdAndDelete(organizationRoleId);
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete organization role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async existsForOrganization(organizationId: string): Promise<boolean> {
    try {
      const count = await OrganizationRoleModel.countDocuments({ organizationId });
      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check organization roles existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async copyMasterRolesToOrganization(organizationId: string): Promise<OrganizationRole[]> {
    try {
      console.log(`🔄 Copying master roles to organization: ${organizationId}`);
      
      // Check if roles already exist for this organization
      const existingRoles = await this.existsForOrganization(organizationId);
      if (existingRoles) {
        console.log(`ℹ️ Roles already exist for organization: ${organizationId}`);
        return await this.findByOrganizationId(organizationId);
      }

      // Get all master roles
      const masterRoles = await this.roleRepository.findAll();
      console.log(`📋 Found ${masterRoles.length} master roles to copy`);

      const createdRoles: OrganizationRole[] = [];

      for (const masterRole of masterRoles) {
        const organizationRoleData: CreateOrganizationRoleRequest = {
          organizationId,
          roleId: masterRole.roleId,
          roleName: masterRole.roleName,
          displayName: masterRole.displayName,
          team: masterRole.team,
          level: masterRole.level,
          permissions: [...masterRole.permissions] // Copy permissions array
        };

        const createdRole = await this.create(organizationRoleData);
        createdRoles.push(createdRole);
        console.log(`✅ Created organization role: ${masterRole.displayName} for org: ${organizationId}`);
      }

      console.log(`🎉 Successfully copied ${createdRoles.length} roles to organization: ${organizationId}`);
      return createdRoles;
    } catch (error) {
      console.error(`❌ Error copying master roles to organization: ${error}`);
      throw new Error(`Failed to copy master roles to organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resetToMasterRole(organizationRoleId: string, resetBy: string): Promise<OrganizationRole | null> {
    try {
      // First get the organization role to find the master role
      const orgRole = await this.findById(organizationRoleId);
      if (!orgRole) {
        throw new Error('Organization role not found');
      }

      // Get the master role
      const masterRole = await this.roleRepository.findById(orgRole.roleId);
      if (!masterRole) {
        throw new Error('Master role not found');
      }

      // Reset the organization role to match the master role
      const updatedRole = await OrganizationRoleModel.findByIdAndUpdate(
        organizationRoleId,
        {
          permissions: [...masterRole.permissions],
          isCustomized: false,
          customizedAt: new Date(),
          customizedBy: resetBy,
          updatedAt: new Date()
        },
        { new: true }
      );

      return updatedRole ? this.mapToEntity(updatedRole) : null;
    } catch (error) {
      throw new Error(`Failed to reset organization role to master: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(roleDoc: any): OrganizationRole {
    return {
      organizationRoleId: roleDoc._id.toString(),
      organizationId: roleDoc.organizationId,
      roleId: roleDoc.roleId,
      roleName: roleDoc.roleName,
      displayName: roleDoc.displayName,
      team: roleDoc.team,
      level: roleDoc.level,
      permissions: roleDoc.permissions,
      isActive: roleDoc.isActive,
      isCustomized: roleDoc.isCustomized,
      customizedAt: roleDoc.customizedAt,
      customizedBy: roleDoc.customizedBy,
      createdAt: roleDoc.createdAt,
      updatedAt: roleDoc.updatedAt
    };
  }
}