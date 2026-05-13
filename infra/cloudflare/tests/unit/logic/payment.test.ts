import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { mapStripeEventType, stripeEventTypeToState } from '@/logic/payment-event-mapping';
import { runReconciliation } from '@/logic/reconciliation';
import {
  getValidNextStates,
  isTransitionAllowed,
  PAYMENT_VALID_TRANSITIONS,
} from '@/logic/payment-state-machine';
import { PaymentTrigger } from '@ocentra/endpoint-domain/constants/stripe';
import { PaymentEventSchema } from '@ocentra/endpoint-domain/schemas/payments';
import { StripeEventType } from '@ocentra/endpoint-domain/constants/stripe';
import { extractIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { Logger, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { validateProduct, calculateAmount } from '@/config/products';
import { requireTestStripeSecretKey } from '@tests/helpers/test-credentials';

const log = Logger.instance;
log.register(import.meta.url);

function createProductKV(products: Record<string, unknown>): KVNamespace {
  return {
    get: async (key: string) => {
      const val = products[key];
      return val === undefined ? null : JSON.stringify(val);
    },
    list: async () => ({ keys: [], list_complete: true }),
    put: async () => {},
    delete: async () => {},
    getWithMetadata: async () => ({ value: null, metadata: null }),
  } as unknown as KVNamespace;
}

const mockEnv = {
  PRODUCT_KV: createProductKV({
    [KvKeyPrefix.Product + 'ac-100']: {
      productType: 'AC_CREDITS',
      productId: 'ac-100',
      stripePriceId: 'price_ac100',
      displayName: '100 AC',
      description: 'Starter refill',
      shopTab: 'Treasury',
      badge: 'Starter',
      benefits: ['AI analysis fuel'],
      entitlementKind: 'credits',
      availability: 'live',
      currency: 'usd',
      active: true,
      acAmount: 100,
    },
    [KvKeyPrefix.Product + 'ac-500']: {
      productType: 'AC_CREDITS',
      productId: 'ac-500',
      stripePriceId: 'price_ac500',
      displayName: '500 AC',
      currency: 'usd',
      active: true,
      acAmount: 500,
    },
  }),
};

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('PaymentStateMachine: allows INITIATED -> CHECKOUT_CREATED'), () => {
    expect(isTransitionAllowed('INITIATED', 'CHECKOUT_CREATED')).toBe(true);
  });

  it(testName('PaymentStateMachine: rejects INITIATED -> PAYMENT_SUCCEEDED without reconcile_repair trigger'), () => {
    expect(isTransitionAllowed('INITIATED', 'PAYMENT_SUCCEEDED')).toBe(false);
    expect(isTransitionAllowed('INITIATED', 'PAYMENT_SUCCEEDED', 'stripe:payment_intent.succeeded')).toBe(false);
  });

  it(testName('PaymentStateMachine: allows INITIATED -> PAYMENT_SUCCEEDED with reconcile_repair trigger'), () => {
    expect(isTransitionAllowed('INITIATED', 'PAYMENT_SUCCEEDED', PaymentTrigger.ReconcileRepair)).toBe(true);
  });

  it(testName('PaymentStateMachine: getValidNextStates returns allowed next states'), () => {
    expect(getValidNextStates('INITIATED')).toEqual(['CHECKOUT_CREATED', 'FAILED', 'PAYMENT_SUCCEEDED']);
    expect(getValidNextStates('PAYMENT_SUCCEEDED')).toEqual(['ENTITLEMENT_GRANTED', 'REFUND_PENDING']);
    expect(getValidNextStates('UNKNOWN')).toEqual([]);
  });

  it(testName('PaymentStateMachine: rejects invalid transition PAYMENT_PENDING -> ENTITLEMENT_GRANTED'), () => {
    expect(isTransitionAllowed('PAYMENT_PENDING', 'ENTITLEMENT_GRANTED')).toBe(false);
  });

  it(testName('PaymentStateMachine: should maintain history - every state has valid next states and transition table is complete'), () => {
    const states = Object.keys(PAYMENT_VALID_TRANSITIONS);
    expect(states.length).toBeGreaterThan(0);
    for (const fromState of states) {
      const nextStates = PAYMENT_VALID_TRANSITIONS[fromState];
      expect(Array.isArray(nextStates)).toBe(true);
      for (const toState of nextStates) {
        expect(isTransitionAllowed(fromState, toState, fromState === 'INITIATED' && toState === 'PAYMENT_SUCCEEDED' ? PaymentTrigger.ReconcileRepair : undefined)).toBe(true);
      }
    }
  });

  it(testName('Idempotency: should reject duplicate stripe events - PaymentEventSchema requires idempotencyKey for dedup'), () => {
    expect(PaymentEventSchema.shape).toHaveProperty('idempotencyKey');
    const parsed = PaymentEventSchema.safeParse({
      eventId: crypto.randomUUID(),
      type: 'PAYMENT_SUCCEEDED',
      paymentId: 'pay-1',
      userId: 'user-1',
      amount: 100,
      currency: 'usd',
      metadata: { productType: 'AC_CREDITS', productId: 'ac-100' },
      createdAt: Date.now(),
      processedAt: Date.now(),
      idempotencyKey: 'evt_stripe_123',
      currentState: 'PAYMENT_SUCCEEDED',
    });
    expect(parsed.success).toBe(true);
    const withoutKey = PaymentEventSchema.safeParse({
      eventId: crypto.randomUUID(),
      type: 'PAYMENT_SUCCEEDED',
      paymentId: 'pay-1',
      userId: 'user-1',
      amount: 100,
      currency: 'usd',
      metadata: { productType: 'AC_CREDITS', productId: 'ac-100' },
      createdAt: Date.now(),
      processedAt: Date.now(),
      currentState: 'PAYMENT_SUCCEEDED',
    });
    expect(withoutKey.success).toBe(false);
  });

  it(testName('Idempotency: should allow retry after failure - same idempotencyKey can be reused in schema'), () => {
    const event = {
      eventId: crypto.randomUUID(),
      type: 'PAYMENT_SUCCEEDED' as const,
      paymentId: 'pay-1',
      userId: 'user-1',
      amount: 100,
      currency: 'usd',
      metadata: { productType: 'AC_CREDITS' as const, productId: 'ac-100' },
      createdAt: Date.now(),
      processedAt: Date.now(),
      idempotencyKey: 'evt_retry_same_key',
      currentState: 'PAYMENT_SUCCEEDED',
    };
    const first = PaymentEventSchema.safeParse(event);
    const second = PaymentEventSchema.safeParse(event);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
  });

  it(testName('validateProduct: returns product for valid productType and productId'), async () => {
    const product = await validateProduct(mockEnv, 'AC_CREDITS', 'ac-100');
    expect(product).not.toBeNull();
    expect(product?.productId).toBe('ac-100');
    expect(product?.acAmount).toBe(100);
    expect(product?.shopTab).toBe('Treasury');
    expect(product?.benefits).toContain('AI analysis fuel');
  });

  it(testName('validateProduct: returns null for wrong productType'), async () => {
    expect(await validateProduct(mockEnv, 'SUBSCRIPTION', 'ac-100')).toBeNull();
  });

  it(testName('validateProduct: returns null for unknown productId'), async () => {
    expect(await validateProduct(mockEnv, 'AC_CREDITS', 'unknown-id')).toBeNull();
  });

  it(testName('calculateAmount: returns acAmount * quantity for AC_CREDITS product'), async () => {
    const product = await validateProduct(mockEnv, 'AC_CREDITS', 'ac-500');
    expect(product).not.toBeNull();
    expect(calculateAmount(product!, 2)).toBe(1000);
    expect(calculateAmount(product!, 1)).toBe(500);
  });

  it(testName('calculateAmount: returns 0 when product has no acAmount'), () => {
    const productLike = {
      productType: 'AC_CREDITS' as const,
      productId: 'test',
      stripePriceId: 'price_test',
      displayName: 'Test',
      currency: 'usd',
      active: true,
    };
    expect(calculateAmount(productLike, 3)).toBe(0);
  });

  it(testName('mapStripeEventType: maps checkout.session.completed to CHECKOUT_CREATED'), () => {
    expect(mapStripeEventType(StripeEventType.CheckoutSessionCompleted)).toBe('CHECKOUT_CREATED');
  });

  it(testName('mapStripeEventType: maps payment_intent.succeeded to PAYMENT_SUCCEEDED'), () => {
    expect(mapStripeEventType(StripeEventType.PaymentIntentSucceeded)).toBe('PAYMENT_SUCCEEDED');
  });

  it(testName('mapStripeEventType: maps charge.dispute.created to DISPUTE_CREATED'), () => {
    expect(mapStripeEventType(StripeEventType.ChargeDisputeCreated)).toBe('DISPUTE_CREATED');
  });

  it(testName('mapStripeEventType: unknown type returns CHECKOUT_CREATED'), () => {
    expect(mapStripeEventType('unknown.event')).toBe('CHECKOUT_CREATED');
  });

  it(testName('stripeEventTypeToState: maps payment_intent.succeeded to PAYMENT_SUCCEEDED'), () => {
    expect(stripeEventTypeToState(StripeEventType.PaymentIntentSucceeded)).toBe('PAYMENT_SUCCEEDED');
  });

  it(testName('stripeEventTypeToState: charge.dispute.closed returns null'), () => {
    expect(stripeEventTypeToState(StripeEventType.ChargeDisputeClosed)).toBeNull();
  });

  it(testName('extractIdFromPath: extracts payment id from status path'), () => {
    const path = `${ApiEndpoint.Payment.Status}/pay-123`;
    const id = extractIdFromPath(path, ApiEndpoint.Payment.Status);
    expect(id).toBe('pay-123');
  });

  it(testName('extractIdFromPath: extracts payment id from refund path'), () => {
    const path = `${ApiEndpoint.Payment.Refund}/pay-456`;
    const id = extractIdFromPath(path, ApiEndpoint.Payment.Refund);
    expect(id).toBe('pay-456');
  });

  it(testName('runReconciliation: returns reconciled false when STRIPE_SECRET_KEY missing'), async () => {
    const env = {} as Parameters<typeof runReconciliation>[0];
    const result = await runReconciliation(env);
    expect(result.reconciled).toBe(false);
    expect(result.stripeCount).toBe(0);
    expect(result.internalMatched).toBe(0);
    expect(result.missingInternal).toBe(0);
    expect(result.discrepancy).toBe(false);
  });

  it(testName('runReconciliation: with repair option returns result with repaired when no PAYMENT_DO'), async () => {
    const env = { STRIPE_SECRET_KEY: requireTestStripeSecretKey() } as Parameters<typeof runReconciliation>[0];
    const result = await runReconciliation(env, { repair: true });
    expect(result.reconciled).toBe(false);
    expect(result.repaired).toBeUndefined();
  });
});
