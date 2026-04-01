import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidRequestHeaders,
  getValidAdminRequestHeaders,
  getValidOriginHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type AuthzCase = {
  action: string;
  method: string;
  url: string;
  headers: () => Record<string, string>;
  expectedStatus: number;
  body?: string;
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('authz matrix forbidden: unauthenticated and non-admin role-action pairs are denied'), async () => {
    const token = await createToken();
    const adminProductsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Admin.Products);
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));
    const victimDataExport = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.OtherUserId));
    const victimDataDelete = `${buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(TestConfig.OtherUserId))}?confirm=true`;

    const cases: AuthzCase[] = [
      {
        action: 'anonymous access to admin products list',
        method: HttpMethod.Get,
        url: adminProductsUrl,
        headers: () => getValidOriginHeaders(TestConfig.LocalhostOrigin),
        expectedStatus: HttpStatus.Unauthorized,
      },
      {
        action: 'regular user access to admin products list',
        method: HttpMethod.Get,
        url: adminProductsUrl,
        headers: () => getValidRequestHeaders(TestConfig.RegularUserId),
        expectedStatus: HttpStatus.Forbidden,
      },
      {
        action: 'anonymous access to signed-url generation',
        method: HttpMethod.Get,
        url: signedUrl,
        headers: () => getValidOriginHeaders(TestConfig.LocalhostOrigin),
        expectedStatus: HttpStatus.Unauthorized,
      },
      {
        action: 'regular user access to signed-url generation',
        method: HttpMethod.Get,
        url: signedUrl,
        headers: () => getValidRequestHeaders(TestConfig.RegularUserId),
        expectedStatus: HttpStatus.Forbidden,
      },
      {
        action: 'regular user export of another user data',
        method: HttpMethod.Get,
        url: victimDataExport,
        headers: () => getValidRequestHeaders(TestConfig.RegularUserId),
        expectedStatus: HttpStatus.Forbidden,
      },
      {
        action: 'regular user delete of another user data',
        method: HttpMethod.Delete,
        url: victimDataDelete,
        headers: () => ({
          ...getValidRequestHeaders(TestConfig.RegularUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        }),
        expectedStatus: HttpStatus.Forbidden,
        body: JSON.stringify({ confirm: true }),
      },
    ];

    for (const testCase of cases) {
      const response = await worker.fetch(
        testCase.url,
        {
          method: testCase.method,
          headers: testCase.headers(),
          body: testCase.body,
        },
        token
      );
      expect(response.status, testCase.action).toBe(testCase.expectedStatus);
      await response.text().catch(() => undefined);
    }
  });

  it(testName('authz matrix allowed: permitted role-action pairs are not rejected by authz gate'), async () => {
    const token = await createToken();
    const adminProductsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Admin.Products);
    const signedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));
    const ownDataExport = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.RegularUserId));
    const otherDataExport = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.OtherUserId));
    const ownDataDelete = `${buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(TestConfig.RegularUserId))}?confirm=true`;
    const otherDataDelete = `${buildTestApiUrlForEndpoint(ApiEndpoint.Data.ByUserId(TestConfig.OtherUserId))}?confirm=true`;
    const alertsUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Alerts);

    const cases: AuthzCase[] = [
      {
        action: 'admin access to admin products list',
        method: HttpMethod.Get,
        url: adminProductsUrl,
        headers: () => getValidAdminRequestHeaders(),
        expectedStatus: HttpStatus.Ok,
      },
      {
        action: 'admin access to signed-url generation',
        method: HttpMethod.Get,
        url: signedUrl,
        headers: () => getValidAdminRequestHeaders(),
        expectedStatus: HttpStatus.Ok,
      },
      {
        action: 'regular user export own data',
        method: HttpMethod.Get,
        url: ownDataExport,
        headers: () => getValidRequestHeaders(TestConfig.RegularUserId),
        expectedStatus: HttpStatus.Ok,
      },
      {
        action: 'admin export another user data',
        method: HttpMethod.Get,
        url: otherDataExport,
        headers: () => getValidAdminRequestHeaders(),
        expectedStatus: HttpStatus.Ok,
      },
      {
        action: 'regular user delete own data with confirmation',
        method: HttpMethod.Delete,
        url: ownDataDelete,
        headers: () => ({
          ...getValidRequestHeaders(TestConfig.RegularUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        }),
        expectedStatus: HttpStatus.Ok,
        body: JSON.stringify({ confirm: true }),
      },
      {
        action: 'admin delete another user data with confirmation',
        method: HttpMethod.Delete,
        url: otherDataDelete,
        headers: () => ({
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        }),
        expectedStatus: HttpStatus.Ok,
        body: JSON.stringify({ confirm: true }),
      },
      {
        action: 'authenticated user access to alerts endpoint',
        method: HttpMethod.Get,
        url: alertsUrl,
        headers: () => getValidRequestHeaders(TestConfig.RegularUserId),
        expectedStatus: HttpStatus.Ok,
      },
    ];

    for (const testCase of cases) {
      const response = await worker.fetch(
        testCase.url,
        {
          method: testCase.method,
          headers: testCase.headers(),
          body: testCase.body,
        },
        token
      );
      expect(response.status, testCase.action).toBe(testCase.expectedStatus);
      await response.text().catch(() => undefined);
    }
  });
});
