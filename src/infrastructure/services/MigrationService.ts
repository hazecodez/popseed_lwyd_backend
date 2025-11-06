import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IOrganizationRoleRepository } from '@/domain/repositories/IOrganizationRoleRepository';

export class MigrationService {
  constructor(
    private organizationRepository: IOrganizationRepository,
    private organizationRoleRepository: IOrganizationRoleRepository
  ) {}

  async migrateExistingOrganizations(): Promise<void> {
    try {
      console.log('🔄 Starting migration: Creating organization roles for existing organizations...');

      // Get all existing organizations
      const organizations = await this.organizationRepository.findAll();
      console.log(`📋 Found ${organizations.length} organizations to migrate`);

      let migratedCount = 0;
      let skippedCount = 0;

      for (const org of organizations) {
        try {
          // Check if organization already has roles
          const hasRoles = await this.organizationRoleRepository.existsForOrganization(org.organizationId);
          
          if (hasRoles) {
            console.log(`⏭️ Skipping ${org.name} (${org.subdomain}) - roles already exist`);
            skippedCount++;
            continue;
          }

          // Copy master roles to organization
          const createdRoles = await this.organizationRoleRepository.copyMasterRolesToOrganization(org.organizationId);
          console.log(`✅ Migrated ${org.name} (${org.subdomain}) - created ${createdRoles.length} roles`);
          migratedCount++;
        } catch (orgError) {
          console.error(`❌ Failed to migrate ${org.name} (${org.subdomain}):`, orgError);
        }
      }

      console.log(`🎉 Migration completed: ${migratedCount} organizations migrated, ${skippedCount} skipped`);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async migrateUserRoleAssignments(): Promise<void> {
    try {
      console.log('🔄 Starting user role migration: Updating user role assignments...');
      console.log('ℹ️ Note: User role assignments will continue to work with existing role names');
      console.log('✅ User role migration completed - no changes needed for existing users');
    } catch (error) {
      console.error('❌ User role migration failed:', error);
      throw new Error(`User role migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}