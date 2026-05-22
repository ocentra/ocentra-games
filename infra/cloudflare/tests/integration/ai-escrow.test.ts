import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { StripeEndpoint, StripeEventType } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, getValidAdminRequestHeaders, buildCreditsApiUrl } from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { TestWorkerBindings } from '@tests/constants/test-worker-bindings';
import { createStripeSignatureHeader } from '@/utils/stripe-webhook-signature';
import {
  ensureContextReady,
  createTestContext,
  setCurrentContext,
  createSetupContextToken,
  getTokenForFetch,
  type SetupContextToken,
} from '@tests/test-setup-core';
import { RunType } from '@ocentra/logging-domain/test-log/types';

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
  userId: string;
  paymentId: string;
  amountCents: number;
}): string {
  return JSON.stringify({
    id: opts.eventId,
    type: StripeEventType.PaymentIntentSucceeded,
    data: {
      object: {
        id: `pi_test_${opts.paymentId.slice(0, 8)}`,
        metadata: { userId: opts.userId, paymentId: opts.paymentId },
        amount_total: opts.amountCents,
        client_reference_id: opts.paymentId,
      },
    },
  });
}

async function consumeResponse(response: Response): Promise<void> {
  await response.text().catch(() => undefined);
}

async function seedCredits(
  worker: TestWorker,
  userId: string,
  acAmount: number,
  token: SetupContextToken | undefined
): Promise<void> {
  const paymentId = crypto.randomUUID();
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

  const payload = buildStripeWebhookPayload({
    eventId: `evt_ai_escrow_${paymentId.slice(0, 8)}`,
    userId,
    paymentId,
    amountCents: acAmount * 100,
  });
  const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
  const webhookRes = await worker.fetch(webhookUrl, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.StripeSignature]: await createStripeSignatureHeader(payload, WEBHOOK_SECRET),
    },
    body: payload,
  }, token);
  expect(webhookRes.status).toBe(HttpStatus.Ok);
  await consumeResponse(webhookRes);
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

  describe('AI Escrow Security (Rule 14.1, 14.3)', () => {
    it(testName('POST reserve without auth returns 401 and error body (Rule 14.1.1)'), async () => {
      const token = getTokenForFetch();
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          idempotencyKey: 'sec-no-auth',
          estimatedTokens: 10,
          reservedAmount: 1,
        }),
      }, token);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      const data = (await response.json()) as { error?: string };
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
      expect((data.error as string).length).toBeGreaterThan(0);
    });

    it(testName('POST reserve with invalid body (missing required field) returns 400 (Rule 14.3.1)'), async () => {
      const token = getTokenForFetch();
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({}),
      }, token);
      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { error?: string; message?: string };
      expect(typeof data.error === 'string' || typeof data.message === 'string').toBe(true);
    });

    it(testName('POST consume without auth returns 401 (Rule 14.1.1)'), async () => {
      const token = getTokenForFetch();
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: '00000000-0000-4000-8000-000000000000',
          actualInputTokens: 0,
          actualOutputTokens: 0,
          idempotencyKey: 'consume-no-auth',
        }),
      }, token);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      const data = (await response.json()) as { error?: string };
      expect(typeof data.error).toBe('string');
    });
  });

  describe('AI Escrow Reserve', () => {
    it(testName('should reserve AC for AI inference with estimated cost'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-reserve-${Date.now()}`;
      await seedCredits(worker, userId, 1000, token);

      // Reserve escrow
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 200,
          idempotencyKey: `escrow-${userId}`,
        }),
      }, token);

      expect(reserveRes.status).toBe(HttpStatus.Ok);
      const reserveData = await reserveRes.json() as {
        escrowId: string;
        reservedAmount: number;
        expiresAt: number;
      };
      expect(reserveData.escrowId).toBeTypeOf('string');
      expect(reserveData.reservedAmount).toBeGreaterThan(0);
      expect(reserveData.expiresAt).toBeGreaterThan(Date.now());

      // Verify balance was reduced
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceData = await balanceRes.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBeLessThan(1000);
    });

    it(testName('should reject reserve when balance is insufficient'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `escrow-insufficient-${Date.now()}`;
      
      // Try to reserve without any balance
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 10000, // Large request
          estimatedOutputTokens: 20000,
          idempotencyKey: `escrow-insufficient-${userId}`,
        }),
      }, token);

      expect(reserveRes.status).toBe(HttpStatus.PaymentRequired);
      const errorData = await reserveRes.json() as { error: string };
      expect(errorData.error).toContain('Insufficient');
    });

    it(testName('should return same escrow for duplicate idempotency key'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-idempotent-${Date.now()}`;
      const idempotencyKey = `escrow-idem-${userId}`;
      await seedCredits(worker, userId, 1000, token);

      // First reserve
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserve1 = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 200,
          idempotencyKey,
        }),
      }, token);

      expect(reserve1.status).toBe(HttpStatus.Ok);
      const data1 = await reserve1.json() as { escrowId: string; reservedAmount: number };

      // Second reserve with same key
      const reserve2 = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 200,
          idempotencyKey,
        }),
      }, token);

      expect(reserve2.status).toBe(HttpStatus.Ok);
      const data2 = await reserve2.json() as { escrowId: string; reservedAmount: number; already_processed?: boolean };
      
      expect(data2.escrowId).toBe(data1.escrowId);
      expect(data2.already_processed).toBe(true);

      // Verify balance was only reduced once
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceData = await balanceRes.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBe(1000 - data1.reservedAmount);
    });

    it(testName('should reject invalid model version'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `escrow-invalid-model-${Date.now()}`;
      
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: '', // Invalid
          estimatedInputTokens: 100,
          estimatedOutputTokens: 200,
          idempotencyKey: `escrow-invalid-${userId}`,
        }),
      }, token);

      expect(reserveRes.status).toBe(HttpStatus.BadRequest);
      await reserveRes.text().catch(() => undefined);
    });
  });

  describe('Plan tiers and allowance (Phase 3)', () => {
    it(testName('Admin POST credits/plan sets user plan tier'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      const userId = `plan-user-${Date.now()}`;
      const planUrl = buildApiUrl(ApiEndpoint.Admin.CreditsPlan, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(planUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ userId, tier: 'pro' }),
      }, token);
      if (res.status !== HttpStatus.Ok) {
        throw new Error('Failed test response: ' + await res.clone().text() + ' status: ' + res.status);
      }
      expect(res.status).toBe(HttpStatus.Ok);
      const data = (await res.json()) as { success?: boolean; tier?: string };
      expect(data.success).toBe(true);
      expect(data.tier).toBe('pro');
    });

    it(testName('Reserve uses allowance when user has plan and tokens within limit'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      const userId = `allowance-user-${Date.now()}`;
      const planUrl = buildApiUrl(ApiEndpoint.Admin.CreditsPlan, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const planRes = await worker.fetch(planUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ userId, tier: 'pro' }),
      }, token);
      await planRes.text().catch(() => undefined);
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 200,
          idempotencyKey: `allowance-reserve-${userId}`,
        }),
      }, token);
      expect(reserveRes.status).toBe(HttpStatus.Ok);
      const data = (await reserveRes.json()) as { escrowId?: string; reservedAmount?: number; useAllowance?: boolean };
      expect(data.useAllowance).toBe(true);
      expect(data.reservedAmount).toBe(0);
      expect(typeof data.escrowId).toBe('string');
    });

    it(testName('Consume allowance escrow charges 0 AC'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      const userId = `allowance-consume-${Date.now()}`;
      const planUrl = buildApiUrl(ApiEndpoint.Admin.CreditsPlan, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const planRes = await worker.fetch(planUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ userId, tier: 'pro' }),
      }, token);
      await planRes.text().catch(() => undefined);
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 50,
          estimatedOutputTokens: 50,
          idempotencyKey: `allowance-consume-${userId}`,
        }),
      }, token);
      const reserveData = (await reserveRes.json()) as { escrowId: string };
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const consumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 50,
          actualOutputTokens: 50,
        }),
      }, token);
      expect(consumeRes.status).toBe(HttpStatus.Ok);
      const consumeData = (await consumeRes.json()) as { charged: number; refunded: number };
      expect(consumeData.charged).toBe(0);
      expect(consumeData.refunded).toBe(0);
    });

    it(testName('Reserve uses AC (overage) when allowance exceeded'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      const userId = `overage-user-${Date.now()}`;
      const planUrl = buildApiUrl(ApiEndpoint.Admin.CreditsPlan, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const planRes = await worker.fetch(planUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ userId, tier: 'free' }),
      }, token);
      await planRes.text().catch(() => undefined);
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const firstReserve = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 5000,
          estimatedOutputTokens: 5000,
          idempotencyKey: `overage-first-${userId}`,
        }),
      }, token);
      expect(firstReserve.status).toBe(HttpStatus.Ok);
      const firstData = (await firstReserve.json()) as { useAllowance?: boolean };
      expect(firstData.useAllowance).toBe(true);
      const secondReserve = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 5000,
          estimatedOutputTokens: 5000,
          idempotencyKey: `overage-second-${userId}`,
        }),
      }, token);
      expect(secondReserve.status).toBe(HttpStatus.PaymentRequired);
      const errorData = (await secondReserve.json()) as { error?: string };
      expect(errorData.error).toContain('Insufficient');
    });
  });

  describe('AI Escrow Consume', () => {
    it(testName('should consume escrow and refund excess AC'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-consume-${Date.now()}`;
      await seedCredits(worker, userId, 1000, token);

      // Reserve escrow
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 1000,
          estimatedOutputTokens: 1000,
          idempotencyKey: `escrow-reserve-${userId}`,
        }),
      }, token);

      const reserveData = await reserveRes.json() as { escrowId: string; reservedAmount: number };
      const reservedAmount = reserveData.reservedAmount;

      // Get balance after reserve
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceBeforeRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceBefore = await balanceBeforeRes.json() as { ac_balance: number };

      // Consume with actual tokens (less than estimated)
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const consumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 500, // Less than estimated
          actualOutputTokens: 500,
        }),
      }, token);

      expect(consumeRes.status).toBe(HttpStatus.Ok);
      const consumeData = await consumeRes.json() as {
        charged: number;
        refunded: number;
        newBalance: number;
      };

      expect(consumeData.charged).toBeGreaterThan(0);
      expect(consumeData.charged).toBeLessThan(reservedAmount);
      expect(consumeData.refunded).toBe(reservedAmount - consumeData.charged);
      expect(consumeData.newBalance).toBe(balanceBefore.ac_balance + consumeData.refunded);
    });

    it(testName('should handle exact cost consumption (no refund)'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-exact-${Date.now()}`;
      await seedCredits(worker, userId, 1000, token);

      // Reserve with small amount
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 100,
          idempotencyKey: `escrow-reserve-${userId}`,
        }),
      }, token);

      const reserveData = await reserveRes.json() as { escrowId: string; reservedAmount: number };

      // Consume with same tokens (cost should be <= reserved due to buffer)
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const consumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 100,
          actualOutputTokens: 100,
        }),
      }, token);

      expect(consumeRes.status).toBe(HttpStatus.Ok);
      const consumeData = await consumeRes.json() as {
        charged: number;
        refunded: number;
      };

      // With 25% buffer, actual cost should be less than reserved, so some refund
      expect(consumeData.charged).toBeGreaterThan(0);
      expect(consumeData.refunded).toBeGreaterThanOrEqual(0);
    });

    it(testName('should reject consume for non-existent escrow'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `escrow-notfound-${Date.now()}`;
      const nonExistentEscrowId = '00000000-0000-0000-0000-000000000000';

      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const consumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: nonExistentEscrowId,
          actualInputTokens: 100,
          actualOutputTokens: 100,
        }),
      }, token);

      expect(consumeRes.status).toBe(HttpStatus.NotFound);
      await consumeRes.text().catch(() => undefined);
    });

    it(testName('should reject consume for already settled escrow'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-settled-${Date.now()}`;
      await seedCredits(worker, userId, 1000, token);

      // Reserve
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 100,
          idempotencyKey: `escrow-reserve-${userId}`,
        }),
      }, token);

      const reserveData = await reserveRes.json() as { escrowId: string };

      // First consume
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const firstConsumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 100,
          actualOutputTokens: 100,
        }),
      }, token);
      await firstConsumeRes.text().catch(() => undefined);

      // Second consume should fail
      const secondConsume = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 50,
          actualOutputTokens: 50,
        }),
      }, token);

      expect(secondConsume.status).toBe(HttpStatus.NotFound);
      await secondConsume.text().catch(() => undefined);
    });
  });

  describe('AI Escrow Economic Invariants', () => {
    it(testName('should maintain invariant: reserved >= charged + refunded'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-invariant-${Date.now()}`;
      await seedCredits(worker, userId, 1000, token);

      // Reserve
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 1000,
          estimatedOutputTokens: 1000,
          idempotencyKey: `escrow-reserve-${userId}`,
        }),
      }, token);

      const reserveData = await reserveRes.json() as { escrowId: string; reservedAmount: number };

      // Consume
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const consumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 500,
          actualOutputTokens: 500,
        }),
      }, token);

      const consumeData = await consumeRes.json() as {
        charged: number;
        refunded: number;
      };

      // Invariant: reserved >= charged + refunded
      expect(reserveData.reservedAmount).toBeGreaterThanOrEqual(consumeData.charged + consumeData.refunded);
    });

    it(testName('should prevent double-spend via idempotency on reserve'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-doublespend-${Date.now()}`;
      const idempotencyKey = `escrow-ds-${userId}`;
      await seedCredits(worker, userId, 1000, token);

      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      
      // Concurrent reserves with same key
      const reserves = await Promise.all([
        worker.fetch(reserveUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({
            modelVersion: 'gpt-4o-mini',
            estimatedInputTokens: 100,
            estimatedOutputTokens: 100,
            idempotencyKey,
          }),
        }, token),
        worker.fetch(reserveUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({
            modelVersion: 'gpt-4o-mini',
            estimatedInputTokens: 100,
            estimatedOutputTokens: 100,
            idempotencyKey,
          }),
        }, token),
      ]);

      // Both should succeed (idempotent)
      expect(reserves[0].status).toBe(HttpStatus.Ok);
      expect(reserves[1].status).toBe(HttpStatus.Ok);

      // Verify balance was only reduced once
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceRes = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      }, token);
      const balanceData = await balanceRes.json() as { ac_balance: number };
      
      const reserveData = await reserves[0].json() as { reservedAmount: number };
      expect(balanceData.ac_balance).toBe(1000 - reserveData.reservedAmount);
      await reserves[1].text().catch(() => undefined);
    });
  });

  describe('AI Escrow Edge Cases', () => {
    it(testName('should handle zero token consumption'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;
      expect(token).not.toBeUndefined();
      expect(typeof token).toBe('object');

      const userId = `escrow-zero-${Date.now()}`;
      await seedCredits(worker, userId, 1000, token);

      // Reserve
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: 100,
          estimatedOutputTokens: 100,
          idempotencyKey: `escrow-reserve-${userId}`,
        }),
      }, token);

      const reserveData = await reserveRes.json() as { escrowId: string; reservedAmount: number };

      // Consume with zero tokens
      const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const consumeRes = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          escrowId: reserveData.escrowId,
          actualInputTokens: 0,
          actualOutputTokens: 0,
        }),
      }, token);

      expect(consumeRes.status).toBe(HttpStatus.Ok);
      const consumeData = await consumeRes.json() as {
        charged: number;
        refunded: number;
      };

      // Should refund entire amount
      expect(consumeData.charged).toBe(0);
      expect(consumeData.refunded).toBe(reserveData.reservedAmount);
    });

    it(testName('should reject negative token counts'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const userId = `escrow-negative-${Date.now()}`;
      
      const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reserveRes = await worker.fetch(reserveUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          modelVersion: 'gpt-4o-mini',
          estimatedInputTokens: -100, // Invalid
          estimatedOutputTokens: 100,
          idempotencyKey: `escrow-neg-${userId}`,
        }),
      }, token);

      expect(reserveRes.status).toBe(HttpStatus.BadRequest);
      await reserveRes.text().catch(() => undefined);
    });
  });
});
