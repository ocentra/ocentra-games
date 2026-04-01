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

  it(testName('Match WS AI Dump: rejects upgrade for non-participant sender'), async () => {
    const token = await createToken();
    const participant = generateTestUserId('ws-ai-dump-participant');
    const outsider = generateTestUserId('ws-ai-dump-outsider');
    const matchId = generateTestMatchId('ws-ai-dump-non-participant');
    await createMatchWithPlayers(worker, token, matchId, [participant]);

    const upgradeResponse = await worker.fetch(buildTestMatchApiUrl(matchId, ''), {
      headers: {
        ...getValidRequestHeaders(outsider),
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);

    expect(upgradeResponse.status).toBe(HttpStatus.Forbidden);
    await consumeResponseBody(upgradeResponse);
  });

  it(testName('Match WS AI Dump: rejects oversized ai_dump payload'), async () => {
    const token = await createToken();
    const participant = generateTestUserId('ws-ai-dump-oversized');
    const matchId = generateTestMatchId('ws-ai-dump-oversized');
    await createMatchWithPlayers(worker, token, matchId, [participant]);

    const ws = await openSocket(worker, token, matchId, participant);
    try {
      ws.send(JSON.stringify({
        type: MatchWSMessageType.AiDump,
        matchId,
        decisions: [{ large: 'x'.repeat((1024 * 1024) + 256) }],
      }));
      const errorPayload = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
      expect(errorPayload.message).toBe('AI dump payload too large');
    } finally {
      await closeSocket(ws);
    }
  });

  it(testName('Match WS AI Dump: stores ai_dump and serves it through GET ai-decisions after finalize'), async () => {
    const token = await createToken();
    const participant = generateTestUserId('ws-ai-dump-store');
    const matchId = generateTestMatchId('ws-ai-dump-store');
    await createMatchWithPlayers(worker, token, matchId, [participant]);

    const ws = await openSocket(worker, token, matchId, participant);
    try {
      const decisions = [
        { step: 1, reasoning: 'test decision', confidence: 0.9, sequenceNumber: 1 },
        { step: 2, reasoning: 'follow-up decision', confidence: 0.8, sequenceNumber: 2 },
      ];
      ws.send(JSON.stringify({
        type: MatchWSMessageType.AiDump,
        matchId,
        decisions,
      }));
      await new Promise(resolve => setTimeout(resolve, 200));

      ws.send(JSON.stringify({
        type: MatchWSMessageType.Finalize,
        matchId,
        scores: [100],
        winner: participant,
      }));
      const closed = await waitForSocketClose(ws, 6000);
      expect(closed).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await worker.fetch(buildTestMatchApiUrl(matchId, '/ai-decisions'), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(participant),
      }, token);
      expect(response.status).toBe(HttpStatus.Ok);
      const payload = await response.json() as { decisions?: Array<{ decisions?: unknown[] }> };
      expect(Array.isArray(payload.decisions)).toBe(true);
      expect((payload.decisions || []).length).toBeGreaterThan(0);
      const storedAggregate = payload.decisions?.find((entry) => Array.isArray(entry.decisions));
      expect(storedAggregate).toBeTruthy();
      expect((storedAggregate?.decisions || []).length).toBe(2);
    } finally {
      await closeSocket(ws);
    }
  });
});
