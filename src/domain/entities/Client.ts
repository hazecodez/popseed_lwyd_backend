export interface Client {
  clientId: string;
  organizationId: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  clientType: 'retainer' | 'standard';
  accountBalance?: number; // For retainer clients
  contactPerson: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}