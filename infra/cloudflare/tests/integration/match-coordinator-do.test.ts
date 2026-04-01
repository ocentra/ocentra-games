import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { MatchCoordinatorDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { MatchWSMessageType } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { TestConfig, TestValues, TestTimeout } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

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
          void 0;
        }
      }
    }
  }
}

async function waitForMessage(ws: WebSocket, timeoutMs = 3000): Promise<Record<string, unknown>> {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      clearTimeout(timer);
      ws.removeEventListener('message', onMessage as EventListener);
      try {
        const payload = JSON.parse(String(event.data)) as Record<string, unknown>;
        resolve(payload);
      } catch (error) {
        reject(error);
      }
    };

    ws.addEventListener('message', onMessage as EventListener);
  });
}

async function waitForMessageType(
  ws: WebSocket,
  type: string,
  timeoutMs = TestTimeout.WebSocketMessage
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const payload = await waitForMessage(ws, remaining);
    if (payload.type === type) {
      return payload;
    }
  }
  throw new Error(`Timed out waiting for message type=${type}`);
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
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  const baseUrl = TestConfig.TestApiUrlPlaceholder;
  const headers = () => getValidRequestHeaders(TestConfig.TestUserId);

  it(testName('MatchCoordinatorDO POST create: returns 200 with success and matchState'), async () => {
    const token = await createToken();
    const matchId = crypto.randomUUID();
    const path = `${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.Create}`;
    const url = buildApiUrl(path, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...headers(),
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ gameName: 'claim', gameType: 0 }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { success?: boolean; matchState?: { matchId?: string; phase?: number } };
    expect(data.success).toBe(true);
    expect(data.matchState).not.toBeUndefined();
    expect(typeof data.matchState?.matchId).toBe('string');
    expect(data.matchState?.matchId).toBe(matchId);
    expect(typeof data.matchState?.phase).toBe('number');
  });

  it(testName('MatchCoordinatorDO GET state: returns 200 with state shape after create'), async () => {
    const token = await createToken();
    const matchId = crypto.randomUUID();
    const createPath = `${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.Create}`;
    const createUrl = buildApiUrl(createPath, { baseUrl });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...headers(),
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({}),
    }, token);
    expect(createRes.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(createRes);

    const statePath = `${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.State}`;
    const stateUrl = buildApiUrl(statePath, { baseUrl });
    const stateRes = await worker.fetch(stateUrl, {
      method: HttpMethod.Get,
      headers: headers(),
    }, token);
    expect(stateRes.status).toBe(HttpStatus.Ok);
    const state = (await stateRes.json()) as { matchId?: string; phase?: number; players?: unknown[] };
    expect(state.matchId).toBe(matchId);
    expect(typeof state.phase).toBe('number');
    expect(Array.isArray(state.players)).toBe(true);
    await consumeResponseBody(stateRes);
  });

  it(testName('MatchCoordinatorDO GET state: returns 404 for non-existent match'), async () => {
    const token = await createToken();
    const matchId = crypto.randomUUID();
    const statePath = `${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.State}`;
    const stateUrl = buildApiUrl(statePath, { baseUrl });
    const stateRes = await worker.fetch(stateUrl, {
      method: HttpMethod.Get,
      headers: headers(),
    }, token);
    expect(stateRes.status).toBe(HttpStatus.NotFound);
    await consumeResponseBody(stateRes);
  });

  it(testName('MatchCoordinatorDO POST create: returns 401 when authentication is missing'), async () => {
    const token = await createToken();
    const matchId = crypto.randomUUID();
    const path = `${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.Create}`;
    const url = buildApiUrl(path, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({}),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await consumeResponseBody(response);
  });

  it(testName('MatchCoordinatorDO WebSocket: rejects unauthenticated upgrade request'), async () => {
    const token = await createToken();
    const matchId = crypto.randomUUID();
    const wsPath = `${ApiEndpoint.Matches.Base}/${matchId}`;
    const wsUrl = buildApiUrl(wsPath, { baseUrl });
    const response = await worker.fetch(wsUrl, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await consumeResponseBody(response);
  });

  it(testName('MatchCoordinatorDO WebSocket: broadcasts state_update and rejects move when match is not playing'), async () => {
    const token = await createToken();
    const matchId = crypto.randomUUID();
    const player1 = 'ws-player-1';
    const player2 = 'ws-player-2';

    const createUrl = buildApiUrl(`${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.Create}`, { baseUrl });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(player1),
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ gameName: 'claim', gameType: 0 }),
    }, token);
    expect(createRes.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(createRes);

    const joinUrl = buildApiUrl(`${ApiEndpoint.Matches.Base}/${matchId}/${MatchCoordinatorDOSegment.Join}`, { baseUrl });
    const join1 = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(player1),
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ playerPubkey: player1 }),
    }, token);
    expect(join1.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(join1);

    const join2 = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(player2),
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ playerPubkey: player2 }),
    }, token);
    expect(join2.status).toBe(HttpStatus.Ok);
    await consumeResponseBody(join2);

    const wsUrl = buildApiUrl(`${ApiEndpoint.Matches.Base}/${matchId}`, { baseUrl });
    const ws1Res = await worker.fetch(wsUrl, {
      headers: {
        ...getValidRequestHeaders(player1),
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);
    const ws2Res = await worker.fetch(wsUrl, {
      headers: {
        ...getValidRequestHeaders(player2),
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);

    expect(ws1Res.status).toBe(HttpStatus.SwitchingProtocols);
    expect(ws2Res.status).toBe(HttpStatus.SwitchingProtocols);
    expect(ws1Res.webSocket).toBeTruthy();
    expect(ws2Res.webSocket).toBeTruthy();
    await ws1Res.text().catch(() => undefined);
    await ws2Res.text().catch(() => undefined);

    const ws1 = ws1Res.webSocket!;
    const ws2 = ws2Res.webSocket!;
    ws1.accept();
    ws2.accept();

    try {
      ws1.send(JSON.stringify({
        type: 'sync',
        matchId,
        onChainState: {
          moveCount: 0,
          currentPlayer: 0,
          phase: 0,
        },
      }));

      const broadcast = await waitForMessageType(ws2, MatchWSMessageType.StateUpdate, TestTimeout.WebSocketMessage);
      expect(broadcast.type).toBe('state_update');
      expect(broadcast.matchId).toBe(matchId);

      ws1.send(JSON.stringify({
        type: 'move',
        matchId,
        txSignature: `tx-${crypto.randomUUID()}`,
        move: { card: 'x' },
      }));

      const moveError = await waitForMessageType(ws1, MatchWSMessageType.Error, TestTimeout.WebSocketMessage);
      expect(moveError.type).toBe(MatchWSMessageType.Error);
      expect(moveError.message).toBe('Match not in playing phase');
    } finally {
      await closeSocket(ws1);
      await closeSocket(ws2);
    }
  });
});
