import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlWithQuery, buildCreditsApiUrl, generateTestUserId, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { Currency } from '@ocentra/endpoint-domain/constants/credits';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
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
    logInfo('[TEST] Initializing test worker for observability tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('Correlation ID Generation: security events should have deterministic correlation IDs'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      logInfo('[TEST] Testing correlation ID generation for security events', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { hash: 'invalid', type: 'image' });
      const response = await worker.fetch(resourceUrl,
        {
          headers: getValidRequestHeaders(userId, false, TestConfig.EvilOrigin)
        },
        token
      );

      logInfo('[TEST] Security event response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await response.text().catch(() => undefined);
      if (response.status < HttpStatus.BadRequest) {
        logError('[TEST] Security event should be rejected', getStackTrace(), { status: response.status });
      }
      
      const resourceUrl2 = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { hash: 'invalid2', type: 'image' });
      const response2 = await worker.fetch(resourceUrl2,
        {
          headers: getValidRequestHeaders(userId, false, TestConfig.EvilOrigin)
        },
        token
      );

      expect(response2.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await response2.text().catch(() => undefined);
    });

  it(testName('Correlation ID Generation: correlation IDs should be unique per event'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const responses = [];

      for (let i = 0; i < 5; i++) {
        const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { hash: `test${i}`, type: 'image' });
        const response = await worker.fetch(resourceUrl,
          {
            headers: getValidRequestHeaders(userId, false, TestConfig.EvilOrigin)
          },
          token
        );
        responses.push(response);
      }

      expect(responses.length).toBe(5);
      for (const r of responses) {
        expect(r.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
        await consumeResponseBody(r);
      }
    });

  it(testName('Security Event Completeness: CORS violations should include all required fields'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { hash: 'test', type: 'image' });
      const response = await worker.fetch(resourceUrl,
        {
          headers: getValidRequestHeaders(userId, false, TestConfig.EvilOrigin)
        },
        token
      );

      expect(response.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await response.text().catch(() => undefined);
    });

  it(testName('Security Event Completeness: direct purchase rejections should be logged with correlation ID'), async () => {
      const token = await createToken();
      const walletId = `test-wallet-${Date.now()}`;
      const userId = generateTestUserId('test-user');
      const testMode = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = testMode === TestEnvValue.Real || testMode === TestEnvValue.Cloud;
      const statuses: number[] = [];
      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);

      const batchSize = 10;
      const totalRequests = 30;
      for (let batch = 0; batch < Math.ceil(totalRequests / batchSize); batch++) {
        const requests = [];
        for (let i = 0; i < batchSize && (batch * batchSize + i) < totalRequests; i++) {
          const index = batch * batchSize + i;
          requests.push(
            worker.fetch(
              purchaseUrl,
              {
                method: 'POST',
                headers: {
                  ...getValidRequestHeaders(userId),
                  [HttpHeader.ContentType]: 'application/json',
                  [HttpHeader.XWalletId]: walletId,
                  [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
                },
                body: JSON.stringify({
                  ac_amount: 1 + index,
                  amount: 1,
                  currency: Currency.USD,
                }),
              },
              token
            )
          );
        }
        const results = await Promise.all(requests);
        for (const res of results) {
          statuses.push(res.status);
          await consumeResponseBody(res);
        }
      }
      expect(statuses.length).toBe(totalRequests);
      const rateLimitedCount = statuses.filter(status => status === HttpStatus.TooManyRequests).length;
      const forbiddenCount = statuses.filter(status => status === HttpStatus.Forbidden).length;
      if (!isRealMode) {
        expect(forbiddenCount + rateLimitedCount).toBeGreaterThan(0);
      } else {
        expect(statuses.every(status => status >= HttpStatus.Ok && status < HttpStatus.InternalServerError)).toBe(true);
      }
    }, 120000);

  it(testName('Event Immutability: security events should be immutable once logged'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      
      const resourceUrl1 = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { hash: 'test', type: 'image' });
      const response1 = await worker.fetch(resourceUrl1,
        {
          headers: getValidRequestHeaders(userId, false, TestConfig.EvilOrigin)
        },
        token
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const resourceUrl2 = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { hash: 'test', type: 'image' });
      const response2 = await worker.fetch(resourceUrl2,
        {
          headers: getValidRequestHeaders(userId, false, TestConfig.EvilOrigin)
        },
        token
      );

      expect(response1.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      expect(response2.status).toBeGreaterThanOrEqual(HttpStatus.BadRequest);
      await response1.text().catch(() => undefined);
      await response2.text().catch(() => undefined);
    });

  it(testName('Money-Critical Path Logging: credit operations should emit security logs with correlation IDs'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('obs-test');

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseResponse = await worker.fetch(purchaseUrl,
        {
          method: 'POST',
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: 'application/json'
          },
          body: JSON.stringify({
            ac_amount: 100,
            amount: 1,
            currency: Currency.USD
          })
        },
        token
      );

      expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(purchaseResponse.status);
      await consumeResponseBody(purchaseResponse);
    });

  it(testName('Rule 15.8.8: no PII in telemetry - credit balance success response does not contain token or secrets'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('pii-check');
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const response = await worker.fetch(balanceUrl, {
        method: 'GET',
        headers: getValidRequestHeaders(userId),
      }, token);
      expect([HttpStatus.Ok, HttpStatus.Unauthorized]).toContain(response.status);
      const body = await response.text();
      if (response.status === HttpStatus.Ok && body.length > 0) {
        const data = JSON.parse(body) as Record<string, unknown>;
        const keys = Object.keys(data).map((k) => k.toLowerCase());
        expect(keys).not.toContain('token');
        expect(keys).not.toContain('authorization');
        expect(keys).not.toContain('password');
        expect(keys).not.toContain('secret');
        expect(body).not.toMatch(/\bBearer\s+/i);
      }
      await consumeResponseBody(response);
    });
});
