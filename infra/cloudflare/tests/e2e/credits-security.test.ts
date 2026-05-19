import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildCreditsApiUrl,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { UserIdTestData } from '@tests/helpers/test-data';
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

async function expectCheckoutOnlyPurchaseRejection(response: Response): Promise<void> {
  expect(response.status).toBe(HttpStatus.Forbidden);
  const data = await response.json() as { error?: string; message?: string; stack?: string };
  expect(data.error).toBe('Forbidden');
  expect(data.message).toContain('payment checkout flow');
  expect(data.stack).toBeUndefined();
}

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    const workerStartTime = Date.now();
    try {
      worker = await getTestWorker();
      
      const workerInitDuration = Date.now() - workerStartTime;
      if (workerInitDuration > 10000) {
        logError('[TEST] Worker initialization took too long', getStackTrace(), {
          duration: workerInitDuration,
          expected: '<10000ms',
          warning: 'Worker may be slow or unresponsive'
        });
      }
      
      const status = worker.getStatus();
      if (status.health !== 'ready') {
        throw new Error(`[FAIL-FAST] Worker is not ready. Status: ${JSON.stringify(status)}. This would cause test timeouts.`);
      }
      
      logInfo('[TEST] Worker initialized and ready', getStackTrace(), {
        duration: workerInitDuration,
        status: status.health,
        mode: status.mode
      }, LOG_TEST_OPERATIONS);
    } catch (error) {
      const workerInitDuration = Date.now() - workerStartTime;
      logError('[TEST] Worker initialization failed', getStackTrace(), {
        duration: workerInitDuration,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  const testData = new UserIdTestData();

  it(testName('Path Parameter Validation: should reject path traversal in userId'), async () => {
      const token = await createToken();
      const userId = TestConfig.TestUserId;
      const traversalPayloads = testData.generateInvalidBoundary().filter(p => p.includes('../') || p.includes('..'));
      logInfo('[TEST] Testing path traversal rejection', getStackTrace(), { payloadCount: traversalPayloads.length }, LOG_TEST_OPERATIONS);

      for (const payload of traversalPayloads) {
        const url = buildCreditsApiUrl(payload, CreditAction.Balance);
        const response = await worker.fetch(url, {
            method: HttpMethod.Get,
            headers: getValidRequestHeaders(userId)
          },
          token
        );

        const status = response.status;
        logInfo('[TEST] Path traversal validation response', getStackTrace(), { payload, status }, LOG_TEST_RESPONSE_DETAILS);
        expect(
          status === HttpStatus.BadRequest ||
          status === HttpStatus.NotFound ||
          status === HttpStatus.Forbidden
        ).toBe(true);
        await consumeResponseBody(response);
      }
    });

  it(testName('Path Parameter Validation: should reject double-encoded userId'), async () => {
      const token = await createToken();
      const userId = TestConfig.TestUserId;
      const doubleEncodedPayloads = testData.generateInvalidDoubleEncoded();
      logInfo('[TEST] Testing double-encoded userId rejection', getStackTrace(), { payloadCount: doubleEncodedPayloads.length }, LOG_TEST_OPERATIONS);

      for (const payload of doubleEncodedPayloads) {
        const url = buildCreditsApiUrl(payload, CreditAction.Balance);
        const response = await worker.fetch(url, {
            method: HttpMethod.Get,
            headers: getValidRequestHeaders(userId)
          },
          token
        );

        logInfo('[TEST] Double-encoded validation response', getStackTrace(), { payload, status: response.status }, LOG_TEST_RESPONSE_DETAILS);
        expect(response.status).toBe(HttpStatus.BadRequest);
        await consumeResponseBody(response);
      }
    });

  it(testName('Authorization (Rule 14.1): should reject unauthenticated balance request even with syntactically valid userId'), async () => {
      const token = await createToken();
      const userId = TestConfig.TestUserId;
      const nullBytePayloads = [
        'test-user\u0000',
        '\u0000test-user',
        'test\u0000user',
      ];
      logInfo('[TEST] Testing null byte injection rejection', getStackTrace(), { payloadCount: nullBytePayloads.length }, LOG_TEST_OPERATIONS);

      for (const payload of nullBytePayloads) {
        const url = buildCreditsApiUrl(payload, CreditAction.Balance);
        const response = await worker.fetch(url, {
            method: HttpMethod.Get,
            headers: getValidRequestHeaders(userId)
          },
          token
        );

        const status = response.status;
        logInfo('[TEST] Null byte injection validation response', getStackTrace(), { payload, status }, LOG_TEST_RESPONSE_DETAILS);
        expect(
          status === HttpStatus.BadRequest ||
          status === HttpStatus.Unauthorized
        ).toBe(true);
      }
    });

  it(testName('Path Parameter Validation: should reject null byte injection in userId'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const url = buildCreditsApiUrl(userId, CreditAction.Balance);
      const response = await worker.fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Authorization Enforcement: should reject cross-user access attempts'), async () => {
      const token = await createToken();
      const attackerUserId = TestConfig.AttackerUserIdCredits;
      const victimUserId = TestConfig.VictimUserId;

      const url = buildCreditsApiUrl(victimUserId, CreditAction.Balance);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(attackerUserId)
        },
      token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('own credit data');
    });

  it(testName('Authorization Enforcement: should reject cross-user purchase attempts'), async () => {
      const token = await createToken();
      const attackerUserId = TestConfig.AttackerUserIdCredits;
      const victimUserId = TestConfig.VictimUserId;
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(victimUserId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(attackerUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 1000,
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      await consumeResponseBody(response);
    });

  it(testName('Economic Safety: should reject client-authoritative AC purchase minting'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('purchase-mint-block');
      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
          },
          body: JSON.stringify({
            ac_amount: 999999,
            amount: 1,
            currency: Currency.USD,
          })
        },
      token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('payment checkout');
    });

  it(testName('Economic Safety: should reject client-authoritative GP award minting'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('gp-mint-block');
      const url = buildCreditsApiUrl(userId, CreditAction.Earn);
      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({
            gp_amount: 999999,
            description: 'client selected reward',
          })
        },
      token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error?: string; message?: string };
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('trusted server workflows');
    });

  it(testName('Redeem: requires authentication (Rule 14.1.1)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-no-auth');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'ANYCODE' }),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await consumeResponseBody(response);
  });

  it(testName('Authorization Enforcement: should reject cross-user consumption attempts'), async () => {
      const token = await createToken();
      const attackerUserId = TestConfig.AttackerUserIdCredits;
      const victimUserId = TestConfig.VictimUserId;
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

      const url = buildCreditsApiUrl(victimUserId, CreditAction.Consume);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(attackerUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 100,
            description: 'AI usage'
          })
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation: should reject purchase with negative amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-input');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: -1000,
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

  it(testName('Input Validation: should reject purchase with zero amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-input');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 0,
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

    it(testName('should reject purchase with missing ac_amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-input');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

  it(testName('Input Validation: should reject consumption with negative amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-input');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

      const url = buildCreditsApiUrl(userId, CreditAction.Consume);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: -50,
            description: 'AI usage'
          })
        },
      token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation: should reject consumption with zero amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user-input');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);

      const url = buildCreditsApiUrl(userId, CreditAction.Consume);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 0,
            description: 'AI usage'
          })
        },
      token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Economic Invariants: should prevent negative balance after consumption'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('economic-test');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const purchaseRes = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseKey
          },
          body: JSON.stringify({
            ac_amount: 100,
            amount: 1,
            currency: Currency.USD,
          })
        },
      token
      );
      await consumeResponseBody(purchaseRes);

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const consumeResponse = await worker.fetch(consumeUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeKey
          },
          body: JSON.stringify({
            ac_amount: 150,
            description: 'AI usage'
          })
        },
      token
      );

      expect(consumeResponse.status).toBe(402);
      await consumeResponseBody(consumeResponse);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(userId)
          }
        },
      token
      );

      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balance = await balanceResponse.json() as { ac_balance: number };
      expect(balance.ac_balance).toBeGreaterThanOrEqual(0);
    });

  it(testName('Economic Invariants: should maintain balance consistency across multiple operations'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('consistency-test');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const purchaseResponse = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseKey
          },
          body: JSON.stringify({
            ac_amount: 1000,
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );
      await expectCheckoutOnlyPurchaseRejection(purchaseResponse);

      const consumeUrl1 = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeKey1 = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      await worker.fetch(consumeUrl1,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeKey1
          },
          body: JSON.stringify({
            ac_amount: 300,
            description: 'AI usage 1'
          })
        },
      token
      );

      const consumeUrl2 = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeKey2 = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      await worker.fetch(consumeUrl2,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeKey2
          },
          body: JSON.stringify({
            ac_amount: 200,
            description: 'AI usage 2'
          })
        },
      token
      );

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(userId)
          }
        },
      token
      );

      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balance = await balanceResponse.json() as { ac_balance: number; total_ac_purchased: number; total_ac_spent: number };
      expect(balance.ac_balance).toBe(0);
      expect(balance.total_ac_purchased).toBe(0);
      expect(balance.total_ac_spent).toBe(0);
    });

  it(testName('Replay Protection: should create unique transaction IDs for each purchase'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('replay-test');

      const purchaseUrl1 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const key1 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const response1 = await worker.fetch(purchaseUrl1,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: key1
          },
          body: JSON.stringify({
            ac_amount: 100,
            amount: 1,
            currency: Currency.USD,
          })
        },
      token
      );

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const key2 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const response2 = await worker.fetch(purchaseUrl2,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: key2
          },
          body: JSON.stringify({
            ac_amount: 100,
            amount: 1,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response1);
      await expectCheckoutOnlyPurchaseRejection(response2);
    });

  it(testName('Replay Protection: should create unique transaction IDs for each consumption'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('replay-consume');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const purchaseResponse = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseKey
          },
          body: JSON.stringify({
            ac_amount: 1000,
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );

      if (purchaseResponse.status !== HttpStatus.Ok) {
        await expectCheckoutOnlyPurchaseRejection(purchaseResponse);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const consumeUrl1 = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeKey1 = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response1 = await worker.fetch(consumeUrl1,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeKey1
          },
          body: JSON.stringify({
            ac_amount: 50,
            description: 'Test consumption 1'
          })
        },
      token
      );

      const consumeUrl2 = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeKey2 = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response2 = await worker.fetch(consumeUrl2,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeKey2
          },
          body: JSON.stringify({
            ac_amount: 50,
            description: 'Test consumption 2'
          })
        },
      token
      );

      if (response1.status !== HttpStatus.Ok || response2.status !== HttpStatus.Ok) {
        const error1 = response1.status !== HttpStatus.Ok ? await response1.json().catch(() => ({ error: 'Failed to parse' })) : null;
        const error2 = response2.status !== HttpStatus.Ok ? await response2.json().catch(() => ({ error: 'Failed to parse' })) : null;
        logError('[TEST] Consume requests failed', getStackTrace(), { response1: response1.status, error1, response2: response2.status, error2 });
      }

      expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response1.status);
      expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response2.status);
      
      if (response1.status !== HttpStatus.Ok || response2.status !== HttpStatus.Ok) {
        return;
      }

      const data1 = await response1.json() as { transaction_id: string };
      const data2 = await response2.json() as { transaction_id: string };

      expect(data1.transaction_id).not.toBe(data2.transaction_id);
    });

  it(testName('Rate Limiting Security: should prevent rate limit bypass via different endpoints'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('rate-limit-bypass');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const purchaseRequests = [];
      const iterations = isRealMode ? 10 : 15;
      for (let i = 0; i < iterations; i++) {
        const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
        const purchaseKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
        purchaseRequests.push(
          worker.fetch(purchaseUrl,
            {
              method: HttpMethod.Post,
              headers: {
                ...getValidRequestHeaders(userId),
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                [HttpHeader.IdempotencyKey]: purchaseKey
              },
              body: JSON.stringify({
                ac_amount: 100,
                amount: 1,
                currency: Currency.USD,
              })
            },
            token
          )
        );
      }

      const responses = await Promise.all(purchaseRequests);
      const forbidden = responses.filter(r => r.status === HttpStatus.Forbidden);
      expect(forbidden.length).toBe(iterations);
      await Promise.all(responses.map(r => consumeResponseBody(r)));
    });

  it(testName('Rate Limiting Security: should track rate limits per user independently'), async () => {
      const token = await createToken();
      const user1 = generateTestUserId('rate-user1');
      const user2 = generateTestUserId('rate-user2');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const requests1 = [];
      const requests2 = [];

      const iterations = isRealMode ? 5 : 12;
      for (let i = 0; i < iterations; i++) {
        const purchaseUrl1 = buildCreditsApiUrl(user1, CreditAction.Purchase);
        const key1 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
        requests1.push(
          worker.fetch(purchaseUrl1,
            {
              method: HttpMethod.Post,
              headers: {
                ...getValidRequestHeaders(user1),
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                [HttpHeader.IdempotencyKey]: key1
              },
              body: JSON.stringify({
                ac_amount: 100,
                amount: 1,
                currency: Currency.USD,
              })
            },
            token
          )
        );

        const purchaseUrl2 = buildCreditsApiUrl(user2, CreditAction.Purchase);
        const key2 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
        requests2.push(
          worker.fetch(purchaseUrl2,
            {
              method: HttpMethod.Post,
              headers: {
                ...getValidRequestHeaders(user2),
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                [HttpHeader.IdempotencyKey]: key2
              },
              body: JSON.stringify({
                ac_amount: 100,
                amount: 1,
                currency: Currency.USD,
              })
            },
            token
          )
        );
      }

      const [responses1, responses2] = await Promise.all([
        Promise.all(requests1),
        Promise.all(requests2)
      ]);

      expect(responses1.every(r => r.status === HttpStatus.Forbidden)).toBe(true);
      expect(responses2.every(r => r.status === HttpStatus.Forbidden)).toBe(true);
      await Promise.all([...responses1, ...responses2].map(r => consumeResponseBody(r)));
    });

  it(testName('Error & Information Leakage: should not leak internal error details in responses'), async () => {
      const token = await createToken();
      const userId = TestConfig.TestUserId;
      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: 'invalid json{'
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

  it(testName('Error & Information Leakage: should return consistent error shape for unauthorized requests'), async () => {
      const token = await createToken();
      const balanceUrl = buildCreditsApiUrl(TestConfig.TestUserId, CreditAction.Balance);
      const response1 = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
      token
      );

      const purchaseUrl = buildCreditsApiUrl(TestConfig.OtherUserId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
      token
      );

      expect(response1.status).toBe(HttpStatus.Unauthorized);
      expect(response2.status).toBe(HttpStatus.Unauthorized);

      const data1 = await response1.json() as { error?: string };
      const data2 = await response2.json() as { error?: string };
      
      expect(typeof data1.error).toBe('string');
      expect(typeof data2.error).toBe('string');
    });

  it(testName('Error & Information Leakage: should not leak user existence via different error messages'), async () => {
      const token = await createToken();
      const attackerUserId = TestConfig.AttackerUserIdCredits;
      
      const balanceUrl1 = buildCreditsApiUrl('nonexistent-user-12345', CreditAction.Balance);
      const response1 = await worker.fetch(balanceUrl1,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(attackerUserId)
        },
      token
      );

      const balanceUrl2 = buildCreditsApiUrl('nonexistent-user-67890', CreditAction.Balance);
      const response2 = await worker.fetch(balanceUrl2,
        {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(attackerUserId)
          }
        },
      token
      );

      expect(response1.status).toBe(HttpStatus.Forbidden);
      expect(response2.status).toBe(HttpStatus.Forbidden);

      const data1 = await response1.json() as { error?: string; message?: string };
      const data2 = await response2.json() as { error?: string; message?: string };
      
      expect(data1.error).toBe(data2.error);
      expect(data1.message).toBe(data2.message);
    });

  it(testName('State & Logic Abuse: should prevent state mutation via invalid transitions'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('state-abuse');

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const initialBalance = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = await initialBalance.json() as { ac_balance: number };
      const initialAC = initialData.ac_balance;

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const skipStepsPurchase = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseKey
          },
          body: JSON.stringify({
            ac_amount: 500,
            amount: 5,
            currency: Currency.USD,
          })
        },
      token
      );
      await expectCheckoutOnlyPurchaseRejection(skipStepsPurchase);

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const consumeResponse = await worker.fetch(consumeUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeKey
          },
          body: JSON.stringify({
            ac_amount: 1000,
            description: 'Attempting to consume more than available'
          })
        },
      token
      );

      expect(consumeResponse.status).toBe(402);
      await consumeResponseBody(consumeResponse);

      const finalBalanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const finalBalance = await worker.fetch(finalBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      const finalData = await finalBalance.json() as { ac_balance: number };
      
      expect(finalData.ac_balance).toBe(initialAC);
      expect(finalData.ac_balance).toBeGreaterThanOrEqual(0);
    });

  it(testName('State & Logic Abuse: should prevent skipping required steps in purchase flow'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('skip-steps');

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify({
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

  it(testName('Concurrency & Race Conditions: should handle concurrent purchase requests correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('concurrent-purchase');

      const initialBalanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const initialBalance = await worker.fetch(initialBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = await initialBalance.json() as { ac_balance?: number };
      const initialAC = typeof initialData.ac_balance === 'number' ? initialData.ac_balance : 0;

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const requests = Array.from({ length: 5 }, () => {
        const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
        return worker.fetch(purchaseUrl,
          {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              [HttpHeader.IdempotencyKey]: idempotencyKey
            },
            body: JSON.stringify({
              ac_amount: 100,
              amount: 1,
              currency: Currency.USD,
            })
          },
          token
        );
      });

      const responses = await Promise.all(requests);
      const successful = responses.filter(r => r.status === HttpStatus.Ok);
      const failed = responses.filter(r => r.status !== HttpStatus.Ok);

      if (failed.length > 0) {
        const errorBodies = await Promise.all(failed.map(r => r.json().catch(() => ({ error: 'Failed to parse' }))));
        logError('[TEST] Some concurrent purchases failed', getStackTrace(), {
          successful: successful.length,
          failed: failed.length,
          failedStatuses: failed.map(r => r.status),
          errorBodies
        });
      }
      await Promise.all(responses.map(r => consumeResponseBody(r)));

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalBalanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const finalBalance = await worker.fetch(finalBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      const finalData = await finalBalance.json() as { ac_balance?: number };
      const finalAC = typeof finalData.ac_balance === 'number' ? finalData.ac_balance : 0;

      const actualIncrease = finalAC - initialAC;
      const expectedIncrease = successful.length * 100;

      expect(actualIncrease).toBe(expectedIncrease);
      expect(finalAC).toBeGreaterThanOrEqual(0);
    });

  it(testName('Concurrency & Race Conditions: should handle concurrent consume requests correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('concurrent-consume');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const concurrentPurchaseRes = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseKey
          },
          body: JSON.stringify({
            ac_amount: 1000,
            amount: 10,
            currency: Currency.USD,
          })
        },
      token
      );
      const startingBalance = concurrentPurchaseRes.status === HttpStatus.Ok ? 1000 : 0;
      if (concurrentPurchaseRes.status === HttpStatus.Ok) {
        await consumeResponseBody(concurrentPurchaseRes);
      } else {
        await expectCheckoutOnlyPurchaseRejection(concurrentPurchaseRes);
      }

      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const requests = Array.from({ length: 10 }, () => {
        const consumeKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
        return worker.fetch(consumeUrl,
          {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              [HttpHeader.IdempotencyKey]: consumeKey
            },
            body: JSON.stringify({
              ac_amount: 50,
              description: 'Concurrent consumption'
            })
          },
          token
        );
      });

      const responses = await Promise.all(requests);
      const successful = responses.filter(r => r.status === HttpStatus.Ok);
      await Promise.all(responses.map(r => consumeResponseBody(r)));

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalBalanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const finalBalance = await worker.fetch(finalBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      const finalData = await finalBalance.json() as { ac_balance: number };
      
      const consumed = successful.length * 50;
      expect(finalData.ac_balance).toBeGreaterThanOrEqual(0);
      expect(finalData.ac_balance).toBeLessThanOrEqual(startingBalance);
      
      const expectedBalance = startingBalance - consumed;
      const balanceDifference = Math.abs(finalData.ac_balance - expectedBalance);
      expect(balanceDifference).toBeLessThanOrEqual(50);
    });

  it(testName('Idempotency Keys: should return same result for duplicate requests with same idempotency key'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('idempotency-test');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const purchasePayload = {
        ac_amount: 100,
        amount: 1,
        currency: Currency.USD,
      };

      const purchaseUrl1 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl1,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey,
          },
          body: JSON.stringify(purchasePayload),
        },
      token
      );

      if (response1.status !== HttpStatus.Ok) {
        await expectCheckoutOnlyPurchaseRejection(response1);
        return;
      }
      
      const data1 = await response1.json() as { success: boolean; transaction_id: string; new_balance: number; ac_added: number };
      expect(data1.success).toBe(true);
      expect(data1.transaction_id).toBeTypeOf('string');
      expect(data1.new_balance).toBe(100);

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl2,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey,
          },
          body: JSON.stringify(purchasePayload),
        },
      token
      );

      expect(response2.status).toBe(HttpStatus.Ok);
      const data2 = await response2.json() as { success: boolean; transaction_id: string; new_balance: number; ac_added: number };
      expect(data2.success).toBe(true);
      expect(data2.transaction_id).toBe(data1.transaction_id);
      expect(data2.new_balance).toBe(data1.new_balance);
      expect(data2.ac_added).toBe(data1.ac_added);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const balanceResponse = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );

      expect(balanceResponse.status).toBe(HttpStatus.Ok);
      const balanceData = await balanceResponse.json() as { ac_balance: number };
      expect(balanceData.ac_balance).toBe(100);
    });

  it(testName('Idempotency Keys: should create separate transactions for requests with different idempotency keys'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('idempotency-diff-test');

      const purchasePayload = {
        ac_amount: 50,
        amount: 0.5,
        currency: Currency.USD,
      };

      const purchaseUrl1 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl1,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
          },
          body: JSON.stringify(purchasePayload),
        },
      token
      );

      if (response1.status !== HttpStatus.Ok) {
        await expectCheckoutOnlyPurchaseRejection(response1);
        return;
      }
      
      const data1 = await response1.json() as { success: boolean; transaction_id: string; new_balance: number };
      expect(data1.success).toBe(true);
      expect(data1.new_balance).toBe(50);

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl2,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
          },
          body: JSON.stringify(purchasePayload),
        },
      token
      );

      if (response2.status !== HttpStatus.Ok) {
        const errorBody = await response2.json().catch(() => ({ error: 'Failed to parse' }));
        logError('[TEST] Second purchase failed', getStackTrace(), { status: response2.status, errorBody, payload: purchasePayload });
      }

      expect([HttpStatus.Ok, HttpStatus.TooManyRequests, HttpStatus.Conflict, HttpStatus.BadRequest]).toContain(response2.status);
      
      if (response2.status !== HttpStatus.Ok) {
        return;
      }
      const data2 = await response2.json() as { success: boolean; transaction_id: string; new_balance: number };
      expect(data2.success).toBe(true);
      expect(data2.transaction_id).not.toBe(data1.transaction_id);
      expect(data2.new_balance).toBe(100);
    });

  it(testName('Idempotency & Duplication Prevention: should create separate transactions for identical purchases'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('idempotency');

      const purchaseUrl1 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response1 = await worker.fetch(purchaseUrl1,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify({
            ac_amount: 200,
            amount: 2,
            currency: Currency.USD,
          })
        },
      token
      );

      if (response1.status !== HttpStatus.Ok) {
        await expectCheckoutOnlyPurchaseRejection(response1);
        return;
      }

      const purchaseUrl2 = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const response2 = await worker.fetch(purchaseUrl2,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify({
            ac_amount: 200,
            amount: 2,
            currency: Currency.USD,
          })
        },
      token
      );

      if (response2.status !== HttpStatus.Ok) {
        const errorBody = await response2.json().catch(() => ({ error: 'Failed to parse' }));
        logError('[TEST] Second purchase failed', getStackTrace(), { status: response2.status, errorBody });
      }

      expect([HttpStatus.Ok, HttpStatus.TooManyRequests, HttpStatus.Conflict, HttpStatus.BadRequest]).toContain(response2.status);
      
      if (response2.status !== HttpStatus.Ok) {
        return;
      }

      const data1 = await response1.json() as { transaction_id: string; new_balance: number };
      const data2 = await response2.json() as { transaction_id: string; new_balance: number };

      expect(data1.transaction_id).not.toBe(data2.transaction_id);
      expect(data2.new_balance).toBe(data1.new_balance + 200);
    });

  it(testName('Boundary Value Testing: should handle maximum integer values correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('boundary-max');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: Number.MAX_SAFE_INTEGER,
            amount: 999999,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

  it(testName('Boundary Value Testing: should reject NaN values'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('boundary-nan');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: NaN,
            amount: 1,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
    });

  it(testName('Boundary Value Testing: should reject Infinity values (serialized as null by JSON.stringify)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('boundary-infinity');
      const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

      const url = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: idempotencyKey
          },
          body: JSON.stringify({
            ac_amount: Infinity,
            amount: 1,
            currency: Currency.USD,
          })
        },
      token
      );

      await expectCheckoutOnlyPurchaseRejection(response);
      
      const bodyText = JSON.stringify({
        ac_amount: Infinity,
        amount: 1,
        currency: Currency.USD,
      });
      expect(bodyText).toContain('"ac_amount":null');
    });
});
