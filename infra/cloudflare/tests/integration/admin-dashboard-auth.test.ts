import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidOriginHeaders,
  getValidRequestHeaders,
  getValidAdminRequestHeaders,
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

  it(testName('admin dashboard-data: returns 401 when auth header is missing'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Admin.DashboardData),
      {
        method: HttpMethod.Get,
        headers: getValidOriginHeaders(TestConfig.LocalhostOrigin),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('admin dashboard-data: returns 403 when user is authenticated but not admin'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Admin.DashboardData),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.RegularUserId),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });

  it(testName('admin dashboard-data: admin request is not rejected by auth gates'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Admin.DashboardData),
      {
        method: HttpMethod.Get,
        headers: getValidAdminRequestHeaders(),
      },
      token
    );
    expect([HttpStatus.Ok, HttpStatus.ServiceUnavailable, HttpStatus.InternalServerError]).toContain(response.status);
    expect(response.status).not.toBe(HttpStatus.Unauthorized);
    expect(response.status).not.toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });

  it(testName('admin user-status: returns 401 when auth header is missing'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Admin.UserStatus(TestConfig.TestUserId)),
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidOriginHeaders(TestConfig.LocalhostOrigin),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ isAdmin: true }),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('admin user-status: returns 403 when user is authenticated but not admin'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Admin.UserStatus(TestConfig.TestUserId)),
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.RegularUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ isAdmin: true }),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });

  it(testName('admin user-status: admin request is not rejected by auth gates'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Admin.UserStatus(TestConfig.TestUserId)),
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ isAdmin: true }),
      },
      token
    );
    expect([HttpStatus.Ok, HttpStatus.ServiceUnavailable, HttpStatus.InternalServerError]).toContain(response.status);
    expect(response.status).not.toBe(HttpStatus.Unauthorized);
    expect(response.status).not.toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });
});
