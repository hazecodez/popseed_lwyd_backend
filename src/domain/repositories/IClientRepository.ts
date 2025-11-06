import { Client } from '../entities/Client';

export interface ClientFilters {
  clientType?: 'retainer' | 'standard';
  isActive?: boolean;
  search?: string;
}

export interface IClientRepository {
  create(client: Omit<Client, 'clientId' | 'createdAt' | 'updatedAt'>): Promise<Client>;
  findById(clientId: string): Promise<Client | null>;
  findByOrganizationId(organizationId: string, filters?: ClientFilters): Promise<Client[]>;
  update(clientId: string, updates: Partial<Client>): Promise<Client | null>;
  delete(clientId: string): Promise<boolean>;
  findByName(organizationId: string, clientName: string): Promise<Client | null>;
  getActiveClients(organizationId: string): Promise<Client[]>;
}