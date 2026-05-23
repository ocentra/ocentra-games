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
const LOCAL_CONSUME_LIMIT_ITERATIONS = 105;
const REAL_CONSUME_LIMIT_ITERATIONS = 5;

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

function buildConsumeRequest(userId: string, index: number, token: Awaited<ReturnType<typeof createToken>>) {
  const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
  return workerFetchOptions(consumeUrl, userId, token, {
    [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Consume),
  }, {
    ac_amount: 1,
    description: `Rate limit consume ${index}`,
  });
}

function buildConsumeGpRequest(userId: string, index: number, token: Awaited<ReturnType<typeof createToken>>) {
  const consumeGpUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
  return workerFetchOptions(consumeGpUrl, userId, token, {
    [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Consume),
  }, {
    amount: 1,
    currency: Currency.AC,
    description: `Rate limit consume GP ${index}`,
  });
}

function workerFetchOptions(
  url: string,
  userId: string,
  token: Awaited<ReturnType<typeof createToken>>,
  extraHeaders: Record<string, string>,
  body: Record<string, unknown>
) {
  return {
    url,
    init: {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    },
    token,
  };
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
      logInfo('[TEST] Testing rate limit bypass prevention', getStackTrace(), { userId, requestCount: LOCAL_CONSUME_LIMIT_ITERATIONS }, LOG_TEST_OPERATIONS);

      const iterations = isRealMode ? REAL_CONSUME_LIMIT_ITERATIONS : LOCAL_CONSUME_LIMIT_ITERATIONS;
      const consumeRequests = Array.from({ length: iterations }, (_, index) => {
        const request = index % 2 === 0
          ? buildConsumeRequest(userId, index, token)
          : buildConsumeGpRequest(userId, index, token);
        return worker.fetch(request.url, request.init, request.token);
      });

      const responses = await Promise.all(consumeRequests);
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

      const iterations = isRealMode ? REAL_CONSUME_LIMIT_ITERATIONS : LOCAL_CONSUME_LIMIT_ITERATIONS;
      const requests1 = Array.from({ length: iterations }, (_, index) => {
        const request = buildConsumeRequest(user1, index, token);
        return worker.fetch(request.url, request.init, request.token);
      });

      const requests2 = Array.from({ length: iterations }, (_, index) => {
        const request = buildConsumeRequest(user2, index, token);
        return worker.fetch(request.url, request.init, request.token);
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

    it(testName('should enforce rate limits on consume GP endpoint'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('rate-consume-gp');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const iterations = isRealMode ? REAL_CONSUME_LIMIT_ITERATIONS : LOCAL_CONSUME_LIMIT_ITERATIONS;
      const consumeGpRequests = Array.from({ length: iterations }, (_, index) => {
        const request = buildConsumeGpRequest(userId, index, token);
        return worker.fetch(request.url, request.init, request.token);
      });

      const responses = await Promise.all(consumeGpRequests);
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
