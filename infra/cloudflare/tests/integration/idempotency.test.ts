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

  it(testName('Credits Purchase Idempotency: should return same result for duplicate requests with same idempotency key'), async () => {
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
      expect(response1.status).toBe(HttpStatus.Ok);
      const data1 = await response1.json() as { success: boolean; transaction_id: string; new_balance: number; ac_added: number };
      logInfo('[TEST] First request data', getStackTrace(), { success: data1.success, transactionId: data1.transaction_id, balance: data1.new_balance }, LOG_TEST_OPERATIONS);
      expect(data1.success).toBe(true);
      expect(data1.transaction_id).toBeTypeOf('string');
      expect(data1.new_balance).toBe(100);

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
      expect(response2.status).toBe(HttpStatus.Ok);
      if (response2.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for second idempotent request', getStackTrace(), { expected: HttpStatus.Ok, actual: response2.status, idempotencyKey });
      }
      const data2 = await response2.json() as { success: boolean; transaction_id: string; new_balance: number; ac_added: number };
      expect(data2.success).toBe(true);
      if (data1.transaction_id !== data2.transaction_id || data1.new_balance !== data2.new_balance) {
        logError('[TEST] Idempotency violation detected', getStackTrace(), { transactionId1: data1.transaction_id, transactionId2: data2.transaction_id, balance1: data1.new_balance, balance2: data2.new_balance });
      }
      expect(data2.transaction_id).toBe(data1.transaction_id);
      expect(data2.new_balance).toBe(data1.new_balance);
      expect(data2.ac_added).toBe(data1.ac_added);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );

      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balanceData = await balanceResponse.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBe(100);
    });

  it(testName('Credits Purchase Idempotency: should create separate transactions for requests with different idempotency keys'), async () => {
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

      expect(response1.status).toBe(HttpStatus.Ok);
      const data1 = await response1.json() as { success: boolean; transaction_id: string; new_balance: number };
      expect(data1.success).toBe(true);
      expect(data1.new_balance).toBe(50);

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

      expect(response2.status).toBe(HttpStatus.Ok);
      const data2 = await response2.json() as { success: boolean; transaction_id: string; new_balance: number };
      expect(data2.success).toBe(true);
      expect(data2.transaction_id).not.toBe(data1.transaction_id);
      expect(data2.new_balance).toBe(100);
    });

  it(testName('Credits Purchase Idempotency: should require idempotency key for purchase requests'), async () => {
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

      expect(response1.status).toBe(HttpStatus.BadRequest);
      const error1 = await response1.json() as { error?: string; message?: string };
      expect(error1.error).toBe('Bad Request');
      expect(error1.message).toContain('Idempotency key');
    });

  it(testName('Redeem Idempotency: same user same code twice returns 200 with already_redeemed on second and balance unchanged (Rule 14.8)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('idem-redeem');
    const seedPath = `${ApiEndpoint.Test.Base}/seed-promo`;
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
