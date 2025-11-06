import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import { IOrganizationRoleRepository } from '@/domain/repositories/IOrganizationRoleRepository';

export interface TestAccountResult {
  organizationId: string;
  adminId: string;
  subdomain: string;
  message: string;
  isExisting: boolean;
}

export class CreateTestAccountUseCase {
  constructor(
    private organizationRepository: IOrganizationRepository,
    private adminRepository: IAdminRepository,
    private organizationRoleRepository: IOrganizationRoleRepository
  ) {}

  async execute(): Promise<TestAccountResult> {
    try {
      // Check if Test Org already exists
      const existingOrg = await this.organizationRepository.findByName("Test Org");
      
      if (existingOrg) {
        // Test org exists, find the admin
        const admin = await this.adminRepository.findById(existingOrg.adminUserId);
        
        if (!admin) {
          throw new Error('Test organization exists but admin not found');
        }

        return {
          organizationId: existingOrg.organizationId,
          adminId: admin.adminId,
          subdomain: existingOrg.subdomain,
          message: 'Using existing test organization',
          isExisting: true
        };
      }

      // Create new test organization and admin
      return await this.createNewTestAccount();
    } catch (error) {
      throw new Error(`Failed to create/retrieve test account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createNewTestAccount(): Promise<TestAccountResult> {
    // First create the admin
    const admin = await this.adminRepository.create({
      email: 'test@mail.com',
      password: '1234', // Will be hashed by repository
      name: 'Admin',
      role: 'CEO',
      organizationId: 'temp' // Temporary, will update after org creation
    });

    // Create the organization with admin reference
    const organization = await this.organizationRepository.create({
      name: 'Test Org',
      subdomain: 'testorg',
      planType: 'freetrial',
      adminUserId: admin.adminId
    });

    // Update admin with correct organizationId
    await this.adminRepository.update(admin.adminId, {
      organizationId: organization.organizationId
    });

    // Create organization-specific roles by copying master roles
    console.log(`🔄 Creating organization roles for test account: ${organization.organizationId}`);
    await this.organizationRoleRepository.copyMasterRolesToOrganization(organization.organizationId);

    return {
      organizationId: organization.organizationId,
      adminId: admin.adminId,
      subdomain: organization.subdomain,
      message: 'Test organization and admin created successfully',
      isExisting: false
    };
  }
}