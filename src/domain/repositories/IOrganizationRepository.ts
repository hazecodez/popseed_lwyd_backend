import { Organization, CreateOrganizationRequest, UpdateOrganizationRequest, SubdomainAvailability } from '../entities/Organization';

export interface IOrganizationRepository {
  create(orgData: CreateOrganizationRequest): Promise<Organization>;
  findById(organizationId: string): Promise<Organization | null>;
  findByName(name: string): Promise<Organization | null>;
  findBySubdomain(subdomain: string): Promise<Organization | null>;
  findByAdminUserId(adminUserId: string): Promise<Organization | null>;
  findByStripeCustomerId(customerId: string): Promise<Organization | null>;
  findByStripeSubscriptionId(subscriptionId: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  update(organizationId: string, updates: UpdateOrganizationRequest): Promise<Organization | null>;
  delete(organizationId: string): Promise<boolean>;
  checkSubdomainAvailability(subdomain: string): Promise<SubdomainAvailability>;
  generateSubdomainSuggestions(baseSubdomain: string): Promise<string[]>;
}