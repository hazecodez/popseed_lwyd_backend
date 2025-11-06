import { OrganizationRole, CreateOrganizationRoleRequest, UpdateOrganizationRolePermissionsRequest } from '../entities/OrganizationRole';

export interface IOrganizationRoleRepository {
  create(roleData: CreateOrganizationRoleRequest): Promise<OrganizationRole>;
  findById(organizationRoleId: string): Promise<OrganizationRole | null>;
  findByOrganizationId(organizationId: string): Promise<OrganizationRole[]>;
  findByOrganizationAndRoleId(organizationId: string, roleId: string): Promise<OrganizationRole | null>;
  update(organizationRoleId: string, updates: Partial<OrganizationRole>): Promise<OrganizationRole | null>;
  updatePermissions(organizationRoleId: string, updates: UpdateOrganizationRolePermissionsRequest): Promise<OrganizationRole | null>;
  delete(organizationRoleId: string): Promise<boolean>;
  copyMasterRolesToOrganization(organizationId: string): Promise<OrganizationRole[]>;
  resetToMasterRole(organizationRoleId: string, resetBy: string): Promise<OrganizationRole | null>;
  findActiveByOrganizationId(organizationId: string): Promise<OrganizationRole[]>;
  existsForOrganization(organizationId: string): Promise<boolean>;
}