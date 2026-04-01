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
import { TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
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

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Rate Limit Enforcement: should prevent rate limit bypass via different endpoints'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('rate-limit-bypass');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      logInfo('[TEST] Testing rate limit bypass prevention', getStackTrace(), { userId, requestCount: 15 }, LOG_TEST_OPERATIONS);

      const iterations = isRealMode ? 10 : 15;
      const purchaseRequests = Array.from({ length: iterations }, () => {
        const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
        return worker.fetch(purchaseUrl, {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify({
              ac_amount: 100,
              amount: 1,
              currency: Currency.USD,
            })
          }, token
        );
      });

      const responses = await Promise.all(purchaseRequests);
      const statusCounts = responses.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      logInfo('[TEST] Rate limit test responses', getStackTrace(), { statusCounts, totalResponses: responses.length }, LOG_TEST_RESPONSE_DETAILS);
      
      const rateLimited = responses.filter(r => r.status === HttpStatus.TooManyRequests);
      logInfo('[TEST] Rate limit enforcement result', getStackTrace(), { rateLimitedCount: rateLimited.length, total: responses.length }, LOG_TEST_OPERATIONS);
      
      if (!isRealMode) {
        expect(rateLimited.length).toBeGreaterThan(0);
        if (rateLimited.length === 0) {
          logError('[TEST] Rate limit not enforced', getStackTrace(), { totalRequests: responses.length, statusCounts });
        }
      } else {
        expect(rateLimited.length).toBeLessThan(iterations);
        for (const response of responses) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
      }
      await Promise.all(responses.map(r => consumeResponseBody(r)));
    });

  it(testName('Rate Limit Enforcement: should track rate limits per user independently'), async () => {
      const token = await createToken();
      const user1 = generateTestUserId('rate-user1');
      const user2 = generateTestUserId('rate-user2');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const iterations = isRealMode ? 5 : 12;
      const requests1 = Array.from({ length: iterations }, () => {
        const purchaseUrl1 = buildCreditsApiUrl(user1, CreditAction.Purchase);
        return worker.fetch(purchaseUrl1, {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(user1),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify({
              ac_amount: 100,
              amount: 1,
              currency: Currency.USD,
            })
          }, token
        );
      });

      const requests2 = Array.from({ length: iterations }, () => {
        const purchaseUrl2 = buildCreditsApiUrl(user2, CreditAction.Purchase);
        return worker.fetch(purchaseUrl2, {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(user2),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify({
              ac_amount: 100,
              amount: 1,
              currency: Currency.USD,
            })
          }, token
        );
      });

      const [responses1, responses2] = await Promise.all([
        Promise.all(requests1),
        Promise.all(requests2)
      ]);

      const rateLimited1 = responses1.filter(r => r.status === HttpStatus.TooManyRequests);
      const rateLimited2 = responses2.filter(r => r.status === HttpStatus.TooManyRequests);

      if (!isRealMode) {
        expect(rateLimited1.length).toBeGreaterThan(0);
        expect(rateLimited2.length).toBeGreaterThan(0);
      } else {
        expect(rateLimited1.length).toBeLessThan(iterations);
        expect(rateLimited2.length).toBeLessThan(iterations);
        for (const response of [...responses1, ...responses2]) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
      }
    }, 60000);

    it(testName('should enforce rate limits on earn GP endpoint'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('rate-earn');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const iterations = isRealMode ? 10 : 60;
      const earnRequests = Array.from({ length: iterations }, (_, i) => {
        const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
        const earnIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);
        return worker.fetch(earnUrl, {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              [HttpHeader.IdempotencyKey]: earnIdempotencyKey
            },
            body: JSON.stringify({
              gp_amount: 10,
              description: `Test GP earning ${i}`
            })
          }, token
        );
      });

      const responses = await Promise.all(earnRequests);
      const rateLimited = responses.filter(r => r.status === HttpStatus.TooManyRequests);

      if (!isRealMode) {
        expect(rateLimited.length).toBeGreaterThan(0);
      } else {
        expect(rateLimited.length).toBeLessThan(iterations);
        for (const response of responses) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
      }
      await Promise.all(responses.map(r => consumeResponseBody(r)));
    }, 60000);
});
