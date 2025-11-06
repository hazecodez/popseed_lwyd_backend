import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { userAuthMiddleware } from '../middleware/userAuthMiddleware';
import { JwtService } from '../../infrastructure/services/JwtService';
import { IAdminRepository } from '../../domain/repositories/IAdminRepository';

export function createTaskRoutes(
  taskController: TaskController,
  jwtService: JwtService,
  adminRepository: IAdminRepository
): Router {
  const router = Router();
  
  // Create auth middleware instance
  const authMiddleware = createAuthMiddleware(jwtService, adminRepository);

  // Project-specific task routes (for project management)
  router.get('/project/:projectId', authMiddleware, taskController.getProjectTasks);
  router.get('/project/:projectId/user', userAuthMiddleware, taskController.getProjectTasks);
  router.get('/project/:projectId/completed', authMiddleware, taskController.getCompletedTasks);
  router.get('/project/:projectId/completed/user', userAuthMiddleware, taskController.getCompletedTasks);
  router.post('/project/:projectId', authMiddleware, taskController.createTask);
  router.post('/project/:projectId/user', userAuthMiddleware, taskController.createTask);
  router.post('/project/:projectId/sample-data', authMiddleware, taskController.createSampleTasks);

  // User-specific task routes (for individual task management)
  router.get('/user', userAuthMiddleware, taskController.getUserTasks);
  router.get('/user/assigned', userAuthMiddleware, taskController.getAssignedTasks);
  router.get('/user/unassigned', userAuthMiddleware, taskController.getUnassignedTasks);
  router.post('/user', userAuthMiddleware, taskController.createTask);

  // Individual task operations (both admin and user can access)
  router.get('/:taskId', authMiddleware, taskController.getTask);
  router.put('/:taskId', authMiddleware, taskController.updateTask);
  router.patch('/:taskId/status', authMiddleware, taskController.updateTaskStatus);
  router.delete('/:taskId', authMiddleware, taskController.deleteTask);

  // User task operations with user auth
  router.get('/user/:taskId', userAuthMiddleware, taskController.getTask);
  router.put('/user/:taskId', userAuthMiddleware, taskController.updateTask);
  router.post('/user/:taskId/comment', userAuthMiddleware, taskController.addComment);
  router.patch('/user/:taskId/status', userAuthMiddleware, taskController.updateTaskStatus);
  router.delete('/user/:taskId', userAuthMiddleware, taskController.deleteTask);
  
  // Workload management
  router.get('/workload/:organizationId', userAuthMiddleware, taskController.getDesignerWorkload);

  return router;
}