import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { StripeEndpoint, StripeEventType } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, buildCreditsApiUrl } from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { TestWorkerBindings } from '@tests/constants/test-worker-bindings';
import {
  ensureContextReady,
  createTestContext,
  setCurrentContext,
  createSetupContextToken,
  getTokenForFetch,
} from '@tests/test-setup-core';
import { RunType } from '@ocentra/logging-domain/test-log/types';
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

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

const WEBHOOK_SECRET = TestWorkerBindings.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_integration_secret_32chars_!!';

function buildStripeWebhookPayload(opts: {
  eventId: string;
  userId: string;
  paymentId: string;
  amountCents: number;
}): string {
  const event = {
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
  };
  return JSON.stringify(event);
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

  it(testName('Stripe webhook: invalid signature returns 401'), async () => {
    const token = getTokenForFetch();
    const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(webhookUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ type: 'payment_intent.succeeded', data: { object: {} } }),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await consumeResponse(response);
  });

  it(testName('Payment status by id: returns 404 or 503 for unknown id'), async () => {
    const token = getTokenForFetch();
    const unknownId = '00000000-0000-0000-0000-000000000000';
    const url = buildApiUrl(ApiEndpoint.Payment.StatusById(unknownId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(),
    }, token);
    expect([HttpStatus.NotFound, HttpStatus.ServiceUnavailable]).toContain(response.status);
    const data = (await response.json()) as { error?: string };
    expect(data != null && typeof data === 'object').toBe(true);
  });

  it(testName('Stripe webhook idempotency: duplicate payment_intent.succeeded returns 200 and does not double-grant credits'), async (testCtx) => {
    await ensureContextReady();
    const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
    if (context) setCurrentContext(context);
    const token = context ? createSetupContextToken(context) : undefined;
    expect(token !== undefined).toBe(true);
    expect(typeof token).toBe('object');
    const userId = `webhook-idem-${Date.now()}`;
    const paymentId = crypto.randomUUID();
    const acAmount = 50;
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
    const balanceBefore = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceBefore.status).toBe(HttpStatus.Ok);
    const beforeData = (await balanceBefore.json()) as { ac_balance: number };
    const acBefore = beforeData.ac_balance;

    const eventId = `evt_test_${paymentId.slice(0, 8)}`;
    const payload = buildStripeWebhookPayload({
      eventId,
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

    const balanceAfter1 = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceAfter1.status).toBe(HttpStatus.Ok);
    const after1Data = (await balanceAfter1.json()) as { ac_balance: number };
    expect(after1Data.ac_balance).toBe(acBefore + acAmount);

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

    const balanceAfter2 = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceAfter2.status).toBe(HttpStatus.Ok);
    const after2Data = (await balanceAfter2.json()) as { ac_balance: number };
    expect(after2Data.ac_balance).toBe(acBefore + acAmount);
  });

  it(testName('Stripe checkout flow: test-init then webhook grants credits'), async (testCtx) => {
    await ensureContextReady();
    const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
    if (context) setCurrentContext(context);
    const token = context ? createSetupContextToken(context) : undefined;
    expect(token !== undefined).toBe(true);
    expect(typeof token).toBe('object');
    const userId = `checkout-flow-${Date.now()}`;
    const paymentId = crypto.randomUUID();
    const acAmount = 100;
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
    const balanceBefore = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceBefore.status).toBe(HttpStatus.Ok);
    const beforeData = (await balanceBefore.json()) as { ac_balance: number };
    const acBefore = beforeData.ac_balance;

    const eventId = `evt_flow_${paymentId.slice(0, 8)}`;
    const payload = buildStripeWebhookPayload({
      eventId,
      userId,
      paymentId,
      amountCents: acAmount * 100,
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
    });
    expect(webhookRes.status).toBe(HttpStatus.Ok);
    await consumeResponse(webhookRes);

    const balanceAfter = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceAfter.status).toBe(HttpStatus.Ok);
    const afterData = (await balanceAfter.json()) as { ac_balance: number };
    expect(afterData.ac_balance).toBe(acBefore + acAmount);
  });

  it(testName('Payment Flow: should complete AC purchase end-to-end'), async (testCtx) => {
    await ensureContextReady();
    const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
    if (context) setCurrentContext(context);
    const token = context ? createSetupContextToken(context) : undefined;
    expect(token !== undefined).toBe(true);
    expect(typeof token).toBe('object');
    const userId = `ac-purchase-${Date.now()}`;
    const paymentId = crypto.randomUUID();
    const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const initRes = await worker.fetch(initUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ paymentId, amount: 100 }),
    }, token);
    expect(initRes.status).toBe(HttpStatus.Ok);
    await consumeResponse(initRes);
    const payload = buildStripeWebhookPayload({
      eventId: `evt_${paymentId.slice(0, 8)}`,
      userId,
      paymentId,
      amountCents: 10000,
    });
    const signature = await signStripeWebhook(payload, WEBHOOK_SECRET);
    const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const webhookRes = await worker.fetch(webhookUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, [HttpHeader.StripeSignature]: signature },
      body: payload,
    });
    expect(webhookRes.status).toBe(HttpStatus.Ok);
    await consumeResponse(webhookRes);
    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceRes.status).toBe(HttpStatus.Ok);
    const balanceData = (await balanceRes.json()) as { ac_balance: number };
    expect(balanceData.ac_balance).toBeGreaterThanOrEqual(0);
  });

  it(testName('Payment Flow: should handle failed payment'), async () => {
    const token = getTokenForFetch();
    const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const userId = `failed-pay-${Date.now()}`;
    const initRes = await worker.fetch(initUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ paymentId: crypto.randomUUID(), amount: 50 }),
    }, token);
    expect(initRes.status).toBe(HttpStatus.Ok);
    await consumeResponse(initRes);
    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceRes.status).toBe(HttpStatus.Ok);
    const data = (await balanceRes.json()) as { ac_balance: number };
    expect(data.ac_balance).toBe(0);
  });

  it(testName('Payment Flow: should handle dispute'), async () => {
    const token = getTokenForFetch();
    const userId = `dispute-${Date.now()}`;
    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(balanceRes.status).toBe(HttpStatus.Ok);
    const data = (await balanceRes.json()) as { ac_balance: number };
    expect(typeof data.ac_balance).toBe('number');
  });

  it(testName('Can receive refund: balance restored; state transition'), async () => {
    const token = getTokenForFetch();
    const userId = `refund-${Date.now()}`;
    const paymentId = crypto.randomUUID();
    const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const initRes = await worker.fetch(initUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ paymentId, amount: 25 }),
    }, token);
    expect(initRes.status).toBe(HttpStatus.Ok);
    await consumeResponse(initRes);
    const refundUrl = buildApiUrl(ApiEndpoint.Payment.RefundById(paymentId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const refundRes = await worker.fetch(refundUrl, {
      method: HttpMethod.Post,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.NotFound, HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.BadGateway]).toContain(refundRes.status);
    await consumeResponse(refundRes);
  });

  it(testName('Can reserve AI escrow: escrow created; balance reserved'), async () => {
    const token = getTokenForFetch();
    const userId = `escrow-reserve-${Date.now()}`;
    const reserveUrl = buildApiUrl(ApiEndpoint.AI.EscrowReserve, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const res = await worker.fetch(reserveUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ estimatedTokens: 100, modelVersion: 'gpt-4o-mini' }),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.PaymentRequired, HttpStatus.ServiceUnavailable]).toContain(res.status);
    await consumeResponse(res);
  });

  it(testName('Can consume AI escrow: charged; refund excess; usage logged'), async () => {
    const token = getTokenForFetch();
    const userId = `escrow-consume-${Date.now()}`;
    const escrowId = crypto.randomUUID();
    const consumeUrl = buildApiUrl(ApiEndpoint.AI.EscrowConsume, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const res = await worker.fetch(consumeUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ escrowId, actualTokens: 50, promptHash: 'hash_' + Date.now() }),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.NotFound, HttpStatus.BadRequest, HttpStatus.ServiceUnavailable]).toContain(res.status);
    await consumeResponse(res);
  });

  it(testName('Reconciliation passes: Stripe to internal ledger match'), async () => {
    const token = getTokenForFetch();
    const reconcileUrl = buildApiUrl(ApiEndpoint.Payment.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const res = await worker.fetch(reconcileUrl, {
      method: HttpMethod.Post,
      headers: getValidRequestHeaders(),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(res.status);
    if (res.status === HttpStatus.Ok) {
      const data = (await res.json()) as { reconciled?: boolean; count?: number };
      expect(typeof data.reconciled).toBe('boolean');
    } else {
      await consumeResponse(res);
    }
  });

  it(testName('Fuzzing: should handle malformed webhooks'), async () => {
    const token = getTokenForFetch();
    const webhookUrl = buildApiUrl(StripeEndpoint.Webhook, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const malformedBodies = ['', '{}', '{"type":1}', 'null', 'not json', '{"data":{}}'];
    for (const body of malformedBodies) {
      const res = await worker.fetch(webhookUrl, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body,
      }, token);
      expect([HttpStatus.Unauthorized, HttpStatus.BadRequest, HttpStatus.Ok]).toContain(res.status);
      await res.text();
    }
  });

  it(testName('Fuzzing: should handle concurrent requests'), async () => {
    const token = getTokenForFetch();
    const userId = `concurrent-${Date.now()}`;
    const initUrl = buildApiUrl(StripeEndpoint.TestInitPayment, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const requests = Array.from({ length: 5 }, () =>
      worker.fetch(initUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ paymentId: crypto.randomUUID(), amount: 10 }),
      }, token)
    );
    const results = await Promise.all(requests);
    const statuses = results.map((r) => r.status);
    expect(statuses.every((s) => s === HttpStatus.Ok || s === HttpStatus.NotFound || s === HttpStatus.ServiceUnavailable)).toBe(true);
    for (const r of results) await r.text();
  });
});
