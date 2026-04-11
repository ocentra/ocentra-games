import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpContentType, HttpHeader, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { DOBaseUrl, PresenceDO as PresenceDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { extractIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';

export const OPENAPI_USER_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
export const DEFAULT_SHARD = 'default';
export const DEFAULT_REGION = 'default';
export const PRESENCE_SHARD_COUNT = 256;
export const LOBBY_SHARD_COUNT = 64;
export const ADMIN_AUTH_TRACE_HEADER_VALUE = 'admin-auth-flow';
export const LOG_ADMIN_AUTH = false;

export function normalizeOpenApiPathSegment(value: string): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    //
  }
  return OPENAPI_USER_ID_PATTERN.test(decoded) ? decoded : null;
}

export function validateOpenApiUserIdPath(
  path: string,
  endpoint: string,
  request: Request,
  env: Env
): { userId: string | null; response?: Response } {
  const result = extractIdFromPath(path, endpoint);
  const normalized = result ? normalizeOpenApiPathSegment(result) : null;
  if (!normalized) {
    return {
      userId: null,
      response: new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'User ID required',
        }),
        {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        }
      ),
    };
  }
  return { userId: normalized };
}

export function isAdminAuthTraceRequest(request: Request): boolean {
  return request.headers.get(HttpHeader.XEnableAbortDebug) === ADMIN_AUTH_TRACE_HEADER_VALUE;
}

export function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getPresenceShardKey(userId: string): string {
  return `presence-${fnv1a(userId) % PRESENCE_SHARD_COUNT}`;
}

export function getLobbyShardKey(roomId: string): string {
  return `lobby-${fnv1a(roomId) % LOBBY_SHARD_COUNT}`;
}

export async function doFetch(
  stub: DurableObjectStub,
  path: string,
  options: { method?: string; body?: string } = {}
): Promise<Response> {
  const url = `${DOBaseUrl}${path}`;
  const res = await stub.fetch(url, {
    method: options.method ?? HttpMethod.Get,
    body: options.body,
    headers: options.body ? { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } : undefined,
  });
  const body = await res.text().catch(() => '');
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export function stubJson(env: Env, data: unknown, status: number = HttpStatus.Ok): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function isBlockedBy(env: Env, blockerId: string, targetId: string): Promise<boolean> {
  if (!env.PRESENCE_DO || !blockerId || !targetId) {
    return false;
  }
  const shardKey = getPresenceShardKey(blockerId);
  const stub = env.PRESENCE_DO.get(env.PRESENCE_DO.idFromName(shardKey));
  const res = await doFetch(
    stub,
    `${PresenceDOPaths.BlockCheck(shardKey)}?userId=${encodeURIComponent(blockerId)}&targetId=${encodeURIComponent(targetId)}`,
    { method: HttpMethod.Get }
  );
  if (!res.ok) {
    await res.text().catch(() => undefined);
    return false;
  }
  const data = (await res.json().catch(() => ({}))) as { blocked?: boolean };
  return data.blocked === true;
}

export function parseConversationTargets(conversationId: string, fromUserId: string): string[] {
  const parts = conversationId.split(':').filter(Boolean);
  if (parts[0] === 'dm' && parts.length >= 3) {
    const others = [parts[1], parts[2]].filter((id) => id && id !== fromUserId);
    return [...new Set(others)];
  }
  if (parts[0] === 'dm' && parts.length === 2) {
    const other = parts[1] === fromUserId ? '' : parts[1];
    return other ? [other] : [];
  }
  if (parts.length >= 2) {
    return [...new Set(parts.filter((id) => id && id !== fromUserId))];
  }
  return [];
}
