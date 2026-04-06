import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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
    logInfo('[TEST] Initializing test worker for AI endpoint tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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

  it(testName('AI Event Handling: should require authentication for AI events'), async () => {
    const token = await createToken();
    logInfo('[TEST] Testing AI endpoint auth requirement', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MatchStart
      })
    }, token);
    logInfo('[TEST] AI endpoint auth check response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);

    expect(response.status).toBe(HttpStatus.Unauthorized);
    if (response.status !== HttpStatus.Unauthorized) {
      logError('[TEST] AI endpoint auth not enforced', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
    }
  });

  it(testName('AI Event Handling: should accept valid AI event request and return 200 with action response'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MatchStart,
        eventData: {},
        currentState: {}
      })
    }, token);

    expect(response.status).toBe(HttpStatus.Ok);
    const data = await response.json() as { action: { type: string; playerId: string; timestamp: string }; chainOfThought: unknown[]; modelMetadata: { modelId: string; provider: string }; responseTimeMs: number };
    expect(typeof data.action.type).toBe('string');
    expect(data.action.type.length).toBeGreaterThan(0);
    expect(typeof data.action.playerId).toBe('string');
    expect(data.action.playerId.length).toBeGreaterThan(0);
    expect(typeof data.action.timestamp).toBe('string');
    expect(data.action.timestamp.length).toBeGreaterThan(0);
    expect(Array.isArray(data.chainOfThought)).toBe(true);
    expect(typeof data.modelMetadata.modelId).toBe('string');
    expect(data.modelMetadata.modelId.length).toBeGreaterThan(0);
    expect(typeof data.responseTimeMs).toBe('number');
    expect(data.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it(testName('AI Event Handling: should reject request with missing required fields'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId
      })
    }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string };
    expect(typeof data.error).toBe('string');
    expect(data.error).toBe('Missing required fields: matchId, playerId, eventType');
  });

  it(testName('AI Event Handling: should reject invalid matchId format'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        matchId: 'not-a-uuid',
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MatchStart,
      }),
    }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    expect(data.error).toBe('Bad Request');
    expect(typeof data.message).toBe('string');
    expect((data.message as string).toLowerCase()).toContain('matchid');
  });

  it(testName('AI Event Handling: should accept request with invalid event type when AI service not configured'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: TestConfig.InvalidEventType
      })
    }, token);

    logInfo('[TEST] AI event response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
    expect(response.status).toBe(HttpStatus.Ok);
    if (response.status !== HttpStatus.Ok) {
      logError('[TEST] Unexpected status for AI event', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
    }
    const data = await response.json() as { action: { type: string } };
    expect(typeof data.action.type).toBe('string');
    expect(data.action.type.length).toBeGreaterThan(0);
    if (typeof data.action.type !== 'string' || data.action.type.length === 0) {
      logError('[TEST] Invalid AI action response', getStackTrace(), { action: data.action });
    }
  });

  it(testName('AI Event Handling: should reject non-string availableActions items'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MatchStart,
        currentState: {},
        eventData: {},
        availableActions: [{}]
      })
    }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    expect(data.error).toBe('Bad Request');
    expect(typeof data.message).toBe('string');
    expect((data.message as string).toLowerCase()).toContain('availableactions');
  });

  it(testName('AI Event Handling: should reject non-object playerHand items'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson
      },
      body: JSON.stringify({
        matchId: TestConfig.TestMatchId,
        playerId: TestConfig.TestPlayerId,
        eventType: AIEventType.MatchStart,
        currentState: {},
        eventData: {},
        playerHand: [0]
      })
    }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    expect(data.error).toBe('Bad Request');
    expect(typeof data.message).toBe('string');
    expect((data.message as string).toLowerCase()).toContain('playerhand');
  });

  it.skip(testName('AI Event Handling: should return 503 when AI service is unavailable'), async () => {
    logWarn('[TEST] SKIPPED: POOL-WORKERS LIMITATION - This test requires AI_SERVICE_URL override which is ignored in pool-workers mode. Cannot test AI service unavailability in current test environment.', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('AI Event Handling: should reject GET requests'), async () => {
    const token = await createToken();
    const aiEventUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent);
    const response = await worker.fetch(aiEventUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId)
    }, token);

    expect(response.status).toBe(HttpStatus.MethodNotAllowed);
    await consumeResponseBody(response);
  });
});
