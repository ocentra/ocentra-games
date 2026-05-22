import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { StripeEndpoint, StripeEventType } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, buildCreditsApiUrl } from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  ensureContextReady,
  createTestContext,
  setCurrentContext,
  createSetupContextToken,
  getTokenForFetch,
} from '@tests/test-setup-core';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { TestWorkerBindings } from '@tests/constants/test-worker-bindings';
import { createStripeSignatureHeader } from '@/utils/stripe-webhook-signature';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const WEBHOOK_SECRET = TestWorkerBindings.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_integration_secret_32chars_!!';

function buildStripeWebhookPayload(opts: {
  eventId: string;
  type: string;
  userId?: string;
  paymentId?: string;
  amountCents?: number;
  chargeId?: string;
  usePaymentIntentAmount?: boolean;
  includeClientReference?: boolean;
  metadata?: Record<string, string>;
  subscriptionDetailsMetadata?: Record<string, string>;
  customerId?: string;
  subscriptionId?: string;
}): string {
  const stripeObject: Record<string, unknown> = {
    id: opts.paymentId ? `pi_test_${opts.paymentId.slice(0, 8)}` : `pi_test_${Date.now()}`,
    metadata: opts.userId ? { userId: opts.userId, paymentId: opts.paymentId, ...(opts.metadata ?? {}) } : {},
  };
  if (opts.usePaymentIntentAmount) {
    stripeObject.amount = opts.amountCents ?? 10000;
  } else {
    stripeObject.amount_total = opts.amountCents ?? 10000;
  }
  if (opts.includeClientReference ?? true) {
    stripeObject.client_reference_id = opts.paymentId;
  }
  if (opts.subscriptionDetailsMetadata) {
    stripeObject.subscription_details = { metadata: opts.subscriptionDetailsMetadata };
  }
  if (opts.customerId) {
    stripeObject.customer = opts.customerId;
  }
  if (opts.subscriptionId) {
    stripeObject.subscription = opts.subscriptionId;
  }

  const base: Record<string, unknown> = {
    id: opts.eventId,
    type: opts.type,
    data: {
      object: stripeObject,
    },
  };

  if (opts.chargeId) {
    const dataObj = base.data as Record<string, unknown> | undefined;
    const existing = dataObj?.object && typeof dataObj.object === 'object' ? dataObj.object as Record<string, unknown> : {};
    if (dataObj) dataObj.object = { ...existing, charge: opts.chargeId };
  }

  return JSON.stringify(base);
}

async function signStripeWebhook(payload: string, secret: string): Promise<string> {
  return createStripeSignatureHeader(payload, secret);
}

async function consumeResponse(response: Response): Promise<void> {
  try {
    await response.text();
  } catch {
    void 0;
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      log.logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  describe('Webhook Signature Verification', () => {
    it(testName('should reject webhook with missing signature'), async () => {
      const token = getTokenForFetch();
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({ type: 'payment_intent.succeeded', data: { object: {} } }),
      }, token);

      expect(res.status).toBe(HttpStatus.Unauthorized);
      await consumeResponse(res);
    });

    it(testName('should reject webhook with invalid signature'), async () => {
      const token = getTokenForFetch();
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: 'invalid_signature',
        },
        body: JSON.stringify({ type: 'payment_intent.succeeded', data: { object: {} } }),
      }, token);

      expect(res.status).toBe(HttpStatus.Unauthorized);
      await consumeResponse(res);
    });

    it(testName('Rule 3.1.11: should reject webhook signed with different env secret (cross-env replay)'), async () => {
      const token = getTokenForFetch();
      const otherEnvSecret = 'whsec_other_env_secret_32chars!!';
      const payload = buildStripeWebhookPayload({
        eventId: `evt_other_${Date.now()}`,
        type: StripeEventType.PaymentIntentSucceeded,
      });
      const signature = await signStripeWebhook(payload, otherEnvSecret);

      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      expect(res.status).toBe(HttpStatus.Unauthorized);
      await consumeResponse(res);
    });

    it(testName('should accept webhook with valid signature'), async () => {
      const token = getTokenForFetch();
      const payload = buildStripeWebhookPayload({
        eventId: `evt_valid_${Date.now()}`,
        type: StripeEventType.PaymentIntentSucceeded,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);

      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      // Should return 200 even if user not found (to prevent retry loops)
      expect(res.status).toBe(HttpStatus.Ok);
      await consumeResponse(res);
    });
  });

  describe('Webhook Idempotency', () => {
    it(testName('should process payment_intent.succeeded only once'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `webhook-idem-${Date.now()}`;
      const paymentId = crypto.randomUUID();
      const acAmount = 50;

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: acAmount }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      // Get balance before
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceBeforeRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceBefore = await balanceBeforeRes.json() as { ac_balance: number };

      // Send webhook
      const eventId = `evt_idem_${paymentId.slice(0, 8)}`;
      const payload = buildStripeWebhookPayload({
        eventId,
        type: StripeEventType.PaymentIntentSucceeded,
        userId,
        paymentId,
        amountCents: acAmount * 100,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const webhook1 = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      expect(webhook1.status).toBe(HttpStatus.Ok);
      await consumeResponse(webhook1);

      // Get balance after first webhook
      const balanceAfter1Res = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceAfter1 = await balanceAfter1Res.json() as { ac_balance: number };
      expect(balanceAfter1.ac_balance).toBe(balanceBefore.ac_balance + acAmount);

      // Send same webhook again
      const webhook2 = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      expect(webhook2.status).toBe(HttpStatus.Ok);
      await consumeResponse(webhook2);

      // Get balance after second webhook
      const balanceAfter2Res = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceAfter2 = await balanceAfter2Res.json() as { ac_balance: number };
      
      // Balance should not change
      expect(balanceAfter2.ac_balance).toBe(balanceAfter1.ac_balance);
    });

    it(testName('should settle real payment_intent payload from metadata payment id'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `webhook-real-pi-${Date.now()}`;
      const paymentId = crypto.randomUUID();
      const acAmount = 75;

      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: acAmount }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceBeforeRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceBefore = await balanceBeforeRes.json() as { ac_balance: number };

      const payload = buildStripeWebhookPayload({
        eventId: `evt_realpi_${paymentId.slice(0, 8)}`,
        type: StripeEventType.PaymentIntentSucceeded,
        userId,
        paymentId,
        amountCents: acAmount * 100,
        usePaymentIntentAmount: true,
        includeClientReference: false,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const webhookRes = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      expect(webhookRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(webhookRes);

      const balanceAfterRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceAfter = await balanceAfterRes.json() as { ac_balance: number };
      expect(balanceAfter.ac_balance).toBe(balanceBefore.ac_balance + acAmount);
    });

    it(testName('should fulfill subscription pass from invoice.paid subscription metadata'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `webhook-pass-${Date.now()}`;
      const paymentId = crypto.randomUUID();
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          paymentId,
          amount: 1,
          productType: 'SUBSCRIPTION',
          productId: 'sub-arena-pass',
          entitlementKind: 'pass',
          subscriptionTier: 'pro',
        }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const subscriptionMetadata = {
        userId,
        paymentId,
        productType: 'SUBSCRIPTION',
        productId: 'sub-arena-pass',
        entitlementKind: 'pass',
        subscriptionTier: 'pro',
      };
      const payload = buildStripeWebhookPayload({
        eventId: `evt_invoice_${paymentId.slice(0, 8)}`,
        type: StripeEventType.InvoicePaid,
        userId,
        paymentId,
        includeClientReference: false,
        metadata: {},
        subscriptionDetailsMetadata: subscriptionMetadata,
        customerId: `cus_${paymentId.slice(0, 8)}`,
        subscriptionId: `sub_${paymentId.slice(0, 8)}`,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const webhookRes = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      expect(webhookRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(webhookRes);

      const statusUrl = buildApiUrl(ApiEndpoint.Payment.StatusById(paymentId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const statusRes = await worker.fetch(statusUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(statusRes.status).toBe(HttpStatus.Ok);
      const statusData = await statusRes.json() as { currentState?: string; stripeSubscriptionId?: string };
      expect(statusData.currentState).toBe('ENTITLEMENT_GRANTED');
      expect(statusData.stripeSubscriptionId).toBe(`sub_${paymentId.slice(0, 8)}`);
    });

    it(testName('should fulfill cosmetic inventory item from payment_intent metadata'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `webhook-cosmetic-${Date.now()}`;
      const paymentId = crypto.randomUUID();
      const productId = 'vault-card-back-neon';
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          paymentId,
          amount: 1,
          productType: 'MARKETPLACE',
          productId,
          entitlementKind: 'cosmetic',
          quantity: 1,
        }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const payload = buildStripeWebhookPayload({
        eventId: `evt_cosmetic_${paymentId.slice(0, 8)}`,
        type: StripeEventType.PaymentIntentSucceeded,
        userId,
        paymentId,
        amountCents: 999,
        metadata: {
          productType: 'MARKETPLACE',
          productId,
          entitlementKind: 'cosmetic',
        },
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const webhookRes = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      expect(webhookRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(webhookRes);

      const inventoryUrl = buildApiUrl(ApiEndpoint.Inventory.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const inventoryRes = await worker.fetch(inventoryUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      expect(inventoryRes.status).toBe(HttpStatus.Ok);
      const inventory = await inventoryRes.json() as { items?: Array<{ itemId?: string; type?: string; count?: number }> };
      const item = inventory.items?.find((entry) => entry.itemId === productId);
      expect(item?.type).toBe('cosmetic');
      expect(item?.count).toBe(1);
    });

    it(testName('should return 200 for duplicate events to prevent retry loops'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `webhook-retry-${Date.now()}`;
      const paymentId = crypto.randomUUID();

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: 50 }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const eventId = `evt_retry_${paymentId.slice(0, 8)}`;
      const payload = buildStripeWebhookPayload({
        eventId,
        type: StripeEventType.PaymentIntentSucceeded,
        userId,
        paymentId,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      // First attempt
      const res1 = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      expect(res1.status).toBe(HttpStatus.Ok);
      await consumeResponse(res1);

      // Retry (duplicate)
      const res2 = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);
      // Should return 200, not error, to prevent Stripe retry loops
      expect(res2.status).toBe(HttpStatus.Ok);
      await consumeResponse(res2);
    });
  });

  describe('Webhook Event Types', () => {
    it(testName('should handle payment_intent.payment_failed'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `webhook-fail-${Date.now()}`;
      const paymentId = crypto.randomUUID();

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: 50 }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const payload = buildStripeWebhookPayload({
        eventId: `evt_fail_${paymentId.slice(0, 8)}`,
        type: StripeEventType.PaymentIntentPaymentFailed,
        userId,
        paymentId,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      expect(res.status).toBe(HttpStatus.Ok);
      await consumeResponse(res);
    });

    it(testName('should handle charge.refunded'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `webhook-refund-${Date.now()}`;
      const paymentId = crypto.randomUUID();

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: 50 }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const payload = buildStripeWebhookPayload({
        eventId: `evt_refund_${paymentId.slice(0, 8)}`,
        type: StripeEventType.ChargeRefunded,
        userId,
        paymentId,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      expect(res.status).toBe(HttpStatus.Ok);
      await consumeResponse(res);
    });

    it(testName('should handle checkout.session.completed'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `webhook-checkout-${Date.now()}`;
      const paymentId = crypto.randomUUID();

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: 50 }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const payload = buildStripeWebhookPayload({
        eventId: `evt_checkout_${paymentId.slice(0, 8)}`,
        type: StripeEventType.CheckoutSessionCompleted,
        userId,
        paymentId,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      expect(res.status).toBe(HttpStatus.Ok);
      await consumeResponse(res);
    });

    it(testName('should handle charge.dispute.created'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `webhook-dispute-${Date.now()}`;
      const paymentId = crypto.randomUUID();

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: 50 }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const payload = buildStripeWebhookPayload({
        eventId: `evt_dispute_${paymentId.slice(0, 8)}`,
        type: StripeEventType.ChargeDisputeCreated,
        userId,
        paymentId,
        chargeId: 'ch_test_123',
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      // May return 200 or error depending on charge lookup, but should not crash
      expect([HttpStatus.Ok, HttpStatus.ServiceUnavailable]).toContain(res.status);
      await consumeResponse(res);
    });
  });

  describe('Webhook Edge Cases', () => {
    it(testName('should handle webhook with missing userId in metadata'), async () => {
      const token = getTokenForFetch();
      const payload = buildStripeWebhookPayload({
        eventId: `evt_nouser_${Date.now()}`,
        type: StripeEventType.PaymentIntentSucceeded,
        // No userId
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      // Should return 200 to prevent retry, but not process
      expect(res.status).toBe(HttpStatus.Ok);
      await consumeResponse(res);
    });

    it(testName('should handle malformed JSON gracefully'), async () => {
      const token = getTokenForFetch();
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      
      // Create a valid signature for malformed body
      const malformedBody = '{"invalid json';
      const signature = await createStripeSignatureHeader(malformedBody, WEBHOOK_SECRET);

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: malformedBody,
      }, token);

      // Should return error but not crash
      expect([HttpStatus.Unauthorized, HttpStatus.BadRequest, HttpStatus.Ok]).toContain(res.status);
      await consumeResponse(res);
    });

    it(testName('should handle unknown event types gracefully'), async () => {
      const token = getTokenForFetch();
      const payload = buildStripeWebhookPayload({
        eventId: `evt_unknown_${Date.now()}`,
        type: 'unknown.event.type',
        userId: 'test-user',
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.StripeSignature]: signature,
        },
        body: payload,
      }, token);

      // Should return 200 to acknowledge receipt
      expect(res.status).toBe(HttpStatus.Ok);
      await consumeResponse(res);
    });

    it(testName('should handle concurrent webhooks for same payment'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `webhook-concurrent-${Date.now()}`;
      const paymentId = crypto.randomUUID();
      const acAmount = 50;

      // Initialize payment
      const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const initRes = await worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId, amount: acAmount }),
      }, token);
      expect(initRes.status).toBe(HttpStatus.Ok);
      await consumeResponse(initRes);

      const eventId = `evt_concurrent_${paymentId.slice(0, 8)}`;
      const payload = buildStripeWebhookPayload({
        eventId,
        type: StripeEventType.PaymentIntentSucceeded,
        userId,
        paymentId,
        amountCents: acAmount * 100,
      });
      const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
      const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });

      // Send multiple concurrent webhooks
      const webhooks = await Promise.all([
        worker.fetch(webhookUrl, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.StripeSignature]: signature,
          },
          body: payload,
        }, token),
        worker.fetch(webhookUrl, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.StripeSignature]: signature,
          },
          body: payload,
        }, token),
        worker.fetch(webhookUrl, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.StripeSignature]: signature,
          },
          body: payload,
        }, token),
      ]);

      // All should return 200
      expect(webhooks[0].status).toBe(HttpStatus.Ok);
      expect(webhooks[1].status).toBe(HttpStatus.Ok);
      expect(webhooks[2].status).toBe(HttpStatus.Ok);
      await Promise.all(webhooks.map((response) => consumeResponse(response)));

      // Verify balance was only increased once
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceData = await balanceRes.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBe(acAmount);
    });
  });
});
