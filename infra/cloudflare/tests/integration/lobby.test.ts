import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl, buildApiUrlWithQueryParams } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiExampleValue } from '@ocentra/endpoint-domain/constants/openapi-examples';
import { HttpMethod, HttpStatus, HttpHeader, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { TestConfig, TestTimeout, TestValues } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logDebug(message, stackTrace, data, enabled);
};

type LobbyRoomView = {
  roomId: string;
  currentPlayers?: number;
  currentSpectators?: number;
  gameStatus?: string;
  status?: string;
  mode?: string;
  visibility?: string;
  allowAI?: boolean;
  aiCount?: number;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: string;
  aiRole?: string;
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: string;
  stakeType?: string;
  stakeStatus?: string;
  chainStatus?: string;
  joinCode?: string;
  matchId?: string;
  players?: Array<{
    userId: string;
    isReady?: boolean;
    isAI?: boolean;
    aiProviderId?: string;
    aiModelId?: string;
    difficulty?: string;
    role?: string;
  }>;
};

type LobbyActionResponse = {
  roomId?: string;
  joined?: boolean;
  created?: boolean;
  ready?: boolean;
  started?: boolean;
  matchId?: string;
  nextCursor?: string | null;
  limit?: number;
  scope?: string;
  rooms?: LobbyRoomView[];
  room?: LobbyRoomView;
  handoff?: {
    roomId?: string;
    matchId?: string;
    gameType?: string;
    status?: string;
  };
};

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

    if (payload.type === type) return payload;
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
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker?.stop) await worker.stop();
  });

  const baseUrl = TestConfig.TestApiUrlPlaceholder;
  const headers = () => getValidRequestHeaders(TestConfig.TestUserId);
  const jsonHeaders = () => ({ ...headers(), [HttpHeader.ContentType]: 'application/json' });
  const gameScopedUrl = (endpoint: string, gameType: string) => buildApiUrlWithQueryParams(endpoint, { [QueryParam.GameType]: gameType }, { baseUrl });
  const createLobbyRoom = async (token: ReturnType<typeof getTokenForFetch>, overrides: Record<string, unknown>): Promise<LobbyActionResponse> => {
    const response = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyCreateRequest, roomId: crypto.randomUUID(), ...overrides }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    return await response.json() as LobbyActionResponse;
  };
  const joinLobbyRoom = async (
    token: ReturnType<typeof getTokenForFetch>,
    roomId: string,
    gameType: string,
    userId: string,
    displayName = userId
  ): Promise<LobbyActionResponse> => {
    const response = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Join(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyJoinRequest, userId, displayName }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    return await response.json() as LobbyActionResponse;
  };

  it(testName('Lobby quick join: creates game-scoped table and reuses it for compatible players'), async () => {
    const token = getTokenForFetch();
    const gameType = `claim-quick-${crypto.randomUUID().slice(0, 8)}`;
    const url = buildApiUrl(ApiEndpoint.Rooms.QuickJoin, { baseUrl });
    const firstRes = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({
        ...OpenApiExampleValue.LobbyQuickJoinRequest,
        userId: 'quick-player-a',
        displayName: 'Quick Player A',
        gameType,
        mode: 'casual',
        allowAI: false,
        maxPlayers: 4,
        createIfMissing: true,
      }),
    }, token);
    expect(firstRes.status).toBe(HttpStatus.Ok);
    const firstData = (await firstRes.json()) as { roomId?: string; joined?: boolean; created?: boolean; room?: { currentPlayers?: number } };
    expect(firstData.created).toBe(true);
    expect(firstData.joined).toBe(true);
    expect(typeof firstData.roomId).toBe('string');

    const secondRes = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({
        ...OpenApiExampleValue.LobbyQuickJoinRequest,
        userId: 'quick-player-b',
        displayName: 'Quick Player B',
        gameType,
        mode: 'casual',
        allowAI: false,
        maxPlayers: 4,
        createIfMissing: true,
      }),
    }, token);
    expect(secondRes.status).toBe(HttpStatus.Ok);
    const secondData = (await secondRes.json()) as { roomId?: string; joined?: boolean; created?: boolean; room?: { currentPlayers?: number } };
    expect(secondData.created).toBe(false);
    expect(secondData.joined).toBe(true);
    expect(secondData.roomId).toBe(firstData.roomId);
    expect(secondData.room?.currentPlayers).toBe(2);

    const listRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Base, gameType), {
      method: HttpMethod.Get,
      headers: headers(),
    }, token);
    expect(listRes.status).toBe(HttpStatus.Ok);
    const listData = (await listRes.json()) as { rooms?: Array<{ roomId?: string; currentPlayers?: number }> };
    const room = listData.rooms?.find(item => item.roomId === firstData.roomId);
    expect(room?.currentPlayers).toBe(2);
  });

  it(testName('Lobby GET rooms: returns 200 and rooms array'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: headers(),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { rooms?: unknown[] };
    expect(Array.isArray(data.rooms)).toBe(true);
  });

  it(testName('Lobby GET rooms: is game-scoped, capped, sorted, and cursorable'), async () => {
    const token = getTokenForFetch();
    const gameType = `claim-list-${crypto.randomUUID().slice(0, 8)}`;
    const otherGameType = `claim-other-${crypto.randomUUID().slice(0, 8)}`;
    const hostA = `host-list-a-${crypto.randomUUID().slice(0, 8)}`;
    const hostB = `host-list-b-${crypto.randomUUID().slice(0, 8)}`;
    const hostC = `host-list-c-${crypto.randomUUID().slice(0, 8)}`;
    const otherHost = `host-list-x-${crypto.randomUUID().slice(0, 8)}`;

    const roomA = await createLobbyRoom(token, { hostId: hostA, gameType, roomName: 'List A', maxPlayers: 4, allowAI: false, aiCount: 0 });
    const roomB = await createLobbyRoom(token, { hostId: hostB, gameType, roomName: 'List B', maxPlayers: 4, allowAI: false, aiCount: 0 });
    const roomC = await createLobbyRoom(token, { hostId: hostC, gameType, roomName: 'List C', maxPlayers: 4, allowAI: false, aiCount: 0 });
    await createLobbyRoom(token, { hostId: otherHost, gameType: otherGameType, roomName: 'Other Game', maxPlayers: 4, allowAI: false, aiCount: 0 });
    await joinLobbyRoom(token, roomB.roomId!, gameType, `guest-list-${crypto.randomUUID().slice(0, 8)}`, 'List Guest');

    const firstPageUrl = buildApiUrlWithQueryParams(ApiEndpoint.Rooms.Base, {
      [QueryParam.GameType]: gameType,
      [QueryParam.Sort]: 'fullest',
      [QueryParam.Limit]: '1',
    }, { baseUrl });
    const firstPageRes = await worker.fetch(firstPageUrl, { method: HttpMethod.Get, headers: headers() }, token);
    expect(firstPageRes.status).toBe(HttpStatus.Ok);
    const firstPage = await firstPageRes.json() as LobbyActionResponse;
    expect(firstPage.limit).toBe(1);
    expect(firstPage.rooms?.length).toBe(1);
    expect(firstPage.rooms?.[0]?.roomId).toBe(roomB.roomId);
    expect(firstPage.rooms?.[0]?.currentPlayers).toBe(2);
    expect(typeof firstPage.nextCursor).toBe('string');

    const secondPageUrl = buildApiUrlWithQueryParams(ApiEndpoint.Rooms.Base, {
      [QueryParam.GameType]: gameType,
      [QueryParam.Sort]: 'fullest',
      [QueryParam.Limit]: '1',
      [QueryParam.Cursor]: firstPage.nextCursor!,
    }, { baseUrl });
    const secondPageRes = await worker.fetch(secondPageUrl, { method: HttpMethod.Get, headers: headers() }, token);
    expect(secondPageRes.status).toBe(HttpStatus.Ok);
    const secondPage = await secondPageRes.json() as LobbyActionResponse;
    expect(secondPage.rooms?.length).toBe(1);
    expect(secondPage.rooms?.[0]?.roomId).not.toBe(roomB.roomId);
    expect([roomA.roomId, roomC.roomId]).toContain(secondPage.rooms?.[0]?.roomId);

    const unscopedRes = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Get,
      headers: headers(),
    }, token);
    expect(unscopedRes.status).toBe(HttpStatus.Ok);
    const unscoped = await unscopedRes.json() as LobbyActionResponse;
    expect(unscoped.scope).toBe('gameType-required');
    expect(unscoped.rooms).toEqual([]);
  });

  it(testName('Lobby POST rooms: creates room with hostId and returns roomId and joined'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl });
    const hostId = `host-${crypto.randomUUID().slice(0, 8)}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
        body: JSON.stringify({ ...OpenApiExampleValue.LobbyCreateRequest, hostId }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { roomId?: string; joined?: boolean; room?: unknown };
    expect(typeof data.roomId).toBe('string');
    expect(data.roomId!.length).toBeGreaterThan(0);
    expect(data.joined).toBe(true);
    expect(data.room !== null && data.room !== undefined).toBe(true);
    expect(typeof data.room).toBe('object');
  });

  it(testName('Lobby create then join then leave: full flow'), async () => {
    const token = getTokenForFetch();
    const hostId = `host-${crypto.randomUUID().slice(0, 8)}`;
    const guestId = `guest-${crypto.randomUUID().slice(0, 8)}`;
    const gameType = `claim-flow-${crypto.randomUUID().slice(0, 8)}`;

    const createUrl = buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl });
    const createRes = await worker.fetch(createUrl, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyCreateRequest, hostId, gameType }),
    }, token);
    expect(createRes.status).toBe(HttpStatus.Ok);
    const createData = (await createRes.json()) as { roomId?: string; joined?: boolean };
    const roomId = createData.roomId;
    expect(roomId).toBeDefined();
    expect(typeof roomId).toBe('string');
    expect((roomId as string).length).toBeGreaterThan(0);
    expect(createData.joined).toBe(true);

    const joinUrl = gameScopedUrl(ApiEndpoint.Rooms.Join(roomId!), gameType);
    const joinRes = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyJoinRequest, userId: guestId }),
    }, token);
    expect(joinRes.status).toBe(HttpStatus.Ok);
    const joinData = (await joinRes.json()) as { joined?: boolean };
    expect(joinData.joined).toBe(true);

    const leaveUrl = gameScopedUrl(ApiEndpoint.Rooms.Leave(roomId!), gameType);
    const leaveRes = await worker.fetch(leaveUrl, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyLeaveRequest, userId: guestId }),
    }, token);
    expect(leaveRes.status).toBe(HttpStatus.Ok);
    const leaveData = (await leaveRes.json()) as { left?: boolean };
    expect(leaveData.left).toBe(true);
  });

  it(testName('Lobby waiting room: ready, unready, and host-only start rules are enforced'), async () => {
    const token = getTokenForFetch();
    const gameType = `claim-start-${crypto.randomUUID().slice(0, 8)}`;
    const hostId = `host-start-${crypto.randomUUID().slice(0, 8)}`;
    const guestId = `guest-start-${crypto.randomUUID().slice(0, 8)}`;
    const createData = await createLobbyRoom(token, {
      hostId,
      hostDisplayName: 'Start Host',
      gameType,
      roomName: 'Start Table',
      maxPlayers: 2,
      allowAI: false,
      aiCount: 0,
    });
    const roomId = createData.roomId!;
    await joinLobbyRoom(token, roomId, gameType, guestId, 'Start Guest');

    const guestStartRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Start(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: guestId }),
    }, token);
    expect(guestStartRes.status).toBe(HttpStatus.Forbidden);
    await guestStartRes.text().catch(() => undefined);

    const earlyStartRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Start(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: hostId }),
    }, token);
    expect(earlyStartRes.status).toBe(HttpStatus.Conflict);
    await earlyStartRes.text().catch(() => undefined);

    const hostReadyRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Ready(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: hostId }),
    }, token);
    expect(hostReadyRes.status).toBe(HttpStatus.Ok);
    const hostReady = await hostReadyRes.json() as LobbyActionResponse;
    expect(hostReady.room?.players?.find(player => player.userId === hostId)?.isReady).toBe(true);

    const guestReadyRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Ready(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: guestId }),
    }, token);
    expect(guestReadyRes.status).toBe(HttpStatus.Ok);

    const guestUnreadyRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Unready(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: guestId }),
    }, token);
    expect(guestUnreadyRes.status).toBe(HttpStatus.Ok);
    const guestUnready = await guestUnreadyRes.json() as LobbyActionResponse;
    expect(guestUnready.room?.players?.find(player => player.userId === guestId)?.isReady).toBe(false);

    const notReadyStartRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Start(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: hostId }),
    }, token);
    expect(notReadyStartRes.status).toBe(HttpStatus.Conflict);
    await notReadyStartRes.text().catch(() => undefined);

    const guestReadyAgainRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Ready(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: guestId }),
    }, token);
    expect(guestReadyAgainRes.status).toBe(HttpStatus.Ok);

    const startRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Start(roomId), gameType), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({ userId: hostId }),
    }, token);
    expect(startRes.status).toBe(HttpStatus.Ok);
    const startData = await startRes.json() as LobbyActionResponse;
    expect(startData.started).toBe(true);
    expect(typeof startData.matchId).toBe('string');
    expect(startData.room?.gameStatus).toBe('starting');
    expect(startData.handoff?.roomId).toBe(roomId);
    expect(startData.handoff?.matchId).toBe(startData.matchId);
  });

  it(testName('Lobby AI and training metadata: rejects no-AI seats and exposes training seat config'), async () => {
    const token = getTokenForFetch();
    const noAiRes = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({
        ...OpenApiExampleValue.LobbyCreateRequest,
        hostId: `host-no-ai-${crypto.randomUUID().slice(0, 8)}`,
        gameType: `claim-no-ai-${crypto.randomUUID().slice(0, 8)}`,
        allowAI: false,
        aiCount: 1,
      }),
    }, token);
    expect(noAiRes.status).toBe(HttpStatus.BadRequest);
    await noAiRes.text().catch(() => undefined);

    const training = await createLobbyRoom(token, {
      hostId: `host-training-${crypto.randomUUID().slice(0, 8)}`,
      hostDisplayName: 'Training Host',
      gameType: `claim-training-${crypto.randomUUID().slice(0, 8)}`,
      mode: 'training',
      allowAI: true,
      aiCount: 1,
      aiProviderId: 'test-provider',
      aiModelId: 'test-model',
      difficulty: 'normal',
      aiRole: 'coach',
      coachEnabled: true,
      coachModelId: 'test-coach-model',
      guideMode: 'guided',
    });
    expect(training.room?.mode).toBe('training');
    expect(training.room?.allowAI).toBe(true);
    expect(training.room?.aiCount).toBe(1);
    expect(training.room?.coachEnabled).toBe(true);
    expect(training.room?.coachModelId).toBe('test-coach-model');
    expect(training.room?.guideMode).toBe('guided');
    const aiSeat = training.room?.players?.find(player => player.isAI);
    expect(aiSeat?.aiProviderId).toBe('test-provider');
    expect(aiSeat?.aiModelId).toBe('test-model');
    expect(aiSeat?.difficulty).toBe('normal');
    expect(aiSeat?.role).toBe('coach');
  });

  it(testName('Lobby stakes: blocks unsupported real-money and failed game-coin locks'), async () => {
    const token = getTokenForFetch();
    const realMoneyRes = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({
        ...OpenApiExampleValue.LobbyCreateRequest,
        hostId: `host-real-${crypto.randomUUID().slice(0, 8)}`,
        gameType: `claim-real-${crypto.randomUUID().slice(0, 8)}`,
        stakeType: 'real-money',
        stakeAmount: 10,
      }),
    }, token);
    expect(realMoneyRes.status).toBe(HttpStatus.UnprocessableEntity);
    await realMoneyRes.text().catch(() => undefined);

    const gameCoinRes = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Post,
      headers: jsonHeaders(),
      body: JSON.stringify({
        ...OpenApiExampleValue.LobbyCreateRequest,
        hostId: `host-stake-${crypto.randomUUID().slice(0, 8)}`,
        gameType: `claim-stake-${crypto.randomUUID().slice(0, 8)}`,
        stakeType: 'game-coin',
        stakeAmount: 25,
      }),
    }, token);
    expect(gameCoinRes.status).toBe(HttpStatus.Conflict);
    await gameCoinRes.text().catch(() => undefined);
  });

  it(testName('Lobby WebSocket: routes to owning game bucket and carries ready, chat, and reconnect'), async () => {
    const token = getTokenForFetch();
    const gameType = `claim-ws-${crypto.randomUUID().slice(0, 8)}`;
    const hostId = `host-ws-${crypto.randomUUID().slice(0, 8)}`;
    const guestId = `guest-ws-${crypto.randomUUID().slice(0, 8)}`;
    const createData = await createLobbyRoom(token, {
      hostId,
      hostDisplayName: 'WS Host',
      gameType,
      roomName: 'WS Table',
      maxPlayers: 3,
      allowAI: false,
      aiCount: 0,
    });
    const roomId = createData.roomId!;
    const wsUrl = buildApiUrlWithQueryParams(ApiEndpoint.Ws.Lobby, {
      [QueryParam.GameType]: gameType,
      [QueryParam.RoomId]: roomId,
    }, { baseUrl });
    const openLobbySocket = async (): Promise<WebSocket> => {
      const upgradeResponse = await worker.fetch(wsUrl, {
        headers: {
          ...headers(),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
        },
      }, token);
      expect(upgradeResponse.status).toBe(HttpStatus.SwitchingProtocols);
      expect(upgradeResponse.webSocket).toBeTruthy();
      const ws = upgradeResponse.webSocket!;
      ws.accept();
      return ws;
    };

    const hostWs = await openLobbySocket();
    const guestWs = await openLobbySocket();
    try {
      hostWs.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: hostId, displayName: 'WS Host' } }));
      const hostWelcome = await waitForWebSocketMessageType(hostWs, 'welcome');
      expect(hostWelcome.roomId).toBe(roomId);

      guestWs.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: guestId, displayName: 'WS Guest' } }));
      const guestWelcome = await waitForWebSocketMessageType(guestWs, 'welcome');
      expect(guestWelcome.roomId).toBe(roomId);
      expect(typeof guestWelcome.reconnectToken).toBe('string');

      const playerJoined = await waitForWebSocketMessageType(hostWs, 'player-joined');
      expect(playerJoined.userId).toBe(guestId);

      guestWs.send(JSON.stringify({ type: 'ready' }));
      const readyChanged = await waitForWebSocketMessageType(hostWs, 'ready-changed');
      expect(readyChanged.userId).toBe(guestId);
      expect(readyChanged.isReady).toBe(true);
      const readyAccepted = await waitForWebSocketMessageType(guestWs, 'ready-accepted');
      expect(readyAccepted.isReady).toBe(true);

      guestWs.send(JSON.stringify({ type: 'chat', payload: { content: 'ready for claim' } }));
      const chatMessage = await waitForWebSocketMessageType(hostWs, 'chat');
      const chatPayload = chatMessage.message as { senderId?: string; content?: string } | undefined;
      expect(chatPayload?.senderId).toBe(guestId);
      expect(chatPayload?.content).toBe('ready for claim');

      await closeSocket(guestWs);
      const reconnectWs = await openLobbySocket();
      try {
        reconnectWs.send(JSON.stringify({ type: 'reconnect', payload: { reconnectToken: guestWelcome.reconnectToken } }));
        const reconnectWelcome = await waitForWebSocketMessageType(reconnectWs, 'welcome');
        expect(reconnectWelcome.roomId).toBe(roomId);
      } finally {
        await closeSocket(reconnectWs);
      }
    } finally {
      await closeSocket(hostWs);
      await closeSocket(guestWs);
    }
  });

  it(testName('Lobby private room: joins by host-visible join code within game shard'), async () => {
    const token = getTokenForFetch();
    const hostId = `host-code-${crypto.randomUUID().slice(0, 8)}`;
    const guestId = `guest-code-${crypto.randomUUID().slice(0, 8)}`;
    const gameType = `claim-code-${crypto.randomUUID().slice(0, 8)}`;
    const createRes = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({
        ...OpenApiExampleValue.LobbyCreateRequest,
        hostId,
        hostDisplayName: 'Code Host',
        gameType,
        roomName: 'Code Table',
        visibility: 'private',
        isPrivate: true,
      }),
    }, token);
    expect(createRes.status).toBe(HttpStatus.Ok);
    const createData = (await createRes.json()) as { roomId?: string; room?: { joinCode?: string; visibility?: string } };
    expect(createData.room?.visibility).toBe('private');
    expect(typeof createData.room?.joinCode).toBe('string');

    const joinCode = createData.room!.joinCode!;
    const joinRes = await worker.fetch(gameScopedUrl(ApiEndpoint.Rooms.Join(joinCode), gameType), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyJoinRequest, userId: guestId, displayName: 'Code Guest' }),
    }, token);
    expect(joinRes.status).toBe(HttpStatus.Ok);
    const joinData = (await joinRes.json()) as { joined?: boolean; roomId?: string; room?: { currentPlayers?: number } };
    expect(joinData.joined).toBe(true);
    expect(joinData.roomId).toBe(createData.roomId);
    expect(joinData.room?.currentPlayers).toBe(2);
  });

  it(testName('Lobby POST rooms with missing hostId: returns 400'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyCreateRequest, hostId: undefined }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });

  it(testName('Lobby POST join with missing userId: returns 400'), async () => {
    const token = getTokenForFetch();
    const createRes = await worker.fetch(buildApiUrl(ApiEndpoint.Rooms.Base, { baseUrl }), {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyCreateRequest, hostId: 'host-join-test' }),
    }, token);
    const createData = (await createRes.json()) as { roomId?: string };
    const roomId = createData.roomId ?? 'any-room-id';
    const joinUrl = buildApiUrl(ApiEndpoint.Rooms.Join(roomId), { baseUrl });
    const response = await worker.fetch(joinUrl, {
      method: HttpMethod.Post,
      headers: { ...headers(), [HttpHeader.ContentType]: 'application/json' },
      body: JSON.stringify({ ...OpenApiExampleValue.LobbyJoinRequest, userId: undefined }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });
});
