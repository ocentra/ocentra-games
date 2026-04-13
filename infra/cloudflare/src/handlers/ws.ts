import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { DOBaseUrl, LobbyDODefaultInstanceName, PresenceDO as PresenceDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const PRESENCE_SHARD_COUNT = 256;
function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function getPresenceShardKey(userId: string): string {
  return `presence-${fnv1a(userId) % PRESENCE_SHARD_COUNT}`;
}

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

export async function handleWsRequest(
  request: Request,
  env: Env,
  _path: string
): Promise<Response> {
  const upgradeHeader = request.headers.get(HttpHeader.Upgrade);
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    logWarn('Rejected non-websocket upgrade request', getStackTrace(), { 
      upgrade: upgradeHeader,
      connection: request.headers.get(HttpHeader.Connection)
    });
    return new Response(JSON.stringify({ error: 'Expected WebSocket upgrade' }), {
      status: HttpStatus.UpgradeRequired,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith(ApiEndpoint.Ws.Lobby)) {
    const ns = env.LOBBY_DO;
    if (!ns) {
      return new Response(JSON.stringify({ error: 'Lobby not available' }), {
        status: HttpStatus.ServiceUnavailable,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const stub = ns.get(ns.idFromName(LobbyDODefaultInstanceName));
    return stub.fetch(request);
  }

  if (pathname.startsWith('/ws/signaling/')) {
    const sessionId = pathname.replace('/ws/signaling/', '').split('/')[0] ?? 'default';
    const ns = env.SIGNALING_DO;
    if (!ns) {
      return new Response(JSON.stringify({ error: 'Signaling not available' }), {
        status: HttpStatus.ServiceUnavailable,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const stub = ns.get(ns.idFromName(sessionId));
    logDebug('Routing to Signaling DO', getStackTrace(), { sessionId });
    // Use URL + headers pattern for more robust local dev proxying of upgrades
    return stub.fetch(request.url, { 
      headers: request.headers,
      method: request.method,
      redirect: 'manual'
    });
  }

  const presenceWsPrefix = '/ws/presence/';
  if (pathname.startsWith(presenceWsPrefix)) {
    const userId = pathname.slice(presenceWsPrefix.length).split('/')[0] ?? '';
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required in path' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const ns = env.PRESENCE_DO;
    if (!ns) {
      return new Response(JSON.stringify({ error: 'Presence not available' }), {
        status: HttpStatus.ServiceUnavailable,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const shardKey = getPresenceShardKey(userId);
    const doPath = PresenceDOPaths.Ws(shardKey);
    const doUrl = `${DOBaseUrl}${doPath}?userId=${encodeURIComponent(userId)}`;
    const stub = ns.get(ns.idFromName(shardKey));
    return stub.fetch(doUrl, { headers: request.headers });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}
