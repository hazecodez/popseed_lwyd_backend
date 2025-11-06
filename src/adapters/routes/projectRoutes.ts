import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { userAuthMiddleware } from '../middleware/userAuthMiddleware';
import { JwtService } from '../../infrastructure/services/JwtService';
import { IAdminRepository } from '../../domain/repositories/IAdminRepository';

export function createProjectRoutes(
  projectController: ProjectController,
  jwtService: JwtService,
  adminRepository: IAdminRepository
): Router {
  const router = Router();
  
  // Create auth middleware instance
  const authMiddleware = createAuthMiddleware(jwtService, adminRepository);

  // User routes (for user dashboard) - MUST come before /:projectId route
  router.get('/user', userAuthMiddleware, projectController.getUserProjects);
  router.get('/user/:projectId', userAuthMiddleware, projectController.getUserProject);
  router.post('/user', userAuthMiddleware, projectController.createProject);
  router.post('/user/sample-data', userAuthMiddleware, projectController.createSampleProjects);

  // Sample data creation (temporary for testing)
  router.post('/sample-data', authMiddleware, projectController.createSampleProjects);

  // Admin routes (for admin dashboard)
  router.get('/', authMiddleware, projectController.getProjects);
  router.post('/', authMiddleware, projectController.createProject);
  router.put('/:projectId', authMiddleware, projectController.updateProject);
  router.patch('/:projectId/progress', authMiddleware, projectController.updateProjectProgress);
  
  // Single project route - MUST come last to avoid conflicts
  router.get('/:projectId', authMiddleware, projectController.getProject);

  return router;
}