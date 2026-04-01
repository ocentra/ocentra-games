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
  const queueUrl = () => buildApiUrl(ApiEndpoint.Matchmaking.Queue, { baseUrl });
  const leaveUrl = () => `${baseUrl}${ApiEndpoint.Matchmaking.Base}/leave`;
  const statusUrl = (ticketId?: string, userId?: string) => {
    const base = `${baseUrl}${ApiEndpoint.Matchmaking.Base}/status`;
    const params = new URLSearchParams();
    if (ticketId) params.set('ticketId', ticketId);
    if (userId) params.set('userId', userId);
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  };

  it(testName('Matchmaking POST queue: returns 200 with ticketId and status'), async () => {
    const token = getTokenForFetch();
    const userId = `mm-user-${crypto.randomUUID().slice(0, 8)}`;
    const response = await worker.fetch(queueUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ userId }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { ticketId?: string; status?: string; position?: number };
    expect(typeof data.ticketId).toBe('string');
    expect(data.ticketId!.length).toBeGreaterThan(0);
    expect(['queued', 'matched']).toContain(data.status);
    expect(typeof data.position).toBe('number');
  });

  it(testName('Matchmaking POST queue twice with same userId: second returns 409 Already in queue'), async () => {
    const token = getTokenForFetch();
    const userId = `mm-dup-${crypto.randomUUID().slice(0, 8)}`;
    const first = await worker.fetch(queueUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ userId }),
    }, token);
    expect(first.status).toBe(HttpStatus.Ok);

    const second = await worker.fetch(queueUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ userId }),
    }, token);
    expect(second.status).toBe(HttpStatus.Conflict);
    const data = (await second.json()) as { error?: string; ticketId?: string };
    expect(data.error).toBe('Already in queue');
    expect(typeof data.ticketId).toBe('string');

    const leaveRes = await worker.fetch(leaveUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ userId }),
    }, token);
    await leaveRes.text().catch(() => undefined);
  });

  it(testName('Matchmaking join then leave then status is idle'), async () => {
    const token = getTokenForFetch();
    const userId = `mm-leave-${crypto.randomUUID().slice(0, 8)}`;
    const joinRes = await worker.fetch(queueUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ userId }),
    }, token);
    expect(joinRes.status).toBe(HttpStatus.Ok);
    const joinData = (await joinRes.json()) as { ticketId?: string };
    const ticketId = joinData.ticketId;

    const statusResBefore = await worker.fetch(statusUrl(ticketId), { method: HttpMethod.Get, headers: headers() }, token);
    expect(statusResBefore.status).toBe(HttpStatus.Ok);
    const statusBefore = (await statusResBefore.json()) as { status?: string };
    expect(['queued', 'matched']).toContain(statusBefore.status);

    const leaveRes = await worker.fetch(leaveUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ userId }),
    }, token);
    expect(leaveRes.status).toBe(HttpStatus.Ok);
    const leaveData = (await leaveRes.json()) as { left?: boolean };
    expect(leaveData.left).toBe(true);

    const statusResAfter = await worker.fetch(statusUrl(undefined, userId), { method: HttpMethod.Get, headers: headers() }, token);
    expect(statusResAfter.status).toBe(HttpStatus.Ok);
    const statusAfter = (await statusResAfter.json()) as { status?: string; position?: number };
    expect(statusAfter.status).toBe('idle');
    expect(statusAfter.position).toBe(0);
  });

  it(testName('Matchmaking POST queue with missing userId: returns 400'), async () => {
    const token = getTokenForFetch();
    const response = await worker.fetch(queueUrl(), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({}),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });
});
