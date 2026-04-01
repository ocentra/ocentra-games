import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { MatchShardDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { MatchShardDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

export interface MoveRecord {
  moveId: string;
  playerId: string;
  timestamp: number;
  data: unknown;
  stateBefore?: unknown;
  stateAfter?: unknown;
}

interface MatchCache {
  matchId: string;
  solanaMatchPda: string;
  lastSyncedSlot: number;
  lastSyncedAt: number;
  syncStatus: 'synced' | 'pending' | 'stale' | 'conflict';
  gameType: number;
  status: string;
  turnCount: number;
  stateHash: string;
  merkleRoot: string;
  gameState?: unknown;
  initialState?: unknown;
  moveHistory: MoveRecord[];
  createdAt: number;
  updatedAt: number;
}

export class MatchShardDO implements DurableObject {
  private matchCache: MatchCache | null = null;
  private initialized = false;
  private readonly log = Logger.instance;

  constructor(
    private readonly state: DurableObjectState,
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

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.matchCache = (await this.state.storage.get<MatchCache>(MatchShardDOStoragePrefix.Match)) ?? null;
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureInitialized();
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MatchShardDOSegment.Register}`)) {
        return this.handleRegister();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MatchShardDOSegment.Unregister}`)) {
        return this.handleUnregister();
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${MatchShardDOSegment.State}`)) {
        return this.handleGetState();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MatchShardDOSegment.Sync}`)) {
        return this.handleSync(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MatchShardDOSegment.AppendMove}`)) {
        return this.handleAppendMove(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('MatchShardDO fetch error', getStackTrace(), { error, url: request.url });
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: HttpStatus.InternalServerError,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
  }

  private async handleRegister(): Promise<Response> {
    if (!this.matchCache) {
      const id = this.state.id.toString();
      const matchId = id.split('-').pop() ?? id;
      this.matchCache = {
        matchId,
        solanaMatchPda: '',
        lastSyncedSlot: 0,
        lastSyncedAt: 0,
        syncStatus: 'pending',
        gameType: 0,
        status: 'pending',
        turnCount: 0,
        stateHash: '',
        merkleRoot: '',
        moveHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.state.storage.put(MatchShardDOStoragePrefix.Match, this.matchCache);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleUnregister(): Promise<Response> {
    await this.state.storage.delete(MatchShardDOStoragePrefix.Match);
    this.matchCache = null;
    return new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleGetState(): Promise<Response> {
    if (!this.matchCache) {
      return new Response(JSON.stringify(null), {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    return new Response(JSON.stringify(this.matchCache), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleSync(request: Request): Promise<Response> {
    let body: { solanaMatchPda?: string; state?: unknown; slot?: number };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as { solanaMatchPda?: string; state?: unknown; slot?: number }) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const slot = typeof body.slot === 'number' ? body.slot : 0;
    const solanaMatchPda = typeof body.solanaMatchPda === 'string' ? body.solanaMatchPda : '';
    const state = body.state;
    const stateHash = state && typeof state === 'object' && 'stateHash' in state
      ? String((state as { stateHash: unknown }).stateHash)
      : '';
    const turnCount = state && typeof state === 'object' && 'turnCount' in state
      ? Number((state as { turnCount: unknown }).turnCount)
      : 0;
    const gameType = state && typeof state === 'object' && 'gameType' in state
      ? Number((state as { gameType: unknown }).gameType)
      : 0;
    const status = state && typeof state === 'object' && 'status' in state
      ? String((state as { status: unknown }).status)
      : 'active';

    const now = Date.now();
    this.matchCache = {
      ...this.matchCache,
      matchId: this.matchCache?.matchId ?? this.state.id.toString(),
      solanaMatchPda: solanaMatchPda || (this.matchCache?.solanaMatchPda ?? ''),
      lastSyncedSlot: slot,
      lastSyncedAt: now,
      syncStatus: 'synced',
      gameType,
      status,
      turnCount,
      stateHash,
      merkleRoot: this.matchCache?.merkleRoot ?? '',
      moveHistory: this.matchCache?.moveHistory ?? [],
      gameState: this.matchCache?.gameState,
      initialState: this.matchCache?.initialState,
      createdAt: this.matchCache?.createdAt ?? now,
      updatedAt: now,
    };
    await this.state.storage.put(MatchShardDOStoragePrefix.Match, this.matchCache);
    return new Response(JSON.stringify(this.matchCache), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleAppendMove(request: Request): Promise<Response> {
    let body: { moveId?: string; playerId?: string; data?: unknown; stateBefore?: unknown; stateAfter?: unknown };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as typeof body) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const moveId = typeof body.moveId === 'string' ? body.moveId : `move-${Date.now()}`;
    const playerId = typeof body.playerId === 'string' ? body.playerId : '';
    const data = body.data;
    const stateBefore = body.stateBefore;
    const stateAfter = body.stateAfter;
    const timestamp = Date.now();
    if (!this.matchCache) {
      return new Response(JSON.stringify({ error: 'Match not registered' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const moveHistory = this.matchCache.moveHistory ?? [];
    const record: MoveRecord = { moveId, playerId, timestamp, data, stateBefore, stateAfter };
    moveHistory.push(record);
    if (stateAfter !== undefined && this.matchCache.initialState === undefined && moveHistory.length === 1) {
      this.matchCache.initialState = stateBefore;
    }
    this.matchCache.gameState = stateAfter !== undefined ? stateAfter : this.matchCache.gameState;
    this.matchCache.moveHistory = moveHistory;
    this.matchCache.turnCount = moveHistory.length;
    this.matchCache.updatedAt = timestamp;
    await this.state.storage.put(MatchShardDOStoragePrefix.Match, this.matchCache);
    return new Response(JSON.stringify({ ok: true, moveId, turnCount: moveHistory.length }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
