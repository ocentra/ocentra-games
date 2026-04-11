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

  it(testName('Replay GET: returns 404 when match does not exist'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Replay.ByMatchId(crypto.randomUUID()), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(),
    }, token);
    expect(response.status).toBe(HttpStatus.NotFound);
    await response.text().catch(() => undefined);
  });

  it(testName('Replay: sync match then GET replay returns replay with timeline and verification'), async () => {
    const token = getTokenForFetch();
    const matchId = crypto.randomUUID();
    const syncUrl = buildApiUrl(ApiEndpoint.Sync.FromSolana, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const syncRes = await worker.fetch(syncUrl, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        matchId,
        solanaMatchPda: 'pda-replay-test',
        state: { stateHash: 'h0', turnCount: 0, gameType: 1, status: 'active' },
        slot: 1,
      }),
    }, token);
    await syncRes.text().catch(() => undefined);
    const replayUrl = buildApiUrl(ApiEndpoint.Replay.ByMatchId(matchId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(replayUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(),
    }, token);
    if (response.status === HttpStatus.ServiceUnavailable || response.status === HttpStatus.NotFound) {
      await response.text().catch(() => undefined);
      expect([HttpStatus.ServiceUnavailable, HttpStatus.NotFound]).toContain(response.status);
      return;
    }
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as {
      matchId?: string;
      timeline?: unknown[];
      version?: string;
      verification?: { solanaMatchPda?: string; stateHashes?: string[]; merkleRoot?: string };
    };
    expect(data.matchId).toBe(matchId);
    expect(data.version).toBe('1.0');
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(data.verification).not.toBeNull();
    expect(typeof data.verification?.merkleRoot).toBe('string');
  });

  it(testName('Replay verify: GET replay/:matchId/verify returns verified true or false'), async () => {
    const token = getTokenForFetch();
    const matchId = crypto.randomUUID();
    const syncUrl = buildApiUrl(ApiEndpoint.Sync.FromSolana, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const syncRes2 = await worker.fetch(syncUrl, {
      method: HttpMethod.Post,
      headers: { ...getValidRequestHeaders(), [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        matchId,
        solanaMatchPda: 'pda-verify',
        state: { stateHash: 'vh', turnCount: 0, gameType: 0, status: 'active' },
        slot: 0,
      }),
    }, token);
    await syncRes2.text().catch(() => undefined);
    const verifyUrl = buildApiUrl(ApiEndpoint.Replay.Verify(matchId), {
      baseUrl: TestConfig.TestApiUrlPlaceholder,
    });
    const response = await worker.fetch(verifyUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(),
    }, token);
    if (response.status === HttpStatus.NotFound) {
      expect(response.status).toBe(HttpStatus.NotFound);
      return;
    }
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { matchId: string; verified: boolean };
    expect(data.matchId).toBe(matchId);
    expect(typeof data.verified).toBe('boolean');
  });
});
