import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { StateSyncService } from '@/services/StateSyncService';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
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

export async function handleSyncRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  logInfo('Sync request', getStackTrace(), { path, method: request.method });
  const sync = new StateSyncService(env);

  if (path === ApiEndpoint.Sync.ToSolana && request.method === HttpMethod.Post) {
    return new Response(
      JSON.stringify({ error: 'Sync to Solana not implemented', code: 'NOT_IMPLEMENTED' }),
      {
        status: HttpStatus.NotImplemented,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      }
    );
  }

  if (path === ApiEndpoint.Sync.Health && request.method === HttpMethod.Get) {
    const health = await sync.getSyncHealth();
    logDebug('Sync health', getStackTrace(), { health });
    return new Response(JSON.stringify(health), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (path === ApiEndpoint.Sync.FromSolana && request.method === HttpMethod.Post) {
    let body: { matchId?: string; solanaMatchPda?: string; state?: unknown; slot?: number };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as typeof body) : {};
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
      );
    }
    const matchId = body.matchId ?? '';
    const solanaMatchPda = body.solanaMatchPda ?? '';
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Missing matchId' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
      );
    }
    let slot: number;
    let state: { stateHash: string; turnCount: number; gameType: number; status: string };
    if (body.state !== undefined && body.state !== null && typeof body.state === 'object') {
      state = sync.normalizeSolanaState(body.state);
      slot = typeof body.slot === 'number' ? body.slot : 0;
    } else if (solanaMatchPda && env.SOLANA_RPC_URL) {
      const fetched = await sync.fetchStateFromSolana(solanaMatchPda);
      if (!fetched) {
        return new Response(
          JSON.stringify({ error: 'Solana account not found or RPC failed' }),
          { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
        );
      }
      state = fetched.state;
      slot = fetched.slot;
    } else {
      state = { stateHash: '', turnCount: 0, gameType: 0, status: 'active' };
      slot = typeof body.slot === 'number' ? body.slot : 0;
    }
    const statePayload = { ...state, solanaMatchPda };
    const cache = await sync.syncFromSolana(matchId, solanaMatchPda, statePayload, slot);
    if (!cache) {
      return new Response(
        JSON.stringify({ error: 'Sync failed or MATCH_SHARD_DO not configured' }),
        { status: HttpStatus.ServiceUnavailable, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
      );
    }
    return new Response(JSON.stringify(cache), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (path === ApiEndpoint.Sync.Reconcile && request.method === HttpMethod.Post) {
    let body: { matchId?: string };
    try {
      const text = await request.text();
      body = text ? (JSON.parse(text) as { matchId?: string }) : {};
    } catch {
      logWarn('Sync Reconcile: invalid JSON', getStackTrace(), { path });
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
      );
    }
    const matchId = body.matchId ?? '';
    if (!matchId) {
      logWarn('Sync Reconcile: missing matchId', getStackTrace(), { path });
      return new Response(
        JSON.stringify({ error: 'Missing matchId' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
      );
    }
    const report = await sync.reconcile(matchId);
    if (!report) {
      logWarn('Sync Reconcile: failed or MATCH_SHARD_DO not configured', getStackTrace(), { matchId });
      return new Response(
        JSON.stringify({ error: 'Reconcile failed or MATCH_SHARD_DO not configured' }),
        { status: HttpStatus.ServiceUnavailable, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
      );
    }
    logInfo('Sync Reconcile success', getStackTrace(), { matchId, discrepancies: report.discrepancies.length });
    return new Response(JSON.stringify(report), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  logDebug('Sync path not matched', getStackTrace(), { path });
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}
