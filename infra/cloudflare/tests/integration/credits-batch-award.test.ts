import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
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
  timeoutMs: number = TestTimeout.WebSocketMessage
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

async function createMatch(
  worker: TestWorker,
  token: SetupContextToken,
  matchId: MatchId,
  ownerId: string
): Promise<void> {
  const createResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/create'), {
    method: HttpMethod.Post,
    headers: {
      ...getValidRequestHeaders(ownerId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({ gameName: 'CLAIM', gameType: 0 }),
  }, token);
  expect(createResponse.status).toBe(HttpStatus.Ok);
  await consumeResponseBody(createResponse);
}

async function joinMatch(
  worker: TestWorker,
  token: SetupContextToken,
  matchId: MatchId,
  authUserId: string,
  playerPubkey: unknown
): Promise<void> {
  const joinResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/join'), {
    method: HttpMethod.Post,
    headers: {
      ...getValidRequestHeaders(authUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({ playerPubkey }),
  }, token);
  expect(joinResponse.status).toBe(HttpStatus.Ok);
  await consumeResponseBody(joinResponse);
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

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
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

  it(testName('Credits Batch Award: awards all valid participants on finalize'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('batch-award-valid-1');
    const player2 = generateTestUserId('batch-award-valid-2');
    const matchId = generateTestMatchId('batch-award-valid');

    await createMatch(worker, token, matchId, player1);
    await joinMatch(worker, token, matchId, player1, player1);
    await joinMatch(worker, token, matchId, player2, player2);

    const initialBalance1 = await getBalance(worker, token, player1);
    const initialBalance2 = await getBalance(worker, token, player2);

    const ws = await openSocket(worker, token, matchId, player1);
    try {
      ws.send(JSON.stringify({
        type: 'finalize',
        matchId,
        scores: [100, 80],
        winner: player1,
      }));
      const closed = await waitForSocketClose(ws, TestTimeout.WebSocketMessageLong);
      expect(closed).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const finalBalance1 = await getBalance(worker, token, player1);
      const finalBalance2 = await getBalance(worker, token, player2);
      expect(finalBalance1).toBe(initialBalance1 + 25);
      expect(finalBalance2).toBe(initialBalance2 + 25);
    } finally {
      await closeSocket(ws);
    }
  });

  it(testName('Credits Batch Award: partial failure keeps valid awards and retry remains idempotent'), async () => {
    const token = await createToken();
    const player1 = generateTestUserId('batch-award-idem-1');
    const matchId = generateTestMatchId('batch-award-idem');

    await createMatch(worker, token, matchId, player1);
    await joinMatch(worker, token, matchId, player1, player1);
    await joinMatch(worker, token, matchId, player1, { malformed: true });

    const initialBalance = await getBalance(worker, token, player1);
    const ws = await openSocket(worker, token, matchId, player1);
    try {
      ws.send(JSON.stringify({
        type: 'finalize',
        matchId,
        scores: [100, 0],
        winner: player1,
      }));
      const firstError = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessageLong);
      expect(firstError.message).toBe('Failed to finalize match');
      await new Promise(resolve => setTimeout(resolve, 300));

      const afterFirstAttempt = await getBalance(worker, token, player1);
      expect(afterFirstAttempt).toBe(initialBalance + 25);

      ws.send(JSON.stringify({
        type: 'finalize',
        matchId,
        scores: [100, 0],
        winner: player1,
      }));
      const secondError = await waitForWebSocketMessageType(ws, MatchWSMessageType.Error, TestTimeout.WebSocketMessageLong);
      expect(secondError.message).toBe('Failed to finalize match');
      await new Promise(resolve => setTimeout(resolve, 300));

      const afterSecondAttempt = await getBalance(worker, token, player1);
      expect(afterSecondAttempt).toBe(afterFirstAttempt);

      const stateResponse = await worker.fetch(buildTestMatchApiUrl(matchId, '/state'), {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(player1),
      }, token);
      expect(stateResponse.status).toBe(HttpStatus.Ok);
      const statePayload = await stateResponse.json() as { phase?: number };
      expect(statePayload.phase).not.toBe(3);
    } finally {
      await closeSocket(ws);
    }
  });
});
