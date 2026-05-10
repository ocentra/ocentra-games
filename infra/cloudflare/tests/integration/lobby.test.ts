import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl, buildApiUrlWithQueryParams } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiExampleValue } from '@ocentra/endpoint-domain/constants/openapi-examples';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { TestConfig } from '@tests/constants/test-constants';
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
  const gameScopedUrl = (endpoint: string, gameType: string) => buildApiUrlWithQueryParams(endpoint, { [QueryParam.GameType]: gameType }, { baseUrl });

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
