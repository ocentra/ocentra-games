import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
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

  it(testName('Discovery GET base: returns 200 with games array (each id and name) and trending array'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Discovery.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { Origin: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { games?: { id: number; name: string }[]; trending?: unknown[] };
    expect(Array.isArray(data.games)).toBe(true);
    expect(data.games!.length).toBeGreaterThanOrEqual(1);
    for (const g of data.games!) {
      expect(typeof g.id).toBe('number');
      expect(typeof g.name).toBe('string');
    }
    expect(Array.isArray(data.trending)).toBe(true);
  });

  it(testName('Discovery GET /search: returns 200 with games array; filters by q when provided'), async () => {
    const token = getTokenForFetch();
    const base = TestConfig.TestApiUrlPlaceholder.replace(/\/$/, '');
    const searchUrl = `${base}${ApiEndpoint.Discovery.Base}/search`;
    const response = await worker.fetch(searchUrl, {
      method: HttpMethod.Get,
      headers: { Origin: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { games?: { id: number; name: string }[] };
    expect(Array.isArray(data.games)).toBe(true);
    expect(data.games!.length).toBeGreaterThanOrEqual(1);
    for (const g of data.games!) {
      expect(typeof g.id).toBe('number');
      expect(typeof g.name).toBe('string');
    }
    const withQuery = `${searchUrl}?q=claim`;
    const resFiltered = await worker.fetch(withQuery, {
      method: HttpMethod.Get,
      headers: { Origin: TestConfig.LocalhostOrigin },
    }, token);
    expect(resFiltered.status).toBe(HttpStatus.Ok);
    const filtered = (await resFiltered.json()) as { games?: { id: number; name: string }[] };
    expect(Array.isArray(filtered.games)).toBe(true);
    if (filtered.games!.length > 0) {
      expect(filtered.games!.every((g) => g.name.toLowerCase().includes('claim') || String(g.id).includes('claim'))).toBe(true);
    }
  });

  it(testName('Discovery GET /trending: returns 200 with stub or KV shape'), async () => {
    const token = getTokenForFetch();
    const base = TestConfig.TestApiUrlPlaceholder.replace(/\/$/, '');
    const url = `${base}${ApiEndpoint.Discovery.Base}/trending`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { Origin: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data !== null && typeof data === 'object').toBe(true);
  });

  it(testName('Discovery GET /featured: returns 200 with games array or KV shape'), async () => {
    const token = getTokenForFetch();
    const base = TestConfig.TestApiUrlPlaceholder.replace(/\/$/, '');
    const url = `${base}${ApiEndpoint.Discovery.Base}/featured`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { Origin: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { games?: { id: number; name: string }[]; banner?: unknown };
    expect(data !== null && typeof data === 'object').toBe(true);
    if (Array.isArray(data.games)) {
      expect(data.games.length).toBeGreaterThanOrEqual(0);
      for (const g of data.games) {
        expect(typeof g.id).toBe('number');
        expect(typeof g.name).toBe('string');
      }
    }
  });
});
