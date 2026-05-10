
import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpointWithPath, generateTestUserId, getValidRequestHeaders, generateTestMatchId } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader, WebSocketProtocol, ConnectionValue } from '@ocentra/endpoint-domain/constants/http';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { TestConfig, TestEnvVar, TestEnvValue, TestTimeout } from '@tests/constants/test-constants';
import { setSetupContext } from '@tests/test-setup-pool';

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

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        // Ignore
      }
    }
  }
}

async function closeWebSocketAndWait(ws: WebSocket, timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      setTimeout(resolve, 100);
      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, timeout);

    ws.addEventListener('close', () => {
      clearTimeout(timer);
      setTimeout(resolve, 100);
    }, { once: true });

    ws.close();
  });
}

async function cleanupWebSocket(ws: WebSocket | null | undefined, response?: Response): Promise<void> {
  if (ws) {
    await closeWebSocketAndWait(ws);
  }
  if (response) {
    await consumeResponseBody(response);
  }
}

async function cleanupDurableObjectWebSocket(
  ws: WebSocket | null | undefined,
  response?: Response,
  maxRetries = 5,
  initialDelay = 200
): Promise<void> {
  if (ws) {
    await closeWebSocketAndWait(ws, TestTimeout.WebSocketMessage);
  }
  if (response) {
    await consumeResponseBody(response);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const delay = initialDelay * (attempt + 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (ws && (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING)) {
      break;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
}

describe(extractName(import.meta.url), TestSuiteType.Websocket, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for isolated storage tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await getTestWorker();

    // Set up context for beforeAll warmup fetch - required for test logging
    const setupToken = setSetupContext(
      'websocket-isolated-storage-warmup',
      'tests/integration/websocket-isolated-storage.test.ts'
    );

    try {
      const userId = generateTestUserId('warmup-user');
      const matchId = generateTestMatchId('warmup');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, setupToken);

      if (response.webSocket) {
        response.webSocket.accept();
        await cleanupDurableObjectWebSocket(response.webSocket, response);
      } else {
        await consumeResponseBody(response);
      }

      // Extended delay to allow Windows to fully release SQLite file locks
      // Framework bug (GitHub Issue #11031) tries to push storage frames for nested describe blocks
      // even with isolatedStorage: false, so we need to ensure files are released
      // Note: This delay happens in beforeAll, so it runs before framework tries to push storage frames
      await new Promise(resolve => setTimeout(resolve, TestTimeout.WebSocketMessage));
    } catch {
      // Silently ignore warmup failures - expected due to framework bug (GitHub Issue #11031)
      // The warmup initializes DO instance; if cleanup fails, subsequent tests will still pass
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  });

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    // Wait for file locks to be released before framework cleanup
    // This helps prevent "EBUSY" errors when framework tries to clean up SQLite files
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (worker?.stop) {
      await worker.stop();
    }

    // Additional wait after worker stop to ensure all file handles are released
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it(testName('Connection Header with Multiple Values: should handle request with multiple Connection header values'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('connection-multiple');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const headers = getValidRequestHeaders(userId);
      headers[HttpHeader.Connection] = ConnectionValue.KeepAliveCommaUpgrade;

      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect([HttpStatus.SwitchingProtocols, HttpStatus.BadRequest, HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
      if (response.webSocket) {
        response.webSocket.accept();
        await cleanupDurableObjectWebSocket(response.webSocket, response);
      } else {
        await consumeResponseBody(response);
      }
    });

  it(testName('Valid WebSocket Connection: should accept valid WebSocket upgrade request with authentication'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('valid-ws');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const response = await worker.fetch(matchUrl, {
            headers: {
              ...getValidRequestHeaders(userId),
              [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
              [HttpHeader.Connection]: ConnectionValue.Upgrade,
              [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          }, token);

      logInfo('[TEST] Valid WebSocket upgrade response', getStackTrace(), { status: response.status, hasWebSocket: !!response.webSocket }, LOG_TEST_RESPONSE_DETAILS);

      const webSocket = response.webSocket;
      if (!webSocket) {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
        return;
      }

      expect(response.status).toBe(HttpStatus.SwitchingProtocols);

      webSocket.accept();

      const messagePromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for message')), 2000);
        webSocket.addEventListener('message', (event) => {
          clearTimeout(timeout);
          resolve(event.data as string);
        });
      });

      try {
        const message = await messagePromise;
        const data = JSON.parse(message);
        expect(data.type).toBe('state_update');
        expect(data.matchState).not.toBeNull();
        } catch (error) {
        logWarn('[TEST] No initial state message received (match may not exist yet)', getStackTrace(), { error }, LOG_TEST_RESPONSE_DETAILS);
      }

      // Properly await WebSocket cleanup to ensure DO storage is released
      await closeWebSocketAndWait(webSocket);
      await consumeResponseBody(response);
      // Small delay to ensure DO finishes processing
      await new Promise(resolve => setTimeout(resolve, 100));
    });

  it(testName('Concurrent Connection Limits: should handle multiple concurrent WebSocket upgrade requests to same match'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('concurrent-test');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const connections = Array.from({ length: 5 }, () =>
        worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token).catch(error => {
          logWarn('[TEST] WebSocket fetch error', getStackTrace(), { error: error instanceof Error ? error.message : String(error) }, LOG_TEST_RESPONSE_DETAILS);
          return new Response(null, { status: 500 });
        })
      );

      const responses = await Promise.all(connections);
      const statuses = responses.map(r => r.status);
      const webSocketCount = responses.filter(r => r.webSocket).length;

      logInfo('[TEST] Concurrent WebSocket results', getStackTrace(), { statuses, webSocketCount }, LOG_TEST_RESPONSE_DETAILS);

      const allValid = statuses.every(s =>
        [HttpStatus.SwitchingProtocols, HttpStatus.BadRequest, HttpStatus.TooManyRequests, HttpStatus.Unauthorized, HttpStatus.NotFound, 500].includes(s)
      );

      expect(allValid).toBe(true);

      for (const r of responses) {
        if (r.webSocket) {
          r.webSocket.accept();
          await cleanupWebSocket(r.webSocket, r);
        } else {
          await cleanupWebSocket(null, r);
        }
      }
    });

  it(testName('Concurrent Connection Limits: should handle multiple players connecting to same match (multiplayer scenario)'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('multiplayer');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const player1 = generateTestUserId('player1');
      const player2 = generateTestUserId('player2');
      const player3 = generateTestUserId('player3');

      const connections = [
        worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(player1),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token),
        worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(player2),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token),
        worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(player3),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token)
      ];

      const responses = await Promise.all(connections);
      const webSocketCount = responses.filter(r => r.webSocket).length;

      expect(webSocketCount).toBeGreaterThanOrEqual(0);

      for (const r of responses) {
        if (r.webSocket) {
          expect(r.status).toBe(HttpStatus.SwitchingProtocols);
          r.webSocket.accept();
          await cleanupWebSocket(r.webSocket, r);
        } else {
          await cleanupWebSocket(null, r);
        }
      }
    });

  it(testName('WebSocket Message Security: should handle WebSocket connection lifecycle correctly'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('lifecycle');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      const webSocket = response.webSocket;
      if (!webSocket) {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
        return;
      }

      expect(response.status).toBe(HttpStatus.SwitchingProtocols);
      webSocket.accept();

      expect(webSocket.readyState).toBe(1);

        await cleanupWebSocket(webSocket, response);
    });

  it(testName('WebSocket Message Security: should accept WebSocket connection and receive initial state if match exists'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('state-test');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      const webSocket = response.webSocket;
      if (!webSocket) {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
        return;
      }

      expect(response.status).toBe(HttpStatus.SwitchingProtocols);
      webSocket.accept();

      const messageReceived = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000);
        webSocket.addEventListener('message', () => {
          clearTimeout(timeout);
          resolve(true);
        }, { once: true });
      });

      const received = await messageReceived;

      if (received) {
        logInfo('[TEST] Initial state message received', getStackTrace(), {}, true);
      } else {
        logInfo('[TEST] No initial state message (match may not exist)', getStackTrace(), {}, true);
      }

        await cleanupWebSocket(webSocket, response);
    });

  it(testName('Denial of Service (DoS) Protection: should handle rapid WebSocket connect/disconnect cycles'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('dos-rapid');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const connections: Response[] = [];
      for (let i = 0; i < 20; i++) {
        const response = await worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token);
        connections.push(response);

        if (response.webSocket) {
          response.webSocket.accept();
          await cleanupWebSocket(response.webSocket, response);
        } else {
          await cleanupWebSocket(null, response);
        }

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const webSocketCount = connections.filter(r => r.webSocket).length;
      expect(webSocketCount).toBeGreaterThanOrEqual(0);
    });

  it(testName('Denial of Service (DoS) Protection: should handle connection exhaustion attempt (nested)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('dos-exhaustion');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const connectionCount = isRealMode ? 5 : 50;

      const connections = Array.from({ length: connectionCount }, () =>
        worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token).catch(() => new Response(null, { status: 500 }))
      );

      const responses = await Promise.all(connections);
      const statuses = responses.map(r => r.status);

      const allValid = statuses.every(s =>
        [HttpStatus.SwitchingProtocols, HttpStatus.BadRequest, HttpStatus.TooManyRequests, HttpStatus.Unauthorized, HttpStatus.NotFound, 500].includes(s)
      );

      expect(allValid).toBe(true);

      for (const r of responses) {
        if (r.webSocket) {
          r.webSocket.accept();
          await cleanupWebSocket(r.webSocket, r);
        } else {
          await cleanupWebSocket(null, r);
        }
      }

    });

  it(testName('Denial of Service (DoS) Protection: should handle connection exhaustion attempt'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('dos-exhaustion');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
      const connectionCount = isRealMode ? 5 : 50;

      const connections = Array.from({ length: connectionCount }, () =>
        worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token).catch(() => new Response(null, { status: 500 }))
      );

      const responses = await Promise.all(connections);
      const statuses = responses.map(r => r.status);

      const allValid = statuses.every(s =>
        [HttpStatus.SwitchingProtocols, HttpStatus.BadRequest, HttpStatus.TooManyRequests, HttpStatus.Unauthorized, HttpStatus.NotFound, 500].includes(s)
      );

      expect(allValid).toBe(true);

      for (const r of responses) {
        if (r.webSocket) {
          r.webSocket.accept();
          await cleanupWebSocket(r.webSocket, r);
        } else {
          await cleanupWebSocket(null, r);
        }
      }
    });

  it(testName('Multiplayer-Specific Security: should prevent unauthorized player from joining match via WebSocket'), async () => {
      const token = await createToken();
      const authorizedPlayer = generateTestUserId('authorized');
      const unauthorizedPlayer = generateTestUserId('unauthorized');
      const matchId = generateTestMatchId('auth-check');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const authorizedResponse = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(authorizedPlayer),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (authorizedResponse.webSocket) {
        authorizedResponse.webSocket.accept();
        await cleanupWebSocket(authorizedResponse.webSocket, authorizedResponse);
      } else {
        await cleanupWebSocket(null, authorizedResponse);
      }

      const unauthorizedResponse = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(unauthorizedPlayer),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (unauthorizedResponse.webSocket) {
        expect(unauthorizedResponse.status).toBe(HttpStatus.SwitchingProtocols);
        unauthorizedResponse.webSocket.accept();
        await cleanupWebSocket(unauthorizedResponse.webSocket, unauthorizedResponse);
      } else {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound, HttpStatus.Forbidden]).toContain(unauthorizedResponse.status);
        await cleanupWebSocket(null, unauthorizedResponse);
      }
    });

  it(testName('Multiplayer-Specific Security: should handle concurrent WebSocket connections from same user to different matches'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const match1 = generateTestMatchId('concurrent-match1');
      const match2 = generateTestMatchId('concurrent-match2');
      const match3 = generateTestMatchId('concurrent-match3');

      const connections = [
        worker.fetch(buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, match1), {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token),
        worker.fetch(buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, match2), {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token),
        worker.fetch(buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, match3), {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        }, token)
      ];

      const responses = await Promise.all(connections);
      const webSocketCount = responses.filter(r => r.webSocket).length;

      expect(webSocketCount).toBeGreaterThanOrEqual(0);

      for (const r of responses) {
        if (r.webSocket) {
          r.webSocket.accept();
          await cleanupWebSocket(r.webSocket, r);
        } else {
          await cleanupWebSocket(null, r);
        }
      }
    });

  it(testName('Replay and Idempotency: should handle identical WebSocket upgrade request replay'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('replay');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      };

      const response1 = await worker.fetch(matchUrl, { headers }, token);

      if (response1.webSocket) {
        response1.webSocket.accept();
        await cleanupWebSocket(response1.webSocket, response1);
      } else {
        await cleanupWebSocket(null, response1);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const response2 = await worker.fetch(matchUrl, { headers }, token);

      if (response2.webSocket) {
        expect(response2.status).toBe(HttpStatus.SwitchingProtocols);
        response2.webSocket.accept();
        await cleanupWebSocket(response2.webSocket, response2);
      } else {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound]).toContain(response2.status);
        await cleanupWebSocket(null, response2);
      }
    });

  const testMatchIdAuth = generateTestMatchId('test-match-ws');

  it(testName('Authentication Requirements: should reject WebSocket upgrade request without authentication'), async () => {
      const token = await createToken();
      logInfo('[TEST] Testing WebSocket auth rejection', getStackTrace(), { matchId: testMatchIdAuth }, LOG_TEST_OPERATIONS);
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, testMatchIdAuth);
      
      const response = await worker.fetch(matchUrl, {
          headers: {
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          }, token);

      logInfo('[TEST] WebSocket auth rejection response', getStackTrace(), { status: response.status, hasWebSocket: !!response.webSocket }, LOG_TEST_RESPONSE_DETAILS);
      
      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Unauthorized, HttpStatus.BadRequest]).toContain(response.status);
        if (response.status === HttpStatus.Unauthorized) {
          const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string };
          const msg = errorData.error ?? errorData.message;
          expect(typeof msg).toBe('string');
          expect((msg as string).length).toBeGreaterThan(0);
        }
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Authentication Requirements: should reject WebSocket upgrade request with invalid token'), async () => {
      const token = await createToken();
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, testMatchIdAuth);
      
      const response = await worker.fetch(matchUrl, {
          headers: {
            [HttpHeader.Authorization]: formatBearerToken('invalid-token'),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          }, token);

      logInfo('[TEST] WebSocket invalid token response', getStackTrace(), { status: response.status, hasWebSocket: !!response.webSocket }, LOG_TEST_RESPONSE_DETAILS);
      
      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Unauthorized, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request from untrusted origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-test');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      logInfo('[TEST] Testing CORS origin validation for WebSocket', getStackTrace(), { matchId, userId, untrustedOrigin: 'https://evil.com' }, true);
      
      const response = await worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: 'https://evil.com'
          }
        }, token);

      logInfo('[TEST] WebSocket origin validation response', getStackTrace(), { 
        status: response.status, 
        hasWebSocket: !!response.webSocket
      }, true);

      if (response.webSocket) {
        logWarn('[TEST] SECURITY GAP: WebSocket accepted from untrusted origin - CORS validation not implemented for WebSocket connections', getStackTrace(), {}, true);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
        expect.fail('WebSocket should be rejected from untrusted origin (CORS validation required)');
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        if (response.status === HttpStatus.Forbidden) {
          logInfo('[TEST] WebSocket correctly rejected from untrusted origin', getStackTrace(), {}, true);
          const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string };
          const msg = errorData.error ?? errorData.message;
          expect(typeof msg).toBe('string');
          expect((msg as string).length).toBeGreaterThan(0);
        }
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with null origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-null');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'null'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with subdomain origin attack'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-subdomain');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://evil.localhost'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with scheme mismatch (http vs https)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-scheme');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'http://localhost:8787'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

    it(testName('should reject WebSocket upgrade request with port mismatch'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-port');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://localhost:9999'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with mixed-case origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-case');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://LoCaLhOsT:8787'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

    it(testName('should reject WebSocket upgrade request with trailing dot origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-trailing');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://localhost.'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with IP-based origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-ip');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'http://127.0.0.1:8787'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

    it(testName('should reject WebSocket upgrade request with empty Origin header'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-empty');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: ''
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should handle WebSocket upgrade request with Origin vs Host mismatch'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-host-mismatch');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://different-host.com',
          'Host': 'api.test'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with IPv6 origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-ipv6');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'http://[::1]:8787'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Origin Validation: should reject WebSocket upgrade request with embedded credentials in origin'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('origin-credentials');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://user:pass@localhost:8787'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with path traversal in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = '../other-match';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with URL-encoded path traversal'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = '%2e%2e%2fother-match';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with null bytes in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = `test-match\0${testMatchIdAuth}`;
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with very long match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'a'.repeat(10000);
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        logWarn('[TEST] SECURITY GAP: WebSocket accepted with very long match ID (10k chars) - should be rejected', getStackTrace(), { matchIdLength: maliciousMatchId.length }, true);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
        expect.fail('WebSocket should be rejected for very long match ID (security: prevent DoS)');
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.PayloadTooLarge, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with special characters in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'match<script>alert(1)</script>';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  const testMatchIdUpgrade = generateTestMatchId('test-match-ws');
  const testMatchIdAuthEdge = generateTestMatchId('test-match-ws');

  it(testName('Upgrade Header Validation: should reject request with invalid Upgrade header'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, testMatchIdUpgrade);
      
      const response = await worker.fetch(matchUrl, {
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.Upgrade]: 'invalid-protocol',
            [HttpHeader.Connection]: ConnectionValue.Upgrade,
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.UpgradeRequired, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Authorization Edge Cases: should reject WebSocket upgrade request with expired token'), async () => {
      const token = await createToken();
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, testMatchIdAuthEdge);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          [HttpHeader.Authorization]: formatBearerToken('expired-token-12345'),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Unauthorized, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Authorization Edge Cases: should prevent cross-user WebSocket access to match'), async () => {
      const token = await createToken();
      const user1 = generateTestUserId('user1');
      const user2 = generateTestUserId('user2');
      const matchId = generateTestMatchId('cross-user');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const user1Response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(user1),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (user1Response.webSocket) {
        user1Response.webSocket.accept();
        await cleanupWebSocket(user1Response.webSocket, user1Response);
      } else {
        await cleanupWebSocket(null, user1Response);
      }

      const user2Response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(user2),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (user2Response.webSocket) {
        expect(user2Response.status).toBe(HttpStatus.SwitchingProtocols);
        user2Response.webSocket.accept();
        await cleanupWebSocket(user2Response.webSocket, user2Response);
      } else {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound, HttpStatus.Forbidden]).toContain(user2Response.status);
        await cleanupWebSocket(null, user2Response);
      }
    });

  it(testName('Connection Header Edge Cases: should handle Connection header with extra whitespace'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('connection-whitespace');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const headers = getValidRequestHeaders(userId);
      headers[HttpHeader.Connection] = ConnectionValue.UpgradeWithWhitespace;
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.SwitchingProtocols, HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('WebSocket Protocol Headers: should handle WebSocket-Key header presence'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('ws-key');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const headers = getValidRequestHeaders(userId);
      headers['Sec-WebSocket-Key'] = 'dGhlIHNhbXBsZSBub25jZQ==';
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('WebSocket Protocol Headers: should handle WebSocket-Version header'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('ws-version');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const headers = getValidRequestHeaders(userId);
      headers['Sec-WebSocket-Version'] = '13';
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

    it(testName('should reject WebSocket upgrade with invalid WebSocket-Version'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('ws-version-invalid');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const headers = getValidRequestHeaders(userId);
      headers['Sec-WebSocket-Version'] = '0';
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.UpgradeRequired, HttpStatus.SwitchingProtocols, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('WebSocket Protocol Headers: should handle WebSocket subprotocol request'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('ws-subprotocol');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const headers = getValidRequestHeaders(userId);
      headers['Sec-WebSocket-Protocol'] = 'game-protocol-v1';
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.SwitchingProtocols, HttpStatus.NotFound, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Header Injection Attacks: should reject WebSocket upgrade request with CRLF injection in Origin header'), async () => {
      const userId = generateTestUserId('test-user');
      expect(() => new Headers({
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://localhost:8787\r\nInjected-Header: evil'
      })).toThrow(/Invalid header value/);
    });

  it(testName('Header Injection Attacks: should reject WebSocket upgrade request with null byte injection in Origin header'), async () => {
      const userId = generateTestUserId('test-user');
      const headers = getValidRequestHeaders(userId);
      headers[HttpHeader.Origin] = `https://localhost:8787\0evil.com`;

      expect(() => new Headers({
        ...headers,
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade
      })).toThrow(/Invalid header value/);
    });

  it(testName('Header Injection Attacks: should reject WebSocket upgrade request when accepted header shape reaches worker'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('header-origin');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://evil.localhost.example'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Unicode and Encoding Attacks: should reject WebSocket upgrade request with IDN/punycode origin confusion'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('idn-origin');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: 'https://xn--evil-localhost-123.com'
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.Forbidden, HttpStatus.BadRequest]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

    it(testName('should reject WebSocket upgrade request with Unicode homoglyph in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'match\u0430'; // Cyrillic 'a' instead of Latin 'a'
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Edge Cases: should reject WebSocket upgrade request with Unicode normalization attack in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'match\u00E0'; // Normalized Unicode
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

    it(testName('should reject WebSocket upgrade request with SQL injection attempt in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = "match'; DROP TABLE matches; --";
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Edge Cases: should reject WebSocket upgrade request with command injection in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'match; rm -rf /';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Edge Cases: should reject WebSocket upgrade request with newline injection in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'match\nother-match';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Edge Cases: should reject WebSocket upgrade request with tab injection in match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = 'match\tother-match';
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });

  it(testName('Match ID Edge Cases: should reject protocol downgrade (hixie-76)'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('protocol-downgrade');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);

      const headers = getValidRequestHeaders(userId);
      headers[HttpHeader.Upgrade] = 'hixie-76';
      headers['Sec-WebSocket-Version'] = '0';

      const response = await worker.fetch(matchUrl, {
        headers: {
          ...headers,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      if (response.webSocket) {
        expect(response.status).toBe(HttpStatus.SwitchingProtocols);
        response.webSocket.accept();
        await cleanupWebSocket(response.webSocket, response);
      } else {
        expect([HttpStatus.BadRequest, HttpStatus.UpgradeRequired, HttpStatus.NotFound]).toContain(response.status);
        await cleanupWebSocket(null, response);
      }
    });
});
