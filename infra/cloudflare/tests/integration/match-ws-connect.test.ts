import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken, type SetupContextToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestMatchApiUrl, generateTestMatchId, generateTestUserId, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { TestConfig, TestValues, TestTimeout } from '@tests/constants/test-constants';
import { Logger, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

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

async function createMatchWithPlayers(
  worker: TestWorker,
  token: SetupContextToken,
  matchId: MatchId,
  players: string[]
): Promise<void> {
  const createResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/create'), {
    method: HttpMethod.Post,
    headers: {
      ...getValidRequestHeaders(players[0]),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({ gameName: 'CLAIM', gameType: 0 }),
  }, token);
  expect(createResponse.status).toBe(HttpStatus.Ok);
  await consumeResponseBody(createResponse);

  for (const player of players) {
    const joinResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/join'), {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(player),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ playerPubkey: player }),
    }, token);
    expect(joinResponse.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(joinResponse);
  }
}

describe(extractName(import.meta.url), TestSuiteType.Websocket, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) {
      await worker.stop();
    }
  });

  it(testName('Match WS Connect: accepts valid connection and sends initial state_update'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('ws-connect-user');
    const matchId = generateTestMatchId('ws-connect');
    await createMatchWithPlayers(worker, token, matchId, [userId]);

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
      const message = await waitForWebSocketMessageType(ws, MatchWSMessageType.StateUpdate, TestTimeout.WebSocketMessage);
      expect(message.type).toBe('state_update');
      expect(message.matchId).toBe(matchId);
      const state = message.matchState as { players?: string[] };
      expect(Array.isArray(state.players)).toBe(true);
      expect(state.players).toContain(userId);
    } finally {
      await closeSocket(ws);
    }
  });

  it(testName('Match WS Connect: rejects invalid token on upgrade'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('ws-connect-invalid');
    const matchId = generateTestMatchId('ws-connect-invalid');
    await createMatchWithPlayers(worker, token, matchId, [userId]);

    const response = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
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

  it(testName('Match WS Connect: reconnect receives state_update with persisted participant state'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('ws-connect-reconnect');
    const matchId = generateTestMatchId('ws-connect-reconnect');
    await createMatchWithPlayers(worker, token, matchId, [userId]);

    const firstUpgrade = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);
    expect(firstUpgrade.status).toBe(HttpStatus.SwitchingProtocols);
    expect(firstUpgrade.webSocket).toBeTruthy();
    const ws1 = firstUpgrade.webSocket!;
    ws1.accept();
    try {
      const firstState = await waitForWebSocketMessageType(ws1, MatchWSMessageType.StateUpdate, TestTimeout.WebSocketMessage);
      const firstMatchState = firstState.matchState as { players?: string[] };
      expect(firstState.matchId).toBe(matchId);
      expect(Array.isArray(firstMatchState.players)).toBe(true);
      expect(firstMatchState.players).toContain(userId);
    } finally {
      await closeSocket(ws1);
    }

    const secondUpgrade = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);
    expect(secondUpgrade.status).toBe(HttpStatus.SwitchingProtocols);
    expect(secondUpgrade.webSocket).toBeTruthy();
    const ws2 = secondUpgrade.webSocket!;
    ws2.accept();
    try {
      const secondState = await waitForWebSocketMessageType(ws2, MatchWSMessageType.StateUpdate, TestTimeout.WebSocketMessage);
      const secondMatchState = secondState.matchState as { players?: string[] };
      expect(secondState.matchId).toBe(matchId);
      expect(Array.isArray(secondMatchState.players)).toBe(true);
      expect(secondMatchState.players).toContain(userId);
    } finally {
      await closeSocket(ws2);
    }
  });
});
