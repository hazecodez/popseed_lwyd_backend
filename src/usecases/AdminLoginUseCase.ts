import { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { JwtService } from '@/infrastructure/services/JwtService';
import { AdminLoginRequest, AdminLoginResponse } from '@/domain/entities/Admin';

export class AdminLoginUseCase {
  constructor(
    private adminRepository: IAdminRepository,
    private organizationRepository: IOrganizationRepository,
    private jwtService: JwtService
  ) {}

  async execute(loginData: AdminLoginRequest): Promise<AdminLoginResponse> {
    try {
      const { email, password, organizationId } = loginData;

      // Validate credentials
      const admin = await this.adminRepository.validateCredentials(email, password, organizationId);
      
      if (!admin) {
        throw new Error('Invalid email or password');
      }

      // Verify admin belongs to the organization (additional security check)
      if (organizationId && admin.organizationId !== organizationId) {
        throw new Error('Access denied for this organization');
      }

      // Get organization details for context
      const organization = await this.organizationRepository.findById(admin.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (!organization.isActive) {
        throw new Error('Organization is inactive');
      }

      // Generate JWT token
      const token = this.jwtService.generateToken({
        adminId: admin.adminId,
        email: admin.email,
        organizationId: admin.organizationId,
        role: admin.role
      });

      // Update last login timestamp
      await this.adminRepository.updateLastLogin(admin.adminId);

      return {
        adminId: admin.adminId,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        organizationId: admin.organizationId,
        token
      };
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}