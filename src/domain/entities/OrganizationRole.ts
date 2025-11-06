export interface OrganizationRole {
  organizationRoleId: string;
  organizationId: string;
  roleId: string; // reference to master role
  roleName: string;
  displayName: string;
  team: string;
  level: string;
  permissions: string[]; // customizable per organization
  isActive: boolean;
  isCustomized: boolean; // tracks if permissions have been modified from master
  customizedAt?: Date;
  customizedBy?: string; // adminId who made the customization
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationRoleRequest {
  organizationId: string;
  roleId: string;
  roleName: string;
  displayName: string;
  team: string;
  level: string;
  permissions: string[];
}

export interface UpdateOrganizationRolePermissionsRequest {
  permissions: string[];
  customizedBy: string;
}