import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  buildTestApiUrlForEndpointWithPath,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { SecurityHeaderValue } from '@/constants/security-headers';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

function assertSecurityHeaders(response: Response): void {
  expect(response.headers.get(HttpHeader.XContentTypeOptions)).toBe(SecurityHeaderValue.NoSniff);
  expect(response.headers.get(HttpHeader.XFrameOptions)).toBe(SecurityHeaderValue.Deny);
  expect(response.headers.get('Server')).toBeNull();
  expect(response.headers.get('X-Powered-By')).toBeNull();
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('response security headers: success response includes anti-sniff and frame-deny headers'), async () => {
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });

    expect(response.status).toBe(HttpStatus.Ok);
    assertSecurityHeaders(response);
    await response.text().catch(() => undefined);
  });

  it(testName('response security headers: auth rejection response still includes anti-sniff and frame-deny headers'), async () => {
    const token = await createToken();
    const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
    const response = await worker.fetch(
      resourceUrl,
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Unauthorized);
    assertSecurityHeaders(response);
    await response.text().catch(() => undefined);
  });

  it(testName('response security headers: preflight response includes anti-sniff and frame-deny headers'), async () => {
    const testUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Test.Base);
    const response = await worker.fetch(testUrl, {
      method: HttpMethod.Options,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });

    expect(response.status).toBe(HttpStatus.NoContent);
    assertSecurityHeaders(response);
    expect(response.headers.get(HttpHeader.AccessControlAllowOrigin)).toBe(TestConfig.TestCorsOrigin);
    await response.text().catch(() => undefined);
  });

  it(testName('response security headers: forbidden response from admin-only route still includes anti-sniff and frame-deny headers'), async () => {
    const token = await createToken();
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));
    const response = await worker.fetch(
      signedUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.RegularUserId),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Forbidden);
    assertSecurityHeaders(response);
    await response.text().catch(() => undefined);
  });

  it(testName('response security headers: not-found responses include anti-sniff and frame-deny headers'), async () => {
    const invalidLogsPath = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'missing-header-route');
    const response = await worker.fetch(invalidLogsPath, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });

    expect(response.status).toBe(HttpStatus.NotFound);
    assertSecurityHeaders(response);
    await response.text().catch(() => undefined);
  });

  it(testName('response security headers: bad-request responses from money-critical flows include anti-sniff and frame-deny headers'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-headers-badreq`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: '{"ac_amount":100',
      },
      token
    );

    expect(response.status).toBe(HttpStatus.BadRequest);
    assertSecurityHeaders(response);
    await response.text().catch(() => undefined);
  });
});
