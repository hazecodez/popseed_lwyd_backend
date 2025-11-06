import { Role, CreateRoleRequest } from '../entities/Role';

export interface IRoleRepository {
  create(roleData: CreateRoleRequest): Promise<Role>;
  findById(roleId: string): Promise<Role | null>;
  findByName(roleName: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  findByTeam(team: string): Promise<Role[]>;
  findByLevel(level: string): Promise<Role[]>;
  update(roleId: string, updates: Partial<Role>): Promise<Role | null>;
  delete(roleId: string): Promise<boolean>;
  seedDefaultRoles(): Promise<void>;
}