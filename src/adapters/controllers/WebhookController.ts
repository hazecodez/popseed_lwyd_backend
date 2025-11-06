import { Request, Response } from 'express';
import { StripeService } from '@/infrastructure/external/StripeService';
import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
// import { PlanType, PlanStatus } from '@/domain/entities/Organization'; // Temporarily disabled for freetrial focus
import { UserRole } from '@/domain/entities/User';
import { ApiResponse } from '@/shared/types';

export class WebhookController {
  constructor(
    private stripeService: StripeService,
    private signupSessionRepository: ISignupSessionRepository,
    private organizationRepository: IOrganizationRepository,
    private userRepository: IUserRepository
  ) {}

  handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        res.status(400).json({ error: 'Missing Stripe signature' });
        return;
      }

      // Construct webhook event
      const event = await this.stripeService.constructWebhookEvent(payload, signature);

      console.log(`Received Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as any);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as any);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as any);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as any);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Webhook processed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed'
      };

      res.status(400).json(response);
    }
  };

  private async handleCheckoutCompleted(sessionData: any): Promise<void> {
    try {
      const stripeSessionId = sessionData.id;
      const metadata = sessionData.metadata || {};
      const signupSessionId = metadata.signup_session_id;

      if (!signupSessionId) {
        throw new Error('No signup session ID in metadata');
      }

      // Find signup session
      const signupSession = await this.signupSessionRepository.findBySessionId(signupSessionId);
      if (!signupSession) {
        throw new Error(`Signup session not found: ${signupSessionId}`);
      }

      const customerId = sessionData.customer;
      const subscriptionId = sessionData.subscription;

      // TODO: Update webhook logic for new schema in future payment implementation
      console.log('Webhook handling temporarily disabled for freetrial focus');
      
      // // Create organization (commented out for now)
      // const organization = await this.organizationRepository.create({
      //   name: signupSession.organizationName,
      //   subdomain: signupSession.subdomain,
      //   planType: 'freetrial',
      //   adminUserId: 'temp-admin-id', // Will be updated when admin is created
      //   contactPhone: signupSession.phoneNumber,
      //   stripeCustomerId: customerId,
      //   stripeSubscriptionId: subscriptionId
      // });

      // Update signup session status
      await this.signupSessionRepository.updateStatus(signupSessionId, 'COMPLETED');

      console.log(`Checkout completed for session: ${signupSessionId}`);
    } catch (error) {
      console.error('Error in handleCheckoutCompleted:', error);
      throw error;
    }
  }

  private async handleSubscriptionCreated(subscriptionData: any): Promise<void> {
    try {
      const customerId = subscriptionData.customer;
      
      // TODO: Update for new schema in future payment implementation
      console.log('Subscription handling temporarily disabled for freetrial focus');
      
      // // Find organization by Stripe customer ID
      // const organization = await this.organizationRepository.findByStripeCustomerId(customerId);
      // if (organization) {
      //   await this.organizationRepository.update(organization.organizationId, {
      //     // Updates will be implemented with new schema
      //   });
      //   console.log(`Subscription created for organization: ${organization.subdomain}`);
      // }
    } catch (error) {
      console.error('Error in handleSubscriptionCreated:', error);
      throw error;
    }
  }

  private async handleSubscriptionUpdated(subscriptionData: any): Promise<void> {
    try {
      const subscriptionId = subscriptionData.id;
      const status = subscriptionData.status;

      // Find organization by subscription ID
      const organization = await this.organizationRepository.findByStripeSubscriptionId(subscriptionId);
      if (organization) {
        // TODO: Update for new schema in future payment implementation
        console.log('Subscription update handling temporarily disabled for freetrial focus');
        
        // // Map Stripe status to our status - will be implemented with new schema
        // await this.organizationRepository.update(organization.organizationId, {
        //   // Updates will be implemented with new schema
        // });
        // console.log(`Subscription updated for organization: ${organization.subdomain}`);
      }
    } catch (error) {
      console.error('Error in handleSubscriptionUpdated:', error);
      throw error;
    }
  }

  private async handlePaymentFailed(invoiceData: any): Promise<void> {
    try {
      const customerId = invoiceData.customer;
      
      // Find organization
      const organization = await this.organizationRepository.findByStripeCustomerId(customerId);
      if (organization) {
        console.warn(`Payment failed for organization: ${organization.subdomain}`);
        // Implement your business logic for payment failures
        // e.g., send notification email, update status, etc.
      }
    } catch (error) {
      console.error('Error in handlePaymentFailed:', error);
      throw error;
    }
  }
}