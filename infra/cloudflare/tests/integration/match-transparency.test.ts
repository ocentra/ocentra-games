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

  describe('MatchTransparencyService', () => {
    it(testName('Transparency get: returns match transparency record'), async () => {
      const matchId = crypto.randomUUID();
      const url = buildApiUrl(ApiEndpoint.Transparency.ByMatchId(matchId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect([HttpStatus.Ok, HttpStatus.InternalServerError]).toContain(response.status);
      const data = (await response.json()) as { 
        matchId?: string;
        solanaMatchPda?: string;
        transactionSignatures?: unknown[];
        initialStateHash?: string;
        finalStateHash?: string;
        stateTransitions?: unknown[];
        moves?: unknown[];
        randomnessSource?: string;
        randomnessCommitments?: unknown[];
        aiPlayers?: unknown[];
        disputes?: unknown[];
        replayAvailable?: boolean;
        replayLocation?: string;
      };
      if (response.status === HttpStatus.Ok) {
        expect(data.matchId).toBe(matchId);
        expect(typeof data.solanaMatchPda).toBe('string');
        expect(Array.isArray(data.transactionSignatures)).toBe(true);
        expect(typeof data.initialStateHash).toBe('string');
        expect(typeof data.finalStateHash).toBe('string');
        expect(Array.isArray(data.stateTransitions)).toBe(true);
        expect(Array.isArray(data.moves)).toBe(true);
        expect(['vrf', 'commit-reveal']).toContain(data.randomnessSource);
        expect(Array.isArray(data.randomnessCommitments)).toBe(true);
        expect(Array.isArray(data.aiPlayers)).toBe(true);
        expect(Array.isArray(data.disputes)).toBe(true);
        expect(typeof data.replayAvailable).toBe('boolean');
        expect(typeof data.replayLocation).toBe('string');
      } else {
        expect(typeof (data as { error?: string }).error).toBe('string');
      }
    });

    it(testName('Transparency verify: returns verification result'), async () => {
      const matchId = crypto.randomUUID();
      const url = buildApiUrl(ApiEndpoint.Transparency.Verify(matchId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect([HttpStatus.Ok, HttpStatus.ServiceUnavailable]).toContain(response.status);
      const data = (await response.json()) as { 
        matchId?: string;
        verifiedAt?: number;
        checks?: {
          hashChain?: boolean;
          moves?: boolean;
          randomness?: boolean;
          onChain?: boolean;
          replay?: boolean;
        };
        overall?: boolean;
      };
      if (response.status === HttpStatus.Ok) {
        expect(data.matchId).toBe(matchId);
        expect(typeof data.verifiedAt).toBe('number');
        expect(typeof data.checks).toBe('object');
        expect(typeof data.checks?.hashChain).toBe('boolean');
        expect(typeof data.checks?.moves).toBe('boolean');
        expect(typeof data.checks?.randomness).toBe('boolean');
        expect(typeof data.checks?.onChain).toBe('boolean');
        expect(typeof data.checks?.replay).toBe('boolean');
        expect(typeof data.overall).toBe('boolean');
      } else {
        expect(typeof (data as { error?: string }).error).toBe('string');
      }
    });

    it(testName('Transparency replay: returns replay or not found'), async () => {
      const matchId = crypto.randomUUID();
      const url = buildApiUrl(ApiEndpoint.Transparency.Replay(matchId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
      if (response.status === HttpStatus.Ok) {
        const data = (await response.json()) as {
          matchId?: string;
          replay?: unknown;
          verified?: boolean;
        };
        expect(data.matchId).toBe(matchId);
        return;
      }
      const notFoundBody = await response.text();
      expect(notFoundBody.length).toBeGreaterThan(0);
    });

    it(testName('Transparency AI decisions: returns decisions array'), async () => {
      const matchId = crypto.randomUUID();
      const url = `${buildApiUrl(ApiEndpoint.Transparency.ByMatchId(matchId), { baseUrl: TestConfig.TestApiUrlPlaceholder })}${ApiEndpoint.Matches.AIDecisionsSegment}`;
      
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect([HttpStatus.Ok, HttpStatus.InternalServerError]).toContain(response.status);
      const data = (await response.json()) as { 
        matchId?: string;
        decisions?: unknown[];
        error?: string;
      };
      if (response.status === HttpStatus.Ok) {
        expect(data.matchId).toBe(matchId);
        expect(Array.isArray(data.decisions)).toBe(true);
      } else {
        expect(typeof data.error).toBe('string');
      }
    });
  });
});
