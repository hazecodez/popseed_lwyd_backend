// Dependency Injection Container
import { UserRepository } from '@/infrastructure/repositories/UserRepository';
import { RoleRepository } from '@/infrastructure/repositories/RoleRepository';
import { OrganizationRepository } from '@/infrastructure/repositories/OrganizationRepository';
import { AdminRepository } from '@/infrastructure/repositories/AdminRepository';
import { SignupSessionRepository } from '@/infrastructure/repositories/SignupSessionRepository';
import { OrganizationRoleRepository } from '@/infrastructure/repositories/OrganizationRoleRepository';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository';
import { PasswordService } from '@/infrastructure/services/PasswordService';
import { ValidationService } from '@/infrastructure/services/ValidationService';
import { JwtService } from '@/infrastructure/services/JwtService';
import { StripeService } from '@/infrastructure/external/StripeService';
import { MigrationService } from '@/infrastructure/services/MigrationService';
import { ClientMigrationService } from '@/infrastructure/services/ClientMigrationService';
import { SocketService } from '@/infrastructure/services/SocketService';
import { NotificationService } from '@/infrastructure/services/NotificationService';
import { ProjectRepository } from '@/infrastructure/repositories/ProjectRepository';
import { TaskRepository } from '@/infrastructure/repositories/TaskRepository';
import { ClientRepository } from '@/infrastructure/repositories/ClientRepository';

// Use Cases
import { CreateAccountUseCase } from '@/usecases/CreateAccountUseCase';
import { SelectPlanUseCase } from '@/usecases/SelectPlanUseCase';
import { CheckSubdomainUseCase } from '@/usecases/CheckSubdomainUseCase';
import { SaveOrganizationDetailsUseCase } from '@/usecases/SaveOrganizationDetailsUseCase';
import { CreateCheckoutSessionUseCase } from '@/usecases/CreateCheckoutSessionUseCase';
import { CreateTestAccountUseCase } from '@/usecases/CreateTestAccountUseCase';
import { CreateOrganizationFromSessionUseCase } from '@/usecases/CreateOrganizationFromSessionUseCase';
import { AdminLoginUseCase } from '@/usecases/AdminLoginUseCase';

// Controllers
import { SignupController } from '@/adapters/controllers/SignupController';
import { OrganizationController } from '@/adapters/controllers/OrganizationController';
import { AdminController } from '@/adapters/controllers/AdminController';
import { WebhookController } from '@/adapters/controllers/WebhookController';
import { UserController } from '@/adapters/controllers/UserController';
import { OrganizationRoleController } from '@/adapters/controllers/OrganizationRoleController';
import { ProjectController } from '@/adapters/controllers/ProjectController';
import { TaskController } from '@/adapters/controllers/TaskController';
import { ClientController } from '@/adapters/controllers/ClientController';
import { NotificationController } from '@/adapters/controllers/NotificationController';

export class Container {
  // Repositories
  public readonly roleRepository = new RoleRepository();
  public readonly userRepository = new UserRepository();
  public readonly organizationRepository = new OrganizationRepository();
  public readonly adminRepository = new AdminRepository();
  public readonly signupSessionRepository = new SignupSessionRepository();
  public readonly organizationRoleRepository = new OrganizationRoleRepository(this.roleRepository);
  public readonly projectRepository = new ProjectRepository();
  public readonly taskRepository = new TaskRepository();
  public readonly clientRepository = new ClientRepository();
  public readonly notificationRepository = new NotificationRepository();

  // Services
  public readonly passwordService = new PasswordService();
  public readonly validationService = new ValidationService();
  public readonly jwtService = new JwtService();
  public readonly stripeService = new StripeService();
  public readonly socketService = new SocketService(this.jwtService);
  public readonly notificationService = new NotificationService(
    this.notificationRepository,
    this.socketService,
    this.userRepository
  );
  public readonly migrationService = new MigrationService(
    this.organizationRepository,
    this.organizationRoleRepository
  );

  public readonly clientMigrationService = new ClientMigrationService(
    this.organizationRepository,
    this.clientRepository,
    this.projectRepository
  );

  // Use Cases
  public readonly createAccountUseCase = new CreateAccountUseCase(
    this.signupSessionRepository,
    this.validationService,
    this.passwordService
  );

  public readonly selectPlanUseCase = new SelectPlanUseCase(
    this.signupSessionRepository,
    this.stripeService
  );

  public readonly checkSubdomainUseCase = new CheckSubdomainUseCase(
    this.organizationRepository,
    this.validationService
  );

  public readonly saveOrganizationDetailsUseCase = new SaveOrganizationDetailsUseCase(
    this.signupSessionRepository,
    this.organizationRepository,
    this.validationService
  );

  public readonly createCheckoutSessionUseCase = new CreateCheckoutSessionUseCase(
    this.signupSessionRepository,
    this.stripeService
  );

  public readonly createTestAccountUseCase = new CreateTestAccountUseCase(
    this.organizationRepository,
    this.adminRepository,
    this.organizationRoleRepository
  );

  public readonly createOrganizationFromSessionUseCase = new CreateOrganizationFromSessionUseCase(
    this.organizationRepository,
    this.adminRepository,
    this.signupSessionRepository,
    this.organizationRoleRepository
  );

  public readonly adminLoginUseCase = new AdminLoginUseCase(
    this.adminRepository,
    this.organizationRepository,
    this.jwtService
  );

  // Controllers
  public readonly signupController = new SignupController(
    this.createAccountUseCase,
    this.selectPlanUseCase,
    this.checkSubdomainUseCase,
    this.saveOrganizationDetailsUseCase,
    this.createCheckoutSessionUseCase,
    this.createTestAccountUseCase,
    this.createOrganizationFromSessionUseCase,
    this.signupSessionRepository
  );

  public readonly organizationController = new OrganizationController(
    this.organizationRepository
  );

  public readonly adminController = new AdminController(
    this.adminLoginUseCase
  );

  public readonly webhookController = new WebhookController(
    this.stripeService,
    this.signupSessionRepository,
    this.organizationRepository,
    this.userRepository
  );

  public readonly userController = new UserController(
    this.userRepository,
    this.organizationRepository,
    this.roleRepository
  );

  public readonly organizationRoleController = new OrganizationRoleController(
    this.organizationRoleRepository
  );

  public readonly projectController = new ProjectController(
    this.projectRepository,
    this.userRepository,
    this.clientRepository,
    this.organizationRoleRepository
  );

  public readonly taskController = new TaskController(
    this.taskRepository,
    this.userRepository,
    this.projectRepository,
    this.notificationService
  );

  public readonly clientController = new ClientController(
    this.clientRepository
  );

  public readonly notificationController = new NotificationController(
    this.notificationRepository
  );
}