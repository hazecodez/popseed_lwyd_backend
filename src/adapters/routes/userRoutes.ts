import { Router } from 'express';
import { UserController } from '@/adapters/controllers/UserController';
import { userAuthMiddleware } from '@/adapters/middleware/userAuthMiddleware';

export function createUserRoutes(userController: UserController): Router {
  const router = Router();

  // Employee signup route
  router.post('/signup', (req, res) => userController.employeeSignup(req, res));

  // User login route
  router.post('/login', (req, res) => userController.userLogin(req, res));

  // Get organization users (for admin) - supports ?status=approved or ?status=not_approved
  router.get('/organization/:organizationId', (req, res) => userController.getOrganizationUsers(req, res));

  // Approve user
  router.put('/:userId/approve', (req, res) => userController.approveUser(req, res));

  // Reject user  
  router.put('/:userId/reject', (req, res) => userController.rejectUser(req, res));

  // Get all roles
  router.get('/roles', (req, res) => userController.getAllRoles(req, res));

  // Dashboard data for AM roles (requires userAuthMiddleware)
  router.get('/dashboard', userAuthMiddleware, (req, res) => userController.getDashboardData(req, res));

  // Team members for AM roles (requires userAuthMiddleware)
  router.get('/team', userAuthMiddleware, (req, res) => userController.getTeamMembers(req, res));
  
  // Team members for Design roles (requires userAuthMiddleware)
  router.get('/team/design', userAuthMiddleware, (req, res) => userController.getDesignTeamMembers(req, res));

  // Note: Protected routes will be added later after fixing middleware import issues
  // router.get('/profile', userAuthMiddleware, (req, res) => userController.getUserProfile(req, res));

  return router;
}