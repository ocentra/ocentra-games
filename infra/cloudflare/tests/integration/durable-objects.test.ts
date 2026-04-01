import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';

import { buildTestMatchApiUrl, generateTestMatchId, generateTestUserId, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { TestConfig, TestValues, TestTimeout, TestR2LockWait } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
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

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Match Coordinator Authentication: should require Firebase auth for match operations'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing durable objects auth requirement', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const matchUrl = buildTestMatchApiUrl(TestConfig.TestMatchId, '/state');
      const response = await worker.fetch(matchUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin
        }
      }, token);

      logInfo('[TEST] Durable objects auth check response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      if (response.status !== HttpStatus.Unauthorized) {
        logError('[TEST] Unexpected status for auth check', getStackTrace(), { expected: HttpStatus.Unauthorized, actual: response.status });
      }
      await consumeResponseBody(response);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('Match Coordinator Authentication: should require auth for match creation'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing match creation auth requirement', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const matchUrl = buildTestMatchApiUrl(TestConfig.TestMatchId, '/create');
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({ matchId: TestConfig.TestMatchId })
      }, token);

      logInfo('[TEST] Match creation auth check response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('Match Coordinator Authentication: should require auth for joining matches'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing match join auth requirement', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const matchUrl = buildTestMatchApiUrl(TestConfig.TestMatchId, '/join');
      const response = await worker.fetch(matchUrl, {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({ playerId: TestConfig.TestPlayerId })
      }, token);

      logInfo('[TEST] Match join auth check response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('Deprecated Match Actions: should return 404 for removed HTTP gameplay endpoints'), async () => {
      const token = await createToken();
      const removedPaths = ['/move', '/checkpoint', '/sync', '/finalize'];

      for (const suffix of removedPaths) {
        const matchUrl = buildTestMatchApiUrl(TestConfig.TestMatchId, suffix);
        const response = await worker.fetch(matchUrl, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({}),
        }, token);
        expect(response.status).toBe(HttpStatus.NotFound);
        await consumeResponseBody(response);
      }

      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('WebSocket Handling: should reject unauthenticated WebSocket upgrade requests'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('do-ws-auth');
      const wsUrl = buildTestMatchApiUrl(matchId, '');
      const response = await worker.fetch(wsUrl, {
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
        },
      }, token);

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
    });

  it(testName('WebSocket Handling: should reject invalid WebSocket messages for authenticated participants'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('do-ws-msg');
      const matchId = generateTestMatchId('do-ws-msg');

      const createResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/create'), {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ gameName: 'CLAIM', gameType: 0 }),
      }, token);
      expect(createResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(createResponse);

      const joinResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/join'), {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ playerPubkey: userId }),
      }, token);
      expect(joinResponse.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(joinResponse);

      const upgradeResponse = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
        headers: {
          ...getValidRequestHeaders(userId),
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
          type: TestValues.MatchWSUnsupportedType,
          matchId,
        }));

        const errorMessage = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
        expect(errorMessage.type).toBe(MatchWSMessageType.Error);
        expect(typeof errorMessage.message).toBe('string');
        expect(String(errorMessage.message).length).toBeGreaterThan(0);
      } finally {
        await closeSocket(ws);
      }

      await waitForR2Locks(TestR2LockWait.MaxRetries, TestR2LockWait.InitialDelayMs);
  });
});
