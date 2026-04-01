import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const feedListPath = `${ApiEndpoint.Feed.Base}/list`;
const feedAppendPath = `${ApiEndpoint.Feed.Base}/append`;

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

  const baseUrl = TestConfig.TestApiUrlPlaceholder;
  const headers = () => getValidRequestHeaders(TestConfig.TestUserId);

  it(testName('ActivityFeedDO feed list: returns 200 and items array for authenticated user'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(feedListPath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: headers(),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { items?: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });

  it(testName('ActivityFeedDO feed list: returns 401 when authentication is missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(feedListPath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    const data = (await response.json()) as { error?: string };
    expect(typeof data.error).toBe('string');
  });

  it(testName('ActivityFeedDO feed append: returns 200 with appended and id for authenticated user'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(feedAppendPath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...headers(),
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ type: 'activity', payload: { message: 'integration test' } }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { appended?: boolean; id?: string };
    expect(data.appended).toBe(true);
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe('string');
    expect((data.id as string).length).toBeGreaterThan(0);
  });

  it(testName('ActivityFeedDO feed append: returns 401 when authentication is missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(feedAppendPath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ type: 'activity', payload: {} }),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    const data = (await response.json()) as { error?: string };
    expect(typeof data.error).toBe('string');
  });
});
