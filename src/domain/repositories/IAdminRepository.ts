import { Admin, CreateAdminRequest, UpdateAdminRequest } from '../entities/Admin';

export interface IAdminRepository {
  create(adminData: CreateAdminRequest): Promise<Admin>;
  findById(adminId: string): Promise<Admin | null>;
  findByEmail(email: string): Promise<Admin | null>;
  findByEmailAndOrganization(email: string, organizationId: string): Promise<Admin | null>;
  findByOrganizationId(organizationId: string): Promise<Admin[]>;
  update(adminId: string, updates: UpdateAdminRequest): Promise<Admin | null>;
  updateLastLogin(adminId: string): Promise<boolean>;
  delete(adminId: string): Promise<boolean>;
  validateCredentials(email: string, password: string, organizationId?: string): Promise<Admin | null>;
}