import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  createExpiredToken,
  createTokenWithInvalidAudience,
  getValidRequestHeaders,
  getValidAdminRequestHeaders,
  getValidOriginHeaders,
} from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
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

  it(testName('token lifecycle: auth is not sticky across requests when Authorization header is removed'), async () => {
    const token = await createToken();
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));

    const authenticatedResponse = await worker.fetch(
      signedUrl,
      {
        method: HttpMethod.Get,
        headers: getValidAdminRequestHeaders(),
      },
      token
    );
    expect(authenticatedResponse.status).toBe(HttpStatus.Ok);
    await authenticatedResponse.text().catch(() => undefined);

    const noAuthResponse = await worker.fetch(
      signedUrl,
      {
        method: HttpMethod.Get,
        headers: getValidOriginHeaders(TestConfig.LocalhostOrigin),
      },
      token
    );
    expect(noAuthResponse.status).toBe(HttpStatus.Unauthorized);
    await noAuthResponse.text().catch(() => undefined);
  });

  it(testName('token lifecycle: privilege downgrade is enforced immediately on token rotation'), async () => {
    const token = await createToken();
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));

    const adminResponse = await worker.fetch(
      signedUrl,
      {
        method: HttpMethod.Get,
        headers: getValidAdminRequestHeaders(),
      },
      token
    );
    expect(adminResponse.status).toBe(HttpStatus.Ok);
    await adminResponse.text().catch(() => undefined);

    const regularUserResponse = await worker.fetch(
      signedUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.RegularUserId),
      },
      token
    );
    expect(regularUserResponse.status).toBe(HttpStatus.Forbidden);
    await regularUserResponse.text().catch(() => undefined);
  });

  it(testName('token lifecycle: expired token is rejected after prior successful authenticated request'), async () => {
    const token = await createToken();
    const ownDataExportUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.RegularUserId));

    const firstValidResponse = await worker.fetch(
      ownDataExportUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.RegularUserId),
      },
      token
    );
    expect(firstValidResponse.status).toBe(HttpStatus.Ok);
    await firstValidResponse.text().catch(() => undefined);

    const expiredTokenResponse = await worker.fetch(
      ownDataExportUrl,
      {
        method: HttpMethod.Get,
        headers: {
          ...getValidOriginHeaders(TestConfig.LocalhostOrigin),
          [HttpHeader.Authorization]: formatBearerToken(createExpiredToken()),
        },
      },
      token
    );
    expect(expiredTokenResponse.status).toBe(HttpStatus.Unauthorized);
    await expiredTokenResponse.text().catch(() => undefined);
  });

  it(testName('token lifecycle: invalid token does not poison subsequent valid token authorization'), async () => {
    const token = await createToken();
    const ownDataDeleteUrl = `${buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(TestConfig.RegularUserId))}?confirm=true`;

    const invalidTokenResponse = await worker.fetch(
      ownDataDeleteUrl,
      {
        method: HttpMethod.Delete,
        headers: {
          ...getValidOriginHeaders(TestConfig.LocalhostOrigin),
          [HttpHeader.Authorization]: formatBearerToken(createTokenWithInvalidAudience()),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ confirm: true }),
      },
      token
    );
    expect(invalidTokenResponse.status).toBe(HttpStatus.Unauthorized);
    await invalidTokenResponse.text().catch(() => undefined);

    const validTokenResponse = await worker.fetch(
      ownDataDeleteUrl,
      {
        method: HttpMethod.Delete,
        headers: {
          ...getValidRequestHeaders(TestConfig.RegularUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ confirm: true }),
      },
      token
    );
    expect(validTokenResponse.status).toBe(HttpStatus.Ok);
    await validTokenResponse.text().catch(() => undefined);
  });
});
