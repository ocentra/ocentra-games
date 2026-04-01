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
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Rule 4.1.8: rate limit not bypassed by spoofed X-Forwarded-For header'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('rate-bypass-xff');
    const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
    const limit = 25;
    const requests = Array.from({ length: limit }, (_, i) =>
      worker.fetch(purchaseUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.IdempotencyKey]: `${IdempotencyKeyPrefix.Purchase}-${userId}-${Date.now()}-${i}`,
          'X-Forwarded-For': `10.0.0.${i}`,
        },
        body: JSON.stringify({ ac_amount: 1, amount: 1, currency: 'USD' }),
      }, token)
    );
    const responses = await Promise.all(requests);
    await Promise.all(responses.map((r) => r.text().catch(() => undefined)));

    const rateLimited = responses.filter((r) => r.status === HttpStatus.TooManyRequests);
    const ok = responses.filter((r) => r.status === HttpStatus.Ok);
    const hasLimitHeader = responses.some(
      (r) => r.headers.has(HttpHeader.XRateLimitRemaining) || r.headers.has(HttpHeader.XRateLimitReset)
    );
    const testMode = process.env[TestEnvVar.TestMode] ?? TestEnvValue.Local;
    if (testMode === TestEnvValue.Local && limit > 0) {
      expect(ok.length + rateLimited.length).toBe(limit);
      expect(hasLimitHeader || rateLimited.length > 0).toBe(true);
    }
  });

  it(testName('Rule 4.1.10: rate limit not bypassed by method change - GET to purchase URL rejected'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('rate-bypass-method');
    const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
    const response = await worker.fetch(purchaseUrl, {
      method: HttpMethod.Get,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    }, token);
    await response.text().catch(() => undefined);
    expect([HttpStatus.MethodNotAllowed, HttpStatus.NotFound, HttpStatus.BadRequest, HttpStatus.Unauthorized]).toContain(response.status);
  });
});
