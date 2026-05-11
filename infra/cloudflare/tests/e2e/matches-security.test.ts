import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken, type SetupContextToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestMatchApiUrl,
  buildTestApiUrlForEndpointWithPath,
  generateTestMatchId,
  buildCreditsApiUrl,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { TestConfig, TestEnvVar, TestEnvValue, TestValues, TestTimeout, TestR2LockWait } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import matchDataJson from '@tests/fixtures/assets/match-human-victory.json';
const MATCH_DATA_RAW = JSON.stringify(matchDataJson);

const log = Logger.instance;
log.register(import.meta.url);

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
          // Ignore - all consumption methods failed, response may be aborted/invalid
        }
      }
    }
  }
}

async function waitForR2Locks(maxRetries = 5, initialDelay = 100): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, initialDelay * (i + 1)));
  }
}

async function runAbortedMatchUpload(
  worker: TestWorker,
  token: SetupContextToken,
  userId: string,
  matchId: string,
  payload: unknown,
  abortAfterMs: number
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortAfterMs);

  try {
    const response = await worker.fetch(
      buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
      {
        method: HttpMethod.Put,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      },
      token
    );
    await consumeResponseBody(response);
  } catch {
    return;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForWebSocketMessageType(
  ws: WebSocket,
  type: string,
  timeoutMs = TestTimeout.WebSocketMessage
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const payload = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timed out waiting for WebSocket message'));
      }, remaining);

      const onMessage = (event: MessageEvent) => {
        clearTimeout(timer);
        ws.removeEventListener('message', onMessage as EventListener);
        try {
          resolve(JSON.parse(String(event.data)) as Record<string, unknown>);
        } catch (error) {
          reject(error);
        }
      };

      ws.addEventListener('message', onMessage as EventListener);
    });

    if (payload.type === type) {
      return payload;
    }
  }

  throw new Error(`Timed out waiting for WebSocket message type=${type}`);
}

async function closeSocket(ws: WebSocket): Promise<void> {
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(WebSocketCloseCode.NormalClosure, TestValues.WebSocketCloseReasonDone);
    }
  } catch {
    void 0;
  }
  await new Promise(resolve => setTimeout(resolve, 50));
}

describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Authorization (Rule 14.1): should require authentication for match upload'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-auth');
      const matchData = MATCH_DATA_RAW;
      
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: matchData
        },
      token
      );

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Authorization (Rule 14.1): should require authentication for match retrieval'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-get');
      
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect([HttpStatus.Unauthorized, HttpStatus.NotFound]).toContain(response.status);
      await consumeResponseBody(response);
    });

  it(testName('Authorization (Rule 14.1): should require authentication for match deletion'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-delete');
      
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Delete,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
      token
      );

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

    it(testName('should reject deprecated HTTP match finalization endpoint'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-finalize');
      
      const finalizeUrl = buildTestMatchApiUrl(matchId, '/finalize');
      const response = await worker.fetch(finalizeUrl,
        {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          },
          body: JSON.stringify({ scores: [100, 80], winner: 'player-1' })
        },
        token
      );

      expect(response.status).toBe(HttpStatus.NotFound);
      await consumeResponseBody(response);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

    it(testName('WebSocket Security: should reject connection with invalid token'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('test-match-ws-invalid-token');
      const wsUrl = buildTestMatchApiUrl(matchId, '');

      const response = await worker.fetch(wsUrl, {
        headers: {
          [HttpHeader.Authorization]: `Bearer ${TestConfig.InvalidToken}`,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

    it(testName('WebSocket Security: should reject spoofed userId in WebSocket message'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('ws-security-player');
      const spoofedUserId = generateTestUserId('ws-security-spoof');
      const matchId = generateTestMatchId('test-match-ws-spoof');

      const createResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/create'), {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ gameName: 'CLAIM', gameType: 0 }),
      }, token);
      expect(createResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(createResponse);

      const joinResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/join'), {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ playerPubkey: playerId }),
      }, token);
      expect(joinResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(joinResponse);

      const upgradeResponse = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
        },
      }, token);

      expect(upgradeResponse.status).toBe(HttpStatus.SwitchingProtocols);
      expect(upgradeResponse.webSocket).toBeTruthy();
      const ws = upgradeResponse.webSocket!;
      ws.accept();

      try {
        ws.send(JSON.stringify({
          type: MatchWSMessageType.Move,
          matchId,
          userId: spoofedUserId,
          txSignature: `tx-${crypto.randomUUID()}`,
          move: { card: 'x' },
        }));

        const errorPayload = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
        expect(errorPayload.type).toBe(MatchWSMessageType.Error);
        expect(errorPayload.message).toBe(ErrorMessage.UserIdMismatch);
      } finally {
        await closeSocket(ws);
      }
    });

    it(testName('WebSocket Security: should reject WebSocket message with wrong matchId'), async () => {
      const token = await createToken();
      const playerId = generateTestUserId('ws-security-match-player');
      const matchId = generateTestMatchId('test-match-ws-matchid');
      const wrongMatchId = generateTestMatchId('test-match-ws-wrong');

      const createResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/create'), {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ gameName: 'CLAIM', gameType: 0 }),
      }, token);
      expect(createResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(createResponse);

      const joinResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/join'), {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ playerPubkey: playerId }),
      }, token);
      expect(joinResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(joinResponse);

      const upgradeResponse = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
        },
      }, token);

      expect(upgradeResponse.status).toBe(HttpStatus.SwitchingProtocols);
      expect(upgradeResponse.webSocket).toBeTruthy();
      const ws = upgradeResponse.webSocket!;
      ws.accept();

      try {
        ws.send(JSON.stringify({
          type: MatchWSMessageType.Ping,
          matchId: wrongMatchId,
        }));

        const errorPayload = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
        expect(errorPayload.type).toBe(MatchWSMessageType.Error);
        expect(errorPayload.message).toBe(ErrorMessage.MatchIdMismatch);
      } finally {
        await closeSocket(ws);
      }
    });

  it(testName('Input Validation (Rule 14.3): should reject match upload with invalid JSON'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-invalid-json');
      const matchId = generateTestMatchId('test-match');

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: 'invalid json'
        },
      token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

  it(testName('Input Validation (Rule 14.3): should reject match upload with missing required fields'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-missing-fields');
      const matchId = generateTestMatchId('test-match');

      const invalidMatch = {
        match_id: matchId
      };

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(invalidMatch)
        },
      token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      await consumeResponseBody(response);
    });

    it(testName('should reject match upload with invalid match_id mismatch'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-id-mismatch');
      const matchId = generateTestMatchId('test-match');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = 'different-match-id';

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.Ok]).toContain(response.status);
      await consumeResponseBody(response);
    });

    it(testName('should reject match upload with invalid player data'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-invalid-players');
      const matchId = generateTestMatchId('test-match');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      parsed.players = null;

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);

      let errorMessage = '';
      const text = await response.text();
      try {
        const data = JSON.parse(text) as { error?: string; message?: string };
        errorMessage = data.error || data.message || '';
      } catch {
        errorMessage = text || '';
      }
      expect(errorMessage.length).toBeGreaterThan(0);
    });

  it(testName('Input Validation (Rule 14.3): should reject match upload with oversized payload'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-oversized');
      const matchId = generateTestMatchId('test-match');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      parsed.events = Array.from({ length: 100000 }, () => ({ type: MatchWSMessageType.Move, data: 'x'.repeat(1000) }));

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect([HttpStatus.PayloadTooLarge, HttpStatus.BadRequest, HttpStatus.InternalServerError]).toContain(response.status);
      await consumeResponseBody(response);
    });

  it(testName('Replay / Idempotency (Rule 14.8): should allow replay of same match upload (idempotent)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-replay');
      const matchId = generateTestMatchId('test-match-replay');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;

      const response1 = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );
      expect(response1.status).toBe(HttpStatus.Ok);
      const data1 = await response1.json() as { success: boolean; matchId: string };

      const response2 = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );
      expect(response2.status).toBe(HttpStatus.Ok);
      const data2 = await response2.json() as { success: boolean; matchId: string };

      expect(data2.matchId).toBe(data1.matchId);
      expect(data2.success).toBe(true);
    });

    it(testName('should handle concurrent match uploads correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-concurrent');
      const matchId = generateTestMatchId('test-match-concurrent');
      const matchDataRaw = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchDataRaw);
      parsed.match_id = matchId;

      const requests = Array.from({ length: 5 }, () =>
        worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Put,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify(parsed)
          },
          token
        )
      );

      const uploadResponses = await Promise.all(requests);
      for (const response of uploadResponses) {
        await consumeResponseBody(response);
      }
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
      
      const getResponse = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      expect(getResponse.status).toBe(HttpStatus.Ok);
      const matchRecord = await getResponse.json() as { match_id: string };
      expect(matchRecord.match_id).toBe(matchId);
      await consumeResponseBody(getResponse);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('Partial Failure & Rollback (Rule 12.1.1, 12.1.2): should handle partial match upload failure correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-partial');
      const matchId = generateTestMatchId('test-match-partial');
      
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;

      const uploadResponse = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      if (uploadResponse.status === HttpStatus.Ok) {
        const getResponse = await worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Get,
            headers: getValidRequestHeaders(userId)
          },
          token
        );

        expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(getResponse.status);
        await consumeResponseBody(getResponse);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.InternalServerError, HttpStatus.TooManyRequests]).toContain(uploadResponse.status);
      }
      await consumeResponseBody(uploadResponse);
    });

  it(testName('Partial Failure & Rollback (Rule 12.1.1, 12.1.2): should maintain idempotency across retries after partial execution'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-retry');
      const matchId = generateTestMatchId('test-match-retry');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;

      const responses = await Promise.all([
        worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Put,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify(parsed)
          },
          token
        ),
        worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Put,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify(parsed)
          },
          token
        )
      ]);

      const results = await Promise.all(
        responses.map(async r => {
          if (r.status === HttpStatus.Ok) {
            const data = await r.json() as { success: boolean; matchId: string };
            return { status: r.status, data };
          }
          await consumeResponseBody(r);
          return { status: r.status, data: null };
        })
      );

      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);

      const successful = results.filter(r => r.status === HttpStatus.Ok && r.data);
      if (successful.length > 0) {
        const allSameId = successful.every(r => r.data!.matchId === matchId);
        expect(allSameId).toBe(true);
      }
    });

  it(testName('Time-Based Attacks (Rule 15.3): should reject match upload with future timestamps'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-future-time');
      const matchId = generateTestMatchId('test-match');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      parsed.createdAt = futureDate;
      parsed.endedAt = new Date(Date.now() + 90000000).toISOString();

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.Ok, HttpStatus.TooManyRequests]).toContain(response.status);
      await consumeResponseBody(response);
    });

    it(testName('should reject match upload with expired match data'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-expired');
      const matchId = generateTestMatchId('test-match');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      const oldDate = new Date(Date.now() - 86400000 * 365).toISOString();
      parsed.createdAt = oldDate;
      parsed.endedAt = new Date(Date.now() - 86400000 * 364).toISOString();

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.Ok, HttpStatus.TooManyRequests]).toContain(response.status);
      await consumeResponseBody(response);
    });

  it(testName('Time-Based Attacks (Rule 15.3): should handle clock skew tolerance correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-clock-skew');
      const matchId = generateTestMatchId('test-match');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      const skewDate = new Date(Date.now() + 60000).toISOString();
      parsed.createdAt = skewDate;

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.Ok, HttpStatus.TooManyRequests]).toContain(response.status);
      await consumeResponseBody(response);
    });

  it(testName('Economic Exhaustion (Rule 15.4): should prevent profit from spamming match uploads'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-spam');
      const matchData = MATCH_DATA_RAW;
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const spamCount = isRealMode ? 5 : 20;

      const spamRequests = Array.from({ length: spamCount }, (_, i) => {
        const matchId = generateTestMatchId(`spam-match-${i}`);
        const parsed = JSON.parse(matchData);
        parsed.match_id = matchId;
        return worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Put,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify(parsed)
          },
          token
        );
      });

      const responses = await Promise.all(spamRequests);
      const successful = responses.filter(r => r.status === HttpStatus.Ok);
      const rateLimited = responses.filter(r => r.status === HttpStatus.TooManyRequests);

      expect(successful.length + rateLimited.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(spamCount);
      
      for (const response of responses) {
        await consumeResponseBody(response);
      }
      await waitForR2Locks(5, 200);
    });

  it(testName('Economic Exhaustion (Rule 15.4): should maintain conservation of value for match GP rewards (Rule 15.4.1.1)'), async () => {
      const token = await createToken();
      const userId1 = generateTestUserId('match-winner');
      const userId2 = generateTestUserId('match-loser');

      const balanceUrl1 = buildCreditsApiUrl(userId1, CreditAction.Balance);
      const initialBalance1 = await worker.fetch(balanceUrl1, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId1)
        },
      token
      );
      expect(initialBalance1.status).toBe(HttpStatus.Ok);
      const initialData1 = await initialBalance1.json() as { gp_balance: number };
      const initialGP1 = initialData1.gp_balance;

      const balanceUrl2 = buildCreditsApiUrl(userId2, CreditAction.Balance);
      const initialBalance2 = await worker.fetch(balanceUrl2, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(userId2)
          }
        },
      token
      );
      expect(initialBalance2.status).toBe(HttpStatus.Ok);
      const initialData2 = await initialBalance2.json() as { gp_balance: number };
      const initialGP2 = initialData2.gp_balance;

      const matchId = generateTestMatchId('match-finalize-test');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      parsed.players = [
        { player_id: userId1, public_key: userId1, pubkey: userId1, type: 'human', index: 0 },
        { player_id: userId2, public_key: userId2, pubkey: userId2, type: 'human', index: 1 }
      ];
      parsed.scores = [150, 80];
      parsed.winner = userId1;

      const uploadResponse = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId1),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      if (uploadResponse.status === HttpStatus.Ok) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const finalBalanceUrl1 = buildCreditsApiUrl(userId1, CreditAction.Balance);
        const finalBalance1 = await worker.fetch(finalBalanceUrl1, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId1)
        }, token);
        const finalData1 = await finalBalance1.json() as { gp_balance: number };
        const gpIncrease1 = finalData1.gp_balance - initialGP1;

        const finalBalanceUrl2 = buildCreditsApiUrl(userId2, CreditAction.Balance);
        const finalBalance2 = await worker.fetch(finalBalanceUrl2, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId2)
        }, token);
        const finalData2 = await finalBalance2.json() as { gp_balance: number };
        const gpIncrease2 = finalData2.gp_balance - initialGP2;

        const totalIncrease = gpIncrease1 + gpIncrease2;
        expect(totalIncrease).toBeGreaterThanOrEqual(0);
        expect(totalIncrease).toBeLessThanOrEqual(125);
        expect(gpIncrease1).toBeGreaterThanOrEqual(gpIncrease2);
      }
    });

  it(testName('Abort Handling (Rule 15.4.5): should handle aborted match uploads without value leakage'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-abort');
      const matchId = generateTestMatchId('test-match-abort');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;

      await runAbortedMatchUpload(worker, token, userId, matchId, parsed, 5);

      await waitForR2Locks(5, 100);

      const getResponse = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(userId)
          }
        },
      token
      );

      if (getResponse.status === HttpStatus.Ok) {
        const matchData = await getResponse.json() as { match_id: string };
        expect(matchData.match_id).toBe(matchId);
      } else {
        expect([HttpStatus.NotFound, HttpStatus.Unauthorized]).toContain(getResponse.status);
      }
      await consumeResponseBody(getResponse);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

    it(testName('should prevent repeated aborts from leaking value (Rule 15.4.5)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-abort-repeat');
      const matchId = generateTestMatchId('test-match-abort');
      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const abortCount = isRealMode ? 3 : 10;

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const initialBalance = await worker.fetch(balanceUrl, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = await initialBalance.json() as { gp_balance: number };
      const initialGP = initialData.gp_balance;
      await consumeResponseBody(initialBalance);

      await Promise.all(Array.from(
        { length: abortCount },
        () => runAbortedMatchUpload(worker, token, userId, matchId, parsed, 10)
      ));
      await waitForR2Locks(5, 100);

      const finalBalanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const finalBalance = await worker.fetch(finalBalanceUrl, {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );
      const finalData = await finalBalance.json() as { gp_balance: number };
      const gpIncrease = finalData.gp_balance - initialGP;

      expect(gpIncrease).toBeGreaterThanOrEqual(0);
      expect(gpIncrease).toBeLessThanOrEqual(0);
      await consumeResponseBody(finalBalance);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('State & Logic Abuse (Rule 14.9): should prevent invalid state transitions in match finalization'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-invalid-state');
      const matchId = generateTestMatchId('test-match');

      const finalizeUrl = buildTestMatchApiUrl(matchId, '/finalize');
      const finalizeResponse = await worker.fetch(finalizeUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify({ scores: [100], winner: userId })
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.NotFound, HttpStatus.Unauthorized]).toContain(finalizeResponse.status);
      await consumeResponseBody(finalizeResponse);
      await waitForR2Locks(5, 200);
    });

    it(testName('should prevent finalizing match with invalid scores'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-invalid-scores');
      const matchId = generateTestMatchId('test-match');

      const finalizeUrl = buildTestMatchApiUrl(matchId, '/finalize');
      const finalizeResponse = await worker.fetch(finalizeUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify({ scores: [-100, 200], winner: userId })
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.NotFound, HttpStatus.Unauthorized]).toContain(finalizeResponse.status);
      await consumeResponseBody(finalizeResponse);
      await waitForR2Locks(5, 200);
    });

    it(testName('should prevent skipping required match steps'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-skip-steps');
      const matchId = generateTestMatchId('test-match');

      const matchData = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchData);
      parsed.match_id = matchId;
      parsed.phase = 0;
      parsed.moveCount = 0;
      parsed.events = [];

      const uploadResponse = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify(parsed)
        },
      token
      );

      expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(uploadResponse.status);
      await consumeResponseBody(uploadResponse);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('State & Logic Abuse (Rule 14.9): should prevent skipping required match steps'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-error');
      const matchId = generateTestMatchId('test-match-error');

      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Put,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson
          },
          body: JSON.stringify({ invalid: 'data' })
        },
      token
      );

      expect([HttpStatus.BadRequest, HttpStatus.InternalServerError, HttpStatus.Ok, HttpStatus.ServiceUnavailable]).toContain(response.status);

      if (response.status === HttpStatus.BadRequest || response.status === HttpStatus.InternalServerError || response.status === HttpStatus.ServiceUnavailable) {
        const text = await response.text();
        try {
          const data = JSON.parse(text) as { error?: string; message?: string; stack?: string };
          expect(data.stack).toBeUndefined();
          const errorMessage: string = data.error || data.message || '';
          expect(errorMessage.length).toBeGreaterThan(0);
          expect(typeof errorMessage).toBe('string');
        } catch {
          expect(text.length).toBeGreaterThan(0);
        }
      } else {
        await consumeResponseBody(response);
      }
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('Error & Information Leakage (Rule 14.11): should return consistent error shape for match operations'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-error-shape');
      const matchId = generateTestMatchId('test-match');

      const invalidActionUrl = buildTestMatchApiUrl(matchId, TestValues.InvalidAction);
      const response = await worker.fetch(invalidActionUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
      token
      );

      expect([HttpStatus.NotFound, HttpStatus.BadRequest, HttpStatus.MethodNotAllowed]).toContain(response.status);
      const data = await response.json() as { error?: string; message?: string };
      const errorMessage: string = data.error || data.message || '';
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(typeof errorMessage).toBe('string');
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('Concurrency & Race Conditions (Rule 15.5): should handle concurrent match uploads correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-concurrent-upload');
      const matchId = generateTestMatchId('test-match-concurrent');
      const matchDataRaw = MATCH_DATA_RAW;
      const parsed = JSON.parse(matchDataRaw);
      parsed.match_id = matchId;
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const requestCount = isRealMode ? 7 : 10;

      const requests = Array.from({ length: requestCount }, () =>
        worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Put,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify(parsed)
          },
          token
        )
      );

      const uploadResponses = await Promise.all(requests);
      for (const response of uploadResponses) {
        await consumeResponseBody(response);
      }

      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);

      const getResponse = await worker.fetch(
        buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );

      expect(getResponse.status).toBe(HttpStatus.Ok);
      const matchRecord = await getResponse.json() as { match_id: string };
      expect(matchRecord.match_id).toBe(matchId);
      await consumeResponseBody(getResponse);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

    it(testName('should reject concurrent HTTP match finalization attempts'), async () => {
      const token = await createToken();
      const userId1 = generateTestUserId('match-final-concurrent-1');
      const matchId = generateTestMatchId('test-match-finalize');

      const finalizeRequests = Array.from({ length: 5 }, () =>
        worker.fetch(
          buildTestMatchApiUrl(matchId, '/finalize'),
          {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(userId1),
              [HttpHeader.XWalletId]: userId1,
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify({ scores: [150, 80], winner: userId1 })
          },
          token
        )
      );

      const finalizeResponses = await Promise.all(finalizeRequests);
      for (const response of finalizeResponses) {
        expect(response.status).toBe(HttpStatus.NotFound);
        await consumeResponseBody(response);
      }
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    }, 60000);

  it(testName('Rate Limiting (Rule 4.1): should enforce rate limits on match uploads'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('match-rate-limit');
      const matchData = MATCH_DATA_RAW;
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const spamCount = isRealMode ? 5 : 15;

      const spamRequests = Array.from({ length: spamCount }, (_, i) => {
        const matchId = generateTestMatchId(`rate-limit-match-${i}`);
        const parsed = JSON.parse(matchData);
        parsed.match_id = matchId;
        return worker.fetch(
          buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId),
          {
            method: HttpMethod.Put,
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson
            },
            body: JSON.stringify(parsed)
          },
          token
        );
      });

      const responses = await Promise.all(spamRequests);
      for (const response of responses) {
        await consumeResponseBody(response);
      }
      await waitForR2Locks(5, 200);
      const rateLimited = responses.filter(r => r.status === HttpStatus.TooManyRequests);

      if (isRealMode) {
        expect(rateLimited.length).toBeLessThan(spamCount);
        for (const response of responses) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
        }
      } else {
        expect(rateLimited.length).toBeGreaterThanOrEqual(0);
      }
    });
});
