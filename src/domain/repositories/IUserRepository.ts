import { User, CreateUserRequest } from '../entities/User';

export interface IUserRepository {
  create(userData: CreateUserRequest): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, organizationId: string): Promise<User | null>;
  findByOrganizationId(organizationId: string): Promise<User[]>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  updateWorkload(id: string, updates: any): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  exists(email: string, organizationId: string): Promise<boolean>;
}