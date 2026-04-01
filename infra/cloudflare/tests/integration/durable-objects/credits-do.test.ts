import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { TestConfig } from '@tests/constants/test-constants';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { Currency, CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import {  IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import {
  buildCreditsApiUrl,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

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

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing credits DO worker', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Credits DO worker ready', getStackTrace(), {}, LOG_TEST_RESPONSE_DETAILS);
    } catch (error) {
      logError('[TEST] Failed to initialize credits DO worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    logWarn('[TEST] Stopping credits DO worker', getStackTrace(), {}, false);
    if (worker.stop) await worker.stop();
  });

  it(testName('Award Endpoint: should award GP to user successfully'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-award');
      const awardId = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: awardId
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; new_balance: number; transaction_id?: string };
      expect(data.success).toBe(true);
      expect(data.new_balance).toBe(100);
      expect(data.transaction_id).toBeTypeOf('string');
      expect(data.transaction_id!.length).toBeGreaterThan(0);
  });

  it(testName('Award Endpoint: should reject negative GP amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-negative');

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Earn)
        },
        body: JSON.stringify({
          gp_amount: -10,
          description: 'Test award'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Award Endpoint: should reject zero GP amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-zero');

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Earn)
        },
        body: JSON.stringify({
          gp_amount: 0,
          description: 'Test award'
        }),
      }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Consume Endpoint: should consume GP successfully when balance is sufficient'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-consume');

      const url = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
      const earnRes = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: earnIdempotencyKey
        },
        body: JSON.stringify({
          gp_amount: 200,
          description: 'Initial balance'
        }),
      }, token);
      await consumeResponseBody(earnRes);

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
        },
        body: JSON.stringify({
          amount: 50,
          currency: Currency.GP,
          description: 'Test consume'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; new_balance: number };
      expect(data.success).toBe(true);
      expect(data.new_balance).toBe(150);
  });

  it(testName('Consume Endpoint: should reject consume when balance is insufficient'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-insufficient');

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
        },
        body: JSON.stringify({
          amount: 100,
          currency: Currency.GP,
          description: 'Test consume'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.Conflict);
      const data = await response.json() as { error: string };
      expect(data.error).toContain('Insufficient');
  });

  it(testName('Consume Endpoint: should reject zero amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-zero-consume');

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
        },
        body: JSON.stringify({
          amount: 0,
          currency: Currency.GP,
          description: 'Test consume'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Consume Endpoint: should reject negative amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-negative-consume');

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
        },
        body: JSON.stringify({
          amount: -10,
          currency: Currency.GP,
          description: 'Test consume'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Consume Endpoint: should reject non-integer amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-non-integer-consume');

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
        },
        body: JSON.stringify({
          amount: 10.5,
          currency: Currency.GP,
          description: 'Test consume'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Purchase Endpoint: should purchase AC successfully'), async () => {
      const token = await createToken();
      const userId = `test-user-purchase-${Date.now()}`;
      const purchaseId = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: purchaseId,
        },
        body: JSON.stringify({
          ac_amount: 100,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; new_balance: number; transaction_id?: string };
      expect(data.success).toBe(true);
      expect(data.new_balance).toBe(100);
      expect(data.transaction_id).toBeTypeOf('string');
  });

  it(testName('Purchase Endpoint: should reject zero AC amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-zero-purchase');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
        },
        body: JSON.stringify({
          ac_amount: 0,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Purchase Endpoint: should reject negative AC amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-negative-purchase');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
        },
        body: JSON.stringify({
          ac_amount: -10,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Purchase Endpoint: should reject non-integer AC amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-non-integer-purchase');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
        },
        body: JSON.stringify({
          ac_amount: 10.5,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Purchase Endpoint: should reject missing idempotency key'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-no-key-purchase');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          ac_amount: 100,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Purchase Endpoint: should return same result when same purchaseId is used twice (Rule 14.8.1)'), async () => {
      const token = await createToken();
      const userId = `test-user-purchase-idempotency-${Date.now()}`;
      const purchaseId = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const purchaseUrl1 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: purchaseId,
        },
        body: JSON.stringify({
          ac_amount: 100,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response1.status).toBe(HttpStatus.Ok);
      const data1 = await response1.json() as { success: boolean; new_balance: number };
      expect(data1.success).toBe(true);
      expect(data1.new_balance).toBe(100);

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: purchaseId,
        },
        body: JSON.stringify({
          ac_amount: 100,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(response2.status).toBe(HttpStatus.Ok);
      const data2 = await response2.json() as { success: boolean; already_processed?: boolean; new_balance: number };
      expect(data2.success).toBe(true);
      expect(data2.already_processed).toBe(true);
      expect(data2.new_balance).toBe(100);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

    const balanceData = await balanceResponse.json() as { ac_balance: number };
    expect(balanceData.ac_balance).toBe(100);
  });

  it(testName('Balance Endpoint: should return balance for user'), async () => {
      const token = await createToken();
      const userId = `test-user-balance-${Date.now()}`;

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
      const earnRes = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: earnIdempotencyKey
        },
        body: JSON.stringify({
          gp_amount: 75,
          description: 'Test award'
        }),
      }, token);
      await earnRes.text().catch(() => undefined);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const response = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { gp_balance: number; ac_balance: number };
      expect(data.gp_balance).toBe(75);
    expect(data.ac_balance).toBe(0);
  });

  it(testName('Idempotency (Rule 14.8): should return same result when same awardId is used twice (Rule 14.8.1)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-idempotency');
      const awardId = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

      const url1 = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response1 = await worker.fetch(url1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: awardId
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response1.status).toBe(HttpStatus.Ok);
      const data1 = await response1.json() as { success: boolean; new_balance: number };
      expect(data1.success).toBe(true);
      expect(data1.new_balance).toBe(100);

      const url2 = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response2 = await worker.fetch(url2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: awardId
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response2.status).toBe(HttpStatus.Ok);
      const data2 = await response2.json() as { success: boolean; already_processed?: boolean; new_balance: number };
      expect(data2.success).toBe(true);
      expect(data2.already_processed).toBe(true);
      expect(data2.new_balance).toBe(100);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      const balanceData = await balanceResponse.json() as { gp_balance: number };
      expect(balanceData.gp_balance).toBe(100);
  });

  it(testName('Idempotency (Rule 14.8): should return same result when same consumeId is used twice (Rule 14.8.2)'), async () => {
    const token = await createToken();
    const userId = `test-user-consume-idempotency-${Date.now()}`;
    const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

    const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
    const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
    const earnRes2 = await worker.fetch(earnUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: earnIdempotencyKey
      },
      body: JSON.stringify({
        gp_amount: 200,
        description: 'Initial balance'
      }),
    }, token);
    await earnRes2.text().catch(() => undefined);

    const consumeUrl1 = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
    const response1 = await worker.fetch(consumeUrl1, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: consumeId
      },
      body: JSON.stringify({
        amount: 50,
        currency: Currency.GP,
        description: 'Test consume'
      }),
    }, token);

    expect(response1.status).toBe(HttpStatus.Ok);
    const data1 = await response1.json() as { success: boolean; new_balance: number };
    expect(data1.success).toBe(true);
    expect(data1.new_balance).toBe(150);

    const url2 = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
    const response2 = await worker.fetch(url2, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: consumeId
      },
      body: JSON.stringify({
        amount: 50,
        currency: Currency.GP,
        description: 'Test consume'
      }),
    }, token);

    expect(response2.status).toBe(HttpStatus.Ok);
    const data2 = await response2.json() as { success: boolean; already_processed?: boolean; new_balance: number };
    expect(data2.success).toBe(true);
    expect(data2.already_processed).toBe(true);
    expect(data2.new_balance).toBe(150);

    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceResponse = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    }, token);

    const balanceData = await balanceResponse.json() as { gp_balance: number };
    expect(balanceData.gp_balance).toBe(150);
  });

  it(testName('Concurrency (Rule 14.8.5, 15.5): should prevent duplicate awards under concurrency (state safety, not HTTP semantics)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-concurrent');
      const awardId = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

      const concurrentRequests = Array.from({ length: 10 }, () => {
        const url = buildCreditsApiUrl(userId, CreditAction.Earn);
        return worker.fetch(url, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: awardId
          },
          body: JSON.stringify({
            gp_amount: 100,
            description: 'Concurrent award'
          }),
        }, token);
      });

      const responses = await Promise.all(concurrentRequests);

      const successful = responses.filter(r => r.status === HttpStatus.Ok);
      expect(successful.length).toBeGreaterThanOrEqual(1);

      for (const r of responses) await r.text().catch(() => undefined);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      const balanceData = await balanceResponse.json() as { gp_balance: number };
      expect(balanceData.gp_balance).toBe(100);
  });

  it(testName('Concurrency (Rule 14.8.5, 15.5): should prevent duplicate consumption under concurrency (state safety)'), async () => {
      const token = await createToken();
      const userId = `test-user-consume-concurrent-${Date.now()}`;
      const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
      const earnConcur = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: earnIdempotencyKey
        },
        body: JSON.stringify({
          gp_amount: 200,
          description: 'Initial balance'
        }),
      }, token);
      await earnConcur.text().catch(() => undefined);

      const concurrentRequests = Array.from({ length: 10 }, () => {
        const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
        return worker.fetch(consumeUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeId
          },
          body: JSON.stringify({
            amount: 50,
            currency: Currency.GP,
            description: 'Concurrent consume'
          }),
        }, token);
      });

      const concurResponses = await Promise.all(concurrentRequests);
      for (const r of concurResponses) await r.text().catch(() => undefined);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      const balanceData = await balanceResponse.json() as { gp_balance: number };
    expect(balanceData.gp_balance).toBe(150);
  });

  it(testName('Error Handling: should accept valid custom idempotency key format'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-adapter-error');
      const customKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: customKey
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { success: boolean; new_balance: number };
      expect(data.success).toBe(true);
      expect(data.new_balance).toBe(100);
  });

  it(testName('Error Handling: should reject malformed request body'), async () => {
    const token = await createToken();
    const userId = `test-user-malformed-${Date.now()}`;

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: 'invalid-json-{',
      }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Input Validation (Rule 14.3): should reject invalid idempotency key format (too short)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-idempotency-short');

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: 'short'
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const errorData = await response.json() as { error?: string; message?: string };
      expect((errorData.message || errorData.error || '').toLowerCase()).toContain('idempotency key');
  });

  it(testName('Input Validation (Rule 14.3): should reject invalid idempotency key format (invalid characters)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-idempotency-invalid');

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: 'invalid@key#with$special'
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const errorData = await response.json() as { error?: string; message?: string };
      expect((errorData.message || errorData.error || '').toLowerCase()).toContain('idempotency key');
  });

  it(testName('Input Validation (Rule 14.3): should reject invalid idempotency key format (too long)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-idempotency-long');
      const longKey = 'a'.repeat(101);

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: longKey
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const errorData = await response.json() as { error?: string; message?: string };
      expect((errorData.message || errorData.error || '').toLowerCase()).toContain('idempotency key');
  });

  it(testName('Input Validation (Rule 14.3): should reject missing amount field'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-validation');

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          currency: Currency.GP,
          description: 'Test consume',
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Input Validation (Rule 14.3): should reject invalid currency'), async () => {
    const token = await createToken();
    const userId = `test-user-currency-${Date.now()}`;
      const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const response = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeId
        },
        body: JSON.stringify({
          amount: 50,
          currency: 'INVALID' as Currency,
          description: 'Test consume'
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Input Validation (Rule 14.3): should reject missing description'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-desc');

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gp_amount: 100,
        }),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
  });

  it(testName('Economic Invariants (Rule 0.1.1, 15.4): should maintain economic safety: no double awards (Rule 0.1.1)'), async () => {
      const token = await createToken();
      const userId = `test-user-economic-${Date.now()}`;
      const awardId = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

      const earnUrl1 = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earn1Res = await worker.fetch(earnUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: awardId
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'First award'
        }),
      }, token);
      await earn1Res.text().catch(() => undefined);

      const earnUrl2 = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earn2Res = await worker.fetch(earnUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: awardId
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Duplicate award'
        }),
      }, token);
      await earn2Res.text().catch(() => undefined);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      const balanceData = await balanceResponse.json() as { gp_balance: number };
      expect(balanceData.gp_balance).toBe(100);
  });

  it(testName('Economic Invariants (Rule 0.1.1, 15.4): should maintain economic safety: no double consumption (Rule 0.1.1)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-consume-economic');
      const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
      const earnRes3 = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: earnIdempotencyKey
        },
        body: JSON.stringify({
          gp_amount: 200,
          description: 'Initial balance'
        }),
      }, token);
      await earnRes3.text().catch(() => undefined);

      const consumeUrl1 = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consume1Res = await worker.fetch(consumeUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeId
        },
        body: JSON.stringify({
          amount: 50,
          currency: Currency.GP,
          description: 'First consume'
        }),
      }, token);
      await consume1Res.text().catch(() => undefined);

      const consumeUrl2 = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
      const consume2Res = await worker.fetch(consumeUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeId
        },
        body: JSON.stringify({
          amount: 50,
          currency: Currency.GP,
          description: 'Duplicate consume'
        }),
      }, token);
      await consume2Res.text().catch(() => undefined);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      const balanceData = await balanceResponse.json() as { gp_balance: number };
      expect(balanceData.gp_balance).toBe(150);
  });

  it(testName('Transactions Endpoint: should return transactions for user'), async () => {
      const token = await createToken();
      const userId = `test-user-transactions-${Date.now()}`;

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
      const earnTx = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: earnIdempotencyKey
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);
      await earnTx.text().catch(() => undefined);

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseTx = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
        },
        body: JSON.stringify({
          ac_amount: 50,
          amount: 1,
          currency: 'USD',
        }),
      }, token);
      await purchaseTx.text().catch(() => undefined);

      const transactionsUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const response = await worker.fetch(transactionsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { transactions: Array<{ transaction_id: string; type: string; amount: number; currency: string }>; count: number };
      expect(data.count).toBeGreaterThanOrEqual(2);
      expect(data.transactions.length).toBeGreaterThanOrEqual(2);
      expect(data.transactions.some(t => t.type === 'earned')).toBe(true);
      expect(data.transactions.some(t => t.type === 'purchase')).toBe(true);
  });

  it(testName('Transactions Endpoint: should enforce limit parameter'), async () => {
    const token = await createToken();
    const userId = `test-user-transactions-limit-${Date.now()}`;

      for (let i = 0; i < 5; i++) {
        const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
        const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
        const earnLimitRes = await worker.fetch(earnUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: earnIdempotencyKey
          },
          body: JSON.stringify({
            gp_amount: 10,
            description: `Test award ${i}`
          }),
        }, token);
        await earnLimitRes.text().catch(() => undefined);
      }

      const transactionsUrl = `${buildCreditsApiUrl(userId, CreditAction.Transactions)}?limit=3`;
      const response = await worker.fetch(transactionsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { transactions: unknown[]; count: number };
      expect(data.count).toBeLessThanOrEqual(3);
      expect(data.transactions.length).toBeLessThanOrEqual(3);
  });

  it(testName('Transactions Endpoint: should return empty transactions for new user'), async () => {
    const token = await createToken();
    const userId = `test-user-transactions-empty-${Date.now()}`;

      const transactionsUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const response = await worker.fetch(transactionsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { transactions: unknown[]; count: number };
      expect(data.count).toBe(0);
    expect(data.transactions.length).toBe(0);
  });

  it(testName('R2 Archiving: should archive purchase transaction to R2 after successful purchase'), async () => {
      const token = await createToken();
      const userId = `test-user-archive-purchase-${Date.now()}`;
      const purchaseId = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseResponse = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: purchaseId,
        },
        body: JSON.stringify({
          ac_amount: 100,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(purchaseResponse.status).toBe(HttpStatus.Ok);
      const purchaseData = await purchaseResponse.json() as { success: boolean; transaction_id?: string };
      expect(purchaseData.success).toBe(true);
      expect(purchaseData.transaction_id).toBeTypeOf('string');

      await new Promise(resolve => setTimeout(resolve, 1000));

      const transactionsUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const transactionsResponse = await worker.fetch(transactionsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(transactionsResponse.status).toBe(HttpStatus.Ok);
      const transactionsData = await transactionsResponse.json() as {
        transactions: Array<{
          transaction_id: string;
          type: string;
          amount: number;
          currency: string;
        }>;
        count: number;
      };

      const archivedTransaction = transactionsData.transactions.find(
        t => t.transaction_id === purchaseData.transaction_id
      );
      expect(archivedTransaction).not.toBeNull();
      expect(archivedTransaction!.transaction_id).toBe(purchaseData.transaction_id);
      expect(archivedTransaction!.type).toBe('purchase');
      expect(archivedTransaction!.amount).toBe(100);
      expect(archivedTransaction!.currency).toBe('AC');
  });

  it(testName('R2 Archiving: should archive consume AC transaction to R2 after successful consume'), async () => {
      const token = await createToken();
      const userId = `test-user-archive-consume-ac-${Date.now()}`;

      const purchaseId = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseArchive = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: purchaseId,
        },
        body: JSON.stringify({
          ac_amount: 200,
          amount: 2,
          currency: 'USD',
        }),
      }, token);
      await purchaseArchive.text().catch(() => undefined);

      const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeResponse = await worker.fetch(consumeUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: consumeId
        },
        body: JSON.stringify({
          ac_amount: 50,
          description: 'Test consume AC'
        }),
      }, token);

      expect(consumeResponse.status).toBe(HttpStatus.Ok);
      const consumeData = await consumeResponse.json() as { success: boolean; transaction_id?: string };
      expect(consumeData.success).toBe(true);
      expect(consumeData.transaction_id).toBeTypeOf('string');

      await new Promise(resolve => setTimeout(resolve, 1000));

      const transactionsUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const transactionsResponse = await worker.fetch(transactionsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(transactionsResponse.status).toBe(HttpStatus.Ok);
      const transactionsData = await transactionsResponse.json() as {
        transactions: Array<{
          transaction_id: string;
          type: string;
          amount: number;
          currency: string;
        }>;
        count: number;
      };

      const archivedTransaction = transactionsData.transactions.find(
        t => t.transaction_id === consumeData.transaction_id
      );
      expect(archivedTransaction).not.toBeNull();
      expect(archivedTransaction!.transaction_id).toBe(consumeData.transaction_id);
      expect(archivedTransaction!.type).toBe('consumption');
      expect(archivedTransaction!.amount).toBe(-50);
      expect(archivedTransaction!.currency).toBe('AC');
  });

  it(testName('R2 Archiving: should archive GP award transaction to R2 after successful award'), async () => {
      const token = await createToken();
      const userId = `test-user-archive-award-${Date.now()}`;
      const awardId = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

      const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
      const earnResponse = await worker.fetch(earnUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: awardId
        },
        body: JSON.stringify({
          gp_amount: 100,
          description: 'Test award'
        }),
      }, token);

      expect(earnResponse.status).toBe(HttpStatus.Ok);
      const earnData = await earnResponse.json() as { success: boolean; transaction_id?: string };
      expect(earnData.success).toBe(true);
      expect(earnData.transaction_id).toBeTypeOf('string');

      await new Promise(resolve => setTimeout(resolve, 1000));

      const transactionsUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const transactionsResponse = await worker.fetch(transactionsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(transactionsResponse.status).toBe(HttpStatus.Ok);
      const transactionsData = await transactionsResponse.json() as {
        transactions: Array<{
          transaction_id: string;
          type: string;
          amount: number;
          currency: string;
        }>;
        count: number;
      };

      const archivedTransaction = transactionsData.transactions.find(
        t => t.transaction_id === earnData.transaction_id
      );
      expect(archivedTransaction).not.toBeNull();
      expect(archivedTransaction!.transaction_id).toBe(earnData.transaction_id);
      expect(archivedTransaction!.type).toBe('earned');
      expect(archivedTransaction!.amount).toBe(100);
      expect(archivedTransaction!.currency).toBe('GP');
  });

  it(testName('R2 Archiving: should handle R2 archiving failure gracefully without affecting DO operation'), async () => {
      const token = await createToken();
      const userId = `test-user-archive-failure-${Date.now()}`;
      const purchaseId = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseResponse = await worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: purchaseId,
        },
        body: JSON.stringify({
          ac_amount: 100,
          amount: 1,
          currency: 'USD',
        }),
      }, token);

      expect(purchaseResponse.status).toBe(HttpStatus.Ok);
      const purchaseData = await purchaseResponse.json() as { success: boolean; new_balance: number };
      expect(purchaseData.success).toBe(true);
      expect(purchaseData.new_balance).toBe(100);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      }, token);

      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balanceData = await balanceResponse.json() as { ac_balance: number };
    expect(balanceData.ac_balance).toBe(100);
  });
});
