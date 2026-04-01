import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken, type SetupContextToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestMatchApiUrl, generateTestMatchId, generateTestUserId, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { TestValues, TestTimeout } from '@tests/constants/test-constants';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
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

async function openSocket(
  worker: TestWorker,
  token: SetupContextToken,
  matchId: MatchId,
  userId: string
): Promise<WebSocket> {
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
  await waitForWebSocketMessageType(ws, MatchWSMessageType.StateUpdate, TestTimeout.WebSocketMessage);
  return ws;
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

  it(testName('Match WS Hibernation: responds to ping after idle period'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('ws-hib-ping');
    const matchId = generateTestMatchId('ws-hib-ping');
    await createMatchWithPlayers(worker, token, matchId, [userId]);

    const ws = await openSocket(worker, token, matchId, userId);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      ws.send(JSON.stringify({
        type: MatchWSMessageType.Ping,
        matchId,
      }));
      const pong = await waitForWebSocketMessageType(ws, MatchWSMessageType.Pong, TestTimeout.WebSocketMessage);
      expect(pong.type).toBe(MatchWSMessageType.Pong);
      expect(pong.matchId).toBe(matchId);
      expect(typeof pong.timestamp).toBe('number');
    } finally {
      await closeSocket(ws);
    }
  });

  it(testName('Match WS Hibernation: preserves attachment identity after idle period'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('ws-hib-attachment');
    const spoofedUserId = generateTestUserId('ws-hib-spoof');
    const matchId = generateTestMatchId('ws-hib-attachment');
    await createMatchWithPlayers(worker, token, matchId, [userId]);

    const ws = await openSocket(worker, token, matchId, userId);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      ws.send(JSON.stringify({
        type: MatchWSMessageType.Move,
        matchId,
        userId: spoofedUserId,
        txSignature: `tx-${crypto.randomUUID()}`,
        move: { card: 'x' },
      }));
      const errorPayload = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
      expect(errorPayload.message).toBe(ErrorMessage.UserIdMismatch);
    } finally {
      await closeSocket(ws);
    }
  });
});
