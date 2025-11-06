import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { Organization, CreateOrganizationRequest, UpdateOrganizationRequest, SubdomainAvailability } from '@/domain/entities/Organization';
import { OrganizationModel } from '@/infrastructure/database/models/OrganizationModel';

export class OrganizationRepository implements IOrganizationRepository {
  async create(orgData: CreateOrganizationRequest): Promise<Organization> {
    try {
      const organization = new OrganizationModel(orgData);
      const savedOrg = await organization.save();
      return this.mapToEntity(savedOrg);
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new Error('Organization with this subdomain already exists');
      }
      throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(organizationId: string): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOne({ organizationId });
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to find organization by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByName(name: string): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOne({ name: name.trim() });
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to find organization by name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByAdminUserId(adminUserId: string): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOne({ adminUserId });
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to find organization by admin user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySubdomain(subdomain: string): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOne({ subdomain: subdomain.toLowerCase() });
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to find organization by subdomain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStripeCustomerId(customerId: string): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOne({ stripeCustomerId: customerId });
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to find organization by Stripe customer ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStripeSubscriptionId(subscriptionId: string): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOne({ stripeSubscriptionId: subscriptionId });
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to find organization by Stripe subscription ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(): Promise<Organization[]> {
    try {
      const orgs = await OrganizationModel.find({});
      return orgs.map(org => this.mapToEntity(org));
    } catch (error) {
      throw new Error(`Failed to find all organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(organizationId: string, updates: UpdateOrganizationRequest): Promise<Organization | null> {
    try {
      const org = await OrganizationModel.findOneAndUpdate(
        { organizationId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      return org ? this.mapToEntity(org) : null;
    } catch (error) {
      throw new Error(`Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(organizationId: string): Promise<boolean> {
    try {
      const result = await OrganizationModel.findOneAndDelete({ organizationId });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkSubdomainAvailability(subdomain: string): Promise<SubdomainAvailability> {
    try {
      const existing = await OrganizationModel.findOne({ 
        subdomain: subdomain.toLowerCase() 
      });

      if (existing) {
        const suggestions = await this.generateSubdomainSuggestions(subdomain);
        return { 
          available: false, 
          message: 'Subdomain is already taken',
          suggestions 
        };
      }

      return { 
        available: true, 
        message: 'Subdomain is available' 
      };
    } catch (error) {
      throw new Error(`Failed to check subdomain availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSubdomainSuggestions(baseSubdomain: string): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      const base = baseSubdomain.toLowerCase();

      // Generate numbered suggestions
      for (let i = 1; i <= 5; i++) {
        const suggestion = `${base}${i}`;
        const exists = await OrganizationModel.findOne({ subdomain: suggestion });
        if (!exists) {
          suggestions.push(suggestion);
        }
      }

      // Generate hyphenated suggestions
      for (let i = 1; i <= 3; i++) {
        const suggestion = `${base}-${i}`;
        const exists = await OrganizationModel.findOne({ subdomain: suggestion });
        if (!exists && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }

      // Generate common suffix suggestions
      const suffixes = ['agency', 'studio', 'creative', 'team'];
      for (const suffix of suffixes) {
        const suggestion = `${base}-${suffix}`;
        const exists = await OrganizationModel.findOne({ subdomain: suggestion });
        if (!exists && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }

      return suggestions.slice(0, 3); // Return top 3 suggestions
    } catch (error) {
      throw new Error(`Failed to generate subdomain suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(orgDoc: any): Organization {
    return {
      organizationId: orgDoc.organizationId,
      name: orgDoc.name,
      subdomain: orgDoc.subdomain,
      planType: orgDoc.planType,
      adminUserId: orgDoc.adminUserId,
      stripeCustomerId: orgDoc.stripeCustomerId,
      stripeSubscriptionId: orgDoc.stripeSubscriptionId,
      trialEndsAt: orgDoc.trialEndsAt,
      maxUsers: orgDoc.maxUsers,
      currentUsers: orgDoc.currentUsers,
      contactPhone: orgDoc.contactPhone,
      companySize: orgDoc.companySize,
      industry: orgDoc.industry,
      isActive: orgDoc.isActive,
      createdAt: orgDoc.createdAt,
      updatedAt: orgDoc.updatedAt
    };
  }
}