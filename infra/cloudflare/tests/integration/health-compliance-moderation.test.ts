import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, getValidAdminRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Health detailed GET: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(ApiEndpoint.HealthDetail, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Health detailed GET: returns 403 when authenticated but not admin'), async () => {
    const url = buildApiUrl(ApiEndpoint.HealthDetail, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    const data = (await response.json()) as { error?: string };
    expect((data.error ?? '').toLowerCase()).toContain('admin');
  });

  it(testName('Health detailed GET: returns 200 with checks object when admin'), async () => {
    const url = buildApiUrl(ApiEndpoint.HealthDetail, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidAdminRequestHeaders(),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { status?: string; checks?: Record<string, unknown> };
    expect(data.status).toBe('ok');
    expect(data.checks !== null && typeof data.checks === 'object').toBe(true);
  });

  it(testName('Compliance GET report: returns 401 when auth missing'), async () => {
    const url = buildApiUrl(ApiEndpoint.Compliance.Report, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Compliance GET report: returns 403 when authenticated but not admin'), async () => {
    const url = buildApiUrl(ApiEndpoint.Compliance.Report, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });

  it(testName('Compliance GET report: returns 200 with report shape when admin'), async () => {
    const url = buildApiUrl(ApiEndpoint.Compliance.Report, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidAdminRequestHeaders(),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data !== null && typeof data === 'object').toBe(true);
  });

  it(testName('Compliance POST report: returns 200 with report shape when admin'), async () => {
    const url = buildApiUrl(ApiEndpoint.Compliance.Report, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidAdminRequestHeaders(),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ reportType: 'soc2' }),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data !== null && typeof data === 'object').toBe(true);
  });

  it(testName('Moderation queue GET: returns 501 or 404 when not implemented (deferred)'), async () => {
    const moderationPath = `${ApiEndpoint.Admin.Base}/moderation/queue`;
    const url = buildApiUrl(moderationPath, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidAdminRequestHeaders(),
    });
    expect([HttpStatus.NotImplemented, HttpStatus.NotFound, HttpStatus.Ok]).toContain(response.status);
    if (response.status === HttpStatus.Ok) {
      const data = (await response.json()) as { reports?: unknown[] };
      expect(Array.isArray(data.reports)).toBe(true);
    }
  });
});
