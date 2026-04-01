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

  it(testName('Match WS Chat: broadcasts chat messages to connected participants'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('ws-chat-b1');
    const player2 = generateTestUserId('ws-chat-b2');
    const matchId = generateTestMatchId('ws-chat-broadcast');
    await createMatchWithPlayers(worker, token, matchId, [player1, player2]);

    const ws1 = await openSocket(worker, token, matchId, player1);
    const ws2 = await openSocket(worker, token, matchId, player2);

    try {
      ws1.send(JSON.stringify({
        type: MatchWSMessageType.Chat,
        matchId,
        content: 'hello table',
        senderType: 'human',
      }));
      const broadcast = await waitForWebSocketMessageType(ws2, MatchWSMessageType.ChatBroadcast, TestTimeout.WebSocketMessage);
      const message = broadcast.message as { senderId?: string; content?: string; channel?: string };
      expect(message.senderId).toBe(player1);
      expect(message.content).toBe('hello table');
      expect(message.channel).toBe('text');
    } finally {
      await closeSocket(ws1);
      await closeSocket(ws2);
    }
  });

  it(testName('Match WS Chat: enforces rate limiting for rapid messages'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('ws-chat-r1');
    const player2 = generateTestUserId('ws-chat-r2');
    const matchId = generateTestMatchId('ws-chat-rate');
    await createMatchWithPlayers(worker, token, matchId, [player1, player2]);

    const ws1 = await openSocket(worker, token, matchId, player1);
    const ws2 = await openSocket(worker, token, matchId, player2);

    try {
      ws1.send(JSON.stringify({
        type: MatchWSMessageType.Chat,
        matchId,
        content: 'first',
        senderType: 'human',
      }));
      await waitForWebSocketMessageType(ws2, MatchWSMessageType.ChatBroadcast, TestTimeout.WebSocketMessage);

      ws1.send(JSON.stringify({
        type: MatchWSMessageType.Chat,
        matchId,
        content: 'second-too-fast',
        senderType: 'human',
      }));
      const errorPayload = await waitForWebSocketMessageType(ws1, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
      expect(errorPayload.message).toBe('Rate limited');
    } finally {
      await closeSocket(ws1);
      await closeSocket(ws2);
    }
  });

  it(testName('Match WS Chat: filters blocked terms in broadcast content'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('ws-chat-f1');
    const player2 = generateTestUserId('ws-chat-f2');
    const matchId = generateTestMatchId('ws-chat-filter');
    await createMatchWithPlayers(worker, token, matchId, [player1, player2]);

    const ws1 = await openSocket(worker, token, matchId, player1);
    const ws2 = await openSocket(worker, token, matchId, player2);

    try {
      ws1.send(JSON.stringify({
        type: MatchWSMessageType.Chat,
        matchId,
        content: 'badword spam',
        senderType: 'human',
      }));
      const broadcast = await waitForWebSocketMessageType(ws2, MatchWSMessageType.ChatBroadcast, TestTimeout.WebSocketMessage);
      const message = broadcast.message as { content?: string };
      expect(typeof message.content).toBe('string');
      expect(message.content).toContain('[filtered]');
    } finally {
      await closeSocket(ws1);
      await closeSocket(ws2);
    }
  });

  it(testName('Match WS Chat: relays voice_text messages on voice channel'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('ws-chat-v1');
    const player2 = generateTestUserId('ws-chat-v2');
    const matchId = generateTestMatchId('ws-chat-voice');
    await createMatchWithPlayers(worker, token, matchId, [player1, player2]);

    const ws1 = await openSocket(worker, token, matchId, player1);
    const ws2 = await openSocket(worker, token, matchId, player2);

    try {
      ws1.send(JSON.stringify({
        type: MatchWSMessageType.VoiceText,
        matchId,
        content: 'voice relay line',
        senderType: 'human',
        channel: 'voice',
      }));
      const broadcast = await waitForWebSocketMessageType(ws2, MatchWSMessageType.ChatBroadcast, TestTimeout.WebSocketMessage);
      const message = broadcast.message as { senderId?: string; content?: string; channel?: string };
      expect(message.senderId).toBe(player1);
      expect(message.content).toBe('voice relay line');
      expect(message.channel).toBe('voice');
    } finally {
      await closeSocket(ws1);
      await closeSocket(ws2);
    }
  });
});
