import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { PresenceDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { PresenceDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

type PresenceStatus = 'online' | 'away' | 'in-game' | 'in-lobby' | 'offline';

interface PresenceState {
  status: PresenceStatus;
  lastSeenAt: number;
  currentRoom?: string;
  currentGame?: string;
  statusMessage?: string;
}

function parseUserIdFromStatusPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 4 || parts[parts.length - 1] !== PresenceDOSegment.Status) return null;
  return parts[parts.length - 2] ?? null;
}

export class PresenceDO implements DurableObject {
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
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.headers.get(HttpHeader.Upgrade) === 'websocket' && pathname.endsWith(`/${PresenceDOSegment.Ws}`)) {
        const userId = url.searchParams.get('userId') ?? '';
        if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({ userId });
        return new Response(null, { status: 101, webSocket: client });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PresenceDOSegment.TypingIn}`)) {
        return this.typingIn(request);
      }
      if (pathname.includes(`/${PresenceDOSegment.Status}`)) {
        const userId = parseUserIdFromStatusPath(pathname);
        if (!userId) return this.json({ error: 'Invalid path' }, HttpStatus.BadRequest);
        if (request.method === HttpMethod.Get) return this.getStatus(userId);
        if (request.method === HttpMethod.Post) return this.updateStatus(userId, request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PresenceDOSegment.Friends}`)) {
        return this.getFriends(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PresenceDOSegment.Friends}`)) {
        return this.addFriend(request);
      }
      if (request.method === HttpMethod.Delete && pathname.endsWith(`/${PresenceDOSegment.Friends}`)) {
        return this.removeFriend(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PresenceDOSegment.Block}`)) {
        return this.block(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PresenceDOSegment.BlockCheck}`)) {
        return this.blockCheck(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('PresenceDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getStatus(userId: string): Promise<Response> {
    const key = `${PresenceDOStoragePrefix.Presence}${userId}`;
    const state = await this.ctx.storage.get<PresenceState>(key);
    const now = Date.now();
    if (!state) {
      return this.json({ status: 'offline', lastSeenAt: 0 });
    }
    const staleThresholdMs = 5 * 60 * 1000;
    const effectiveStatus = state.lastSeenAt < now - staleThresholdMs ? 'offline' : state.status;
    return this.json({
      status: effectiveStatus,
      lastSeenAt: state.lastSeenAt,
      currentRoom: state.currentRoom ?? undefined,
      currentGame: state.currentGame ?? undefined,
      statusMessage: state.statusMessage ?? undefined,
    });
  }

  private async updateStatus(userId: string, request: Request): Promise<Response> {
    let body: { status?: string; currentRoom?: string; currentGame?: string; statusMessage?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as typeof body;
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const validStatuses: PresenceStatus[] = ['online', 'away', 'in-game', 'in-lobby', 'offline'];
    const status = (validStatuses.includes((body.status ?? '') as PresenceStatus) ? body.status : 'online') as PresenceStatus;
    const key = `${PresenceDOStoragePrefix.Presence}${userId}`;
    const existing = await this.ctx.storage.get<PresenceState>(key);
    const now = Date.now();
    const state: PresenceState = {
      status,
      lastSeenAt: now,
      currentRoom: body.currentRoom ?? existing?.currentRoom,
      currentGame: body.currentGame ?? existing?.currentGame,
      statusMessage: body.statusMessage ?? existing?.statusMessage,
    };
    await this.ctx.storage.put(key, state);
    return this.json({ status: state.status, lastSeenAt: state.lastSeenAt });
  }

  private async getFriends(request: Request): Promise<Response> {
    const url = new URL(request.url, 'http://dummy');
    const userId = url.searchParams.get('userId') ?? '';
    const key = `${PresenceDOStoragePrefix.Friends}${userId}`;
    const list = await this.ctx.storage.get<Array<{ friendId: string; status: string }>>(key);
    const friends = list ?? [];
    return this.json({ friends });
  }

  private async addFriend(request: Request): Promise<Response> {
    let body: { userId?: string; friendId?: string } = {};
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    const friendId = body.friendId ?? '';
    if (!userId || !friendId) return this.json({ error: 'userId and friendId required' }, HttpStatus.BadRequest);
    const key = `${PresenceDOStoragePrefix.Friends}${userId}`;
    const list = (await this.ctx.storage.get<Array<{ friendId: string; status: string }>>(key)) ?? [];
    if (list.some((f) => f.friendId === friendId)) return this.json({ friends: list });
    list.push({ friendId, status: 'accepted' });
    await this.ctx.storage.put(key, list);
    return this.json({ friends: list });
  }

  private async removeFriend(request: Request): Promise<Response> {
    let body: { userId?: string; friendId?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as typeof body;
    } catch {
      return this.json({ removed: true });
    }
    const userId = body.userId ?? '';
    const friendId = body.friendId ?? '';
    if (!userId || !friendId) return this.json({ removed: true });
    const key = `${PresenceDOStoragePrefix.Friends}${userId}`;
    const list = (await this.ctx.storage.get<Array<{ friendId: string; status: string }>>(key)) ?? [];
    const filtered = list.filter((f) => f.friendId !== friendId);
    await this.ctx.storage.put(key, filtered);
    return this.json({ removed: true, friends: filtered });
  }

  private async block(request: Request): Promise<Response> {
    let body: { userId?: string; targetId?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as typeof body;
    } catch {
      return this.json({ blocked: true });
    }
    const userId = body.userId ?? '';
    const targetId = body.targetId ?? '';
    if (userId && targetId) {
      const key = `${PresenceDOStoragePrefix.Block}${userId}`;
      const set = (await this.ctx.storage.get<string[]>(key)) ?? [];
      if (!set.includes(targetId)) {
        set.push(targetId);
        await this.ctx.storage.put(key, set);
      }
    }
    return this.json({ blocked: true });
  }

  private async blockCheck(request: Request): Promise<Response> {
    const url = new URL(request.url, 'http://dummy');
    const userId = url.searchParams.get('userId') ?? '';
    const targetId = url.searchParams.get('targetId') ?? '';
    if (!userId) return this.json({ blocked: false });
    const key = `${PresenceDOStoragePrefix.Block}${userId}`;
    const list = (await this.ctx.storage.get<string[]>(key)) ?? [];
    const blocked = list.includes(targetId);
    return this.json({ blocked });
  }

  private async typingIn(request: Request): Promise<Response> {
    let body: { fromUserId?: string; conversationId?: string; targetUserId?: string } = {};
    try {
      body = (await request.json().catch(() => ({}))) as typeof body;
    } catch {
      return this.json({ delivered: 0 });
    }
    const { fromUserId, conversationId, targetUserId } = body;
    if (!fromUserId || !conversationId || !targetUserId) return this.json({ delivered: 0 });
    const payload = JSON.stringify({ type: 'typing', from: fromUserId, conversationId });
    let delivered = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as { userId?: string } | null;
      if (att?.userId === targetUserId && ws.readyState === WebSocket.READY_STATE_OPEN) {
        try {
          ws.send(payload);
          delivered++;
        } catch {
          //
        }
      }
    }
    return this.json({ delivered });
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {}

  webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {}

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
