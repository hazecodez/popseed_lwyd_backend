import { Request, Response } from 'express';
import { IClientRepository } from '../../domain/repositories/IClientRepository';

export class ClientController {
  constructor(
    private clientRepository: IClientRepository
  ) {}

  // Get all clients for organization
  getClients = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const { clientType, isActive, search } = req.query;
      
      const filters: any = {};
      if (clientType) filters.clientType = clientType;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;

      const clients = await this.clientRepository.findByOrganizationId(organizationId, filters);

      res.json({
        success: true,
        data: clients,
        total: clients.length
      });
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get active clients for dropdowns
  getActiveClients = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const clients = await this.clientRepository.getActiveClients(organizationId);

      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      console.error('Error fetching active clients:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Get single client
  getClient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      const client = await this.clientRepository.findById(clientId);
      
      if (!client || client.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Client not found or access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Create new client
  createClient = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID and User ID are required'
        });
        return;
      }

      const {
        clientName,
        clientEmail,
        companyName,
        clientType = 'standard',
        accountBalance,
        contactPerson,
        phone,
        address,
        isActive = true
      } = req.body;

      // Validation
      const errors = [];
      if (!clientName?.trim()) errors.push('Client name is required');
      if (!clientEmail?.trim()) errors.push('Client email is required');
      if (!companyName?.trim()) errors.push('Company name is required');
      if (!contactPerson?.trim()) errors.push('Contact person is required');

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (clientEmail && !emailRegex.test(clientEmail)) {
        errors.push('Valid email address is required');
      }

      // Check if client name already exists in organization
      if (clientName) {
        const existingClient = await this.clientRepository.findByName(organizationId, clientName.trim());
        if (existingClient) {
          errors.push('Client name already exists in this organization');
        }
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors
        });
        return;
      }

      const clientData = {
        organizationId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        companyName: companyName.trim(),
        clientType: clientType as 'retainer' | 'standard',
        accountBalance: clientType === 'retainer' ? parseFloat(accountBalance || '0') : undefined,
        contactPerson: contactPerson.trim(),
        phone: phone?.trim(),
        address: address?.trim(),
        isActive
      };

      const client = await this.clientRepository.create(clientData);

      res.status(201).json({
        success: true,
        data: client,
        message: 'Client created successfully'
      });
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Update client
  updateClient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      const client = await this.clientRepository.findById(clientId);
      
      if (!client || client.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Client not found or access denied'
        });
        return;
      }

      const {
        clientName,
        clientEmail,
        companyName,
        clientType,
        accountBalance,
        contactPerson,
        phone,
        address,
        isActive
      } = req.body;

      const updateData: any = {};
      
      if (clientName !== undefined) updateData.clientName = clientName.trim();
      if (clientEmail !== undefined) updateData.clientEmail = clientEmail.trim().toLowerCase();
      if (companyName !== undefined) updateData.companyName = companyName.trim();
      if (clientType !== undefined) updateData.clientType = clientType;
      if (accountBalance !== undefined) updateData.accountBalance = parseFloat(accountBalance);
      if (contactPerson !== undefined) updateData.contactPerson = contactPerson.trim();
      if (phone !== undefined) updateData.phone = phone?.trim();
      if (address !== undefined) updateData.address = address?.trim();
      if (isActive !== undefined) updateData.isActive = isActive;

      // Validate email if provided
      if (updateData.clientEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.clientEmail)) {
          res.status(400).json({
            success: false,
            error: 'Valid email address is required'
          });
          return;
        }
      }

      // Check if client name already exists (excluding current client)
      if (updateData.clientName && updateData.clientName !== client.clientName) {
        const existingClient = await this.clientRepository.findByName(organizationId, updateData.clientName);
        if (existingClient && existingClient.clientId !== clientId) {
          res.status(400).json({
            success: false,
            error: 'Client name already exists in this organization'
          });
          return;
        }
      }

      const updatedClient = await this.clientRepository.update(clientId, updateData);

      if (!updatedClient) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedClient,
        message: 'Client updated successfully'
      });
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Delete client
  deleteClient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId } = req.params;
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;

      const client = await this.clientRepository.findById(clientId);
      
      if (!client || client.organizationId !== organizationId) {
        res.status(404).json({
          success: false,
          error: 'Client not found or access denied'
        });
        return;
      }

      const deleted = await this.clientRepository.delete(clientId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Client not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Client deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };

  // Create sample clients for testing
  createSampleClients = async (req: Request, res: Response): Promise<void> => {
    try {
      const organizationId = (req as any).admin?.organizationId || (req as any).user?.organizationId;
      const userId = (req as any).admin?.adminId || (req as any).user?.userId;

      if (!organizationId || !userId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID and User ID are required'
        });
        return;
      }

      const sampleClients = [
        {
          organizationId,
          clientName: 'Nike Inc',
          clientEmail: 'contact@nike.com',
          companyName: 'Nike, Inc.',
          clientType: 'retainer' as const,
          accountBalance: 250000,
          contactPerson: 'Sarah Johnson',
          phone: '+1-503-671-6453',
          address: 'One Bowerman Drive, Beaverton, OR 97005',
          isActive: true
        },
        {
          organizationId,
          clientName: 'Apple Inc',
          clientEmail: 'marketing@apple.com',
          companyName: 'Apple Inc.',
          clientType: 'standard' as const,
          contactPerson: 'Michael Chen',
          phone: '+1-408-996-1010',
          address: 'One Apple Park Way, Cupertino, CA 95014',
          isActive: true
        },
        {
          organizationId,
          clientName: 'Tesla Motors',
          clientEmail: 'creative@tesla.com',
          companyName: 'Tesla, Inc.',
          clientType: 'retainer' as const,
          accountBalance: 180000,
          contactPerson: 'Emma Rodriguez',
          phone: '+1-650-681-5000',
          address: '1 Tesla Road, Austin, TX 78725',
          isActive: true
        },
        {
          organizationId,
          clientName: 'Google LLC',
          clientEmail: 'partnerships@google.com',
          companyName: 'Google LLC',
          clientType: 'standard' as const,
          contactPerson: 'David Kim',
          phone: '+1-650-253-0000',
          address: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
          isActive: true
        },
        {
          organizationId,
          clientName: 'Coca-Cola Company',
          clientEmail: 'agency@coca-cola.com',
          companyName: 'The Coca-Cola Company',
          clientType: 'retainer' as const,
          accountBalance: 320000,
          contactPerson: 'Lisa Williams',
          phone: '+1-404-676-2121',
          address: '1 Coca Cola Plaza, Atlanta, GA 30313',
          isActive: true
        }
      ];

      const createdClients = [];
      for (const clientData of sampleClients) {
        // Check if client already exists
        const existingClient = await this.clientRepository.findByName(organizationId, clientData.clientName);
        if (!existingClient) {
          const client = await this.clientRepository.create(clientData);
          createdClients.push(client);
        }
      }

      res.json({
        success: true,
        data: createdClients,
        message: `${createdClients.length} sample clients created successfully`
      });
    } catch (error) {
      console.error('Error creating sample clients:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error. Please try again later.'
      });
    }
  };
}