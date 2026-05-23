import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildCreditsApiUrl,
  buildTestApiUrlForEndpoint,
  generateTestUserId,
  getValidRequestHeaders,
  getAdminAuthHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for idempotency tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Credits Purchase Idempotency: duplicate direct purchase requests are rejected without mutation'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('idempotency-integration');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      logInfo('[TEST] Testing idempotency with duplicate requests', getStackTrace(), { userId, idempotencyKey }, LOG_TEST_OPERATIONS);

      const purchasePayload = {
        ac_amount: 100,
        amount: 1,
        currency: Currency.USD,
      };

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify(purchasePayload),
        },
        token
      );

      logInfo('[TEST] First idempotent request response', getStackTrace(), { status: response1.status, idempotencyKey }, LOG_TEST_RESPONSE_DETAILS);
      expect(response1.status).toBe(HttpStatus.Forbidden);
      await response1.text().catch(() => undefined);

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl2, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify(purchasePayload),
        },
        token
      );

      logInfo('[TEST] Second idempotent request response', getStackTrace(), { status: response2.status, idempotencyKey }, LOG_TEST_RESPONSE_DETAILS);
      expect(response2.status).toBe(HttpStatus.Forbidden);
      if (response2.status !== HttpStatus.Forbidden) {
        logError('[TEST] Unexpected status for second blocked purchase request', getStackTrace(), { expected: HttpStatus.Forbidden, actual: response2.status, idempotencyKey });
      }
      await response2.text().catch(() => undefined);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );

      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balanceData = await balanceResponse.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBe(0);
    });

  it(testName('Credits Purchase Idempotency: different keys do not bypass checkout-only purchase boundary'), async () => {
      const token = await createToken();
      const userId = `idempotency-diff-integration-${Date.now()}`;

      const purchasePayload = {
        ac_amount: 50,
        amount: 0.5,
        currency: Currency.USD,
      };

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase)
          },
          body: JSON.stringify(purchasePayload),
        },
        token
      );

      expect(response1.status).toBe(HttpStatus.Forbidden);
      await response1.text().catch(() => undefined);

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl2, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
          },
          body: JSON.stringify(purchasePayload),
        },
        token
      );

      expect(response2.status).toBe(HttpStatus.Forbidden);
      await response2.text().catch(() => undefined);

      const balanceResponse = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );
      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balanceData = await balanceResponse.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBe(0);
    });

  it(testName('Credits Purchase Idempotency: public purchase path rejects before idempotency validation'), async () => {
      const token = await createToken();
      const userId = `idempotency-no-key-${Date.now()}`;

      const purchasePayload = {
        ac_amount: 75,
        amount: 0.75,
        currency: Currency.USD,
      };

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
          body: JSON.stringify(purchasePayload),
        },
        token
      );

      expect(response1.status).toBe(HttpStatus.Forbidden);
      const error1 = await response1.json() as { error?: string; message?: string };
      expect(error1.error).toBe('Forbidden');
      expect(error1.message).toContain('payment checkout flow');
    });

  it(testName('Redeem Idempotency: same user same code twice returns 200 with already_redeemed on second and balance unchanged (Rule 14.8)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('idem-redeem');
    const seedPath = ApiEndpoint.Test.SeedPromo;
    const seedUrl = buildTestApiUrlForEndpoint(seedPath);
    const seedRes = await worker.fetch(seedUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'IDEM_REDEEM_CODE', ac: 20, gp: 10 }),
    });
    expect(seedRes.status).toBe(HttpStatus.Ok);

    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const first = await worker.fetch(redeemUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'IDEM_REDEEM_CODE' }),
    }, token);
    expect(first.status).toBe(HttpStatus.Ok);
    const firstData = await first.json() as { success: boolean; ac_added?: number; gp_added?: number; already_redeemed?: boolean };
    expect(firstData.success).toBe(true);
    expect(firstData.ac_added).toBe(20);
    expect(firstData.gp_added).toBe(10);
    expect(firstData.already_redeemed !== true).toBe(true);

    const second = await worker.fetch(redeemUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'IDEM_REDEEM_CODE' }),
    }, token);
    expect(second.status).toBe(HttpStatus.Ok);
    const secondData = await second.json() as { success: boolean; already_redeemed?: boolean; ac_added?: number; gp_added?: number };
    expect(secondData.success).toBe(true);
    expect(secondData.already_redeemed).toBe(true);
    expect(secondData.ac_added).toBeUndefined();
    expect(secondData.gp_added).toBeUndefined();

    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balance = await balanceRes.json() as { ac_balance: number; gp_balance: number };
    expect(balance.ac_balance).toBe(20);
    expect(balance.gp_balance).toBe(10);
  });
});
