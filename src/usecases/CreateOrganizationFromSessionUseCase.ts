import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { IOrganizationRoleRepository } from '@/domain/repositories/IOrganizationRoleRepository';

export interface CreateOrganizationResult {
  organizationId: string;
  adminId: string;
  subdomain: string;
  organizationName: string;
  adminEmail: string;
  message: string;
}

export class CreateOrganizationFromSessionUseCase {
  constructor(
    private organizationRepository: IOrganizationRepository,
    private adminRepository: IAdminRepository,
    private signupSessionRepository: ISignupSessionRepository,
    private organizationRoleRepository: IOrganizationRoleRepository
  ) {}

  async execute(sessionId: string): Promise<CreateOrganizationResult> {
    try {
      // Get signup session data
      const session = await this.signupSessionRepository.findBySessionId(sessionId);
      if (!session) {
        throw new Error('Signup session not found');
      }

      // Validate session has required data
      if (!session.organizationName || !session.subdomain || !session.email || !session.password) {
        throw new Error('Incomplete signup session data');
      }

      // Check if organization with this subdomain already exists
      const existingOrg = await this.organizationRepository.findBySubdomain(session.subdomain);
      if (existingOrg) {
        throw new Error('Organization with this subdomain already exists');
      }

      // First create the admin user
      const admin = await this.adminRepository.create({
        email: session.email,
        password: session.password, // Already hashed in session
        name: 'Admin', // Default name, can be updated later
        role: 'CEO',
        organizationId: 'temp', // Temporary, will update after org creation
        isPasswordHashed: true // Password is already hashed from signup session
      });

      // Create the organization with admin reference
      const organization = await this.organizationRepository.create({
        name: session.organizationName,
        subdomain: session.subdomain,
        planType: 'freetrial', // Always freetrial for now
        adminUserId: admin.adminId
      });

      // Update admin with correct organizationId
      await this.adminRepository.update(admin.adminId, {
        organizationId: organization.organizationId
      });

      // Create organization-specific roles by copying master roles
      console.log(`🔄 Creating organization roles for: ${organization.organizationId}`);
      await this.organizationRoleRepository.copyMasterRolesToOrganization(organization.organizationId);

      // Update signup session status
      await this.signupSessionRepository.updateStatus(sessionId, 'COMPLETED');

      return {
        organizationId: organization.organizationId,
        adminId: admin.adminId,
        subdomain: organization.subdomain,
        organizationName: organization.name,
        adminEmail: admin.email,
        message: 'Organization and admin created successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create organization from session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}