import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken, type SetupContextToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestMatchApiUrl,
  buildCreditsApiUrl,
  generateTestMatchId,
  generateTestUserId,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { TestValues, TestTimeout } from '@tests/constants/test-constants';
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

async function waitForSocketClose(ws: WebSocket, timeoutMs = 4000): Promise<boolean> {
  return await new Promise(resolve => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      resolve(true);
      return;
    }
    const timer = setTimeout(() => resolve(false), timeoutMs);
    ws.addEventListener('close', () => {
      clearTimeout(timer);
      resolve(true);
    }, { once: true });
  });
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

async function getBalance(worker: TestWorker, token: SetupContextToken, userId: string): Promise<number> {
  const response = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
    method: HttpMethod.Get,
    headers: getValidRequestHeaders(userId),
  }, token);
  expect(response.status).toBe(HttpStatus.Ok);
  const payload = await response.json() as { gp_balance: number };
  return payload.gp_balance;
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

  it(testName('Match WS Finalize: finalizes match, writes R2 record, awards GP, persists chat history, and closes sockets'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('ws-finalize-p1');
    const player2 = generateTestUserId('ws-finalize-p2');
    const matchId = generateTestMatchId('ws-finalize');
    await createMatchWithPlayers(worker, token, matchId, [player1, player2]);

    const initialBalance1 = await getBalance(worker, token, player1);
    const initialBalance2 = await getBalance(worker, token, player2);

    const ws1 = await openSocket(worker, token, matchId, player1);
    const ws2 = await openSocket(worker, token, matchId, player2);

    try {
      ws1.send(JSON.stringify({
        type: MatchWSMessageType.Chat,
        matchId,
        content: 'finalize-chat-line',
        senderType: 'human',
      }));
      await waitForWebSocketMessageType(ws2, MatchWSMessageType.ChatBroadcast, TestTimeout.WebSocketMessage);

      ws1.send(JSON.stringify({
        type: MatchWSMessageType.Finalize,
        matchId,
        scores: [150, 100],
        winner: player1,
        events: [{ type: 'test-finalize' }],
      }));

      const [closed1, closed2] = await Promise.all([
        waitForSocketClose(ws1, 6000),
        waitForSocketClose(ws2, 6000),
      ]);
      expect(closed1).toBe(true);
      expect(closed2).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 500));

      const stateResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/state'), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(player1),
      }, token);
      expect(stateResponse.status).toBe(HttpStatus.Ok);
      const statePayload = await stateResponse.json() as { phase?: number };
      expect(statePayload.phase).toBe(3);

      const matchResponse = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(player1),
      }, token);
      expect(matchResponse.status).toBe(HttpStatus.Ok);
      const matchPayload = await matchResponse.json() as {
        match_id?: string;
        matchId?: string;
        phase?: number;
        chatHistory?: unknown[];
      };
      expect(matchPayload.match_id || matchPayload.matchId).toBe(matchId);
      expect(matchPayload.phase).toBe(3);
      expect(Array.isArray(matchPayload.chatHistory)).toBe(true);
      expect((matchPayload.chatHistory || []).length).toBeGreaterThan(0);

      const finalBalance1 = await getBalance(worker, token, player1);
      const finalBalance2 = await getBalance(worker, token, player2);
      expect(finalBalance1).toBe(initialBalance1 + 25);
      expect(finalBalance2).toBe(initialBalance2 + 25);
    } finally {
      await closeSocket(ws1);
      await closeSocket(ws2);
    }
  });
});
