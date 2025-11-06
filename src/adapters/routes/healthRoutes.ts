import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { ApiResponse } from '@/shared/types';
import { config } from '@/shared/config';

export function createHealthRoutes(): Router {
  const router = Router();

  // Basic health check
  router.get('/health', (req: Request, res: Response) => {
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: config.server.environment
      },
      message: 'Service is running'
    };

    res.status(200).json(response);
  });

  // Detailed health check with database connection
  router.get('/health/detailed', async (req: Request, res: Response) => {
    const dbConnection = DatabaseConnection.getInstance();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: config.server.environment,
      database: {
        connected: dbConnection.isConnected(),
        url: config.database.mongoUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Hide credentials
      },
      stripe: {
        configured: !!config.stripe.secretKey
      }
    };

    const response: ApiResponse = {
      success: true,
      data: health,
      message: 'Detailed health check'
    };

    res.status(200).json(response);
  });

  // Root API endpoint
  router.get('/', (req: Request, res: Response) => {
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Popseed.ai Backend API',
        version: '2.0.0',
        module: 'Signup & Onboarding',
        documentation: '/api/health/detailed'
      }
    };

    res.status(200).json(response);
  });

  return router;
}