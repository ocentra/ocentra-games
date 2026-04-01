import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
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

  it(testName('Marketplace GET list: returns 200 with listings array'), async () => {
    const token = getTokenForFetch();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Marketplace.Base}/list`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { listings?: unknown[] };
    expect(Array.isArray(data.listings)).toBe(true);
  });

  it(testName('Tournament GET without id: returns 400'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Tournament.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });

  it(testName('Tournament GET by id: returns 200 with bracket or tournament data'), async () => {
    const token = getTokenForFetch();
    const tournamentId = 'test-tournament-' + Date.now();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Tournament.ById(tournamentId)}/bracket`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
    if (response.status === HttpStatus.Ok) {
      const data = (await response.json()) as Record<string, unknown>;
      expect(data !== null && typeof data === 'object').toBe(true);
    }
  });

  it(testName('Tournament POST register: returns 200 or 400/404 for tournament id'), async () => {
    const token = getTokenForFetch();
    const tournamentId = 'test-tournament-reg-' + Date.now();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Tournament.ById(tournamentId)}/register`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin, [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({}),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
  });

  it(testName('Tournament POST start: returns 200 or 400/404 for tournament id (scheduling)'), async () => {
    const token = getTokenForFetch();
    const tournamentId = 'test-tournament-start-' + Date.now();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Tournament.ById(tournamentId)}/start`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin, [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({}),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
  });
});
