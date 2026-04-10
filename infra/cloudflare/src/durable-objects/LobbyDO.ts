import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { LobbyDOSegment, LobbyDODefaultInstanceName } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { LobbyDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
const MAX_ROOMS_PER_SHARD = 500;
const DEFAULT_MAX_PLAYERS = 13;
const MIN_MAX_PLAYERS = 1;
const CHAT_RATE_LIMIT_MS = 1000;
const CHAT_HISTORY_MAX = 100;
const COUNTDOWN_SECONDS = 5;
const CHAT_BLOCKED_PATTERNS = [/badword/i, /spam/i];

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

interface RoomStored {
  roomId: string;
  roomType: 'lobby' | 'game' | 'tournament' | 'private';
  maxPlayers: number;
  playerIds: string[];
  spectatorIds?: string[];
  gameStatus: 'waiting' | 'starting' | 'in-progress' | 'ended';
  hostId: string;
  gameType?: string;
  isPrivate?: boolean;
  createdAt: number;
  lastActivityAt: number;
  chatHistory?: ChatMessageStored[];
  lastChatAt?: Record<string, number>;
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
      const roomIdForAction = (action === LobbyDOSegment.Join || action === LobbyDOSegment.Leave || action === LobbyDOSegment.Spectate) ? (parts[segmentIndex] ?? '') : null;

      if (request.method === HttpMethod.Get && (segment === LobbyDOSegment.Rooms || pathname.endsWith(`/${LobbyDOSegment.Rooms}`))) {
        return this.listRooms(request);
      }
      if (request.method === HttpMethod.Post && (segment === LobbyDOSegment.Rooms || pathname.endsWith(`/${LobbyDOSegment.Rooms}`))) {
        return this.createRoom(request);
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
    const url = new URL(request.url, 'http://dummy');
    const userId = url.searchParams.get('userId') ?? undefined;
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    const rooms: Array<{ roomId: string; roomType: string; maxPlayers: number; currentPlayers: number; currentSpectators: number; gameStatus: string; hostId: string; gameType?: string; isPrivate?: boolean; createdAt: number }> = [];
    for (const id of roomIds) {
      const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${id}`);
      if (room && room.gameStatus === 'waiting') {
        const spectatorIds = room.spectatorIds ?? [];
        if (room.isPrivate && (!userId || (!room.playerIds.includes(userId) && !spectatorIds.includes(userId)))) continue;
        rooms.push(this.toRoomView(room));
      }
    }
    return this.json({ rooms });
  }

  private async createRoom(request: Request): Promise<Response> {
    let body: { roomType?: string; maxPlayers?: number; gameType?: string; hostId: string; hostDisplayName?: string; roomId?: string; isPrivate?: boolean };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const hostId = body.hostId ?? '';
    if (!hostId) return this.json({ error: 'hostId required' }, HttpStatus.BadRequest);
    const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
    if (roomIds.length >= MAX_ROOMS_PER_SHARD) return this.json({ error: 'Room limit reached' }, HttpStatus.ServiceUnavailable);
    const maxPlayers = Math.min(DEFAULT_MAX_PLAYERS, Math.max(MIN_MAX_PLAYERS, body.maxPlayers ?? DEFAULT_MAX_PLAYERS));
    const roomId = typeof body.roomId === 'string' && body.roomId.length > 0 ? body.roomId : crypto.randomUUID();
    const now = Date.now();
    const room: RoomStored = {
      roomId,
      roomType: (body.roomType === 'game' || body.roomType === 'tournament' || body.roomType === 'private') ? body.roomType : 'lobby',
      maxPlayers,
      playerIds: [hostId],
      spectatorIds: [],
      gameStatus: 'waiting',
      hostId,
      gameType: body.gameType,
      isPrivate: body.isPrivate === true,
      createdAt: now,
      lastActivityAt: now,
    };
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    roomIds.push(roomId);
    await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, roomIds);
    return this.json({ roomId, joined: true, spectating: false, room: this.toRoomView(room) });
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
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room) return this.json({ error: 'Room not found' }, HttpStatus.NotFound);
    if (room.gameStatus !== 'waiting') return this.json({ error: 'Room not joinable' }, HttpStatus.Conflict);
    const spectatorIds = room.spectatorIds ?? [];
    room.spectatorIds = spectatorIds.filter((id) => id !== userId);
    if (room.playerIds.includes(userId)) {
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
      return this.json({ joined: true, roomId, spectating: false, room: this.toRoomView(room) });
    }
    if (room.playerIds.length >= room.maxPlayers) return this.json({ error: 'Room full' }, HttpStatus.Conflict);
    room.playerIds.push(userId);
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    return this.json({ joined: true, roomId, spectating: false, room: this.toRoomView(room) });
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
    room.spectatorIds = room.spectatorIds ?? [];
    if (room.playerIds.includes(userId)) return this.json({ error: 'Already in room as player' }, HttpStatus.Conflict);
    if (!room.spectatorIds.includes(userId)) {
      room.spectatorIds.push(userId);
      room.lastActivityAt = Date.now();
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    }
    return this.json({ joined: true, roomId, spectating: true, room: this.toRoomView(room) });
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
    room.lastActivityAt = Date.now();
    if (room.playerIds.length === 0 && (room.spectatorIds?.length ?? 0) === 0) {
      await this.ctx.storage.delete(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
      const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
      const newIds = roomIds.filter((id) => id !== roomId);
      await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, newIds);
    } else {
      if (room.hostId === userId) room.hostId = room.playerIds[0];
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    }
    return this.json({ left: true });
  }

  private toRoomView(room: RoomStored): { roomId: string; roomType: string; maxPlayers: number; currentPlayers: number; currentSpectators: number; gameStatus: string; hostId: string; gameType?: string; isPrivate?: boolean; createdAt: number } {
    return {
      roomId: room.roomId,
      roomType: room.roomType,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.playerIds.length,
      currentSpectators: room.spectatorIds?.length ?? 0,
      gameStatus: room.gameStatus,
      hostId: room.hostId,
      gameType: room.gameType,
      isPrivate: room.isPrivate,
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
      this.leaveRoomByAttachment(ws, a).catch((e) => this.log.logError('LobbyDO leaveRoomByAttachment', getStackTrace(), { error: e }));
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
    const roomId = await this.ctx.storage.get<string>(LobbyDOStoragePrefix.CountdownAlarmRoom);
    await this.ctx.storage.delete(LobbyDOStoragePrefix.CountdownAlarmRoom);
    if (!roomId) return;
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (room && room.gameStatus === 'waiting') {
      room.gameStatus = 'starting';
      room.lastActivityAt = Date.now();
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
      this.broadcastToRoom(roomId, { type: 'room-status', gameStatus: 'starting', roomId });
    }
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
    const stored = await this.ctx.storage.get<{ roomId: string; userId: string; displayName?: string }>(`${LobbyDOStoragePrefix.ReconnectPrefix}${token}`);
    if (!stored) {
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
    const room = await this.ctx.storage.get<RoomStored>(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
    if (!room || room.hostId !== userId) {
      this.sendTo(ws, { type: 'error', message: 'Only host can start countdown' });
      return;
    }
    if (room.gameStatus !== 'waiting') {
      this.sendTo(ws, { type: 'error', message: 'Room not in waiting state' });
      return;
    }
    await this.ctx.storage.put(LobbyDOStoragePrefix.CountdownAlarmRoom, roomId);
    this.ctx.storage.setAlarm(Date.now() + COUNTDOWN_SECONDS * 1000).catch(() => {});
    this.broadcastToRoom(roomId, { type: 'countdown-started', seconds: COUNTDOWN_SECONDS });
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
      await this.ctx.storage.put(`${LobbyDOStoragePrefix.ReconnectPrefix}${reconnectToken}`, { roomId, userId, displayName: payload.displayName });
      const a = ws.deserializeAttachment() as LobbyAttachment;
      a.roomId = roomId;
      a.userId = userId;
      a.displayName = payload.displayName;
      ws.serializeAttachment(a);
      this.sendTo(ws, { type: 'welcome', roomId, reconnectToken, room: { roomId: room.roomId, currentPlayers: room.playerIds.length, maxPlayers: room.maxPlayers } });
      return;
    }
    if (room.playerIds.length >= room.maxPlayers) {
      this.sendTo(ws, { type: 'error', message: 'Room full' });
      return;
    }
    room.playerIds.push(userId);
    room.lastActivityAt = Date.now();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
    const reconnectToken = crypto.randomUUID();
    await this.ctx.storage.put(`${LobbyDOStoragePrefix.ReconnectPrefix}${reconnectToken}`, { roomId, userId, displayName: payload.displayName });
    const a = ws.deserializeAttachment() as LobbyAttachment;
    a.roomId = roomId;
    a.userId = userId;
    a.displayName = payload.displayName;
    ws.serializeAttachment(a);
    this.sendTo(ws, { type: 'welcome', roomId, reconnectToken, room: { roomId: room.roomId, currentPlayers: room.playerIds.length, maxPlayers: room.maxPlayers } });
    this.broadcastToRoom(roomId, { type: 'player-joined', userId, displayName: payload.displayName ?? userId });
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
        room.lastActivityAt = Date.now();
        if (room.playerIds.length === 0) {
          await this.ctx.storage.delete(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`);
          const roomIds = (await this.ctx.storage.get<string[]>(LobbyDOStoragePrefix.RoomIds)) ?? [];
          await this.ctx.storage.put(LobbyDOStoragePrefix.RoomIds, roomIds.filter((id) => id !== roomId));
        } else {
          if (room.hostId === userId) room.hostId = room.playerIds[0];
          await this.ctx.storage.put(`${LobbyDOStoragePrefix.RoomPrefix}${roomId}`, room);
        }
        this.broadcastToRoom(roomId, { type: 'player-left', userId });
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
