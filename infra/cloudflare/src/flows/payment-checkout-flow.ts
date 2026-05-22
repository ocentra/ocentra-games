import { fetchFromDO } from '@/utils/durable-object-request';
import { validateProduct, calculateAmount, saveProductToKV } from '@/config/products';
import { PaymentDO as PaymentDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { CreateCheckoutRequest } from '@ocentra/endpoint-domain/schemas/payments';
import { BaseFlow } from '@/flows/core/BaseFlow';
import type { FlowContext } from '@/flows/core/FlowContext';
import type { FlowResult } from '@/flows/core/FlowResult';
import { StripeApiVersion } from '@/constants/stripe';
import type { Product } from '@/config/products';

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
  customers: {
    create(params: Record<string, unknown>): Promise<{ id: string }>;
  };
  products: {
    create(params: Record<string, unknown>): Promise<{ id: string }>;
  };
  prices: {
    create(params: Record<string, unknown>): Promise<{ id: string }>;
  };
};

export type PaymentCheckoutFlowInput =
  | {
      kind: 'test-init';
      paymentId: string;
      amount: number;
      productType?: CreateCheckoutRequest['productType'];
      productId?: string;
      entitlementKind?: Product['entitlementKind'];
      subscriptionTier?: string;
      quantity?: number;
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
  }) as unknown as PaymentStripeClient;
}

function toJsonString(value: unknown): string {
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripeRefs(product: Product): Record<string, unknown> {
  const refs = product.providerRefs?.stripe;
  return isRecord(refs) ? refs : {};
}

function cleanStripeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value || value.startsWith('price_placeholder_')) return undefined;
  return value;
}

function resolveStripePriceId(product: Product): string | undefined {
  return cleanStripeId(stripeRefs(product).priceId) ?? cleanStripeId(product.stripePriceId);
}

function resolveBillingMode(product: Product): 'payment' | 'subscription' {
  if (product.billingMode === 'payment' || product.billingMode === 'subscription') return product.billingMode;
  if (product.productType === 'SUBSCRIPTION' && product.subscriptionTier !== 'founder') return 'subscription';
  return 'payment';
}

function shouldAutoMaterializeStripeProduct(env: FlowContext['env']): boolean {
  return env.STRIPE_AUTO_MATERIALIZE_PRODUCTS === 'true';
}

function automaticTaxEnabled(env: FlowContext['env']): boolean {
  return env.STRIPE_AUTOMATIC_TAX_ENABLED === 'true';
}

async function materializeStripeProductIfAllowed(
  env: FlowContext['env'],
  stripeClient: PaymentStripeClient,
  product: Product,
  billingMode: 'payment' | 'subscription'
): Promise<string | undefined> {
  if (!shouldAutoMaterializeStripeProduct(env)) return undefined;
  if (!env.PRODUCT_KV || product.unitPriceCents == null || product.unitPriceCents <= 0) return undefined;
  const refs = stripeRefs(product);
  const stripeProduct = await stripeClient.products.create({
    name: product.displayName,
    metadata: {
      productId: product.productId,
      productType: product.productType,
      entitlementKind: product.entitlementKind ?? '',
      subscriptionTier: product.subscriptionTier ?? '',
    },
  });
  const priceParams: Record<string, unknown> = {
    product: stripeProduct.id,
    unit_amount: product.unitPriceCents,
    currency: product.currency,
    metadata: {
      productId: product.productId,
      productType: product.productType,
      entitlementKind: product.entitlementKind ?? '',
      subscriptionTier: product.subscriptionTier ?? '',
    },
  };
  if (billingMode === 'subscription') {
    priceParams.recurring = { interval: 'month' };
  }
  const price = await stripeClient.prices.create(priceParams);
  const updatedProduct: Product = {
    ...product,
    stripeProductId: stripeProduct.id,
    stripePriceId: price.id,
    billingMode,
    providerRefs: {
      ...product.providerRefs,
      stripe: {
        ...refs,
        productId: stripeProduct.id,
        priceId: price.id,
        mode: billingMode,
      },
    },
  };
  await saveProductToKV(env, updatedProduct);
  return price.id;
}

async function getOrCreateStripeCustomerId(
  stub: DurableObjectStub,
  stripeClient: PaymentStripeClient,
  userId: string
): Promise<string> {
  const existingRes = await fetchFromDO(stub, PaymentDOPaths.StripeCustomer, { method: HttpMethod.Get });
  const existing = await existingRes.json().catch(() => ({})) as { stripeCustomerId?: string | null };
  if (typeof existing.stripeCustomerId === 'string' && existing.stripeCustomerId) {
    return existing.stripeCustomerId;
  }
  const customer = await stripeClient.customers.create({
    metadata: { userId },
  });
  await fetchFromDO(stub, PaymentDOPaths.StripeCustomer, {
    method: HttpMethod.Post,
    body: toJsonString({ stripeCustomerId: customer.id }),
  }).then((res) => res.text().catch(() => undefined));
  return customer.id;
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
        provider: 'stripe',
        productType: input.productType ?? 'AC_CREDITS',
        productId: input.productId ?? 'test',
        quantity: input.quantity ?? 1,
        entitlementKind: input.entitlementKind ?? 'credits',
        acAmount: input.amount,
        subscriptionTier: input.subscriptionTier,
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
    const secret = context.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Stripe not configured' },
      };
    }

    const stripeClient = await (this.deps.createStripeClient ?? defaultCreateStripeClient)(secret);
    const billingMode = resolveBillingMode(product);
    const stripePriceId = resolveStripePriceId(product)
      ?? await materializeStripeProductIfAllowed(context.env, stripeClient, product, billingMode);
    if (!stripePriceId) {
      return {
        status: HttpStatus.ServiceUnavailable,
        body: { error: 'Stripe price not configured' },
      };
    }
    const stripeCustomerId = await getOrCreateStripeCustomerId(stub, stripeClient, userId);

    const initRes = await fetchFromDO(stub, PaymentDOPaths.InitPayment, {
      method: HttpMethod.Post,
      body: toJsonString({
        paymentId,
        userId,
        amount,
        currency: product.currency,
        provider: 'stripe',
        productType: input.productType,
        productId: input.productId,
        quantity: input.quantity,
        entitlementKind: product.entitlementKind,
        acAmount: product.acAmount,
        subscriptionTier: product.subscriptionTier,
        stripeCustomerId,
      }),
    });
    if (!initRes.ok) {
      await initRes.text().catch(() => undefined);
      return {
        status: HttpStatus.InternalServerError,
        body: { error: 'Failed to initialize payment' },
      };
    }

    const metadata = {
      userId,
      productType: input.productType,
      productId: input.productId,
      paymentId,
      entitlementKind: product.entitlementKind ?? '',
      subscriptionTier: product.subscriptionTier ?? '',
    };
    const sessionParams: Record<string, unknown> = {
      mode: billingMode,
      customer: stripeCustomerId,
      client_reference_id: paymentId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: [{ price: stripePriceId, quantity: input.quantity }],
      metadata,
      allow_promotion_codes: true,
    };
    if (automaticTaxEnabled(context.env)) {
      sessionParams.automatic_tax = { enabled: true };
    }
    if (billingMode === 'subscription') {
      sessionParams.subscription_data = { metadata };
    } else {
      sessionParams.payment_intent_data = { metadata };
    }

    const session = await stripeClient.checkout.sessions.create(sessionParams);

    const transitionRes = await fetchFromDO(stub, PaymentDOPaths.Transition, {
      method: HttpMethod.Post,
      body: toJsonString({
        paymentId,
        toState: 'CHECKOUT_CREATED',
        trigger: 'checkout_created',
        stripeCheckoutSessionId: session.id,
        stripeCustomerId,
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
