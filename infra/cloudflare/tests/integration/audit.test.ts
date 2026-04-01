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

const log = Logger.instance;
log.register(import.meta.url);

function minimalAuditEvent(overrides: { eventId?: string; actorId?: string; timestamp?: number } = {}) {
  const eventId = overrides.eventId ?? crypto.randomUUID();
  const ts = overrides.timestamp ?? Date.now();
  return {
    eventId,
    eventType: 'test.event',
    category: 'test',
    actor: { type: 'user' as const, id: overrides.actorId ?? TestConfig.TestUserId },
    target: { type: 'resource', id: 'res-1' },
    action: { type: 'read', status: 'success' as const },
    context: { timestamp: ts, requestId: 'req-1', traceId: 'trace-1' },
    classification: { sensitivity: 'user', retention: 'short' },
  };
}

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

  it(testName('Audit store event: returns 200 and logged when body valid'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Audit.Log, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const event = minimalAuditEvent();
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify(event),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { logged?: boolean; eventId?: string };
    expect(data.logged).toBe(true);
    expect(data.eventId).toBe(event.eventId);
  });

  it(testName('Audit query: returns events array after store'), async () => {
    const token = getTokenForFetch();
    const eventId = crypto.randomUUID();
    const storeUrl = buildApiUrl(ApiEndpoint.Audit.Log, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const storeRes = await worker.fetch(storeUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify(minimalAuditEvent({ eventId })),
    }, token);
    await storeRes.text().catch(() => undefined);
    const queryUrl = buildApiUrl(ApiEndpoint.Audit.Query, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const queryResponse = await worker.fetch(queryUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ filters: {} }),
    }, token);
    expect(queryResponse.status).toBe(HttpStatus.Ok);
    const queryData = (await queryResponse.json()) as { events?: Array<{ eventId: string }>; total?: number };
    expect(Array.isArray(queryData.events)).toBe(true);
    expect(typeof queryData.total).toBe('number');
    const found = queryData.events?.find((e) => e.eventId === eventId);
    expect(found).not.toBeNull();
    expect(found?.eventId).toBe(eventId);
  });

  it(testName('Audit store event: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Audit.Log, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify(minimalAuditEvent()),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Audit store event: returns 400 when body invalid'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Audit.Log, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ eventId: 'not-a-uuid', eventType: 'x' }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });
});
