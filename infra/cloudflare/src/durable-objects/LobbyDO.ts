import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { CreditsDO as CreditsDOPaths, LobbyDOSegment, LobbyDODefaultInstanceName } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { QueryParam, QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { Currency } from '@ocentra/endpoint-domain/constants/credits';
import {
  LobbyAIDifficultyValues,
  LobbyAIRoleValues,
  LobbyChainStatusValues,
  LobbyModeValues,
  LobbyStakeStatusValues,
  LobbyStakeTypeValues,
  LobbyTrainingGuideModeValues,
  LobbyVisibilityValues,
  RoomTypeValues,
} from '@ocentra/endpoint-domain/constants/worker-contract-values';
import { LobbyDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { fetchFromDO } from '@/utils/durable-object-request';
const MAX_ROOMS_PER_SHARD = 500;
const DEFAULT_MAX_PLAYERS = 13;
const MIN_MAX_PLAYERS = 1;
const CHAT_RATE_LIMIT_MS = 1000;
const CHAT_HISTORY_MAX = 100;
const COUNTDOWN_SECONDS = 5;
const STALE_WAITING_ROOM_TTL_MS = 30 * 60 * 1000;
const RECONNECT_TOKEN_TTL_MS = 2 * 60 * 1000;
const CLEANUP_ALARM_INTERVAL_MS = 60 * 1000;
const MIN_START_PLAYERS = 2;
const CHAT_BLOCKED_PATTERNS = [/badword/i, /spam/i];
const DEFAULT_ROOM_TYPE = RoomTypeValues[1];
const DEFAULT_LOBBY_MODE = LobbyModeValues[0];
const DEFAULT_VISIBILITY = LobbyVisibilityValues[0];
const DEFAULT_STAKE_TYPE = LobbyStakeTypeValues[0];
const DEFAULT_STAKE_STATUS = LobbyStakeStatusValues[0];
const DEFAULT_CHAIN_STATUS = LobbyChainStatusValues[0];
const DEFAULT_AI_ROLE = LobbyAIRoleValues[0];
const DEFAULT_AI_DIFFICULTY = LobbyAIDifficultyValues[1];
const DEFAULT_GUIDE_MODE = LobbyTrainingGuideModeValues[0];
const DEFAULT_TURN_TIMER_SECONDS = 60;
const DEFAULT_REGION = 'global';

type LobbyRoomType = typeof RoomTypeValues[number];
type LobbyMode = typeof LobbyModeValues[number];
type LobbyVisibility = typeof LobbyVisibilityValues[number];
type LobbyStakeType = typeof LobbyStakeTypeValues[number];
type LobbyStakeStatus = typeof LobbyStakeStatusValues[number];
type LobbyChainStatus = typeof LobbyChainStatusValues[number];
type LobbyAIRole = typeof LobbyAIRoleValues[number];
type LobbyAIDifficulty = typeof LobbyAIDifficultyValues[number];
type LobbyTrainingGuideMode = typeof LobbyTrainingGuideModeValues[number];
type LobbyStatus = 'waiting' | 'starting' | 'in-progress' | 'ended';

interface LobbyAttachment {
  connectionId: string;
  userId: string | null;
  roomId: string | null;
  connectedAt: number;
  displayName?: string;
}

interface ChatMessageStored {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'emote';
}

interface RoomPlayerStored {
  userId: string;
  displayName?: string;
  seatIndex: number;
  isHost: boolean;
  isReady: boolean;
  isAI: boolean;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty;
  role?: LobbyAIRole;
  joinedAt: number;
}

interface RoomStored {
  roomId: string;
  roomName?: string;
  roomType: LobbyRoomType;
  mode?: LobbyMode;
  visibility?: LobbyVisibility;
  maxPlayers: number;
  playerIds: string[];
  spectatorIds?: string[];
  players?: RoomPlayerStored[];
  gameStatus: LobbyStatus;
  hostId: string;
  gameType?: string;
  variantId?: string;
  competitionProgramId?: string;
  eventId?: string;
  tournamentId?: string;
  bracketMatchId?: string;
  allowAI?: boolean;
  aiCount?: number;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty;
  aiRole?: LobbyAIRole;
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: LobbyTrainingGuideMode;
  allowSpectators?: boolean;
  stakeType?: LobbyStakeType;
  stakeAmount?: number;
  stakeStatus?: LobbyStakeStatus;
  stakeEscrowId?: string;
  stakeLocks?: Record<string, string>;
  chainStatus?: LobbyChainStatus;
  turnTimerSeconds?: number;
  region?: string;
  joinCode?: string;
  isPrivate?: boolean;
  matchId?: string;
  stateVersion?: number;
  createdAt: number;
  lastActivityAt: number;
  chatHistory?: ChatMessageStored[];
  lastChatAt?: Record<string, number>;
}

interface RoomView {
  roomId: string;
  roomName?: string;
  roomType: string;
  mode: string;
  visibility: string;
  maxPlayers: number;
  currentPlayers: number;
  currentSpectators: number;
  gameStatus: string;
  status: string;
  hostId: string;
  gameType?: string;
  variantId?: string;
  competitionProgramId?: string;
  eventId?: string;
  tournamentId?: string;
  bracketMatchId?: string;
  allowAI: boolean;
  aiCount: number;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: string;
  aiRole?: string;
  coachEnabled: boolean;
  coachModelId?: string;
  guideMode: string;
  allowSpectators: boolean;
  stakeType: string;
  stakeAmount: number;
  stakeStatus: string;
  stakeEscrowId?: string;
  chainStatus: string;
  turnTimerSeconds: number;
  region: string;
  isPrivate: boolean;
  viewerJoined?: boolean;
  viewerSpectating?: boolean;
  joinCode?: string;
  matchId?: string;
  stateVersion: number;
  players: Array<{
    userId: string;
    displayName?: string;
    seatIndex: number;
    isHost: boolean;
    isReady: boolean;
    isAI: boolean;
    aiProviderId?: string;
    aiModelId?: string;
    difficulty?: string;
    role?: string;
  }>;
  createdAt: number;
}

interface CreateRoomBody {
  roomType?: string;
  roomName?: string;
  maxPlayers?: number;
  gameType?: string;
  variantId?: string;
  competitionProgramId?: string;
  eventId?: string;
  tournamentId?: string;
  bracketMatchId?: string;
  hostId: string;
  hostDisplayName?: string;
  roomId?: string;
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
  allowSpectators?: boolean;
  stakeType?: string;
  stakeAmount?: number;
  turnTimerSeconds?: number;
  region?: string;
  isPrivate?: boolean;
}

export class LobbyDO implements DurableObject {
  private readonly log = Logger.instance;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) {
    this.log.register(import.meta.url);
  }

  private logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logInfo(message, stackTrace, data, enabled);
  };

  private logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logWarn(message, stackTrace, data, enabled);
  };

  private logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
    this.log.logError(message, stackTrace, data);
  };

  private logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logDebug(message, stackTrace, data, enabled);
  };

  async fetch(request: Request): Promise<Response> {
    try {
      if (request.headers.get(HttpHeader.Upgrade) === 'websocket') {
        const pair = new WebSocketPair();
        const serverWs = pair[1];
        this.ctx.acceptWebSocket(serverWs);
        const attachment: LobbyAttachment = {
          connectionId: crypto.randomUUID(),
          userId: null,
          roomId: null,
          connectedAt: Date.now(),
        };
        serverWs.serializeAttachment(attachment);
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;
      const parts = pathname.split('/').filter(Boolean);
      const segmentIndex = parts[0] === LobbyDODefaultInstanceName ? 2 : 0;
      const segment = parts[segmentIndex];
      const action = parts[segmentIndex + 1];
      const roomIdForAction = (
        action === LobbyDOSegment.Join ||
        action === LobbyDOSegment.Leave ||
        action === LobbyDOSegment.Spectate ||
        action === LobbyDOSegment.Ready ||
        action === LobbyDOSegment.Unready ||
        action === LobbyDOSegment.Start ||
        action === LobbyDOSegment.AddAI
      ) ? (parts[segmentIndex] ?? '') : null;

      if (request.method === HttpMethod.Get && (segment === LobbyDOSegment.Rooms || pathname.endsWith(`/${LobbyDOSegment.Rooms}`))) {
        return this.listRooms(request);
      }
      if (request.method === HttpMethod.Post && (segment === LobbyDOSegment.Rooms || pathname.endsWith(`/${LobbyDOSegment.Rooms}`))) {
        return this.createRoom(request);
      }
      if (request.method === HttpMethod.Post && (segment === LobbyDOSegment.QuickJoin || pathname.endsWith(`/${LobbyDOSegment.QuickJoin}`))) {
        return this.quickJoinRoom(request);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.Join && roomIdForAction) {
        return this.joinRoom(roomIdForAction, request);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.Leave && roomIdForAction) {
        return this.leaveRoom(roomIdForAction, request);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.Spectate && roomIdForAction) {
        return this.spectateRoom(roomIdForAction, request);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.Ready && roomIdForAction) {
        return this.setReadyState(roomIdForAction, request, true);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.Unready && roomIdForAction) {
        return this.setReadyState(roomIdForAction, request, false);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.Start && roomIdForAction) {
        return this.startRoom(roomIdForAction, request);
      }
      if (request.method === HttpMethod.Post && action === LobbyDOSegment.AddAI && roomIdForAction) {
        return this.addAISeat(roomIdForAction, request);
      }
      if (request.method === HttpMethod.Post && (segment === LobbyDOSegment.Message || pathname.endsWith(`/${LobbyDOSegment.Message}`))) {
        return this.json({ sent: true });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('LobbyDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async listRooms(request: Request): Promise<Response> {
    await this.cleanupStaleRooms(Date.now());
    const url = new URL(request.url, 'http://dummy');
    const userId = url.searchParams.get(QueryParam.UserId) ?? undefined;
    const gameType = url.searchParams.get(QueryParam.GameType) ?? '';
    const mode = url.searchParams.get(QueryParam.Mode) ?? '';
    const visibility = url.searchParams.get(QueryParam.Visibility) ?? '';
    const status = url.searchParams.get(QueryParam.Status) ?? 'waiting';
    const search = this.cleanText(url.searchParams.get(QueryParam.Search), 128)?.toLowerCase() ?? '';
    const stakeType = url.searchParams.get(QueryParam.StakeType) ?? '';
    const allowAI = url.searchParams.get(QueryParam.AllowAI);
    const sort = url.searchParams.get(QueryParam.Sort) ?? 'newest';
    const limit = this.clampListLimit(url.searchParams.get(QueryParam.Limit));
    const cursor = this.decodeListCursor(url.searchParams.get(QueryParam.Cursor));
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    const rooms: RoomView[] = [];
    for (const id of roomIds) {
      const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${id}`);
      if (room) {
        if (status && room.gameStatus !== status) continue;
        if (gameType && room.gameType !== gameType) continue;
        if (mode && room.mode !== mode) continue;
        if (visibility && this.roomVisibility(room) !== visibility) continue;
        if (stakeType && room.stakeType !== stakeType) continue;
        if (allowAI === 'true' && room.allowAI === false) continue;
        if (allowAI === 'false' && room.allowAI !== false) continue;
        if (search && !this.roomMatchesSearch(room, search)) continue;
        const spectatorIds = room.spectatorIds ?? [];
        if (this.roomVisibility(room) === 'private' && (!userId || (!room.playerIds.includes(userId) && !spectatorIds.includes(userId)))) continue;
        const view = this.toRoomView(room, userId);
        if (cursor && !this.isAfterCursor(view, cursor, sort)) continue;
        rooms.push(view);
      }
    }
    const sortedRooms = this.sortRooms(rooms, sort);
    const page = sortedRooms.slice(0, limit);
    const hasMore = sortedRooms.length > limit;
    const nextCursor = hasMore && page.length > 0 ? this.encodeListCursor(page[page.length - 1], sort) : null;
    return this.json({ rooms: page, nextCursor, hasMore, limit });
  }

  private async createRoom(request: Request): Promise<Response> {
    let body: CreateRoomBody;
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const hostId = body.hostId ?? '';
    if (!hostId) return this.json({ error: 'hostId required' }, HttpStatus.BadRequest);
    const created = await this.createStoredRoom(body);
    if ('error' in created) return this.json({ error: created.error }, created.status);
    return this.json({ roomId: created.room.roomId, joined: true, spectating: false, created: true, room: this.toRoomView(created.room, hostId) });
  }

  private async joinRoom(roomId: string, request: Request): Promise<Response> {
    let body: { userId: string; displayName?: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    const room = await this.getRoomByIdOrCode(roomId);
    if (!room) return this.json({ error: 'Room not found' }, HttpStatus.NotFound);
    if (room.gameStatus !== 'waiting') return this.json({ error: 'Room not joinable' }, HttpStatus.Conflict);
    const spectatorIds = room.spectatorIds ?? [];
    room.spectatorIds = spectatorIds.filter((id) => id !== userId);
    if (room.playerIds.includes(userId)) {
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${room.roomId}`, room);
      return this.json({ joined: true, roomId: room.roomId, spectating: false, room: this.toRoomView(room, userId) });
    }
    if (room.playerIds.length >= room.maxPlayers) return this.json({ error: 'Room full' }, HttpStatus.Conflict);
    const stakeLock = await this.lockStakeForJoin(room, userId);
    if (!stakeLock.ok) return this.json({ error: stakeLock.error }, stakeLock.status);
    this.addPlayer(room, userId, body.displayName);
    if (stakeLock.escrowId) {
      room.stakeLocks = { ...(room.stakeLocks ?? {}), [userId]: stakeLock.escrowId };
      room.stakeEscrowId = stakeLock.escrowId;
      room.stakeStatus = 'locked';
    }
    room.stateVersion = (room.stateVersion ?? 0) + 1;
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${room.roomId}`, room);
    await this.scheduleCleanupAlarm();
    this.broadcastToRoom(room.roomId, { type: 'player-joined', userId, displayName: body.displayName ?? userId, room: this.toRoomView(room, userId) });
    return this.json({ joined: true, roomId: room.roomId, spectating: false, room: this.toRoomView(room, userId) });
  }

  private async spectateRoom(roomId: string, request: Request): Promise<Response> {
    let body: { userId: string; displayName?: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return this.json({ error: 'Room not found' }, HttpStatus.NotFound);
    if (room.allowSpectators === false) return this.json({ error: 'Spectators disabled' }, HttpStatus.Conflict);
    room.spectatorIds = room.spectatorIds ?? [];
    if (room.playerIds.includes(userId)) return this.json({ error: 'Already in room as player' }, HttpStatus.Conflict);
    if (!room.spectatorIds.includes(userId)) {
      room.spectatorIds.push(userId);
      room.lastActivityAt = Date.now();
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
      await this.scheduleCleanupAlarm();
      this.broadcastToRoom(roomId, { type: 'spectator-joined', userId, displayName: body.displayName ?? userId, room: this.toRoomView(room, userId) });
    }
    return this.json({ joined: true, roomId, spectating: true, room: this.toRoomView(room, userId) });
  }

  private async setReadyState(roomId: string, request: Request, isReady: boolean): Promise<Response> {
    let body: { userId: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    const result = await this.setReadyStateForUser(roomId, userId, isReady);
    if ('error' in result) return this.json({ error: result.error }, result.status);
    return this.json({ ready: isReady, roomId, room: result.room });
  }

  private async setReadyStateForUser(roomId: string, userId: string, isReady: boolean): Promise<{ room: RoomView } | { error: string; status: number }> {
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return { error: 'Room not found', status: HttpStatus.NotFound };
    if (!room.playerIds.includes(userId)) return { error: 'Player not in room', status: HttpStatus.Forbidden };
    const players = this.roomPlayers(room);
    room.players = players.map((player) => player.userId === userId && !player.isAI ? { ...player, isReady } : player);
    room.stateVersion = (room.stateVersion ?? 0) + 1;
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    await this.scheduleCleanupAlarm();
    const view = this.toRoomView(room, userId);
    this.broadcastToRoom(roomId, { type: 'ready-changed', roomId, userId, isReady, room: view });
    return { room: view };
  }

  private async startRoom(roomId: string, request: Request): Promise<Response> {
    let body: { userId: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const result = await this.startRoomForUser(roomId, body.userId ?? '');
    if ('error' in result) return this.json({ error: result.error }, result.status);
    return this.json(result);
  }

  private async addAISeat(roomId: string, request: Request): Promise<Response> {
    let body: {
      userId: string;
      displayName?: string;
      aiProviderId?: string;
      aiModelId?: string;
      difficulty?: string;
      aiRole?: string;
    };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return this.json({ error: 'Room not found' }, HttpStatus.NotFound);
    if (room.hostId !== userId) return this.json({ error: 'Only host can add AI seats' }, HttpStatus.Forbidden);
    if (room.gameStatus !== 'waiting') return this.json({ error: 'Room not in waiting state' }, HttpStatus.Conflict);
    if (room.allowAI === false) return this.json({ error: 'AI seats are disabled for this room' }, HttpStatus.Conflict);
    if (room.playerIds.length >= room.maxPlayers) return this.json({ error: 'Room full' }, HttpStatus.Conflict);

    const players = this.roomPlayers(room);
    const occupiedSeats = new Set(players.map((player) => player.seatIndex));
    let seatIndex = 0;
    while (occupiedSeats.has(seatIndex)) seatIndex += 1;
    const aiIndex = players.filter((player) => player.isAI).length + 1;
    const aiId = `ai:${room.roomId}:${aiIndex}:${crypto.randomUUID()}`;
    const aiRole = this.normalizeAIRole(body.aiRole ?? room.aiRole);
    const aiDifficulty = this.normalizeAIDifficulty(body.difficulty ?? room.difficulty);
    const aiPlayer: RoomPlayerStored = {
      userId: aiId,
      displayName: this.cleanText(body.displayName, 80) ?? `AI Seat ${aiIndex}`,
      seatIndex,
      isHost: false,
      isReady: true,
      isAI: true,
      aiProviderId: this.cleanText(body.aiProviderId, 128) ?? room.aiProviderId,
      aiModelId: this.cleanText(body.aiModelId, 128) ?? room.aiModelId,
      difficulty: aiDifficulty,
      role: aiRole,
      joinedAt: Date.now(),
    };
    room.playerIds.push(aiId);
    room.players = [...players, aiPlayer].sort((a, b) => a.seatIndex - b.seatIndex);
    room.aiCount = (room.aiCount ?? 0) + 1;
    room.stateVersion = (room.stateVersion ?? 0) + 1;
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    await this.scheduleCleanupAlarm();
    const view = this.toRoomView(room, userId);
    this.broadcastToRoom(roomId, { type: 'ai-added', roomId, userId: aiId, room: view });
    this.broadcastToRoom(roomId, { type: 'player-joined', userId: aiId, displayName: aiPlayer.displayName, room: view });
    return this.json({ joined: true, roomId, room: view });
  }

  private async quickJoinRoom(request: Request): Promise<Response> {
    let body: {
      roomId?: string;
      userId: string;
      displayName?: string;
      gameType: string;
      mode?: string;
      allowAI?: boolean;
      stakeType?: string;
      maxPlayers?: number;
      createIfMissing?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    const gameType = body.gameType ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    if (!gameType) return this.json({ error: 'gameType required' }, HttpStatus.BadRequest);
    const room = await this.findQuickJoinRoom(body);
    if (room) {
      if (!room.playerIds.includes(userId)) {
        const stakeLock = await this.lockStakeForJoin(room, userId);
        if (!stakeLock.ok) return this.json({ error: stakeLock.error }, stakeLock.status);
        this.addPlayer(room, userId, body.displayName);
        if (stakeLock.escrowId) {
          room.stakeLocks = { ...(room.stakeLocks ?? {}), [userId]: stakeLock.escrowId };
          room.stakeEscrowId = stakeLock.escrowId;
          room.stakeStatus = 'locked';
        }
      }
      room.spectatorIds = (room.spectatorIds ?? []).filter((id) => id !== userId);
      room.stateVersion = (room.stateVersion ?? 0) + 1;
      room.lastActivityAt = Date.now();
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${room.roomId}`, room);
      await this.scheduleCleanupAlarm();
      this.broadcastToRoom(room.roomId, { type: 'player-joined', userId, displayName: body.displayName ?? userId, room: this.toRoomView(room, userId) });
      return this.json({ joined: true, created: false, roomId: room.roomId, spectating: false, room: this.toRoomView(room, userId) });
    }
    if (body.createIfMissing === false) return this.json({ error: 'No joinable room found' }, HttpStatus.NotFound);
    const created = await this.createStoredRoom({
      hostId: userId,
      hostDisplayName: body.displayName,
      roomId: body.roomId,
      roomName: `${gameType} Quick Table`,
      roomType: DEFAULT_ROOM_TYPE,
      mode: body.mode,
      visibility: DEFAULT_VISIBILITY,
      maxPlayers: body.maxPlayers,
      gameType,
      allowAI: body.allowAI,
      aiCount: body.allowAI === false ? 0 : Math.max(0, Math.min((body.maxPlayers ?? 4) - 1, 1)),
      allowSpectators: true,
      stakeType: body.stakeType,
      stakeAmount: 0,
      isPrivate: false,
    });
    if ('error' in created) return this.json({ error: created.error }, created.status);
    return this.json({ joined: true, created: true, roomId: created.room.roomId, spectating: false, room: this.toRoomView(created.room, userId) });
  }

  private async leaveRoom(roomId: string, request: Request): Promise<Response> {
    let body: { userId: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return this.json({ left: true });
    const playerIdx = room.playerIds.indexOf(userId);
    if (playerIdx !== -1) room.playerIds.splice(playerIdx, 1);
    const spectatorIds = room.spectatorIds ?? [];
    room.spectatorIds = spectatorIds.filter((id) => id !== userId);
    await this.refundStakeForLeave(room, userId);
    if (room.stakeLocks) {
      delete room.stakeLocks[userId];
      if (Object.keys(room.stakeLocks).length === 0 && room.stakeType === 'game-coin') room.stakeStatus = 'refunded';
    }
    room.lastActivityAt = Date.now();
    if (room.playerIds.length === 0) {
      await this.ctx.storage.delete(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
      const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
      const newIds = roomIds.filter((id) => id !== roomId);
      await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, newIds);
    } else {
      if (room.hostId === userId) room.hostId = room.playerIds[0] ?? room.spectatorIds?.[0] ?? '';
      room.players = this.roomPlayers(room).filter((player) => player.userId !== userId).map((player) => ({
        ...player,
        isHost: player.userId === room.hostId,
      }));
      room.stateVersion = (room.stateVersion ?? 0) + 1;
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    }
    await this.scheduleCleanupAlarm();
    this.broadcastToRoom(roomId, { type: 'player-left', userId, roomId });
    return this.json({ left: true });
  }

  private async createStoredRoom(body: CreateRoomBody): Promise<{ room: RoomStored } | { error: string; status: number }> {
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    if (roomIds.length >= MAX_ROOMS_PER_SHARD) return { error: 'Room limit reached', status: HttpStatus.ServiceUnavailable };
    const hostId = body.hostId ?? '';
    const maxPlayers = Math.min(DEFAULT_MAX_PLAYERS, Math.max(MIN_MAX_PLAYERS, body.maxPlayers ?? 4));
    const roomId = typeof body.roomId === 'string' && body.roomId.length > 0 ? body.roomId : crypto.randomUUID();
    const visibility = this.normalizeVisibility(body.visibility, body.isPrivate);
    const now = Date.now();
    const allowAI = body.allowAI ?? true;
    const aiCount = Math.max(0, Math.min(maxPlayers - 1, body.aiCount ?? 0));
    if (!allowAI && aiCount > 0) return { error: 'AI seats are disabled for this room', status: HttpStatus.BadRequest };
    const stakeType = this.normalizeStakeType(body.stakeType);
    const stakeAmount = Math.max(0, body.stakeAmount ?? 0);
    if (stakeType === 'real-money') return { error: 'real-money stake rooms are not supported until payment settlement is enabled', status: HttpStatus.UnprocessableEntity };
    const stakeLock = await this.lockStakeForCreate(roomId, hostId, stakeType, stakeAmount);
    if (!stakeLock.ok) return { error: stakeLock.error, status: stakeLock.status };
    const aiRole = this.normalizeAIRole(body.aiRole);
    const aiDifficulty = this.normalizeAIDifficulty(body.difficulty);
    const room: RoomStored = {
      roomId,
      roomName: this.cleanText(body.roomName, 128),
      roomType: this.normalizeRoomType(body.roomType, visibility),
      mode: this.normalizeMode(body.mode),
      visibility,
      maxPlayers,
      playerIds: [hostId],
      spectatorIds: [],
      players: [{
        userId: hostId,
        displayName: this.cleanText(body.hostDisplayName, 80),
        seatIndex: 0,
        isHost: true,
        isReady: false,
        isAI: false,
        joinedAt: now,
      }],
      gameStatus: 'waiting',
      hostId,
      gameType: this.cleanText(body.gameType, 128),
      variantId: this.cleanText(body.variantId, 128),
      competitionProgramId: this.cleanText(body.competitionProgramId, 128),
      eventId: this.cleanText(body.eventId, 128),
      tournamentId: this.cleanText(body.tournamentId, 128),
      bracketMatchId: this.cleanText(body.bracketMatchId, 128),
      allowAI,
      aiCount,
      aiProviderId: this.cleanText(body.aiProviderId, 128),
      aiModelId: this.cleanText(body.aiModelId, 128),
      difficulty: aiDifficulty,
      aiRole,
      coachEnabled: body.coachEnabled === true,
      coachModelId: this.cleanText(body.coachModelId, 128),
      guideMode: this.normalizeGuideMode(body.guideMode),
      allowSpectators: body.allowSpectators !== false,
      stakeType,
      stakeAmount,
      stakeStatus: stakeLock.escrowId ? 'locked' : DEFAULT_STAKE_STATUS,
      stakeEscrowId: stakeLock.escrowId,
      stakeLocks: stakeLock.escrowId ? { [hostId]: stakeLock.escrowId } : {},
      chainStatus: DEFAULT_CHAIN_STATUS,
      turnTimerSeconds: Math.min(3600, Math.max(5, body.turnTimerSeconds ?? DEFAULT_TURN_TIMER_SECONDS)),
      region: this.cleanText(body.region, 64) || DEFAULT_REGION,
      joinCode: this.createJoinCode(roomId),
      isPrivate: visibility === 'private',
      stateVersion: 1,
      createdAt: now,
      lastActivityAt: now,
    };
    for (let i = 0; i < aiCount; i++) {
      const aiId = `ai:${roomId}:${i + 1}`;
      room.playerIds.push(aiId);
      room.players?.push({
        userId: aiId,
        displayName: `AI Seat ${i + 1}`,
        seatIndex: i + 1,
        isHost: false,
        isReady: true,
        isAI: true,
        aiProviderId: room.aiProviderId,
        aiModelId: room.aiModelId,
        difficulty: room.difficulty,
        role: aiRole,
        joinedAt: now,
      });
    }
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, [...roomIds.filter((id) => id !== roomId), roomId]);
    await this.scheduleCleanupAlarm();
    return { room };
  }

  private async getRoomByIdOrCode(value: string): Promise<RoomStored | null> {
    const exact = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${value}`);
    if (exact) return exact;
    const normalizedCode = value.trim().toUpperCase();
    if (!normalizedCode) return null;
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    for (const id of roomIds) {
      const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${id}`);
      if (room?.joinCode === normalizedCode) return room;
    }
    return null;
  }

  private async findQuickJoinRoom(filters: { gameType: string; mode?: string; allowAI?: boolean; stakeType?: string; maxPlayers?: number }): Promise<RoomStored | null> {
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    let best: RoomStored | null = null;
    for (const id of roomIds) {
      const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${id}`);
      if (!room || room.gameStatus !== 'waiting') continue;
      if (room.gameType !== filters.gameType) continue;
      if (this.roomVisibility(room) !== 'public') continue;
      if (filters.mode && room.mode !== filters.mode) continue;
      if (filters.allowAI === false && room.allowAI !== false) continue;
      if (filters.stakeType && filters.stakeType !== 'free' && room.stakeType !== filters.stakeType) continue;
      if (filters.maxPlayers && room.maxPlayers !== filters.maxPlayers) continue;
      if (room.playerIds.length >= room.maxPlayers) continue;
      if (!best || room.playerIds.length > best.playerIds.length || room.createdAt < best.createdAt) best = room;
    }
    return best;
  }

  private addPlayer(room: RoomStored, userId: string, displayName?: string): void {
    if (!room.playerIds.includes(userId)) room.playerIds.push(userId);
    const players = this.roomPlayers(room).filter((player) => player.userId !== userId);
    const occupiedSeats = new Set(players.map((player) => player.seatIndex));
    let seatIndex = 0;
    while (occupiedSeats.has(seatIndex)) seatIndex += 1;
    players.push({
      userId,
      displayName: this.cleanText(displayName, 80),
      seatIndex,
      isHost: userId === room.hostId,
      isReady: false,
      isAI: false,
      joinedAt: Date.now(),
    });
    room.players = players.map((player) => ({ ...player, isHost: player.userId === room.hostId }));
  }

  private roomPlayers(room: RoomStored): RoomPlayerStored[] {
    const storedPlayers = room.players ?? [];
    const byUserId = new Map(storedPlayers.map((player) => [player.userId, player]));
    return room.playerIds.map((userId, index) => {
      const stored = byUserId.get(userId);
      return {
        userId,
        displayName: stored?.displayName,
        seatIndex: stored?.seatIndex ?? index,
        isHost: userId === room.hostId,
        isReady: stored?.isReady ?? false,
        isAI: stored?.isAI ?? userId.startsWith('ai:'),
        aiProviderId: stored?.aiProviderId,
        aiModelId: stored?.aiModelId,
        difficulty: stored?.difficulty,
        role: stored?.role,
        joinedAt: stored?.joinedAt ?? room.createdAt,
      };
    }).sort((a, b) => a.seatIndex - b.seatIndex);
  }

  private normalizeRoomType(value: unknown, visibility: LobbyVisibility): LobbyRoomType {
    if (typeof value === 'string' && (RoomTypeValues as readonly string[]).includes(value)) return value as LobbyRoomType;
    return visibility === 'private' ? 'private' : DEFAULT_ROOM_TYPE;
  }

  private normalizeMode(value: unknown): LobbyMode {
    return typeof value === 'string' && (LobbyModeValues as readonly string[]).includes(value) ? value as LobbyMode : DEFAULT_LOBBY_MODE;
  }

  private normalizeVisibility(value: unknown, isPrivate?: boolean): LobbyVisibility {
    if (isPrivate === true) return 'private';
    return typeof value === 'string' && (LobbyVisibilityValues as readonly string[]).includes(value) ? value as LobbyVisibility : DEFAULT_VISIBILITY;
  }

  private normalizeStakeType(value: unknown): LobbyStakeType {
    return typeof value === 'string' && (LobbyStakeTypeValues as readonly string[]).includes(value) ? value as LobbyStakeType : DEFAULT_STAKE_TYPE;
  }

  private roomVisibility(room: RoomStored): LobbyVisibility {
    if (room.isPrivate === true) return 'private';
    return this.normalizeVisibility(room.visibility);
  }

  private cleanText(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    const next = value.trim().slice(0, maxLength);
    return next.length > 0 ? next : undefined;
  }

  private roomMatchesSearch(room: RoomStored, query: string): boolean {
    const values = [
      room.roomId,
      room.roomName,
      room.gameType,
      room.variantId,
      room.joinCode,
      room.mode,
      room.visibility,
      room.aiProviderId,
      room.aiModelId,
      room.coachModelId,
      room.region,
      ...this.roomPlayers(room).map((player) => player.displayName ?? player.userId),
    ];
    return values.some((value) => typeof value === 'string' && value.toLowerCase().includes(query));
  }

  private createJoinCode(roomId: string): string {
    return roomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  }

  private normalizeAIRole(value: unknown): LobbyAIRole {
    return typeof value === 'string' && (LobbyAIRoleValues as readonly string[]).includes(value) ? value as LobbyAIRole : DEFAULT_AI_ROLE;
  }

  private normalizeAIDifficulty(value: unknown): LobbyAIDifficulty {
    return typeof value === 'string' && (LobbyAIDifficultyValues as readonly string[]).includes(value) ? value as LobbyAIDifficulty : DEFAULT_AI_DIFFICULTY;
  }

  private normalizeGuideMode(value: unknown): LobbyTrainingGuideMode {
    return typeof value === 'string' && (LobbyTrainingGuideModeValues as readonly string[]).includes(value) ? value as LobbyTrainingGuideMode : DEFAULT_GUIDE_MODE;
  }

  private clampListLimit(value: string | null): number {
    const parsed = Number.parseInt(value ?? '', 10);
    if (!Number.isFinite(parsed)) return 50;
    return Math.max(1, Math.min(100, parsed));
  }

  private encodeListCursor(room: RoomView, sort: string): string {
    return encodeURIComponent(JSON.stringify({
      sort,
      roomId: room.roomId,
      createdAt: room.createdAt,
      players: room.currentPlayers,
    }));
  }

  private decodeListCursor(value: string | null): { sort?: string; roomId?: string; createdAt?: number; players?: number } | null {
    if (!value) return null;
    try {
      const decoded = JSON.parse(decodeURIComponent(value)) as { sort?: string; roomId?: string; createdAt?: number; players?: number };
      return typeof decoded === 'object' && decoded !== null ? decoded : null;
    } catch {
      return null;
    }
  }

  private sortRooms(rooms: RoomView[], sort: string): RoomView[] {
    return [...rooms].sort((a, b) => {
      if (sort === 'oldest') return a.createdAt - b.createdAt || a.roomId.localeCompare(b.roomId);
      if (sort === 'fullest') return b.currentPlayers - a.currentPlayers || b.createdAt - a.createdAt || a.roomId.localeCompare(b.roomId);
      if (sort === 'emptiest') return a.currentPlayers - b.currentPlayers || b.createdAt - a.createdAt || a.roomId.localeCompare(b.roomId);
      return b.createdAt - a.createdAt || a.roomId.localeCompare(b.roomId);
    });
  }

  private isAfterCursor(room: RoomView, cursor: { sort?: string; roomId?: string; createdAt?: number; players?: number }, sort: string): boolean {
    if (cursor.sort && cursor.sort !== sort) return true;
    const cursorCreatedAt = cursor.createdAt ?? 0;
    const cursorPlayers = cursor.players ?? 0;
    const cursorRoomId = cursor.roomId ?? '';
    if (sort === 'oldest') return room.createdAt > cursorCreatedAt || (room.createdAt === cursorCreatedAt && room.roomId > cursorRoomId);
    if (sort === 'fullest') {
      return room.currentPlayers < cursorPlayers ||
        (room.currentPlayers === cursorPlayers && room.createdAt < cursorCreatedAt) ||
        (room.currentPlayers === cursorPlayers && room.createdAt === cursorCreatedAt && room.roomId > cursorRoomId);
    }
    if (sort === 'emptiest') {
      return room.currentPlayers > cursorPlayers ||
        (room.currentPlayers === cursorPlayers && room.createdAt < cursorCreatedAt) ||
        (room.currentPlayers === cursorPlayers && room.createdAt === cursorCreatedAt && room.roomId > cursorRoomId);
    }
    return room.createdAt < cursorCreatedAt || (room.createdAt === cursorCreatedAt && room.roomId > cursorRoomId);
  }

  private stakeOperationId(kind: string, roomId: string, userId: string): string {
    const safeRoomId = roomId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48);
    const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48);
    return `lobby-stake-${kind}-${safeRoomId}-${safeUserId}`.slice(0, 120);
  }

  private async lockStakeForCreate(
    roomId: string,
    userId: string,
    stakeType: LobbyStakeType,
    stakeAmount: number
  ): Promise<{ ok: true; escrowId?: string } | { ok: false; error: string; status: number }> {
    if (stakeType !== 'game-coin' || stakeAmount <= 0) return { ok: true };
    return this.lockStakeWithCredits(roomId, userId, stakeAmount);
  }

  private async lockStakeForJoin(room: RoomStored, userId: string): Promise<{ ok: true; escrowId?: string } | { ok: false; error: string; status: number }> {
    if (room.stakeType !== 'game-coin' || (room.stakeAmount ?? 0) <= 0) return { ok: true };
    const existing = room.stakeLocks?.[userId];
    if (existing) return { ok: true, escrowId: existing };
    return this.lockStakeWithCredits(room.roomId, userId, room.stakeAmount ?? 0);
  }

  private async lockStakeWithCredits(roomId: string, userId: string, stakeAmount: number): Promise<{ ok: true; escrowId: string } | { ok: false; error: string; status: number }> {
    if (!this.env.CREDITS_DO) return { ok: false, error: 'Credits service unavailable', status: HttpStatus.ServiceUnavailable };
    const consumeId = this.stakeOperationId('lock', roomId, userId);
    const stub = this.env.CREDITS_DO.get(this.env.CREDITS_DO.idFromName(userId));
    const res = await fetchFromDO(stub, CreditsDOPaths.Consume, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        consumeId,
        amount: stakeAmount,
        currency: Currency.GP,
        description: `Lobby stake lock for ${roomId}`,
        metadata: { roomId, userId, stakeType: 'game-coin' },
      }),
    });
    const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string };
    if (!res.ok || data.success !== true) {
      return { ok: false, error: data.error ?? 'Stake lock failed', status: res.status || HttpStatus.Conflict };
    }
    return { ok: true, escrowId: consumeId };
  }

  private async refundStakeForLeave(room: RoomStored, userId: string): Promise<void> {
    if (room.gameStatus !== 'waiting' || room.stakeType !== 'game-coin' || (room.stakeAmount ?? 0) <= 0 || !room.stakeLocks?.[userId] || !this.env.CREDITS_DO) return;
    const awardId = this.stakeOperationId('refund', room.roomId, userId);
    const stub = this.env.CREDITS_DO.get(this.env.CREDITS_DO.idFromName(userId));
    const res = await fetchFromDO(stub, CreditsDOPaths.Award, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({
        awardId,
        amount: room.stakeAmount,
        description: `Lobby stake refund for ${room.roomId}`,
        metadata: { roomId: room.roomId, userId, stakeType: 'game-coin' },
      }),
    });
    if (!res.ok) await res.text().catch(() => undefined);
  }

  private async startRoomForUser(roomId: string, userId: string): Promise<
    | { started: true; roomId: string; matchId: string; handoff: { roomId: string; matchId: string; gameType?: string; status: string }; room: RoomView }
    | { error: string; status: number }
  > {
    if (!userId) return { error: 'userId required', status: HttpStatus.BadRequest };
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return { error: 'Room not found', status: HttpStatus.NotFound };
    if (room.hostId !== userId) return { error: 'Only host can start room', status: HttpStatus.Forbidden };
    if (room.gameStatus !== 'waiting') return { error: 'Room not in waiting state', status: HttpStatus.Conflict };
    const players = this.roomPlayers(room);
    const minPlayers = Math.min(MIN_START_PLAYERS, room.maxPlayers);
    if (players.length < minPlayers) return { error: 'Not enough players to start', status: HttpStatus.Conflict };
    const unreadyHumans = players.filter((player) => !player.isAI && !player.isReady);
    if (unreadyHumans.length > 0) return { error: 'All human players must be ready', status: HttpStatus.Conflict };
    const matchId = room.matchId ?? `match:${room.roomId}:${Date.now()}`;
    room.gameStatus = 'starting';
    room.matchId = matchId;
    room.stateVersion = (room.stateVersion ?? 0) + 1;
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    const view = this.toRoomView(room, userId);
    const handoff = { roomId, matchId, gameType: room.gameType, status: room.gameStatus };
    this.broadcastToRoom(roomId, { type: 'room-status', gameStatus: room.gameStatus, roomId, matchId, room: view, handoff });
    this.broadcastToRoom(roomId, { type: 'countdown-started', seconds: COUNTDOWN_SECONDS, roomId, matchId });
    return { started: true, roomId, matchId, handoff, room: view };
  }

  private async storeReconnectToken(token: string, data: { roomId: string; userId: string; displayName?: string }): Promise<void> {
    const expiresAt = Date.now() + RECONNECT_TOKEN_TTL_MS;
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.ReconnectPrefix}${token}`, { ...data, expiresAt });
    const tokens = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.ReconnectTokens)) ?? [];
    await this.ctx.storage.put(LobbyDOStoragePrefix.ReconnectTokens, [...tokens.filter((value) => value !== token), token]);
    await this.scheduleCleanupAlarm();
  }

  private async cleanupStaleRooms(now: number): Promise<void> {
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    const liveRoomIds: string[] = [];
    for (const roomId of roomIds) {
      const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
      if (!room) continue;
      if (room.playerIds.length === 0 || (room.gameStatus === 'waiting' && now - room.lastActivityAt > STALE_WAITING_ROOM_TTL_MS)) {
        await this.ctx.storage.delete(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
        continue;
      }
      liveRoomIds.push(roomId);
    }
    if (liveRoomIds.length !== roomIds.length) await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, liveRoomIds);
    const tokens = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.ReconnectTokens)) ?? [];
    const liveTokens: string[] = [];
    for (const token of tokens) {
      const stored = await this.ctx.storage.get<{ expiresAt?: number }>(`${LobbyDOStoragePrefix.ReconnectPrefix}${token}`);
      if (!stored || (stored.expiresAt ?? 0) <= now) {
        await this.ctx.storage.delete(`${LobbyDOStoragePrefix.ReconnectPrefix}${token}`);
        continue;
      }
      liveTokens.push(token);
    }
    if (liveTokens.length !== tokens.length) await this.ctx.storage.put(LobbyDOStoragePrefix.ReconnectTokens, liveTokens);
  }

  private async scheduleCleanupAlarm(): Promise<void> {
    const alarmAt = Date.now() + CLEANUP_ALARM_INTERVAL_MS;
    await this.ctx.storage.put(LobbyDOStoragePrefix.CleanupAlarmAt, alarmAt);
    if (this.env.TEST_MODE === QueryValue.True) return;
    await this.ctx.storage.setAlarm(alarmAt);
  }

  private toRoomView(room: RoomStored, viewerId?: string): RoomView {
    const spectatorIds = room.spectatorIds ?? [];
    const visibility = this.roomVisibility(room);
    return {
      roomId: room.roomId,
      roomName: room.roomName,
      roomType: room.roomType,
      mode: room.mode ?? DEFAULT_LOBBY_MODE,
      visibility,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.playerIds.length,
      currentSpectators: spectatorIds.length,
      gameStatus: room.gameStatus,
      status: room.gameStatus,
      hostId: room.hostId,
      gameType: room.gameType,
      variantId: room.variantId,
      competitionProgramId: room.competitionProgramId,
      eventId: room.eventId,
      tournamentId: room.tournamentId,
      bracketMatchId: room.bracketMatchId,
      allowAI: room.allowAI ?? true,
      aiCount: room.aiCount ?? 0,
      aiProviderId: room.aiProviderId,
      aiModelId: room.aiModelId,
      difficulty: room.difficulty ?? DEFAULT_AI_DIFFICULTY,
      aiRole: room.aiRole ?? DEFAULT_AI_ROLE,
      coachEnabled: room.coachEnabled === true,
      coachModelId: room.coachModelId,
      guideMode: room.guideMode ?? DEFAULT_GUIDE_MODE,
      allowSpectators: room.allowSpectators !== false,
      stakeType: room.stakeType ?? DEFAULT_STAKE_TYPE,
      stakeAmount: room.stakeAmount ?? 0,
      stakeStatus: room.stakeStatus ?? DEFAULT_STAKE_STATUS,
      stakeEscrowId: viewerId && room.playerIds.includes(viewerId) ? room.stakeLocks?.[viewerId] ?? room.stakeEscrowId : undefined,
      chainStatus: room.chainStatus ?? DEFAULT_CHAIN_STATUS,
      turnTimerSeconds: room.turnTimerSeconds ?? DEFAULT_TURN_TIMER_SECONDS,
      region: room.region ?? DEFAULT_REGION,
      isPrivate: visibility === 'private',
      viewerJoined: viewerId ? room.playerIds.includes(viewerId) : undefined,
      viewerSpectating: viewerId ? spectatorIds.includes(viewerId) : undefined,
      joinCode: viewerId && (room.hostId === viewerId || room.playerIds.includes(viewerId)) ? room.joinCode : undefined,
      matchId: room.matchId,
      stateVersion: room.stateVersion ?? 0,
      players: this.roomPlayers(room).map((player) => ({
        userId: player.userId,
        displayName: player.displayName,
        seatIndex: player.seatIndex,
        isHost: player.userId === room.hostId,
        isReady: player.isReady,
        isAI: player.isAI,
        aiProviderId: player.aiProviderId,
        aiModelId: player.aiModelId,
        difficulty: player.difficulty,
        role: player.role,
      })),
      createdAt: room.createdAt,
    };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let messages: unknown[];
    try {
      const parsed = JSON.parse(raw) as { messages?: unknown[] };
      messages = Array.isArray(parsed.messages) ? parsed.messages : [parsed];
    } catch {
      return;
    }
    for (const msg of messages) {
      this.handleWsMessage(ws, msg as { type?: string; payload?: unknown });
    }
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    const a = ws.deserializeAttachment() as LobbyAttachment | null;
    if (a?.roomId && a?.userId) {
      this.broadcastToRoom(a.roomId, { type: 'player-disconnected', roomId: a.roomId, userId: a.userId });
      a.roomId = null;
      a.userId = null;
      a.displayName = undefined;
      ws.serializeAttachment(a);
    }
  }

  private async handleWsMessage(ws: WebSocket, msg: { type?: string; payload?: unknown }): Promise<void> {
    const type = msg.type ?? '';
    if (type === 'join-room') {
      await this.handleWsJoinRoom(ws, (msg.payload ?? {}) as { roomId?: string; userId?: string; displayName?: string });
      return;
    }
    if (type === 'reconnect') {
      await this.handleWsReconnect(ws, (msg.payload ?? {}) as { reconnectToken?: string });
      return;
    }
    if (type === 'start-countdown') {
      await this.handleStartCountdown(ws);
      return;
    }
    if (type === 'ready' || type === 'unready') {
      await this.handleWsReady(ws, type === 'ready');
      return;
    }
    if (type === 'leave-room') {
      await this.handleWsLeaveRoom(ws);
      return;
    }
    if (type === 'chat') {
      await this.handleWsChat(ws, (msg.payload ?? {}) as { content?: string; scope?: string; toUserId?: string });
      return;
    }
    if (type === 'ping') {
      this.sendTo(ws, { type: 'pong', timestamp: Date.now() });
    }
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    await this.cleanupStaleRooms(now);
    const roomId = await this.ctx.storage.get<string>(LobbyDOStoragePrefix.CountdownAlarmRoom);
    await this.ctx.storage.delete(LobbyDOStoragePrefix.CountdownAlarmRoom);
    await this.ctx.storage.delete(LobbyDOStoragePrefix.CountdownAlarmAt);
    if (!roomId) {
      const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
      const tokens = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.ReconnectTokens)) ?? [];
      if (roomIds.length > 0 || tokens.length > 0) await this.scheduleCleanupAlarm();
      return;
    }
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (room && room.gameStatus === 'waiting') {
      room.gameStatus = 'starting';
      room.stateVersion = (room.stateVersion ?? 0) + 1;
      room.lastActivityAt = Date.now();
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
      this.broadcastToRoom(roomId, { type: 'room-status', gameStatus: 'starting', roomId });
    }
    await this.scheduleCleanupAlarm();
  }

  private filterChatContent(content: string): string {
    let out = content;
    for (const re of CHAT_BLOCKED_PATTERNS) {
      out = out.replace(re, '[filtered]');
    }
    return out;
  }

  private async handleWsReconnect(ws: WebSocket, payload: { reconnectToken?: string }): Promise<void> {
    const token = payload.reconnectToken ?? '';
    if (!token) {
      this.sendTo(ws, { type: 'error', message: 'reconnectToken required' });
      return;
    }
    const stored = await this.ctx.storage.get<{ roomId: string; userId: string; displayName?: string; expiresAt?: number }>(`${LobbyDOStoragePrefix.ReconnectPrefix}${token}`);
    if (!stored) {
      this.sendTo(ws, { type: 'error', message: 'Invalid or expired reconnectToken' });
      return;
    }
    if ((stored.expiresAt ?? 0) <= Date.now()) {
      await this.ctx.storage.delete(`${LobbyDOStoragePrefix.ReconnectPrefix}${token}`);
      this.sendTo(ws, { type: 'error', message: 'Invalid or expired reconnectToken' });
      return;
    }
    await this.handleWsJoinRoom(ws, { roomId: stored.roomId, userId: stored.userId, displayName: stored.displayName });
  }

  private async handleStartCountdown(ws: WebSocket): Promise<void> {
    const a = ws.deserializeAttachment() as LobbyAttachment;
    const roomId = a.roomId ?? '';
    const userId = a.userId ?? '';
    if (!roomId || !userId) {
      this.sendTo(ws, { type: 'error', message: 'Not in a room' });
      return;
    }
    const result = await this.startRoomForUser(roomId, userId);
    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }
    this.sendTo(ws, { type: 'start-accepted', ...result });
  }

  private async handleWsReady(ws: WebSocket, isReady: boolean): Promise<void> {
    const a = ws.deserializeAttachment() as LobbyAttachment;
    const roomId = a.roomId ?? '';
    const userId = a.userId ?? '';
    if (!roomId || !userId) {
      this.sendTo(ws, { type: 'error', message: 'Not in a room' });
      return;
    }
    const result = await this.setReadyStateForUser(roomId, userId, isReady);
    if ('error' in result) {
      this.sendTo(ws, { type: 'error', message: result.error });
      return;
    }
    this.sendTo(ws, { type: 'ready-accepted', roomId, isReady, room: result.room });
  }

  private sendTo(ws: WebSocket, data: unknown): void {
    try {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) ws.send(JSON.stringify(data));
    } catch {
      //
    }
  }

  private broadcastToRoom(roomId: string, data: unknown): void {
    const payload = JSON.stringify(data);
    for (const w of this.ctx.getWebSockets()) {
      const a = w.deserializeAttachment() as LobbyAttachment | null;
      if (a?.roomId === roomId && w.readyState === WebSocket.READY_STATE_OPEN) {
        try {
          w.send(payload);
        } catch {
          //
        }
      }
    }
  }

  private async handleWsJoinRoom(ws: WebSocket, payload: { roomId?: string; userId?: string; displayName?: string }): Promise<void> {
    const roomId = payload.roomId ?? '';
    const userId = payload.userId ?? '';
    if (!roomId || !userId) {
      this.sendTo(ws, { type: 'error', message: 'roomId and userId required' });
      return;
    }
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) {
      this.sendTo(ws, { type: 'error', message: 'Room not found' });
      return;
    }
    if (room.gameStatus !== 'waiting') {
      this.sendTo(ws, { type: 'error', message: 'Room not joinable' });
      return;
    }
    if (room.playerIds.includes(userId)) {
      const reconnectToken = crypto.randomUUID();
      await this.storeReconnectToken(reconnectToken, { roomId, userId, displayName: payload.displayName });
      const a = ws.deserializeAttachment() as LobbyAttachment;
      a.roomId = roomId;
      a.userId = userId;
      a.displayName = payload.displayName;
      ws.serializeAttachment(a);
      this.sendTo(ws, { type: 'welcome', roomId, reconnectToken, room: this.toRoomView(room, userId) });
      return;
    }
    if (room.playerIds.length >= room.maxPlayers) {
      this.sendTo(ws, { type: 'error', message: 'Room full' });
      return;
    }
    const stakeLock = await this.lockStakeForJoin(room, userId);
    if (!stakeLock.ok) {
      this.sendTo(ws, { type: 'error', message: stakeLock.error });
      return;
    }
    this.addPlayer(room, userId, payload.displayName);
    if (stakeLock.escrowId) {
      room.stakeLocks = { ...(room.stakeLocks ?? {}), [userId]: stakeLock.escrowId };
      room.stakeEscrowId = stakeLock.escrowId;
      room.stakeStatus = 'locked';
    }
    room.stateVersion = (room.stateVersion ?? 0) + 1;
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    const reconnectToken = crypto.randomUUID();
    await this.storeReconnectToken(reconnectToken, { roomId, userId, displayName: payload.displayName });
    const a = ws.deserializeAttachment() as LobbyAttachment;
    a.roomId = roomId;
    a.userId = userId;
    a.displayName = payload.displayName;
    ws.serializeAttachment(a);
    this.sendTo(ws, { type: 'welcome', roomId, reconnectToken, room: this.toRoomView(room, userId) });
    this.broadcastToRoom(roomId, { type: 'player-joined', userId, displayName: payload.displayName ?? userId, room: this.toRoomView(room, userId) });
  }

  private async handleWsLeaveRoom(ws: WebSocket): Promise<void> {
    await this.leaveRoomByAttachment(ws, ws.deserializeAttachment() as LobbyAttachment);
  }

  private async leaveRoomByAttachment(ws: WebSocket, a: LobbyAttachment): Promise<void> {
    const roomId = a.roomId ?? '';
    const userId = a.userId ?? '';
    if (!roomId || !userId) {
      a.roomId = null;
      a.userId = null;
      ws.serializeAttachment(a);
      return;
    }
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (room) {
      const idx = room.playerIds.indexOf(userId);
      if (idx !== -1) {
        room.playerIds.splice(idx, 1);
        await this.refundStakeForLeave(room, userId);
        if (room.stakeLocks) {
          delete room.stakeLocks[userId];
          if (Object.keys(room.stakeLocks).length === 0 && room.stakeType === 'game-coin') room.stakeStatus = 'refunded';
        }
        room.lastActivityAt = Date.now();
        if (room.playerIds.length === 0) {
          await this.ctx.storage.delete(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
          const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
          await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, roomIds.filter((id) => id !== roomId));
        } else {
          if (room.hostId === userId) room.hostId = room.playerIds[0];
          room.players = this.roomPlayers(room).filter((player) => player.userId !== userId).map((player) => ({
            ...player,
            isHost: player.userId === room.hostId,
          }));
          room.stateVersion = (room.stateVersion ?? 0) + 1;
          await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
        }
        await this.scheduleCleanupAlarm();
        this.broadcastToRoom(roomId, { type: 'player-left', userId, roomId });
      }
    }
    a.roomId = null;
    a.userId = null;
    a.displayName = undefined;
    ws.serializeAttachment(a);
  }

  private async handleWsChat(ws: WebSocket, payload: { content?: string; scope?: string; toUserId?: string }): Promise<void> {
    const a = ws.deserializeAttachment() as LobbyAttachment;
    const roomId = a.roomId ?? '';
    const userId = a.userId ?? '';
    const raw = typeof payload.content === 'string' ? payload.content.trim() : '';
    const content = this.filterChatContent(raw);
    if (content.length === 0) return;
    const scope = payload.scope ?? 'room';
    const now = Date.now();

    if (scope === 'global') {
      const key = `globalChat:${userId}`;
      const last = (await this.ctx.storage.get<number>(key)) ?? 0;
      if (now - last < CHAT_RATE_LIMIT_MS) {
        this.sendTo(ws, { type: 'error', message: 'Rate limited' });
        return;
      }
      await this.ctx.storage.put(key, now);
      const msg = { type: 'chat', scope: 'global', message: { messageId: crypto.randomUUID(), senderId: userId, senderName: a.displayName ?? userId, content, timestamp: now } };
      for (const w of this.ctx.getWebSockets()) {
        if (w.readyState === WebSocket.READY_STATE_OPEN) this.sendTo(w, msg);
      }
      return;
    }

    if (scope === 'whisper') {
      const toUserId = payload.toUserId ?? '';
      if (!toUserId) {
        this.sendTo(ws, { type: 'error', message: 'toUserId required for whisper' });
        return;
      }
      const key = `whisperChat:${userId}`;
      const last = (await this.ctx.storage.get<number>(key)) ?? 0;
      if (now - last < CHAT_RATE_LIMIT_MS) {
        this.sendTo(ws, { type: 'error', message: 'Rate limited' });
        return;
      }
      await this.ctx.storage.put(key, now);
      const payloadOut = { type: 'chat', scope: 'whisper', message: { messageId: crypto.randomUUID(), senderId: userId, senderName: a.displayName ?? userId, content, timestamp: now } };
      for (const w of this.ctx.getWebSockets()) {
        const att = w.deserializeAttachment() as LobbyAttachment | null;
        if (att?.userId === toUserId && w.readyState === WebSocket.READY_STATE_OPEN) {
          try {
            w.send(JSON.stringify(payloadOut));
          } catch {
            //
          }
          break;
        }
      }
      this.sendTo(ws, { type: 'chat-sent', scope: 'whisper', toUserId });
      return;
    }

    if (!roomId || !userId) {
      this.sendTo(ws, { type: 'error', message: 'Not in a room' });
      return;
    }
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return;
    const lastChatAt = room.lastChatAt ?? {};
    if (now - (lastChatAt[userId] ?? 0) < CHAT_RATE_LIMIT_MS) {
      this.sendTo(ws, { type: 'error', message: 'Rate limited' });
      return;
    }
    lastChatAt[userId] = now;
    const chatHistory = room.chatHistory ?? [];
    const chatMessage: ChatMessageStored = {
      messageId: crypto.randomUUID(),
      senderId: userId,
      senderName: a.displayName ?? userId,
      content,
      timestamp: now,
      type: 'text',
    };
    chatHistory.push(chatMessage);
    if (chatHistory.length > CHAT_HISTORY_MAX) chatHistory.shift();
    room.chatHistory = chatHistory;
    room.lastChatAt = lastChatAt;
    room.lastActivityAt = now;
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    this.broadcastToRoom(roomId, { type: 'chat', message: chatMessage });
  }
}
