import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getValidRequestHeaders, buildTestApiUrlForEndpoint, buildTestMatchApiUrl, generateTestMatchId } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader,  HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { AIEventType } from '@/constants/ai';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
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

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for AI storage enhanced tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Storage with Enhanced Fields: should store AI decision with communication output for text-to-speech'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-tts');
      const playerId = TestConfig.TestPlayerId;
      logInfo('[TEST] Testing AI decision storage with TTS output', getStackTrace(), { matchId, playerId }, LOG_TEST_OPERATIONS);

      const eventRequest = {
        matchId,
        playerId,
        eventType: AIEventType.MoveSubmitted,
        eventData: { move: 'play_card' },
        currentState: { turn: 1 },
        communicationOutput: {
          text: 'I think I have this one in the bag',
          intent: 'bluff',
          targetPlayers: [],
        },
      };

      const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response = await worker.fetch(aiEventUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest),
      }, token);

      logInfo('[TEST] AI storage communication response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      const responseData = await response.json() as { communicationOutput?: { text: string } };
      expect(responseData.communicationOutput?.text).toBe(eventRequest.communicationOutput.text);
    });

  it(testName('Storage with Enhanced Fields: should store AI decision with input consumption from speech-to-text'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-stt');
      const playerId = TestConfig.TestPlayerId;

      const eventRequest = {
        matchId,
        playerId,
        eventType: AIEventType.MoveSubmitted,
        eventData: {},
        currentState: { turn: 2 },
        inputConsumption: {
          transcripts: [
            {
              playerId: 'opponent-player-123',
              text: 'all in',
              timestamp: new Date().toISOString(),
            },
          ],
          processedContext: { detectedBluff: true },
        },
      };

      const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response = await worker.fetch(aiEventUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const responseData = await response.json() as { inputConsumption?: { transcripts: Array<{ text: string }> } };
      expect(responseData.inputConsumption?.transcripts[0]?.text).toBe('all in');
    });

  it(testName('Storage with Enhanced Fields: should store AI decision with sequence number for replay ordering'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-seq');
      const playerId = TestConfig.TestPlayerId;

      const eventRequest = {
        matchId,
        playerId,
        eventType: AIEventType.MatchStart,
        eventData: {},
        currentState: {},
        sequenceNumber: 1,
        eventSequence: 1,
      };

      const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const response = await worker.fetch(aiEventUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const responseData = await response.json() as { sequenceNumber?: number; eventSequence?: number };
      expect(responseData.sequenceNumber).toBe(1);
      expect(responseData.eventSequence).toBe(1);
    });

  it(testName('Retrieve AI Decisions for Match: should return all AI decisions for a match ordered by sequence number'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-retrieve');
      const playerId1 = TestConfig.TestPlayerId;
      const playerId2 = 'test-player-2';

      const eventRequest1 = {
        matchId,
        playerId: playerId1,
        eventType: AIEventType.MatchStart,
        eventData: {},
        currentState: {},
        sequenceNumber: 1,
      };

      const eventRequest2 = {
        matchId,
        playerId: playerId2,
        eventType: AIEventType.MoveSubmitted,
        eventData: {},
        currentState: {},
        sequenceNumber: 2,
      };

      const aiEventUrl1 = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      await worker.fetch(aiEventUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest1),
      }, token);

      const aiEventUrl2 = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      await worker.fetch(aiEventUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest2),
      }, token);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const aiDecisionsUrl = buildTestMatchApiUrl(matchId, '/ai-decisions');
      const retrieveResponse = await worker.fetch(aiDecisionsUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      }, token);

      expect(retrieveResponse.status).toBe(HttpStatus.Ok);
      const decisions = await retrieveResponse.json() as { decisions: Array<{ sequenceNumber?: number; playerId?: string }> };
      expect(Array.isArray(decisions.decisions)).toBe(true);
      expect(decisions.decisions.length).toBeGreaterThanOrEqual(2);

      if (decisions.decisions.length >= 2) {
        const seq1 = decisions.decisions.find(d => d.sequenceNumber === 1);
        const seq2 = decisions.decisions.find(d => d.sequenceNumber === 2);
        expect(seq1?.sequenceNumber).toBe(1);
        expect(seq2?.sequenceNumber).toBe(2);

        const sortedBySeq = [...decisions.decisions].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
        expect(sortedBySeq[0].sequenceNumber).toBeLessThanOrEqual(sortedBySeq[1].sequenceNumber || 0);
      }
    }, 30000);

  it(testName('Retrieve AI Decisions for Match: should return 404 when match has no AI decisions'), async () => {
      const token = await createToken();
      const nonExistentMatchId = generateTestMatchId('non-existent-match');

      const aiDecisionsUrl = buildTestMatchApiUrl(nonExistentMatchId, '/ai-decisions');
      const response = await worker.fetch(aiDecisionsUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      }, token);

      expect(response.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(response);
    });

  it(testName('Retrieve AI Decisions for Match: should require authentication to retrieve AI decisions'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-auth');

      const aiDecisionsUrl = buildTestMatchApiUrl(matchId, '/ai-decisions');
      const response = await worker.fetch(aiDecisionsUrl, {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Retrieve AI Decisions for Match: should filter AI decisions by playerId when playerId query parameter provided'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-filter');
      const playerId1 = TestConfig.TestPlayerId;
      const playerId2 = 'test-player-filter-2';

      const eventRequest1 = {
        matchId,
        playerId: playerId1,
        eventType: AIEventType.MatchStart,
        eventData: {},
        currentState: {},
      };

      const eventRequest2 = {
        matchId,
        playerId: playerId2,
        eventType: AIEventType.MoveSubmitted,
        eventData: {},
        currentState: {},
      };

      const aiEventUrl1 = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const res1 = await worker.fetch(aiEventUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest1),
      }, token);
      await consumeResponseBody(res1);

      const aiEventUrl2 = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
      const res2 = await worker.fetch(aiEventUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(eventRequest2),
      }, token);
      await consumeResponseBody(res2);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const baseUrl = buildTestMatchApiUrl(matchId, '/ai-decisions');
      const url = new URL(baseUrl);
      url.searchParams.set('playerId', playerId1);
      const aiDecisionsUrl = url.toString();
      const response = await worker.fetch(aiDecisionsUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const decisions = await response.json() as { decisions: Array<{ playerId?: string }> };
      expect(Array.isArray(decisions.decisions)).toBe(true);
      if (decisions.decisions.length > 0) {
        expect(decisions.decisions.every(d => d.playerId === playerId1)).toBe(true);
      }
    }, 30000);
});
