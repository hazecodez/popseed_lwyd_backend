import { IClientRepository, ClientFilters } from '../../domain/repositories/IClientRepository';
import { Client } from '../../domain/entities/Client';
import { ClientModel, IClientDocument } from '../database/models/ClientModel';
import { v4 as uuidv4 } from 'uuid';

export class ClientRepository implements IClientRepository {
  async create(clientData: Omit<Client, 'clientId' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const clientId = uuidv4();
    
    const clientDoc = new ClientModel({
      ...clientData,
      clientId
    });

    const savedClient = await clientDoc.save();
    return this.mapToEntity(savedClient);
  }

  async findById(clientId: string): Promise<Client | null> {
    const client = await ClientModel.findOne({ clientId });
    return client ? this.mapToEntity(client) : null;
  }

  async findByOrganizationId(organizationId: string, filters?: ClientFilters): Promise<Client[]> {
    const query: any = { organizationId };
    
    this.applyFilters(query, filters);
    
    const clients = await ClientModel.find(query).sort({ createdAt: -1 });
    return clients.map(client => this.mapToEntity(client));
  }

  async update(clientId: string, updates: Partial<Client>): Promise<Client | null> {
    // Remove fields that shouldn't be directly updated
    const { clientId: _, createdAt, updatedAt, ...updateData } = updates;

    const updatedClient = await ClientModel.findOneAndUpdate(
      { clientId },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    return updatedClient ? this.mapToEntity(updatedClient) : null;
  }

  async delete(clientId: string): Promise<boolean> {
    const result = await ClientModel.deleteOne({ clientId });
    return result.deletedCount === 1;
  }

  async findByName(organizationId: string, clientName: string): Promise<Client | null> {
    const client = await ClientModel.findOne({ 
      organizationId, 
      clientName: { $regex: new RegExp(`^${clientName}$`, 'i') }
    });
    return client ? this.mapToEntity(client) : null;
  }

  async getActiveClients(organizationId: string): Promise<Client[]> {
    const clients = await ClientModel.find({ 
      organizationId, 
      isActive: true 
    }).sort({ clientName: 1 });
    
    return clients.map(client => this.mapToEntity(client));
  }

  private applyFilters(query: any, filters?: ClientFilters): void {
    if (!filters) return;

    if (filters.clientType) {
      query.clientType = filters.clientType;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.search) {
      query.$or = [
        { clientName: { $regex: filters.search, $options: 'i' } },
        { companyName: { $regex: filters.search, $options: 'i' } },
        { contactPerson: { $regex: filters.search, $options: 'i' } },
        { clientEmail: { $regex: filters.search, $options: 'i' } }
      ];
    }
  }

  private mapToEntity(doc: IClientDocument): Client {
    return {
      clientId: doc.clientId,
      organizationId: doc.organizationId,
      clientName: doc.clientName,
      clientEmail: doc.clientEmail,
      companyName: doc.companyName,
      clientType: doc.clientType,
      accountBalance: doc.accountBalance,
      contactPerson: doc.contactPerson,
      phone: doc.phone,
      address: doc.address,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}