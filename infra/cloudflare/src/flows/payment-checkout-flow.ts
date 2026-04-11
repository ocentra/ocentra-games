import { fetchFromDO } from '@/utils/durable-object-request';
import { validateProduct, calculateAmount } from '@/config/products';
import { PaymentDO as PaymentDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { CreateCheckoutRequest } from '@ocentra/endpoint-domain/schemas/payments';
import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { StripeApiVersion } from '@/constants/stripe';

type PaymentCheckoutSession = {
  id: string;
  url: string | null;
  expires_at: number | null;
};

type PaymentStripeClient = {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<PaymentCheckoutSession>;
    };
  };
};

export type PaymentCheckoutFlowInput =
  | {
      kind: 'test-init';
      paymentId: string;
      amount: number;
    }
  | {
      kind: 'checkout';
      productType: CreateCheckoutRequest['productType'];
      productId: string;
      quantity: number;
      successUrl: string;
      cancelUrl: string;
    };

export type PaymentCheckoutFlowBody =
  | {
      error: string;
    }
  | {
      paymentId: string;
      amount: number;
    }
  | {
      paymentId: string;
      checkoutSessionId: string;
      url: string | null;
      expiresAt: number;
    };

export interface PaymentCheckoutFlowDeps {
  createStripeClient?: (secret: string) => Promise<PaymentStripeClient>;
  validateProduct?: typeof validateProduct;
  calculateAmount?: typeof calculateAmount;
}

function getPaymentStub(env: FlowContext['env'], userId: string): DurableObjectStub | null {
  const ns = env.PAYMENT_DO;
  if (!ns) return null;
  return ns.get(ns.idFromName(userId));
}

async function defaultCreateStripeClient(secret: string): Promise<PaymentStripeClient> {
  const Stripe = (await import('stripe')).default;
  return new Stripe(secret, {
    apiVersion: StripeApiVersion,
    httpClient: (Stripe as { createFetchHttpClient?: () => unknown }).createFetchHttpClient?.() as never,
  }) as PaymentStripeClient;
}

function toJsonString(value: unknown): string {
  return JSON.stringify(value);
}

export class PaymentCheckoutFlow extends BaseFlow<PaymentCheckoutFlowInput, PaymentCheckoutFlowBody> {
  constructor(private readonly deps: PaymentCheckoutFlowDeps = {}) {
    super();
  }

  async execute(context: FlowContext, input: PaymentCheckoutFlowInput): Promise<FlowResult<PaymentCheckoutFlowBody>> {
    const authUserId = context.authUserId;
    if (!authUserId) {
      return {
        status: HttpStatus.Unauthorized,
        body: { error: 'Authentication required' },
      };
    }

    const stub = getPaymentStub(context.env, authUserId);
    if (!stub) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Payment service unavailable' },
      };
    }

    if (input.kind === 'test-init') {
      return this.runTestInit(context, stub, authUserId, input);
    }

    return this.runCheckout(context, stub, authUserId, input);
  }

  private async runTestInit(
    _context: FlowContext,
    stub: DurableObjectStub,
    userId: string,
    input: Extract<PaymentCheckoutFlowInput, { kind: 'test-init' }>
  ): Promise<FlowResult<PaymentCheckoutFlowBody>> {
    const initRes = await fetchFromDO(stub, PaymentDOPaths.InitPayment, {
      method: HttpMethod.Post,
      body: toJsonString({
        paymentId: input.paymentId,
        userId,
        amount: input.amount,
        currency: 'usd',
        productType: 'AC_CREDITS',
        productId: 'test',
      }),
    });
    if (!initRes.ok) {
      await initRes.text().catch(() => undefined);
      return {
        status: HttpStatus.InternalServerError,
        body: { error: 'Failed to initialize payment' },
      };
    }

    const transitionRes1 = await fetchFromDO(stub, PaymentDOPaths.Transition, {
      method: HttpMethod.Post,
      body: toJsonString({ paymentId: input.paymentId, toState: 'CHECKOUT_CREATED', trigger: 'test_init' }),
    });
    await transitionRes1.text().catch(() => undefined);

    const transitionRes2 = await fetchFromDO(stub, PaymentDOPaths.Transition, {
      method: HttpMethod.Post,
      body: toJsonString({ paymentId: input.paymentId, toState: 'PAYMENT_PENDING', trigger: 'test_init' }),
    });
    await transitionRes2.text().catch(() => undefined);

    return {
      status: HttpStatus.Ok,
      body: {
        paymentId: input.paymentId,
        amount: input.amount,
      },
    };
  }

  private async runCheckout(
    context: FlowContext,
    stub: DurableObjectStub,
    userId: string,
    input: Extract<PaymentCheckoutFlowInput, { kind: 'checkout' }>
  ): Promise<FlowResult<PaymentCheckoutFlowBody>> {
    const validateProductFn = this.deps.validateProduct ?? validateProduct;
    const product = await validateProductFn(
      context.env,
      input.productType,
      input.productId
    );
    if (!product) {
      return {
        status: HttpStatus.BadRequest,
        body: { error: 'Invalid product' },
      };
    }

    const calculateAmountFn = this.deps.calculateAmount ?? calculateAmount;
    const amount = calculateAmountFn(product, input.quantity);
    const paymentId = crypto.randomUUID();

    const initRes = await fetchFromDO(stub, PaymentDOPaths.InitPayment, {
      method: HttpMethod.Post,
      body: toJsonString({
        paymentId,
        userId,
        amount,
        currency: product.currency,
        productType: input.productType,
        productId: input.productId,
      }),
    });
    if (!initRes.ok) {
      await initRes.text().catch(() => undefined);
      return {
        status: HttpStatus.InternalServerError,
        body: { error: 'Failed to initialize payment' },
      };
    }

    const secret = context.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Stripe not configured' },
      };
    }

    const stripeClient = await (this.deps.createStripeClient ?? defaultCreateStripeClient)(secret);
    const lineItems = product.unitPriceCents != null
      ? [{
          price_data: {
            currency: product.currency,
            product_data: { name: product.displayName, metadata: { productType: input.productType, productId: input.productId, paymentId } },
            unit_amount: product.unitPriceCents,
          },
          quantity: input.quantity,
        }]
      : [{ price: product.stripePriceId, quantity: input.quantity }];

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: paymentId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: lineItems,
      metadata: { userId, productType: input.productType, productId: input.productId, paymentId },
      payment_intent_data: { metadata: { userId, paymentId } },
    });

    const transitionRes = await fetchFromDO(stub, PaymentDOPaths.Transition, {
      method: HttpMethod.Post,
      body: toJsonString({
        paymentId,
        toState: 'CHECKOUT_CREATED',
        trigger: 'checkout_created',
        stripeCheckoutSessionId: session.id,
      }),
    });
    await transitionRes.text().catch(() => undefined);

    return {
      status: HttpStatus.Ok,
      body: {
        paymentId,
        checkoutSessionId: session.id,
        url: session.url,
        expiresAt: session.expires_at ?? 0,
      },
    };
  }
}
