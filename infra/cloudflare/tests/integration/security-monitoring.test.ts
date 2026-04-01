import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      log.logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  describe('Security Monitoring', () => {
    it(testName('Security penalty status: requires authentication'), async () => {
      const url = buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
      });
      expect(response.status).toBe(HttpStatus.Unauthorized);
    });

    it(testName('Security penalty status: returns penalties array when authenticated'), async () => {
      const userId = `security-status-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { penalties?: unknown[] };
      expect(Array.isArray(data.penalties)).toBe(true);
    });

    it(testName('Security penalty issue route: creates penalty on /issue'), async () => {
      const userId = `security-issue-${Date.now()}`;
      const url = `${buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder })}/issue`;
      const response = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          userId,
          type: 'warning',
          reason: 'Security rule test',
          issuedBy: 'admin-security',
        }),
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { issued?: boolean; penaltyId?: string };
      expect(data.issued).toBe(true);
      expect(typeof data.penaltyId).toBe('string');
    });

    it(testName('Security profile route currently resolves through penalty status contract'), async () => {
      const userId = `security-profile-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Security.Profile(userId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { penalties?: unknown[] };
      expect(Array.isArray(data.penalties)).toBe(true);
    });

    it(testName('Security dashboard is admin-only'), async () => {
      const userId = `security-dashboard-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Security.Dashboard, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });
      expect(response.status).toBe(HttpStatus.Forbidden);
    });
  });
});
