import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { PlayerShardDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

interface PlayerCache {
  playerId: string;
  displayName: string;
  walletAddress: string;
  elo: number;
  gamesPlayed: number;
  gamesWon: number;
  lastSyncedAt: number;
}

export class PlayerShardDO implements DurableObject {
  private players: Map<string, PlayerCache> = new Map();
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
    const stored = await this.state.storage.get<[string, PlayerCache][]>('players');
    if (stored) this.players = new Map(stored);
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureInitialized();
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${PlayerShardDOSegment.State}`)) {
        const playerId = url.searchParams.get('playerId');
        return this.handleGetPlayer(playerId);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${PlayerShardDOSegment.Sync}`)) {
        return this.handleSyncBatch(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('PlayerShardDO fetch error', getStackTrace(), { error, url: request.url });
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: HttpStatus.InternalServerError,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
  }

  private async handleGetPlayer(playerId: string | null): Promise<Response> {
    if (!playerId) {
      return new Response(JSON.stringify({ error: 'Missing playerId' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const player = this.players.get(playerId) ?? null;
    return new Response(JSON.stringify(player), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleSyncBatch(request: Request): Promise<Response> {
    let body: { playerIds?: string[]; players?: PlayerCache[] };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as { playerIds?: string[]; players?: PlayerCache[] }) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const now = Date.now();
    if (Array.isArray(body.players)) {
      for (const p of body.players) {
        if (p && typeof p.playerId === 'string') {
          this.players.set(p.playerId, {
            playerId: p.playerId,
            displayName: typeof p.displayName === 'string' ? p.displayName : '',
            walletAddress: typeof p.walletAddress === 'string' ? p.walletAddress : '',
            elo: typeof p.elo === 'number' ? p.elo : 0,
            gamesPlayed: typeof p.gamesPlayed === 'number' ? p.gamesPlayed : 0,
            gamesWon: typeof p.gamesWon === 'number' ? p.gamesWon : 0,
            lastSyncedAt: now,
          });
        }
      }
    }
    if (Array.isArray(body.playerIds)) {
      for (const id of body.playerIds) {
        if (typeof id === 'string' && !this.players.has(id)) {
          this.players.set(id, {
            playerId: id,
            displayName: '',
            walletAddress: '',
            elo: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            lastSyncedAt: now,
          });
        }
      }
    }
    await this.state.storage.put('players', Array.from(this.players.entries()));
    return new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
