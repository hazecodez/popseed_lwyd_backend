import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { StripeService } from '@/infrastructure/external/StripeService';
import { SignupStatus } from '@/domain/entities/SignupSession';

export interface SelectPlanRequest {
  sessionId: string;
  planType: string;
}

export interface SelectPlanResponse {
  sessionId: string;
  planInfo: any;
  message: string;
}

export class SelectPlanUseCase {
  constructor(
    private signupSessionRepository: ISignupSessionRepository,
    private stripeService: StripeService
  ) {}

  async execute(request: SelectPlanRequest): Promise<SelectPlanResponse> {
    // Validate input
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }

    // Find session
    const session = await this.signupSessionRepository.findBySessionId(request.sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Validate plan type (currently only Enterprise supported)
    const planType = request.planType || 'ENTERPRISE';
    if (planType !== 'ENTERPRISE') {
      throw new Error('Currently only Enterprise plan is available');
    }

    // Update session with plan selection
    const updatedSession = await this.signupSessionRepository.updateStatus(
      request.sessionId,
      SignupStatus.PLAN_SELECTED,
      { planType }
    );

    if (!updatedSession) {
      throw new Error('Failed to update session');
    }

    // Get plan information from Stripe service
    const planInfo = this.stripeService.getPlanInfo('ENTERPRISE');

    return {
      sessionId: request.sessionId,
      planInfo,
      message: 'Plan selected successfully'
    };
  }
}