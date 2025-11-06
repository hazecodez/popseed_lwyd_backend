import { Request, Response } from 'express';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { ApiResponse } from '@/shared/types';

export class OrganizationController {
  constructor(
    private organizationRepository: IOrganizationRepository
  ) {}

  getOrganizationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization ID is required'
        };
        res.status(400).json(response);
        return;
      }

      const organization = await this.organizationRepository.findById(organizationId);
      
      if (!organization) {
        const response: ApiResponse = {
          success: false,
          error: 'Organization not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: organization,
        message: 'Organization retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Organization fetch error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organization'
      };
      res.status(500).json(response);
    }
  }

  getOrganizationBySubdomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subdomain } = req.params;

      if (!subdomain) {
        const response: ApiResponse = {
          success: false,
          error: 'Subdomain is required'
        };
        res.status(400).json(response);
        return;
      }

      console.log(`🔍 Looking up organization by subdomain: ${subdomain}`);
      const organization = await this.organizationRepository.findBySubdomain(subdomain);
      
      if (!organization) {
        console.log(`❌ Organization not found for subdomain: ${subdomain}`);
        const response: ApiResponse = {
          success: false,
          error: `Organization with subdomain '${subdomain}' not found`
        };
        res.status(404).json(response);
        return;
      }

      console.log(`✅ Organization found: ${organization.name} (${organization.organizationId})`);
      const response: ApiResponse = {
        success: true,
        data: organization,
        message: 'Organization retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Organization fetch by subdomain error:', error);
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch organization'
      };
      res.status(500).json(response);
    }
  }
}