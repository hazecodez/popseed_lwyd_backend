import express from 'express';
import { config } from '@/shared/config';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { Container } from '@/container';
import { corsMiddleware } from '@/adapters/middleware/cors';
import { errorHandler, notFoundHandler } from '@/adapters/middleware/errorHandler';
import { rawBodyMiddleware } from '@/adapters/middleware/rawBody';
import { createSignupRoutes } from '@/adapters/routes/signupRoutes';
import { createOrganizationRoutes } from '@/adapters/routes/organizationRoutes';
import { createAdminRoutes } from '@/adapters/routes/adminRoutes';
import { createHealthRoutes } from '@/adapters/routes/healthRoutes';
import { createUserRoutes } from '@/adapters/routes/userRoutes';
import { createOrganizationRoleRoutes } from '@/adapters/routes/organizationRoleRoutes';
import { createProjectRoutes } from '@/adapters/routes/projectRoutes';
import { createTaskRoutes } from '@/adapters/routes/taskRoutes';
import { createClientRoutes } from '@/adapters/routes/clientRoutes';
import uploadRoutes from '@/adapters/routes/uploadRoutes';
import notificationRoutes from '@/adapters/routes/notificationRoutes';

async function createApp(): Promise<express.Application> {
  const app = express();

  // Initialize database connection
  const dbConnection = DatabaseConnection.getInstance();
  await dbConnection.connect();
  
  // Seed default roles
  const { RoleRepository } = await import('@/infrastructure/repositories/RoleRepository');
  const roleRepository = new RoleRepository();
  await roleRepository.seedDefaultRoles();

  // Initialize dependency injection container
  const container = new Container();

  // Run migration to create organization roles for existing organizations
  console.log('🔄 Running migration for existing organizations...');
  try {
    await container.migrationService.migrateExistingOrganizations();
    console.log('✅ Role migration completed successfully');
  } catch (error) {
    console.warn('⚠️ Role migration warning:', error);
    // Continue server startup even if migration fails
  }

  try {
    await container.clientMigrationService.migrateProjectsToClientSystem();
    console.log('✅ Client migration completed successfully');
  } catch (error) {
    console.warn('⚠️ Client migration warning:', error);
    // Continue server startup even if migration fails
  }

  // Middleware
  app.use(corsMiddleware);
  
  // Raw body middleware for Stripe webhooks (must be before express.json())
  app.use(rawBodyMiddleware);
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging in development
  if (config.server.environment === 'development') {
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }

  // Routes
  app.use('/api', createHealthRoutes());
  app.use('/api', createSignupRoutes(container.signupController, container.webhookController));
  app.use('/api', createOrganizationRoutes(container.organizationController));
  app.use('/api', createAdminRoutes(container.adminController, container.jwtService, container.adminRepository, container.organizationRepository));
  
  // User routes
  app.use('/api/users', createUserRoutes(container.userController));
  
  // Organization role routes
  app.use('/api/organization-roles', createOrganizationRoleRoutes(container.organizationRoleController));

  // Project routes
  app.use('/api/projects', createProjectRoutes(container.projectController, container.jwtService, container.adminRepository));
  
  // Task routes
  app.use('/api/tasks', createTaskRoutes(container.taskController, container.jwtService, container.adminRepository));
  
  // Client routes
  app.use('/api/clients', createClientRoutes(container.clientController, container.jwtService, container.adminRepository));
  
  // Upload routes
  app.use('/api/upload', uploadRoutes);

  // Notification routes
  app.use('/api/notifications', notificationRoutes);

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function startServer(): Promise<void> {
  try {
    const app = await createApp();
    const container = new Container();
    
    const server = app.listen(config.server.port, '0.0.0.0', () => {
      console.log(`
🚀 Popseed.ai Backend Server Started Successfully!

📊 Server Information:
   • Port: ${config.server.port}
   • Environment: ${config.server.environment}
   • Database: ${config.database.dbName}

🔗 Available Endpoints:
   • Health Check: http://localhost:${config.server.port}/api/health
   • API Root: http://localhost:${config.server.port}/api/

📝 Signup Flow Endpoints:
   • POST /api/signup/create-account
   • POST /api/signup/select-plan
   • GET  /api/check-subdomain/:subdomain
   • POST /api/signup/organization
   • POST /api/signup/create-checkout
   • POST /api/webhooks/stripe

💳 Stripe Integration: ${config.stripe.secretKey ? 'Configured' : 'Not Configured'}
      `);
    });

    // Initialize Socket.io
    container.socketService.initialize(server);
    console.log('✅ Socket.io initialized successfully');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔄 HTTP server closed.');
        
        try {
          const dbConnection = DatabaseConnection.getInstance();
          await dbConnection.disconnect();
          console.log('✅ Database connection closed.');
        } catch (error) {
          console.error('❌ Error closing database connection:', error);
        }
        
        console.log('✅ Graceful shutdown completed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp, startServer };