import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { StripeService } from '@/infrastructure/external/StripeService';
import { SignupStatus } from '@/domain/entities/SignupSession';

export interface CreateCheckoutSessionRequest {
  sessionId: string;
}

export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export class CreateCheckoutSessionUseCase {
  constructor(
    private signupSessionRepository: ISignupSessionRepository,
    private stripeService: StripeService
  ) {}

  async execute(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
    // Validate input
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }

    // Find session
    const session = await this.signupSessionRepository.findBySessionId(request.sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    if (session.status !== SignupStatus.ORG_DETAILS) {
      throw new Error('Organization details must be completed before checkout');
    }

    // Validate required fields for checkout
    if (!session.organizationName || !session.subdomain || !session.email) {
      throw new Error('Missing required organization information');
    }

    try {
      // Create Stripe checkout session
      const checkoutSession = await this.stripeService.createCheckoutSession({
        customerEmail: session.email,
        organizationName: session.organizationName,
        subdomain: session.subdomain,
        sessionId: session.sessionId,
        planType: session.planType
      });

      // Update signup session with Stripe session ID
      const updatedSession = await this.signupSessionRepository.updateStatus(
        request.sessionId,
        SignupStatus.PAYMENT_PENDING,
        { stripeSessionId: checkoutSession.id }
      );

      if (!updatedSession) {
        throw new Error('Failed to update session with Stripe information');
      }

      return {
        checkoutUrl: checkoutSession.url || '',
        sessionId: request.sessionId
      };
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}