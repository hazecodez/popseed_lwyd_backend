import { Request, Response } from 'express';
import { CreateAccountUseCase } from '@/usecases/CreateAccountUseCase';
import { SelectPlanUseCase } from '@/usecases/SelectPlanUseCase';
import { CheckSubdomainUseCase } from '@/usecases/CheckSubdomainUseCase';
import { SaveOrganizationDetailsUseCase } from '@/usecases/SaveOrganizationDetailsUseCase';
import { CreateCheckoutSessionUseCase } from '@/usecases/CreateCheckoutSessionUseCase';
import { CreateTestAccountUseCase } from '@/usecases/CreateTestAccountUseCase';
import { CreateOrganizationFromSessionUseCase } from '@/usecases/CreateOrganizationFromSessionUseCase';
import { SignupSessionRepository } from '@/infrastructure/repositories/SignupSessionRepository';
import { ApiResponse } from '@/shared/types';
import { AppError } from '@/shared/errors';

export class SignupController {
  constructor(
    private createAccountUseCase: CreateAccountUseCase,
    private selectPlanUseCase: SelectPlanUseCase,
    private checkSubdomainUseCase: CheckSubdomainUseCase,
    private saveOrganizationDetailsUseCase: SaveOrganizationDetailsUseCase,
    private createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private createTestAccountUseCase: CreateTestAccountUseCase,
    private createOrganizationFromSessionUseCase: CreateOrganizationFromSessionUseCase,
    private signupSessionRepository: SignupSessionRepository
  ) {}

  createAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.createAccountUseCase.execute(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: result,
        message: result.message
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  selectPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.selectPlanUseCase.execute(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: result,
        message: result.message
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  checkSubdomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subdomain } = req.params;
      const result = await this.checkSubdomainUseCase.execute({ subdomain });
      
      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  saveOrganizationDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.saveOrganizationDetailsUseCase.execute(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: result,
        message: result.message
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.createCheckoutSessionUseCase.execute(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  getSessionInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        const response: ApiResponse = {
          success: false,
          error: 'Session ID is required'
        };
        res.status(400).json(response);
        return;
      }

      // Get session from repository
      const session = await this.signupSessionRepository.findBySessionId(sessionId);
      
      if (!session) {
        const response: ApiResponse = {
          success: false,
          error: 'Session not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { session },
        message: 'Session retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  private handleError(res: Response, error: unknown): void {
    console.error('SignupController Error:', error);

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: error.message
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    const response: ApiResponse = {
      success: false,
      error: message
    };

    res.status(500).json(response);
  }

  createTestAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🧪 Creating test account...');
      
      const result = await this.createTestAccountUseCase.execute();
      
      const response: ApiResponse = {
        success: true,
        data: {
          organizationId: result.organizationId,
          adminId: result.adminId,
          subdomain: result.subdomain,
          loginUrl: `${result.subdomain}/admin/login`, // Frontend will handle localhost vs production
          isExisting: result.isExisting
        },
        message: result.message
      };

      console.log(`✅ Test account ready: ${result.subdomain} (${result.isExisting ? 'existing' : 'created'})`);
      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  createOrganizationFromSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        const response: ApiResponse = {
          success: false,
          error: 'Session ID is required'
        };
        res.status(400).json(response);
        return;
      }

      console.log('🏢 Creating organization from signup session:', sessionId);
      
      const result = await this.createOrganizationFromSessionUseCase.execute(sessionId);
      
      const response: ApiResponse = {
        success: true,
        data: {
          organizationId: result.organizationId,
          adminId: result.adminId,
          subdomain: result.subdomain,
          organizationName: result.organizationName,
          adminEmail: result.adminEmail,
          loginUrl: `${result.subdomain}/admin/login` // Frontend will handle localhost vs production
        },
        message: result.message
      };

      console.log(`✅ Organization created: ${result.subdomain} for ${result.adminEmail}`);
      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }
}