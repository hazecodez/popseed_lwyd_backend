import Stripe from 'stripe';
import { config } from '@/shared/config';

export interface CheckoutSessionData {
  customerEmail: string;
  organizationName: string;
  subdomain: string;
  sessionId: string;
  planType: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PlanInfo {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trial_days: number;
  features: string[];
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    console.log('🔑 Stripe Secret Key (first 20 chars):', config.stripe.secretKey?.substring(0, 20) + '...');
    console.log('🔑 Full key length:', config.stripe.secretKey?.length);
    
    if (!config.stripe.secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    this.stripe = new Stripe(config.stripe.secretKey);
    console.log('✅ Stripe instance created successfully');
  }

  private readonly PLANS = {
    ENTERPRISE: {
      name: 'Enterprise Plan',
      price: 14900, // $149.00 in cents
      currency: 'usd',
      interval: 'month' as const,
      trial_period_days: 14,
      features: [
        'Account Management + Design + Creative Strategy teams',
        'Finance module included',
        'Up to 50 users',
        'Custom workflows',
        'Priority support'
      ]
    }
  };

  async createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email,
        name,
        metadata: metadata || {}
      });
    } catch (error) {
      throw new Error(`Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrCreatePrice(planType: keyof typeof this.PLANS = 'ENTERPRISE'): Promise<Stripe.Price> {
    try {
      const plan = this.PLANS[planType];
      if (!plan) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      // First, try to find existing product by name
      const existingProducts = await this.stripe.products.list({
        limit: 100,
      });

      let product = existingProducts.data.find(p => 
        p.name === plan.name && p.active === true
      );

      // If product doesn't exist, create it
      if (!product) {
        console.log(`Creating new Stripe product: ${plan.name}`);
        product = await this.stripe.products.create({
          name: plan.name,
          description: `Popseed.ai ${plan.name} - Creative Agency Management Platform`,
          metadata: { plan_type: planType }
        });
      } else {
        console.log(`Found existing Stripe product: ${plan.name} (${product.id})`);
      }

      // Now check if price already exists for this product
      const existingPrices = await this.stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });

      let price = existingPrices.data.find(p => 
        p.unit_amount === plan.price &&
        p.currency === plan.currency &&
        p.recurring?.interval === plan.interval
      );

      // If price doesn't exist, create it
      if (!price) {
        console.log(`Creating new Stripe price for ${plan.name}: $${plan.price/100}`);
        price = await this.stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: plan.currency,
          recurring: { interval: plan.interval },
          metadata: { plan_type: planType }
        });
      } else {
        console.log(`Found existing Stripe price: ${price.id} ($${price.unit_amount!/100})`);
      }

      return price;
    } catch (error) {
      throw new Error(`Failed to get or create Stripe price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCheckoutSession(data: CheckoutSessionData): Promise<Stripe.Checkout.Session> {
    try {
      // Get or create price for the plan (avoids duplicates)
      const price = await this.getOrCreatePrice(data.planType as keyof typeof this.PLANS);

      const successUrl = data.successUrl || `${config.frontend.baseUrl}/signup/processing?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = data.cancelUrl || `${config.frontend.baseUrl}/signup/checkout`;

      return await this.stripe.checkout.sessions.create({
        customer_email: data.customerEmail,
        payment_method_types: ['card'],
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            organization_name: data.organizationName,
            subdomain: data.subdomain,
            signup_session_id: data.sessionId
          }
        },
        metadata: {
          organization_name: data.organizationName,
          subdomain: data.subdomain,
          signup_session_id: data.sessionId,
          plan_type: data.planType
        }
      });
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      throw new Error(`Failed to retrieve session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      throw new Error(`Failed to retrieve subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async constructWebhookEvent(payload: Buffer, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret || ''
      );
    } catch (error) {
      throw new Error(`Failed to verify webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getPlanInfo(planType: keyof typeof this.PLANS = 'ENTERPRISE'): PlanInfo {
    const plan = this.PLANS[planType];
    if (!plan) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    return {
      name: plan.name,
      price: plan.price / 100, // Convert cents to dollars
      currency: plan.currency.toUpperCase(),
      interval: plan.interval,
      trial_days: plan.trial_period_days,
      features: plan.features
    };
  }
}