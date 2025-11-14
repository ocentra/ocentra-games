/**
 * StripeService - Handles Stripe integration for AC purchases and Pro subscriptions.
 * Per spec Section 20: Economic model - Stripe integration.
 * 
 * Note: Stripe is used for:
 * - AI Credits (AC) purchases
 * - Pro subscription purchases
 */

export interface StripeConfig {
  publishableKey: string;
  apiBaseUrl?: string;
}

export interface PurchaseAICreditsRequest {
  userId: string;
  acAmount: number;
  successUrl: string;
  cancelUrl: string;
}

export interface PurchaseAICreditsResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface PurchaseSubscriptionRequest {
  userId: string;
  tier: 'pro' | 'proplus';
  durationDays: number;
  successUrl: string;
  cancelUrl: string;
}

export interface PurchaseSubscriptionResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
}

/**
 * StripeService handles Stripe payment operations.
 */
// Stripe.js types (would be imported from @stripe/stripe-js in production)
interface StripeInstance {
  redirectToCheckout(options: { sessionId: string }): Promise<{ error?: { message?: string } }>;
}

export class StripeService {
  private config: StripeConfig;
  private stripe: StripeInstance | null; // Stripe.js instance (loaded dynamically)

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = null; // Will be loaded on demand
  }

  /**
   * Loads Stripe.js library dynamically.
   * Per spec: Stripe integration for AC purchases and subscriptions.
   */
  private async loadStripe(): Promise<StripeInstance> {
    if (this.stripe !== null) {
      return this.stripe;
    }

    // Dynamic import of Stripe.js
    // In production, this would be loaded from CDN or bundled
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Stripe = require('@stripe/stripe-js');
      const stripeInstance = await Stripe.loadStripe(this.config.publishableKey);
      if (!stripeInstance) {
        throw new Error('Failed to initialize Stripe');
      }
      this.stripe = stripeInstance as StripeInstance;
      return this.stripe;
    } catch (error) {
      console.error('[StripeService] Failed to load Stripe.js:', error);
      throw new Error('Stripe.js library not available');
    }
  }

  /**
   * Creates a checkout session for AI Credits purchase.
   * Per spec Section 20.1.6: AC purchase via Stripe.
   */
  async purchaseAICredits(
    request: PurchaseAICreditsRequest
  ): Promise<PurchaseAICreditsResult> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || '/api';
      const response = await fetch(`${apiBaseUrl}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ai_credits',
          userId: request.userId,
          acAmount: request.acAmount,
          successUrl: request.successUrl,
          cancelUrl: request.cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create checkout session',
        };
      }

      const result = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await this.loadStripe();
      if (stripe && result.sessionId) {
        const { error: redirectError } = await stripe.redirectToCheckout({
          sessionId: result.sessionId,
        });

        if (redirectError) {
          return {
            success: false,
            error: redirectError.message || 'Failed to redirect to checkout',
          };
        }
      }

      return {
        success: true,
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      };
    } catch (error) {
      console.error('[StripeService] Failed to purchase AI credits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Creates a checkout session for Pro subscription purchase.
   * Per spec Section 20.1.5: Pro subscription via Stripe.
   */
  async purchaseSubscription(
    request: PurchaseSubscriptionRequest
  ): Promise<PurchaseSubscriptionResult> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || '/api';
      const response = await fetch(`${apiBaseUrl}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'subscription',
          userId: request.userId,
          tier: request.tier,
          durationDays: request.durationDays,
          successUrl: request.successUrl,
          cancelUrl: request.cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create checkout session',
        };
      }

      const result = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await this.loadStripe();
      if (stripe && result.sessionId) {
        const { error: redirectError } = await stripe.redirectToCheckout({
          sessionId: result.sessionId,
        });

        if (redirectError) {
          return {
            success: false,
            error: redirectError.message || 'Failed to redirect to checkout',
          };
        }
      }

      return {
        success: true,
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl,
      };
    } catch (error) {
      console.error('[StripeService] Failed to purchase subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handles Stripe webhook events.
   * Called by backend when Stripe sends webhook events.
   */
  async handleWebhook(event: { type: string; data: unknown }): Promise<{ success: boolean; error?: string }> {
    try {
      const apiBaseUrl = this.config.apiBaseUrl || '/api';
      const response = await fetch(`${apiBaseUrl}/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to handle webhook',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[StripeService] Failed to handle webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

