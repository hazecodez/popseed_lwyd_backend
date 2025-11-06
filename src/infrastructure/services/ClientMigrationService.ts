import { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository';
import { IClientRepository } from '../../domain/repositories/IClientRepository';
import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { ProjectModel } from '../database/models/ProjectModel';

export class ClientMigrationService {
  constructor(
    private organizationRepository: IOrganizationRepository,
    private clientRepository: IClientRepository,
    private projectRepository: IProjectRepository
  ) {}

  async migrateProjectsToClientSystem(): Promise<void> {
    console.log('🔄 Starting Client Migration Service...');
    
    try {
      const organizations = await this.organizationRepository.findAll();
      console.log(`📋 Found ${organizations.length} organizations to migrate`);

      for (const org of organizations) {
        console.log(`\n🏢 Processing organization: ${org.name} (${org.subdomain})`);
        
        // 1. Check if "Legacy Client" already exists
        let legacyClient = await this.clientRepository.findByName(org.organizationId, 'Legacy Client');
        
        if (!legacyClient) {
          // 2. Create "Legacy Client" entry
          legacyClient = await this.clientRepository.create({
            organizationId: org.organizationId,
            clientName: 'Legacy Client',
            clientEmail: 'legacy@placeholder.com',
            companyName: 'Legacy Client Company',
            clientType: 'standard',
            contactPerson: 'Legacy Contact',
            isActive: true
          });
          console.log(`✅ Created Legacy Client for ${org.name}`);
        } else {
          console.log(`⏭️ Legacy Client already exists for ${org.name}`);
        }

        // 3. Find projects that need migration (have clientName but no clientId)
        const projectsToMigrate = await ProjectModel.find({
          organizationId: org.organizationId,
          clientId: { $exists: false },
          clientName: { $exists: true }
        }).lean(); // Use lean() to get plain objects instead of mongoose documents

        if (projectsToMigrate.length === 0) {
          console.log(`⏭️ No projects need migration for ${org.name}`);
          continue;
        }

        console.log(`📦 Found ${projectsToMigrate.length} projects to migrate`);

        // 4. For each project, create a client if needed and update project
        let migratedCount = 0;
        const createdClients = new Set<string>();

        for (const project of projectsToMigrate) {
          try {
            let projectClient = legacyClient;
            const clientNameFromProject = (project as any).clientName; // Safe access to legacy field

            // If project has a specific client name, try to create/find a real client
            if (clientNameFromProject && clientNameFromProject.trim() !== '' && clientNameFromProject !== 'Legacy Client') {
              // Check if client already exists
              let existingClient = await this.clientRepository.findByName(org.organizationId, clientNameFromProject);
              
              if (!existingClient && !createdClients.has(clientNameFromProject)) {
                // Create new client based on project data
                try {
                  existingClient = await this.clientRepository.create({
                    organizationId: org.organizationId,
                    clientName: clientNameFromProject,
                    clientEmail: `${clientNameFromProject.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
                    companyName: clientNameFromProject,
                    clientType: 'standard',
                    contactPerson: 'Migrated Contact',
                    isActive: true
                  });
                  createdClients.add(clientNameFromProject);
                  console.log(`  ✅ Created client: ${clientNameFromProject}`);
                } catch (clientError) {
                  console.log(`  ⚠️ Could not create client ${clientNameFromProject}, using Legacy Client`);
                  existingClient = legacyClient;
                }
              }

              if (existingClient) {
                projectClient = existingClient;
              }
            }

            // 5. Update project with clientId and set default budget if missing
            await ProjectModel.updateOne(
              { _id: project._id },
              { 
                $set: { 
                  clientId: projectClient.clientId,
                  budget: (project as any).budget || 0 // Set default budget if missing
                },
                $unset: {
                  clientName: 1, // Remove old clientName field
                  paymentType: 1, // Remove deprecated paymentType
                  retainerBalance: 1, // Remove deprecated retainerBalance
                  retainerAlert: 1 // Remove deprecated retainerAlert
                }
              }
            );

            migratedCount++;
          } catch (projectError) {
            console.error(`  ❌ Error migrating project ${(project as any).projectName}:`, projectError);
          }
        }

        console.log(`✅ Successfully migrated ${migratedCount} projects for ${org.name}`);
        console.log(`📊 Created ${createdClients.size} new clients from project data`);
      }

      console.log('\n🎉 Client migration completed successfully!');
    } catch (error) {
      console.error('❌ Error during client migration:', error);
      throw error;
    }
  }
}