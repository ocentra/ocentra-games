import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
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

  it(testName('Rule 14.14 session fixation: stateless bearer auth - no server-side session so fixation N/A'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Balance(TestConfig.TestUserId));
    const res = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    }, token);
    expect(res.status).toBe(HttpStatus.Ok);
    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toBeNull();
    await res.text();
  });

  it(testName('Rule 14.14 CSRF: state-changing request without Authorization is rejected'), async () => {
    const userId = `${TestConfig.TestUserId}-csrf`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const res = await worker.fetch(purchaseUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ ac_amount: 100, amount: 1, currency: 'USD' }),
    });
    expect(res.status).toBe(HttpStatus.Unauthorized);
    await res.text();
  });
});
