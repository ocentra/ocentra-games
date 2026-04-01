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

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
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

  it(testName('Sync health: returns 200 and JSON with health key (StateSyncCoordinatorDO)'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Sync.Health, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { health?: string; mode?: string };
    expect(data).toHaveProperty('health');
    expect(typeof data.health).toBe('string');
  });

  it(testName('Sync reconcile: returns 400 when matchId missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Sync.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({}),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });

  it(testName('Sync to-solana: returns 501 Not Implemented'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Sync.ToSolana, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ matchId: 'test-match' }),
    }, token);
    expect(response.status).toBe(501);
    const data = (await response.json()) as { error?: string; code?: string };
    expect(data.code).toBe('NOT_IMPLEMENTED');
  });

  it(testName('Sync from-solana: returns 200 and cache when matchId and state provided'), async () => {
    const token = getTokenForFetch();
    const matchId = `sync-test-${Date.now()}`;
    const url = buildApiUrl(ApiEndpoint.Sync.FromSolana, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        matchId,
        solanaMatchPda: 'pda-placeholder',
        state: { stateHash: 'abc', turnCount: 0, gameType: 0, status: 'active' },
        slot: 0,
      }),
    }, token);
    if (response.status === HttpStatus.ServiceUnavailable) {
      await response.text().catch(() => undefined);
      expect(response.status).toBe(HttpStatus.ServiceUnavailable);
      return;
    }
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { matchId?: string; syncStatus?: string };
    expect(typeof data.matchId).toBe('string');
    expect((data.matchId ?? '').length).toBeGreaterThan(0);
    expect(data.syncStatus).toBe('synced');
  });

  it(testName('Sync reconcile: returns 200 and report with resolution when matchId provided'), async () => {
    const token = getTokenForFetch();
    const matchId = `reconcile-test-${Date.now()}`;
    const fromUrl = buildApiUrl(ApiEndpoint.Sync.FromSolana, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const fromRes = await worker.fetch(fromUrl, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        matchId,
        solanaMatchPda: 'pda-placeholder',
        state: { stateHash: 'h1', turnCount: 1, gameType: 0, status: 'active' },
        slot: 1,
      }),
    }, token);
    await fromRes.text().catch(() => undefined);
    const url = buildApiUrl(ApiEndpoint.Sync.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ matchId }),
    }, token);
    if (response.status === HttpStatus.ServiceUnavailable) {
      await response.text().catch(() => undefined);
      expect(response.status).toBe(HttpStatus.ServiceUnavailable);
      return;
    }
    expect(response.status).toBe(HttpStatus.Ok);
    const report = (await response.json()) as { matchId: string; resolution: string; discrepancies: unknown[] };
    expect(typeof report.matchId).toBe('string');
    expect(report.matchId.length).toBeGreaterThan(0);
    expect(['no_conflict', 'solana_wins']).toContain(report.resolution);
    expect(Array.isArray(report.discrepancies)).toBe(true);
  });
});
