import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { StateSyncCoordinatorDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { SolanaRPC } from '@/services/solana-rpc';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const SyncMode = { REALTIME: 'realtime', DEGRADED: 'degraded', FALLBACK: 'fallback', RECOVERY: 'recovery' } as const;
type SyncModeValue = (typeof SyncMode)[keyof typeof SyncMode];

export class StateSyncCoordinatorDO implements DurableObject {
  private syncMode: SyncModeValue = SyncMode.REALTIME;
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
    const stored = await this.state.storage.get<SyncModeValue>('syncMode');
    if (stored) this.syncMode = stored;
    this.initialized = true;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      await this.ensureInitialized();
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${StateSyncCoordinatorDOSegment.Register}`)) {
        return this.handleRegister(url.searchParams.get('matchId'));
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${StateSyncCoordinatorDOSegment.Unregister}`)) {
        return this.handleUnregister(url.searchParams.get('matchId'));
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${StateSyncCoordinatorDOSegment.ActiveMatches}`)) {
        return this.handleGetActiveMatches();
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${StateSyncCoordinatorDOSegment.HealthCheck}`)) {
        return this.handleHealthCheck();
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${StateSyncCoordinatorDOSegment.SetMode}`)) {
        return this.handleSetMode(request);
      }
      if (request.method === HttpMethod.Post && pathname.includes(StateSyncCoordinatorDOSegment.FallbackEnter)) {
        return this.handleFallbackEnter();
      }
      if (request.method === HttpMethod.Post && pathname.includes(StateSyncCoordinatorDOSegment.FallbackQueue)) {
        return this.handleFallbackQueue(request);
      }
      if (request.method === HttpMethod.Post && pathname.includes(StateSyncCoordinatorDOSegment.FallbackRecover)) {
        return this.handleFallbackRecover();
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('StateSyncCoordinatorDO fetch error', getStackTrace(), { error, url: request.url });
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: HttpStatus.InternalServerError,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
  }

  private async handleRegister(matchId: string | null): Promise<Response> {
    if (!matchId) {
      return new Response(JSON.stringify({ error: 'Missing matchId' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const ids = new Set<string>((await this.state.storage.get<string[]>('activeMatchIds')) ?? []);
    ids.add(matchId);
    await this.state.storage.put('activeMatchIds', Array.from(ids));
    return new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleUnregister(matchId: string | null): Promise<Response> {
    if (!matchId) {
      return new Response(JSON.stringify({ error: 'Missing matchId' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const ids = new Set<string>((await this.state.storage.get<string[]>('activeMatchIds')) ?? []);
    ids.delete(matchId);
    await this.state.storage.put('activeMatchIds', Array.from(ids));
    return new Response(JSON.stringify({ ok: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleGetActiveMatches(): Promise<Response> {
    const ids = (await this.state.storage.get<string[]>('activeMatchIds')) ?? [];
    return new Response(JSON.stringify(ids), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleHealthCheck(): Promise<Response> {
    let health: 'healthy' | 'degraded' | 'down' = 'healthy';
    const rpc = SolanaRPC.fromEnv(this.env);
    if (rpc) {
      const result = await rpc.getHealth();
      health = result === 'ok' ? 'healthy' : result === 'down' ? 'down' : 'degraded';
      if (health === 'down' && this.syncMode !== SyncMode.FALLBACK) {
        await this.handleFallbackEnter();
      } else if (health === 'healthy' && this.syncMode === SyncMode.FALLBACK) {
        await this.handleFallbackRecover();
      }
    }
    return new Response(
      JSON.stringify({
        health,
        mode: this.syncMode,
      }),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      }
    );
  }

  private async handleSetMode(request: Request): Promise<Response> {
    let body: { mode?: string };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as { mode?: string }) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const mode = body.mode;
    const valid = Object.values(SyncMode) as string[];
    if (typeof mode !== 'string' || !valid.includes(mode)) {
      return new Response(JSON.stringify({ error: 'Invalid mode', valid }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    this.syncMode = mode as SyncModeValue;
    await this.state.storage.put('syncMode', this.syncMode);
    return new Response(JSON.stringify({ ok: true, mode: this.syncMode }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleFallbackEnter(): Promise<Response> {
    this.syncMode = SyncMode.FALLBACK;
    await this.state.storage.put('syncMode', this.syncMode);
    await this.state.storage.put('fallbackQueue', []);
    this.logInfo('Entered fallback mode', getStackTrace(), { mode: this.syncMode });
    return new Response(JSON.stringify({ ok: true, mode: this.syncMode }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleFallbackQueue(request: Request): Promise<Response> {
    let body: { event?: unknown; queuedAt?: number };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as { event?: unknown; queuedAt?: number }) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const queue = (await this.state.storage.get<Array<{ event: unknown; queuedAt: number }>>('fallbackQueue')) ?? [];
    queue.push({ event: body.event ?? null, queuedAt: typeof body.queuedAt === 'number' ? body.queuedAt : Date.now() });
    await this.state.storage.put('fallbackQueue', queue);
    return new Response(JSON.stringify({ ok: true, queueLength: queue.length }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleFallbackRecover(): Promise<Response> {
    const queue = (await this.state.storage.get<Array<{ event: unknown; queuedAt: number }>>('fallbackQueue')) ?? [];
    queue.sort((a, b) => a.queuedAt - b.queuedAt);
    this.syncMode = SyncMode.REALTIME;
    await this.state.storage.put('syncMode', this.syncMode);
    await this.state.storage.put('fallbackQueue', []);
    this.logInfo('Recovered from fallback', getStackTrace(), { replayedCount: queue.length });
    return new Response(JSON.stringify({ ok: true, mode: this.syncMode, replayedCount: queue.length }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
