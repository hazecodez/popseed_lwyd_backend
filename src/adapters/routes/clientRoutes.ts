import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import { userAuthMiddleware } from '../middleware/userAuthMiddleware';
import { JwtService } from '../../infrastructure/services/JwtService';
import { IAdminRepository } from '../../domain/repositories/IAdminRepository';

export function createClientRoutes(
  clientController: ClientController,
  jwtService: JwtService,
  adminRepository: IAdminRepository
): Router {
  const router = Router();
  
  // Create auth middleware instance
  const authMiddleware = createAuthMiddleware(jwtService, adminRepository);

  // Admin routes (for client management)
  router.get('/', authMiddleware, clientController.getClients);
  router.get('/active', authMiddleware, clientController.getActiveClients);
  router.post('/', authMiddleware, clientController.createClient);
  router.post('/sample-data', authMiddleware, clientController.createSampleClients);
  
  // User routes (for project creation - users can access active clients)
  router.get('/user/active', userAuthMiddleware, clientController.getActiveClients);
  router.post('/user', userAuthMiddleware, clientController.createClient);

  // Individual client operations
  router.get('/:clientId', authMiddleware, clientController.getClient);
  router.put('/:clientId', authMiddleware, clientController.updateClient);
  router.delete('/:clientId', authMiddleware, clientController.deleteClient);

  return router;
}