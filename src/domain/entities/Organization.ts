export interface Organization {
  organizationId: string;
  name: string;
  subdomain: string;
  planType: string; // For now, simplified to just "freetrial"
  adminUserId: string; // Reference to admin document ID
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  maxUsers?: number;
  currentUsers?: number;
  contactPhone?: string;
  companySize?: CompanySize;
  industry?: Industry;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum PlanType {
  STARTER = 'STARTER',
  ADVANCED = 'ADVANCED', 
  ENTERPRISE = 'ENTERPRISE'
}

export enum PlanStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED'
}

export enum PlanFeature {
  ACCOUNT_MANAGEMENT = 'ACCOUNT_MANAGEMENT',
  DESIGN_TEAM = 'DESIGN_TEAM',
  CREATIVE_STRATEGY = 'CREATIVE_STRATEGY',
  FINANCE_TEAM = 'FINANCE_TEAM'
}

export enum CompanySize {
  FREELANCER = '1',
  SMALL = '2-10',
  MEDIUM = '11-50',
  LARGE = '51-200',
  ENTERPRISE = '200+'
}

export enum Industry {
  ADVERTISING = 'Advertising',
  MARKETING = 'Marketing',
  DESIGN = 'Design',
  BRANDING = 'Branding',
  DIGITAL = 'Digital Agency',
  CREATIVE = 'Creative Services',
  OTHER = 'Other'
}

export interface CreateOrganizationRequest {
  name: string;
  subdomain: string;
  planType: string;
  adminUserId: string;
  contactPhone?: string;
  companySize?: CompanySize;
  industry?: Industry;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  subdomain?: string;
  planType?: string;
  adminUserId?: string;
  isActive?: boolean;
  contactPhone?: string;
  companySize?: CompanySize;
  industry?: Industry;
}

export interface SubdomainAvailability {
  available: boolean;
  message: string;
  suggestions?: string[];
}