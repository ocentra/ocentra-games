import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
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

  const baseUrl = TestConfig.TestApiUrlPlaceholder;
  const headers = () => getValidRequestHeaders(TestConfig.TestUserId);

  it(testName('Presence GET by id: returns 200 with status when not set returns offline'), async () => {
    const token = getTokenForFetch();
    const userId = `presence-${crypto.randomUUID().slice(0, 8)}`;
    const url = buildApiUrl(ApiEndpoint.Presence.ById(userId), { baseUrl });
    const response = await worker.fetch(url, { method: HttpMethod.Get, headers: headers() }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { status?: string; lastSeenAt?: number };
    expect(typeof data.status).toBe('string');
    expect(data.status).toBe('offline');
    expect(typeof data.lastSeenAt).toBe('number');
  });

  it(testName('Presence POST update status then GET returns updated status'), async () => {
    const token = getTokenForFetch();
    const userId = `presence-update-${crypto.randomUUID().slice(0, 8)}`;
    const url = buildApiUrl(ApiEndpoint.Presence.ById(userId), { baseUrl });

    const updateRes = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ status: 'online' }),
    }, token);
    expect(updateRes.status).toBe(HttpStatus.Ok);

    const getRes = await worker.fetch(url, { method: HttpMethod.Get, headers: headers() }, token);
    expect(getRes.status).toBe(HttpStatus.Ok);
    const data = (await getRes.json()) as { status?: string; lastSeenAt?: number };
    expect(data.status).toBe('online');
    expect(typeof data.lastSeenAt).toBe('number');
    expect(data.lastSeenAt).toBeGreaterThan(0);
  });

  it(testName('Presence POST with in-lobby status persists'), async () => {
    const token = getTokenForFetch();
    const userId = `presence-lobby-${crypto.randomUUID().slice(0, 8)}`;
    const url = buildApiUrl(ApiEndpoint.Presence.ById(userId), { baseUrl });

    const postRes = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ status: 'in-lobby', currentRoom: 'room-1' }),
    }, token);
    await postRes.text().catch(() => undefined);

    const getRes = await worker.fetch(url, { method: HttpMethod.Get, headers: headers() }, token);
    expect(getRes.status).toBe(HttpStatus.Ok);
    const data = (await getRes.json()) as { status?: string; currentRoom?: string };
    expect(data.status).toBe('in-lobby');
    expect(data.currentRoom).toBe('room-1');
  });
});
