import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken, type SetupContextToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestMatchApiUrl, getValidRequestHeaders, generateTestMatchId, generateTestUserId } from '@tests/helpers/test-helpers';

import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

async function uploadFinalizedMatchRecord(
  worker: TestWorker,
  token: SetupContextToken,
  matchId: MatchId,
  userId: string
): Promise<void> {
  const uploadUrl = buildTestMatchApiUrl(matchId, '');
  const uploadResponse = await worker.fetch(uploadUrl, {
    method: HttpMethod.Put,
    headers: {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({
      match_id: matchId,
      version: '2.0.0',
      events: [],
      players: [{ player_id: userId }],
      phase: 3,
      endedAt: new Date().toISOString(),
    }),
  }, token);

  expect(uploadResponse.status).toBe(HttpStatus.Ok);
  await consumeResponseBody(uploadResponse);
}

describe(extractName(import.meta.url), TestSuiteType.Integration, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for match query tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Active Match Query (DO-First): should return active match from DO, not R2'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('match-query-active');
      const matchId = generateTestMatchId('active-match');

      const matchHeaders = () => ({
        ...getValidRequestHeaders(playerId),
        [HttpHeader.XWalletId]: playerId
      });

      const createUrl = buildTestMatchApiUrl(matchId, '/create');
      const createResponse = await worker.fetch(createUrl, {
        method: HttpMethod.Post,
        headers: {
          ...matchHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gameName: 'CLAIM',
          gameType: 0,
          seed: 12345
        })
      }, token);

      expect(createResponse.status).toBe(HttpStatus.Ok);
      const createData = await createResponse.json() as { success: boolean; matchState: { phase: number } };
      expect(createData.success).toBe(true);
      expect(createData.matchState.phase).not.toBe(3);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const getUrl = buildTestMatchApiUrl(matchId, '/state');
      let getResponse = await worker.fetch(getUrl, {
        method: HttpMethod.Get,
        headers: matchHeaders()
      }, token);

      for (let attempt = 0; attempt < 3 && getResponse.status === HttpStatus.NotFound; attempt++) {
        await consumeResponseBody(getResponse);
        await new Promise(resolve => setTimeout(resolve, 800));
        getResponse = await worker.fetch(getUrl, {
          method: HttpMethod.Get,
          headers: matchHeaders()
        }, token);
      }

      expect(getResponse.status).toBe(HttpStatus.Ok);
      const matchData = await getResponse.json() as { matchId: string; phase: number };
      expect(matchData.matchId).toBe(matchId);
      expect(matchData.phase).not.toBe(3);
      expect(typeof matchData.phase).toBe('number');
    });

  it(testName('Finalized Match Query (R2-Fallback): should return finalized match from R2'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('match-query-finalized');
      const matchId = generateTestMatchId('finalized-match');

      const matchHeaders = () => ({
        ...getValidRequestHeaders(playerId),
        [HttpHeader.XWalletId]: playerId
      });

      await uploadFinalizedMatchRecord(worker, token, matchId, playerId);

      await new Promise(resolve => setTimeout(resolve, 500));

      const getUrl = buildTestMatchApiUrl(matchId, '');
      const getResponse = await worker.fetch(getUrl, {
        method: HttpMethod.Get,
        headers: matchHeaders()
      }, token);

      expect(getResponse.status).toBe(HttpStatus.Ok);
      const matchData = await getResponse.json() as { matchId?: string; match_id?: string; phase?: number };
      expect(matchData.matchId || matchData.match_id).toBe(matchId);
      expect(matchData.phase).toBe(3);
    });

  it(testName('Non-Existent Match Query: should return 404 for non-existent match'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('match-query-nonexistent');
      const matchId = generateTestMatchId('non-existent');

      const getUrl = buildTestMatchApiUrl(matchId, '');
      const getResponse = await worker.fetch(getUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.XWalletId]: playerId
        }
      }, token);

      expect(getResponse.status).toBe(HttpStatus.NotFound);
      const errorData = await getResponse.json() as { error?: string };
      expect(typeof errorData.error).toBe('string');
      expect((errorData.error as string).length).toBeGreaterThan(0);
      await consumeResponseBody(getResponse);
    });

  it(testName('Concurrency Tests - Active Match (DO Read/Write): should handle concurrent GET requests for active match'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('match-query-concurrent-active');
      const matchId = generateTestMatchId('concurrent-active');

      const matchHeaders = () => ({
        ...getValidRequestHeaders(playerId),
        [HttpHeader.XWalletId]: playerId
      });

      const createUrl = buildTestMatchApiUrl(matchId, '/create');
      const createResponse = await worker.fetch(createUrl, {
        method: HttpMethod.Post,
        headers: {
          ...matchHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gameName: 'CLAIM',
          gameType: 0,
          seed: 12345
        })
      }, token);
      expect(createResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(createResponse);

      await new Promise(resolve => setTimeout(resolve, 800));

      const getUrl = buildTestMatchApiUrl(matchId, '/state');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const iterations = isRealMode ? 5 : 4;
      const concurrentRequests = Array.from({ length: iterations }, () =>
        worker.fetch(getUrl, {
          method: HttpMethod.Get,
          headers: matchHeaders()
        }, token)
      );

      const responses = await Promise.all(concurrentRequests);

      for (const response of responses) {
        expect(response.status).toBe(HttpStatus.Ok);
        const matchData = await response.json() as { matchId: string; phase: number };
        expect(matchData.matchId).toBe(matchId);
        expect(matchData.phase).not.toBe(3);
      }
    });

  it(testName('Concurrency Tests - Finalized Match (R2 Read-Only): should handle concurrent GET requests for finalized match'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('match-query-concurrent-finalized');
      const matchId = generateTestMatchId('concurrent-finalized');

      const matchHeaders = () => ({
        ...getValidRequestHeaders(playerId),
        [HttpHeader.XWalletId]: playerId
      });

      await uploadFinalizedMatchRecord(worker, token, matchId, playerId);

      await new Promise(resolve => setTimeout(resolve, 500));

      const getUrl = buildTestMatchApiUrl(matchId, '');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const iterations = isRealMode ? 5 : 4;

      const concurrentRequests = Array.from({ length: iterations }, () =>
        worker.fetch(getUrl, {
          method: HttpMethod.Get,
          headers: matchHeaders()
        }, token)
      );

      const responses = await Promise.all(concurrentRequests);

      for (const response of responses) {
        expect(response.status).toBe(HttpStatus.Ok);
        const matchData = await response.json() as { matchId?: string; match_id?: string; phase: number };
        expect(matchData.matchId || matchData.match_id).toBe(matchId);
        expect(matchData.phase).toBe(3);
      }
    });
});
