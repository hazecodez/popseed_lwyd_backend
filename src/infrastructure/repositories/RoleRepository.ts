import { IRoleRepository } from '@/domain/repositories/IRoleRepository';
import { Role, CreateRoleRequest, PERMISSIONS, TEAMS, LEVELS } from '@/domain/entities/Role';
import { RoleModel } from '@/infrastructure/database/models/RoleModel';

export class RoleRepository implements IRoleRepository {
  async create(roleData: CreateRoleRequest): Promise<Role> {
    try {
      const role = new RoleModel(roleData);
      const savedRole = await role.save();
      return this.mapToEntity(savedRole);
    } catch (error) {
      throw new Error(`Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(roleId: string): Promise<Role | null> {
    try {
      const role = await RoleModel.findById(roleId);
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to find role by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByName(roleName: string): Promise<Role | null> {
    try {
      const role = await RoleModel.findOne({ roleName });
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to find role by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<Role[]> {
    try {
      const roles = await RoleModel.find().sort({ team: 1, level: 1 });
      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      throw new Error(`Failed to find all roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByTeam(team: string): Promise<Role[]> {
    try {
      const roles = await RoleModel.find({ team }).sort({ level: 1 });
      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      throw new Error(`Failed to find roles by team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByLevel(level: string): Promise<Role[]> {
    try {
      const roles = await RoleModel.find({ level }).sort({ team: 1 });
      return roles.map(role => this.mapToEntity(role));
    } catch (error) {
      throw new Error(`Failed to find roles by level: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(roleId: string, updates: Partial<Role>): Promise<Role | null> {
    try {
      const role = await RoleModel.findByIdAndUpdate(
        roleId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      return role ? this.mapToEntity(role) : null;
    } catch (error) {
      throw new Error(`Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(roleId: string): Promise<boolean> {
    try {
      const result = await RoleModel.findByIdAndDelete(roleId);
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async seedDefaultRoles(): Promise<void> {
    try {
      const existingRoles = await RoleModel.countDocuments();
      if (existingRoles > 0) {
        console.log('Roles already seeded, skipping...');
        return;
      }

      console.log('Seeding default roles...');

      const defaultRoles: CreateRoleRequest[] = [
        // Administration
        {
          roleName: 'GM',
          displayName: 'General Manager',
          level: LEVELS.L1,
          team: TEAMS.ADMINISTRATION,
          permissions: [PERMISSIONS.ALL_PERMISSIONS]
        },

        // Management Team
        {
          roleName: 'AM Head',
          displayName: 'Account Manager Head',
          level: LEVELS.L2,
          team: TEAMS.MANAGEMENT_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_DESIGN_LEAD,
            PERMISSIONS.ASSIGN_TO_DESIGN_HEAD,
            PERMISSIONS.ASSIGN_TO_DESIGNER,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'AM Lead',
          displayName: 'Account Manager Lead',
          level: LEVELS.L2,
          team: TEAMS.MANAGEMENT_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_DESIGN_LEAD,
            PERMISSIONS.ASSIGN_TO_DESIGN_HEAD,
            PERMISSIONS.ASSIGN_TO_DESIGNER,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Senior AM',
          displayName: 'Senior Account Manager',
          level: LEVELS.L3,
          team: TEAMS.MANAGEMENT_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_DESIGN_LEAD,
            PERMISSIONS.ASSIGN_TO_DESIGN_HEAD,
            PERMISSIONS.ASSIGN_TO_DESIGNER,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Junior AM',
          displayName: 'Junior Account Manager',
          level: LEVELS.L3,
          team: TEAMS.MANAGEMENT_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_DESIGN_LEAD,
            PERMISSIONS.ASSIGN_TO_DESIGN_HEAD,
            PERMISSIONS.ASSIGN_TO_DESIGNER,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },

        // Creative Strategy Team
        {
          roleName: 'Head of Strategy',
          displayName: 'Head of Strategy',
          level: LEVELS.L2,
          team: TEAMS.CREATIVE_STRATEGY_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_CREATIVE_HEAD,
            PERMISSIONS.ASSIGN_TO_COPY_HEAD,
            PERMISSIONS.ASSIGN_TO_COPYWRITER,
            PERMISSIONS.ASSIGN_TO_STRATEGIST,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Creative Head',
          displayName: 'Creative Head',
          level: LEVELS.L2,
          team: TEAMS.CREATIVE_STRATEGY_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_STRATEGIST,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Copy Writer Head',
          displayName: 'Copy Writer Head',
          level: LEVELS.L2,
          team: TEAMS.CREATIVE_STRATEGY_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.ASSIGN_TO_COPYWRITER,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Creative Strategist',
          displayName: 'Creative Strategist',
          level: LEVELS.L3,
          team: TEAMS.CREATIVE_STRATEGY_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Senior Copywriter',
          displayName: 'Senior Copywriter',
          level: LEVELS.L3,
          team: TEAMS.CREATIVE_STRATEGY_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },
        {
          roleName: 'Junior Copywriter',
          displayName: 'Junior Copywriter',
          level: LEVELS.L3,
          team: TEAMS.CREATIVE_STRATEGY_TEAM,
          permissions: [
            PERMISSIONS.CREATE_PROJECT,
            PERMISSIONS.SEND_TO_CLIENT,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.CREATE_TASK
          ]
        },

        // Design Team
        {
          roleName: 'Design Head',
          displayName: 'Design Head',
          level: LEVELS.L2,
          team: TEAMS.DESIGN_TEAM,
          permissions: [
            PERMISSIONS.ASSIGN_TO_DESIGN_LEAD,
            PERMISSIONS.ASSIGN_TO_DESIGNER,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.SEND_TO_AM
          ]
        },
        {
          roleName: 'Design Lead',
          displayName: 'Design Lead',
          level: LEVELS.L2,
          team: TEAMS.DESIGN_TEAM,
          permissions: [
            PERMISSIONS.ASSIGN_TO_DESIGNER,
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.SEND_TO_AM
          ]
        },
        {
          roleName: 'Senior Designer',
          displayName: 'Senior Designer',
          level: LEVELS.L3,
          team: TEAMS.DESIGN_TEAM,
          permissions: [
            PERMISSIONS.SEND_TO_DESIGNER_LEAD,
            PERMISSIONS.SEND_TO_AM
          ]
        },
        {
          roleName: 'Junior Designer',
          displayName: 'Junior Designer',
          level: LEVELS.L3,
          team: TEAMS.DESIGN_TEAM,
          permissions: [
            PERMISSIONS.SEND_TO_DESIGNER_LEAD,
            PERMISSIONS.SEND_TO_AM
          ]
        },

        // Finance Team
        {
          roleName: 'Accounts Head',
          displayName: 'Accounts Head',
          level: LEVELS.L2,
          team: TEAMS.FINANCE_TEAM,
          permissions: [
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.RAISE_PO,
            PERMISSIONS.RAISE_INVOICE
          ]
        },
        {
          roleName: 'Senior Accountant',
          displayName: 'Senior Accountant',
          level: LEVELS.L3,
          team: TEAMS.FINANCE_TEAM,
          permissions: [
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.SEND_TO_ACCOUNTS_HEAD,
            PERMISSIONS.RAISE_PO,
            PERMISSIONS.RAISE_INVOICE
          ]
        },
        {
          roleName: 'Junior Accountant',
          displayName: 'Junior Accountant',
          level: LEVELS.L3,
          team: TEAMS.FINANCE_TEAM,
          permissions: [
            PERMISSIONS.SEND_TO_ADMINS,
            PERMISSIONS.SEND_TO_ACCOUNTS_HEAD,
            PERMISSIONS.RAISE_PO,
            PERMISSIONS.RAISE_INVOICE
          ]
        }
      ];

      // Insert all roles
      for (const roleData of defaultRoles) {
        await this.create(roleData);
      }

      console.log(`✅ Successfully seeded ${defaultRoles.length} default roles`);
    } catch (error) {
      console.error('❌ Error seeding default roles:', error);
      throw error;
    }
  }

  private mapToEntity(roleDoc: any): Role {
    return {
      roleId: roleDoc._id.toString(),
      roleName: roleDoc.roleName,
      displayName: roleDoc.displayName,
      level: roleDoc.level,
      team: roleDoc.team,
      permissions: roleDoc.permissions,
      createdAt: roleDoc.createdAt,
      updatedAt: roleDoc.updatedAt
    };
  }
}