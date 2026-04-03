import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  buildTestApiUrlForEndpointWithPath,
  buildTestApiUrlWithQuery,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { formatBearerToken } from '@/utils/auth';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

function assertSanitizedErrorBody(body: string): void {
  expect(body).not.toContain('/Users/');
  expect(body).not.toContain('C:\\');
  expect(body).not.toContain('.ts:');
  expect(body).not.toContain('Error:');
  expect(body).not.toContain('at ');
  expect(body).not.toContain('TypeError');
  expect(body).not.toContain('ReferenceError');
  expect(body).not.toContain('Unhandled');
  expect(body).not.toContain('node_modules');
}

function assertNoSensitiveErrorKeys(payload: unknown): void {
  if (typeof payload !== 'object' || payload === null) {
    return;
  }
  const keys = Object.keys(payload as Record<string, unknown>).map((key) => key.toLowerCase());
  const forbiddenKeys = ['stack', 'trace', 'exception', 'sql', 'query', 'path', 'internal'];
  for (const forbidden of forbiddenKeys) {
    expect(keys).not.toContain(forbidden);
  }
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

  it(testName('error leakage: malformed JWT rejection does not include stack traces or internal paths'), async () => {
    const token = await createToken();
    const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
    const response = await worker.fetch(
      resourceUrl,
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Authorization]: formatBearerToken('not.valid.jwt'),
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        },
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Unauthorized);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('error leakage: not-found route response does not include stack traces or internal paths'), async () => {
    const logsUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'invalid-path');
    const response = await worker.fetch(logsUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });

    expect(response.status).toBe(HttpStatus.NotFound);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('error leakage: malformed JSON request returns sanitized error payload'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-error-json`;
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
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
    assertSanitizedErrorBody(body);
  });

  it(testName('error leakage: 401 response does not contain submitted token (Rule 10.1.2, 14.11.3); Rule 15.8.2: error response does not contain sensitive data'), async () => {
    const secretToken = 'secret-leak-test-token-12345';
    const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
    const response = await worker.fetch(resourceUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Authorization]: formatBearerToken(secretToken),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });

    expect(response.status).toBe(HttpStatus.Unauthorized);
    const body = await response.text();
    expect(body).not.toContain(secretToken);
    assertSanitizedErrorBody(body);
    const contentType = response.headers.get(HttpHeader.ContentType) ?? '';
    if (contentType.includes('application/json') && body.length > 0) {
      const data = JSON.parse(body) as Record<string, unknown>;
      assertNoSensitiveErrorKeys(data);
    }
  });

  it(testName('error leakage: error responses have stable JSON shape (Rule 14.11.4)'), async () => {
    await createToken();
    const notFoundUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'nonexistent');
    const res = await worker.fetch(notFoundUrl, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.TestCorsOrigin },
    });
    expect(res.status).toBe(HttpStatus.NotFound);
    const contentType = res.headers.get(HttpHeader.ContentType) ?? '';
    const body = await res.text();
    if (contentType.includes('application/json') && body.length > 0) {
      const data = JSON.parse(body) as Record<string, unknown>;
      expect(typeof data === 'object' && data !== null).toBe(true);
      assertNoSensitiveErrorKeys(data);
    }
  });

  it(testName('error leakage: malformed payload does not echo attacker-controlled marker in response body'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-marker`;
    const marker = `LEAK_MARKER_${Date.now()}`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: `{"ac_amount":100,"note":"${marker}",`,
      },
      token
    );

    expect(response.status).toBe(HttpStatus.BadRequest);
    const body = await response.text();
    assertSanitizedErrorBody(body);
    expect(body).not.toContain(marker);
  });

  it(testName('error leakage: forbidden data-export responses do not reveal target-user existence (Rule 10.1.5)'), async () => {
    const token = await createToken();
    const requesterUserId = TestConfig.RegularUserId;
    const existingTargetUserId = TestConfig.OtherUserId;
    const missingTargetUserId = `nonexistent-user-${Date.now()}`;
    const existingTargetUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(existingTargetUserId));
    const missingTargetUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(missingTargetUserId));

    const existingTargetResponse = await worker.fetch(
      existingTargetUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(requesterUserId),
      },
      token
    );
    const missingTargetResponse = await worker.fetch(
      missingTargetUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(requesterUserId),
      },
      token
    );

    expect(existingTargetResponse.status).toBe(missingTargetResponse.status);
    const existingBody = await existingTargetResponse.text();
    const missingBody = await missingTargetResponse.text();

    assertSanitizedErrorBody(existingBody);
    assertSanitizedErrorBody(missingBody);
    expect(existingBody).not.toContain(existingTargetUserId);
    expect(missingBody).not.toContain(missingTargetUserId);
    expect(existingBody).not.toContain(requesterUserId);
    expect(missingBody).not.toContain(requesterUserId);
  });

  it(testName('error leakage: error response does not expose internal error codes (Rule 10.1.2)'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-internal-codes`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({}),
      },
      token
    );

    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity]).toContain(response.status);
    const contentType = response.headers.get(HttpHeader.ContentType) ?? '';
    const body = await response.text();
    assertSanitizedErrorBody(body);
    if (contentType.includes('application/json') && body.length > 0) {
      const data = JSON.parse(body) as Record<string, unknown>;
      assertNoSensitiveErrorKeys(data);
    }
  });

  it(testName('error leakage: 401 and 404 responses are JSON objects with no stack/sensitive keys (Rule 10.1.4)'), async () => {
    const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
    const notFoundUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Logs.Base, 'nonexistent-path-404');
    const res401 = await worker.fetch(resourceUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Authorization]: formatBearerToken('invalid'),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });
    const res404 = await worker.fetch(notFoundUrl, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.TestCorsOrigin },
    });

    expect(res401.status).toBe(HttpStatus.Unauthorized);
    expect(res404.status).toBe(HttpStatus.NotFound);
    const ct401 = res401.headers.get(HttpHeader.ContentType) ?? '';
    const ct404 = res404.headers.get(HttpHeader.ContentType) ?? '';
    const body401 = await res401.text();
    const body404 = await res404.text();

    if (ct401.includes('application/json') && body401.length > 0) {
      const data401 = JSON.parse(body401) as Record<string, unknown>;
      expect(typeof data401 === 'object' && data401 !== null).toBe(true);
      assertNoSensitiveErrorKeys(data401);
    }
    if (ct404.includes('application/json') && body404.length > 0) {
      const data404 = JSON.parse(body404) as Record<string, unknown>;
      expect(typeof data404 === 'object' && data404 !== null).toBe(true);
      assertNoSensitiveErrorKeys(data404);
    }
  });

  it(testName('Rule 5.1.9: input with NaN in JSON body is rejected (validation at boundary)'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-nan`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: '{"ac_amount":NaN,"amount":1,"currency":"USD"}',
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity]).toContain(response.status);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('Rule 5.1.9: input with Infinity in JSON body is rejected (validation at boundary)'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-inf`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: '{"ac_amount":Infinity,"amount":1,"currency":"USD"}',
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity]).toContain(response.status);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('Rule 5.1.8: input with negative ac_amount (underflow) is rejected at boundary'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-underflow`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ ac_amount: -100, amount: 1, currency: 'USD' }),
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity]).toContain(response.status);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('Rule 5.1.10: request body that is empty array is rejected at boundary'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-empty-arr`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: '[]',
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity]).toContain(response.status);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('Rule 5.1.12: JSON with duplicate keys is rejected or handled deterministically at boundary'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-dup-keys`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: '{"ac_amount":100,"amount":1,"currency":"USD","ac_amount":200}',
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity, HttpStatus.Ok]).toContain(response.status);
    const body = await response.text();
    if (response.status !== HttpStatus.Ok) {
      assertSanitizedErrorBody(body);
    }
  });

  it(testName('Rule 5.1.16: string where number required (ac_amount) is rejected at boundary'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-coerce`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: '{"ac_amount":"100","amount":1,"currency":"USD"}',
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity]).toContain(response.status);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('Rule 5.2.6: non-JSON body to JSON endpoint is rejected at boundary'), async () => {
    const token = await createToken();
    const userId = `${TestConfig.TestUserId}-binary`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const response = await worker.fetch(
      purchaseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationOctetStream,
        },
        body: new Uint8Array([0x00, 0x01, 0xff]),
      },
      token
    );
    expect([HttpStatus.BadRequest, HttpStatus.UnprocessableEntity, HttpStatus.UnsupportedMediaType]).toContain(response.status);
    const body = await response.text();
    assertSanitizedErrorBody(body);
  });

  it(testName('error leakage: 401 and 400 json error payloads exclude stack/trace keys'), async () => {
    const token = await createToken();
    const resourceUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Assets.ManifestRebuild);
    const unauthorizedResponse = await worker.fetch(resourceUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Authorization]: formatBearerToken('bad.token.value'),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });
    expect(unauthorizedResponse.status).toBe(HttpStatus.Unauthorized);

    const unauthorizedContentType = unauthorizedResponse.headers.get(HttpHeader.ContentType) ?? '';
    const unauthorizedBody = await unauthorizedResponse.text();
    assertSanitizedErrorBody(unauthorizedBody);
    if (unauthorizedContentType.includes(HttpContentType.ApplicationJson)) {
      const unauthorizedPayload = JSON.parse(unauthorizedBody) as Record<string, unknown>;
      assertNoSensitiveErrorKeys(unauthorizedPayload);
    }

    const userId = `${TestConfig.TestUserId}-error-keys`;
    const purchaseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Credits.Purchase(userId));
    const badRequestResponse = await worker.fetch(
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
    expect(badRequestResponse.status).toBe(HttpStatus.BadRequest);

    const badRequestContentType = badRequestResponse.headers.get(HttpHeader.ContentType) ?? '';
    const badRequestBody = await badRequestResponse.text();
    assertSanitizedErrorBody(badRequestBody);
    if (badRequestContentType.includes(HttpContentType.ApplicationJson)) {
      const badRequestPayload = JSON.parse(badRequestBody) as Record<string, unknown>;
      assertNoSensitiveErrorKeys(badRequestPayload);
    }
  });
});
