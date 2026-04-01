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
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import {
  ensureContextReady,
  createTestContext,
  setCurrentContext,
  createSetupContextToken,
} from '@tests/test-setup-core';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { TestWorkerBindings } from '@tests/constants/test-worker-bindings';
import { createStripeSignatureHeader } from '@/utils/stripe-webhook-signature';

const log = Logger.instance;
log.register(import.meta.url);

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

async function signStripeWebhook(payload: string, secret: string): Promise<string> {
  return createStripeSignatureHeader(payload, secret);
}

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
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

  it(testName('Shop UI: complete purchase flow - init payment, webhook grants credits, balance increases by payment amount'), async (testCtx) => {
    await ensureContextReady();
    const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
    if (context) setCurrentContext(context);
    const token = context ? createSetupContextToken(context) : undefined;
    expect(token).not.toBeUndefined();
    expect(typeof token).toBe('object');
    const userId = `e2e-shop-${Date.now()}`;
    const paymentId = crypto.randomUUID();
    const acAmount = 100;
    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const beforeRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(beforeRes.status).toBe(HttpStatus.Ok);
    const beforeData = (await beforeRes.json()) as { ac_balance: number };
    const acBefore = beforeData.ac_balance;

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

    const payload = buildStripeWebhookPayload({
      eventId: `evt_${paymentId.slice(0, 8)}`,
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
    }, token);
    expect(webhookRes.status).toBe(HttpStatus.Ok);

    const afterRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    expect(afterRes.status).toBe(HttpStatus.Ok);
    const afterData = (await afterRes.json()) as { ac_balance: number };
    expect(afterData.ac_balance).toBe(acBefore + acAmount);
  });
});
