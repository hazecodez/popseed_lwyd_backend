import { Router } from 'express';
import { SignupController } from '@/adapters/controllers/SignupController';
import { WebhookController } from '@/adapters/controllers/WebhookController';

export function createSignupRoutes(
  signupController: SignupController,
  webhookController: WebhookController
): Router {
  const router = Router();

  // Signup flow routes
  router.post('/signup/create-account', signupController.createAccount);
  router.post('/signup/select-plan', signupController.selectPlan);
  router.get('/check-subdomain/:subdomain', signupController.checkSubdomain);
  router.post('/signup/organization', signupController.saveOrganizationDetails);
  router.post('/signup/create-checkout', signupController.createCheckoutSession);
  router.get('/signup/session/:sessionId', signupController.getSessionInfo);

  // Development helper routes
  router.post('/signup/create-test-account', signupController.createTestAccount);
  
  // Organization creation from session (for freetrial flow)
  router.post('/signup/create-organization', signupController.createOrganizationFromSession);

  // Stripe webhook (raw body needed for signature verification)
  router.post('/webhooks/stripe', webhookController.handleStripeWebhook);

  return router;
}