import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { GameName, GameTypeId } from '@ocentra/endpoint-domain/constants/game';
import { extractIdFromPath, extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import { DOBaseUrl } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import {
  LobbyDO as LobbyDOPaths,
  MatchmakingDO as MatchmakingDOPaths,
  PresenceDO as PresenceDOPaths,
  AuditLogDO as AuditLogDOPaths,
  ProgressionDO as ProgressionDOPaths,
  RewardDO as RewardDOPaths,
  AntiCheatDO as AntiCheatDOPaths,
  FraudDetectionDO as FraudDetectionDOPaths,
  PenaltyDO as PenaltyDOPaths,
  ProfileDO as ProfileDOPaths,
  MessageDO as MessageDOPaths,
  ActivityFeedDO as ActivityFeedDOPaths,
  PartyDO as PartyDOPaths,
  PartyDOSegment,
  NotificationDO as NotificationDOPaths,
  InventoryDO as InventoryDOPaths,
  MarketplaceDO as MarketplaceDOPaths,
  TournamentDO as TournamentDOPaths,
  SettingsDO as SettingsDOPaths,
  ProfileDOSegment,
  CreditsDO as CreditsDOPaths,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { getCatalogFromEnv, saveCatalogToKV } from '@/data/ai-catalog';
import type { AICatalogProviderEntry } from '@/data/ai-catalog-types';
import { AuditTrailService } from '@/services/AuditTrailService';
import { SecurityMonitoringService } from '@/services/SecurityMonitoringService';
import { getPersonalizedContentFromData, getChurnPredictionFromData } from '@/logic/retention';
import { generateTotpSecret, verifyTotpCode } from '@/utils/totp';
import { earnGP } from '@/handlers/credits';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';
import { getFirestoreUsersCollectionUrl, getFirestoreAdminActivityCollectionUrl, getFirestoreUserUrl } from '@/utils/firebase';
import { getFirestoreAuthHeader } from '@/utils/firebase-service-auth';
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

const DEFAULT_SHARD = 'default';
const DEFAULT_REGION = 'default';
const PRESENCE_SHARD_COUNT = 256;
const LOBBY_SHARD_COUNT = 64;
const ADMIN_AUTH_TRACE_HEADER_VALUE = 'admin-auth-flow';
const LOG_ADMIN_AUTH = false;

function isAdminAuthTraceRequest(request: Request): boolean {
  return request.headers.get(HttpHeader.XEnableAbortDebug) === ADMIN_AUTH_TRACE_HEADER_VALUE;
}

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

function getLobbyShardKey(roomId: string): string {
  return `lobby-${fnv1a(roomId) % LOBBY_SHARD_COUNT}`;
}

async function doFetch(
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

function stubJson(env: Env, data: unknown, status: number = HttpStatus.Ok): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleLobbyRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Lobby request', getStackTrace(), { path });
  const ns = env.LOBBY_DO;
  if (!ns) {
    logDebug('Lobby: DO not configured, returning empty rooms', getStackTrace(), { path });
    return stubJson(env, { rooms: [] });
  }
  const parts = path.split('/').filter(Boolean);
  const roomIdFromPath = (path.includes('join') || path.includes('leave')) ? (parts[3] ?? '') : '';
  const isJoin = path.includes('join');
  const isLeave = path.includes('leave');
  const shardKey = roomIdFromPath && (isJoin || isLeave) ? getLobbyShardKey(roomIdFromPath) : DEFAULT_SHARD;
  let bodyText: string | undefined;
  if (request.method === HttpMethod.Post) {
    bodyText = await request.text();
    const isCreateRoom = path.includes('rooms') && !isJoin && !isLeave;
    if (isCreateRoom && bodyText) {
      try {
        const body = JSON.parse(bodyText) as { roomId?: string; hostId?: string; [k: string]: unknown };
        const roomId = body.roomId ?? crypto.randomUUID();
        const shardForCreate = getLobbyShardKey(roomId);
        body.roomId = roomId;
        bodyText = JSON.stringify(body);
        const stubCreate = ns.get(ns.idFromName(shardForCreate));
        const doPathCreate = LobbyDOPaths.Rooms(shardForCreate);
        const resCreate = await doFetch(stubCreate, doPathCreate, { method: HttpMethod.Post, body: bodyText });
        const dataCreate = await resCreate.json().catch(() => ({}));
        return new Response(JSON.stringify(dataCreate), { status: resCreate.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
      } catch {
        //
      }
    }
  }
  if (request.method === HttpMethod.Get && !isJoin && !isLeave) {
    let userId: string | undefined;
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, '');
    if (authResult instanceof Response) userId = undefined;
    else userId = authResult.userId;
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const allRooms: Array<{ roomId: string; roomType: string; maxPlayers: number; currentPlayers: number; gameStatus: string; hostId: string; gameType?: string; isPrivate?: boolean; createdAt: number }> = [];
    for (let i = 0; i < LOBBY_SHARD_COUNT; i++) {
      const sk = `lobby-${i}`;
      const stub = ns.get(ns.idFromName(sk));
      const res = await doFetch(stub, LobbyDOPaths.Rooms(sk) + query, { method: HttpMethod.Get });
      const data = (await res.json().catch(() => ({}))) as { rooms?: typeof allRooms };
      if (Array.isArray(data.rooms)) allRooms.push(...data.rooms);
    }
    return new Response(JSON.stringify({ rooms: allRooms }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  const doPath = isJoin ? LobbyDOPaths.Join(shardKey, roomIdFromPath) : isLeave ? LobbyDOPaths.Leave(shardKey, roomIdFromPath) : LobbyDOPaths.Rooms(shardKey);
  const stub = ns.get(ns.idFromName(shardKey));
  const res = await doFetch(stub, doPath, { method: request.method, body: bodyText });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleMatchmakingRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Matchmaking request', getStackTrace(), { path });
  const ns = env.MATCHMAKING_DO;
  if (!ns) {
    logDebug('Matchmaking: DO not configured, returning stub ticket', getStackTrace(), { path });
    return stubJson(env, { ticketId: crypto.randomUUID(), position: 0 });
  }
  const stub = ns.get(ns.idFromName(DEFAULT_REGION));
  const search = new URL(request.url).search;
  const isLeave = path.endsWith('leave') || (path.endsWith('queue') && request.method === HttpMethod.Delete);
  const doPath =
    path.endsWith('queue') && request.method !== HttpMethod.Delete
      ? MatchmakingDOPaths.Queue(DEFAULT_REGION)
      : isLeave
        ? MatchmakingDOPaths.Leave(DEFAULT_REGION) + (search ? search : '')
        : MatchmakingDOPaths.Status(DEFAULT_REGION) + (search ? search : '');
  const method = isLeave ? (request.method === HttpMethod.Delete ? HttpMethod.Delete : HttpMethod.Post) : request.method;
  const res = await doFetch(stub, doPath, { method, body: method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleFriendsRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Friends request', getStackTrace(), { path });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for friends');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const ns = env.PRESENCE_DO;
  if (!ns) return stubJson(env, { friends: [] });
  const shardKey = getPresenceShardKey(userId);
  const stub = ns.get(ns.idFromName(shardKey));
  const friendsBase = ApiEndpoint.Friends.Base.replace(/\/$/, '');
  const pathAfterFriends = path.startsWith(friendsBase) ? path.slice(friendsBase.length).replace(/^\//, '') : '';
  const friendsSegments = pathAfterFriends.split('/').filter(Boolean);
  if (path.startsWith(ApiEndpoint.Users.Base) && path.endsWith('/block')) {
    const pathAfterUsers = path.replace(ApiEndpoint.Users.Base, '').replace(/^\//, '');
    const blockSegments = pathAfterUsers.split('/').filter(Boolean);
    const targetId = blockSegments[0] ?? '';
    if (!targetId) return new Response(JSON.stringify({ error: 'User id required' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    const doPath = PresenceDOPaths.Block(shardKey);
    const res = await doFetch(stub, doPath, { method: HttpMethod.Post, body: JSON.stringify({ userId, targetId }) });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (path.startsWith(friendsBase)) {
    if (request.method === HttpMethod.Get) {
      const doPath = PresenceDOPaths.Friends(shardKey) + `?userId=${encodeURIComponent(userId)}`;
      const res = await doFetch(stub, doPath, { method: HttpMethod.Get });
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    const friendId = friendsSegments[0] ?? '';
    if (!friendId) return new Response(JSON.stringify({ error: 'Friend id required' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    if (request.method === HttpMethod.Post) {
      const doPath = PresenceDOPaths.Friends(shardKey);
      const res = await doFetch(stub, doPath, { method: HttpMethod.Post, body: JSON.stringify({ userId, friendId }) });
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    if (request.method === HttpMethod.Delete) {
      const doPath = PresenceDOPaths.Friends(shardKey);
      const res = await doFetch(stub, doPath, { method: HttpMethod.Delete, body: JSON.stringify({ userId, friendId }) });
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
  }
  return new Response(JSON.stringify({ error: 'Not Found' }), { status: HttpStatus.NotFound, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

function parseConversationTargets(conversationId: string, fromUserId: string): string[] {
  const parts = conversationId.split(':').filter(Boolean);
  if (parts[0] === 'dm' && parts.length >= 3) {
    const others = [parts[1], parts[2]].filter((id) => id && id !== fromUserId);
    return [...new Set(others)];
  }
  if (parts[0] === 'dm' && parts.length === 2) {
    const other = parts[1] === fromUserId ? '' : parts[1];
    return other ? [other] : [];
  }
  return [];
}

export async function handlePresenceRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Presence request', getStackTrace(), { path });
  const ns = env.PRESENCE_DO;
  if (!ns) {
    logDebug('Presence: DO not configured', getStackTrace(), { path });
    return stubJson(env, { status: 'offline', friends: [] });
  }
  const typingPath = ApiEndpoint.Presence.Typing.replace(/\/$/, '');
  const isTyping = path === typingPath || path.endsWith('/typing');
  if (isTyping && request.method === HttpMethod.Post) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for typing');
    if (authResult instanceof Response) return authResult;
    const fromUserId = authResult.userId;
    let body: { conversationId?: string } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as typeof body;
    } catch {
      return stubJson(env, { delivered: 0 }, HttpStatus.BadRequest);
    }
    const conversationId = body.conversationId ?? '';
    if (!conversationId) return stubJson(env, { delivered: 0 });
    const targetUserIds = parseConversationTargets(conversationId, fromUserId);
    let delivered = 0;
    for (const targetUserId of targetUserIds) {
      const shardKey = getPresenceShardKey(targetUserId);
      const stub = ns.get(ns.idFromName(shardKey));
      const doPath = PresenceDOPaths.TypingIn(shardKey);
      const res = await doFetch(stub, doPath, {
        method: HttpMethod.Post,
        body: JSON.stringify({ fromUserId, conversationId, targetUserId }),
      });
      const data = (await res.json().catch(() => ({}))) as { delivered?: number };
      delivered += typeof data.delivered === 'number' ? data.delivered : 0;
    }
    return stubJson(env, { delivered });
  }
  const pathAfterBase = path.replace(ApiEndpoint.Presence.Base, '').replace(/^\//, '');
  const segments = pathAfterBase.split('/').filter(Boolean);
  const userId = segments[0] ?? '';
  const shardKey = userId ? getPresenceShardKey(userId) : DEFAULT_SHARD;
  const stub = ns.get(ns.idFromName(shardKey));
  const doPath = path.endsWith('friends') ? PresenceDOPaths.Friends(shardKey) : path.endsWith('block') ? PresenceDOPaths.Block(shardKey) : PresenceDOPaths.Status(shardKey, userId);
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleAuditRequest(request: Request, env: Env, path: string): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for audit');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;

  const auditService = new AuditTrailService(env);

  if (path.endsWith('verify')) {
    const targetUserId = new URL(request.url).searchParams.get('userId') || userId;
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin && targetUserId !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const result = await auditService.verifyChain(targetUserId);
    return new Response(JSON.stringify(result), {
      status: result.error ? HttpStatus.InternalServerError : HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (path.endsWith('export')) {
    const targetUserId = new URL(request.url).searchParams.get('userId') || userId;
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin && targetUserId !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const result = await auditService.exportUserData(targetUserId);
    return new Response(JSON.stringify(result), {
      status: result.error ? HttpStatus.InternalServerError : HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const ns = env.AUDIT_LOG_DO;
  if (!ns) return stubJson(env, { events: [] });
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.endsWith('query') ? AuditLogDOPaths.Query : path.endsWith('log') ? AuditLogDOPaths.Log : AuditLogDOPaths.StoreEvent;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleProgressionRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.PROGRESSION_DO;
  if (!ns) return stubJson(env, { xp: 0, level: 1 });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for progression');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.endsWith('xp')
    ? ProgressionDOPaths.Xp
    : path.endsWith('level')
      ? ProgressionDOPaths.Level
      : path.includes('unlock-skill')
        ? ProgressionDOPaths.UnlockSkill
        : path.includes('update-achievement')
          ? ProgressionDOPaths.UpdateAchievement
          : path.endsWith('skills')
            ? ProgressionDOPaths.Skills
            : path.endsWith('achievements')
              ? ProgressionDOPaths.Achievements
              : path.endsWith('collections')
                ? ProgressionDOPaths.Collections
                : ProgressionDOPaths.Get;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handlePersonalizationRequest(request: Request, env: Env, _path: string): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for personalization');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  let progression: { level?: number; totalXpEarned?: number; xp?: number; skillPoints?: number; skillsUnlocked?: string[]; achievementPoints?: number } = {};
  let daily: { day?: number; claimed?: boolean; streak?: number } = {};
  if (env.PROGRESSION_DO) {
    const stub = env.PROGRESSION_DO.get(env.PROGRESSION_DO.idFromName(userId));
    const res = await doFetch(stub, ProgressionDOPaths.Get, { method: HttpMethod.Get });
    if (res.ok) progression = (await res.json().catch(() => ({}))) as typeof progression;
    else await res.text().catch(() => undefined);
  }
  if (env.REWARD_DO) {
    const stub = env.REWARD_DO.get(env.REWARD_DO.idFromName(userId));
    const res = await doFetch(stub, RewardDOPaths.Daily, { method: HttpMethod.Get });
    if (res.ok) daily = (await res.json().catch(() => ({}))) as typeof daily;
    else await res.text().catch(() => undefined);
  }
  const progressionSnapshot = {
    level: progression?.level ?? 1,
    totalXpEarned: progression?.totalXpEarned ?? 0,
    xp: progression?.xp ?? 0,
    ...progression,
  };
  const content = getPersonalizedContentFromData(userId, progressionSnapshot, daily);
  return new Response(JSON.stringify(content), {
    status: HttpStatus.Ok,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

async function handleAnalyticsProfileRequest(request: Request, env: Env): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for analytics profile');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  let progression: { level?: number; totalXpEarned?: number; xp?: number } = {};
  let daily: { day?: number; claimed?: boolean; streak?: number } = {};
  if (env.PROGRESSION_DO) {
    const stub = env.PROGRESSION_DO.get(env.PROGRESSION_DO.idFromName(userId));
    const res = await doFetch(stub, ProgressionDOPaths.Get, { method: HttpMethod.Get });
    if (res.ok) progression = (await res.json().catch(() => ({}))) as typeof progression;
    else await res.text().catch(() => undefined);
  }
  if (env.REWARD_DO) {
    const stub = env.REWARD_DO.get(env.REWARD_DO.idFromName(userId));
    const res = await doFetch(stub, RewardDOPaths.Daily, { method: HttpMethod.Get });
    if (res.ok) daily = (await res.json().catch(() => ({}))) as typeof daily;
    else await res.text().catch(() => undefined);
  }
  const progressionSnapshot = {
    level: progression?.level ?? 1,
    totalXpEarned: progression?.totalXpEarned ?? 0,
    xp: progression?.xp ?? 0,
  };
  const prediction = getChurnPredictionFromData(userId, progressionSnapshot, daily);
  return new Response(JSON.stringify(prediction), {
    status: HttpStatus.Ok,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleAnalyticsRequest(request: Request, env: Env, path: string): Promise<Response> {
  if (path.includes('profile')) return handleAnalyticsProfileRequest(request, env);
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleRewardRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.REWARD_DO;
  if (!ns) return stubJson(env, { available: true, claimed: false });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for rewards');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.includes('daily/claim')
    ? RewardDOPaths.DailyClaim
    : path.includes('streak')
      ? RewardDOPaths.StreakFreeze
      : path.includes('battle-pass/claim')
        ? RewardDOPaths.BattlePassClaim
        : path.includes('battle-pass/xp')
          ? RewardDOPaths.BattlePassXp
          : path.includes('battle-pass')
            ? RewardDOPaths.BattlePass
            : path.includes('mission') || path.includes('missions')
              ? path.includes('progress')
                ? RewardDOPaths.MissionProgress
                : path.includes('claim')
                  ? RewardDOPaths.MissionClaim
                  : RewardDOPaths.MissionsList
              : RewardDOPaths.Daily;
  let body: string | undefined;
  if (request.method === HttpMethod.Post) {
    const raw = await request.text();
    let parsed: Record<string, unknown> = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        body = raw;
      }
    }
    if (body === undefined) {
      parsed.userId = userId;
      body = JSON.stringify(parsed);
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}


export async function handleSecurityRequest(request: Request, env: Env, path: string): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;

  if (path.includes('2fa/setup') && request.method === HttpMethod.Post) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for 2FA');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const kv = env.SECURITY_KV;
    if (!kv) return stubJson(env, { error: '2FA not configured' }, HttpStatus.ServiceUnavailable);
    const existing = await kv.get(KvKeyPrefix.TwoFA + userId);
    if (existing) return stubJson(env, { error: '2FA already enabled' }, HttpStatus.Conflict);
    const { secret, qrUrl } = await generateTotpSecret();
    await kv.put(KvKeyPrefix.TwoFA + userId + ':pending', JSON.stringify({ secret, createdAt: Date.now() }), { expirationTtl: 600 });
    return stubJson(env, { secret, qrUrl, message: 'Verify with code within 10 minutes' });
  }

  if (path.includes('2fa/verify') && request.method === HttpMethod.Post) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for 2FA');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const kv = env.SECURITY_KV;
    if (!kv) return stubJson(env, { error: '2FA not configured' }, HttpStatus.ServiceUnavailable);
    let body: { code?: string };
    try { body = await request.json() as { code?: string }; } catch { return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest); }
    const code = body.code ?? '';
    const pendingRaw = await kv.get(KvKeyPrefix.TwoFA + userId + ':pending');
    if (!pendingRaw) return stubJson(env, { error: 'No pending 2FA setup' }, HttpStatus.BadRequest);
    const pending = JSON.parse(pendingRaw) as { secret: string };
    const valid = await verifyTotpCode(pending.secret, code);
    if (!valid) return stubJson(env, { error: 'Invalid code' }, HttpStatus.BadRequest);
    await kv.delete(KvKeyPrefix.TwoFA + userId + ':pending');
    await kv.put(KvKeyPrefix.TwoFA + userId, JSON.stringify({ secret: pending.secret, enabledAt: Date.now() }));
    return stubJson(env, { enabled: true });
  }

  if (path.includes('2fa/disable') && request.method === HttpMethod.Post) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const kv = env.SECURITY_KV;
    if (!kv) return stubJson(env, { error: '2FA not configured' }, HttpStatus.ServiceUnavailable);
    let body: { code?: string };
    try { body = await request.json() as { code?: string }; } catch { return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest); }
    const stored = await kv.get(KvKeyPrefix.TwoFA + userId);
    if (!stored) return stubJson(env, { error: '2FA not enabled' }, HttpStatus.BadRequest);
    const { secret } = JSON.parse(stored) as { secret: string };
    const valid = await verifyTotpCode(secret, body.code ?? '');
    if (!valid) return stubJson(env, { error: 'Invalid code' }, HttpStatus.BadRequest);
    await kv.delete(KvKeyPrefix.TwoFA + userId);
    return stubJson(env, { disabled: true });
  }

  if (path.includes('/devices') && request.method === HttpMethod.Get) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const kv = env.SECURITY_KV;
    if (!kv) return stubJson(env, { devices: [] });
    const raw = await kv.get(KvKeyPrefix.Devices + userId);
    const devices = raw ? (JSON.parse(raw) as Array<{ deviceId: string; fingerprint: string; name?: string; lastSeen: number }>) : [];
    return stubJson(env, { devices });
  }

  if (path.includes('/devices') && request.method === HttpMethod.Post && path.endsWith('/devices')) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const kv = env.SECURITY_KV;
    if (!kv) return stubJson(env, { error: 'Device tracking not configured' }, HttpStatus.ServiceUnavailable);
    let body: { fingerprint?: string; name?: string };
    try { body = await request.json() as { fingerprint?: string; name?: string }; } catch { return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest); }
    const fingerprint = (body.fingerprint ?? '').slice(0, 256) || crypto.randomUUID();
    const deviceId = crypto.randomUUID();
    const raw = await kv.get(KvKeyPrefix.Devices + userId);
    const devices = raw ? (JSON.parse(raw) as Array<{ deviceId: string; fingerprint: string; name?: string; lastSeen: number }>) : [];
    devices.push({ deviceId, fingerprint, name: body.name?.slice(0, 64), lastSeen: Date.now() });
    if (devices.length > 50) devices.shift();
    await kv.put(KvKeyPrefix.Devices + userId, JSON.stringify(devices));
    return stubJson(env, { deviceId, registered: true });
  }

  if (path.includes('/devices/') && request.method === HttpMethod.Delete) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const userId = authResult.userId;
    const deviceId = extractIdFromPath(path, ApiEndpoint.Security.Devices);
    if (!deviceId) return stubJson(env, { error: 'Invalid device id' }, HttpStatus.BadRequest);
    const kv = env.SECURITY_KV;
    if (!kv) return stubJson(env, { error: 'Device tracking not configured' }, HttpStatus.ServiceUnavailable);
    const raw = await kv.get(KvKeyPrefix.Devices + userId);
    let devices = raw ? (JSON.parse(raw) as Array<{ deviceId: string }>) : [];
    devices = devices.filter((d) => d.deviceId !== deviceId);
    await kv.put(KvKeyPrefix.Devices + userId, JSON.stringify(devices));
    return stubJson(env, { revoked: true });
  }

  if (path.includes('appeal/review') && request.method === HttpMethod.Post) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    let body: { userId: string; penaltyId?: string; appealId: string; action: 'approve' | 'deny'; moderatorId?: string };
    try { body = await request.json() as typeof body; } catch { return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest); }
    const { userId, appealId, action, moderatorId } = body;
    if (!userId || !appealId || !action || !moderatorId) {
      return stubJson(env, { error: 'Missing userId, appealId, action or moderatorId' }, HttpStatus.BadRequest);
    }
    const ns = env.PENALTY_DO;
    if (!ns) return stubJson(env, { error: 'Penalty service not configured' }, HttpStatus.ServiceUnavailable);
    const stub = ns.get(ns.idFromName(userId));
    const res = await doFetch(stub, PenaltyDOPaths.ReviewAppeal, {
      method: HttpMethod.Post,
      body: JSON.stringify({ appealId, action, moderatorId }),
    });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }

  if (path.includes('dashboard') && request.method === HttpMethod.Get) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const svc = new SecurityMonitoringService(env);
    const summary = await svc.getDashboardSummary();
    return stubJson(env, summary);
  }

  const ns = env.PENALTY_DO;
  if (!ns) return stubJson(env, { penalties: [] });
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for penalty');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.includes('issue') ? PenaltyDOPaths.Issue : path.includes('appeal') && !path.includes('review') ? PenaltyDOPaths.Appeal : PenaltyDOPaths.Status;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleFraudRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.FRAUD_DETECTION_DO;
  if (!ns) return stubJson(env, { risk: 'low' });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for fraud check');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.endsWith('check') ? FraudDetectionDOPaths.Check : FraudDetectionDOPaths.Risk;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleAntiCheatRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.ANTI_CHEAT_DO;
  if (!ns) return stubJson(env, { status: 'clear' });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for anti-cheat');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.endsWith('analyze') ? AntiCheatDOPaths.Analyze : path.endsWith('report') ? AntiCheatDOPaths.Report : AntiCheatDOPaths.Status;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleProfileRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.PROFILE_DO;
  if (!ns) return stubJson(env, { displayName: '', avatarUrl: '' });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for profile');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  let doPath: string =
    path.endsWith(ProfileDOSegment.Avatar) ? ProfileDOPaths.Avatar
    : path.includes(ProfileDOSegment.Update) ? ProfileDOPaths.Update
    : path.endsWith(ProfileDOSegment.GetSocialCard) ? ProfileDOPaths.GetSocialCard
    : path.endsWith(ProfileDOSegment.AddBadge) ? ProfileDOPaths.AddBadge
    : path.endsWith(ProfileDOSegment.UpdateStats) ? ProfileDOPaths.UpdateStats
    : ProfileDOPaths.Get;
  if (path.endsWith(ProfileDOSegment.GetSocialCard)) {
    const viewerId = new URL(request.url, 'http://dummy').searchParams.get('viewerId') ?? '';
    doPath = `${doPath}${viewerId ? `?viewerId=${encodeURIComponent(viewerId)}` : ''}`;
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

async function isBlockedBy(env: Env, recipientUserId: string, senderUserId: string): Promise<boolean> {
  if (!env.PRESENCE_DO || !recipientUserId || !senderUserId) return false;
  const shardKey = getPresenceShardKey(recipientUserId);
  const stub = env.PRESENCE_DO.get(env.PRESENCE_DO.idFromName(shardKey));
  const path = `${PresenceDOPaths.BlockCheck(shardKey)}?userId=${encodeURIComponent(recipientUserId)}&targetId=${encodeURIComponent(senderUserId)}`;
  const res = await doFetch(stub, path, { method: HttpMethod.Get });
  const data = (await res.json().catch(() => ({}))) as { blocked?: boolean };
  return data.blocked === true;
}

export async function handleMessageRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.MESSAGE_DO;
  if (!ns) return stubJson(env, { messages: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for messages');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const convId = extractIdFromPath(path, ApiEndpoint.Message.Base) ?? 'default';
  if (request.method === HttpMethod.Post && path.endsWith('send')) {
    const participants = convId.split(':').filter(Boolean);
    for (const participantId of participants) {
      if (participantId !== userId) {
        const blocked = await isBlockedBy(env, participantId, userId);
        if (blocked) {
          return new Response(
            JSON.stringify({ error: 'Cannot send message; you are blocked' }),
            { status: HttpStatus.Forbidden, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
          );
        }
      }
    }
  }
  const stub = ns.get(ns.idFromName(convId));
  const doPath = path.endsWith('send') ? MessageDOPaths.Send : path.endsWith('read-receipt') ? MessageDOPaths.ReadReceipt : MessageDOPaths.List;
  let body: string | undefined;
  if (request.method === HttpMethod.Post) {
    const raw = await request.text();
    if (path.endsWith('send')) {
      const parsed = (await new Response(raw).json().catch(() => ({}))) as { content?: string };
      body = JSON.stringify({ senderId: userId, content: (parsed.content ?? '').slice(0, 4096) });
    } else {
      body = raw;
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleFeedRequest(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === HttpMethod.Post && path.endsWith('/fanout')) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for feed fanout');
    if (authResult instanceof Response) return authResult;
    const actorId = authResult.userId;
    let body: { type?: string; payload?: Record<string, unknown> } = {};
    try {
      body = (await request.json().catch(() => ({}))) as typeof body;
    } catch {
      return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const type = (body.type ?? 'activity').slice(0, 64);
    const payload = typeof body.payload === 'object' && body.payload !== null ? { ...body.payload, actorId } : { actorId };
    if (!env.PRESENCE_DO || !env.ACTIVITY_FEED_DO) return stubJson(env, { fanout: 0 });
    const shardKey = getPresenceShardKey(actorId);
    const presenceStub = env.PRESENCE_DO.get(env.PRESENCE_DO.idFromName(shardKey));
    const friendsPath = `${PresenceDOPaths.Friends(shardKey)}?userId=${encodeURIComponent(actorId)}`;
    const friendsRes = await doFetch(presenceStub, friendsPath, { method: HttpMethod.Get });
    const friendsData = (await friendsRes.json().catch(() => ({}))) as { friends?: { friendId: string }[] };
    const friendIds = (friendsData.friends ?? []).map((f) => f.friendId).filter(Boolean);
    let appended = 0;
    for (const friendId of friendIds) {
      const feedStub = env.ACTIVITY_FEED_DO.get(env.ACTIVITY_FEED_DO.idFromName(friendId));
      const appendRes = await doFetch(feedStub, ActivityFeedDOPaths.Append, {
        method: HttpMethod.Post,
        body: JSON.stringify({ type, payload }),
      });
      if (appendRes.ok) appended++;
      await appendRes.text().catch(() => undefined);
    }
    return stubJson(env, { fanout: appended, friends: friendIds.length });
  }
  const ns = env.ACTIVITY_FEED_DO;
  if (!ns) return stubJson(env, { items: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for feed');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.endsWith('list') ? ActivityFeedDOPaths.List : ActivityFeedDOPaths.Append;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handlePartyRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.PARTY_DO;
  if (!ns) return stubJson(env, { partyId: '', members: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for party');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const partyId = extractIdFromPath(path, ApiEndpoint.Party.Base);
  if (!partyId && request.method === HttpMethod.Post) {
    const newPartyId = crypto.randomUUID();
    const stub = ns.get(ns.idFromName(newPartyId));
    const body = JSON.stringify({ userId, partyId: newPartyId });
    const res = await doFetch(stub, PartyDOPaths.Create, { method: HttpMethod.Post, body });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (data.error) return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    return new Response(JSON.stringify({ partyId: newPartyId }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (!partyId) return stubJson(env, { partyId: '', members: [] });
  const partyBody = request.method === HttpMethod.Post ? ((await request.json().catch(() => ({}))) as object) : {};
  if (request.method === HttpMethod.Post && path.endsWith(PartyDOSegment.Invite)) {
    const inviteeId = (partyBody as { inviteeId?: string }).inviteeId ?? '';
    if (inviteeId) {
      const blocked = await isBlockedBy(env, inviteeId, userId);
      if (blocked) {
        return new Response(
          JSON.stringify({ error: 'Cannot invite; you are blocked' }),
          { status: HttpStatus.Forbidden, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
        );
      }
    }
  }
  const stub = ns.get(ns.idFromName(partyId));
  const doPath = path.endsWith(PartyDOSegment.Join)
    ? PartyDOPaths.Join
    : path.endsWith(PartyDOSegment.Leave)
      ? PartyDOPaths.Leave
      : path.endsWith(PartyDOSegment.Invite)
        ? PartyDOPaths.Invite
        : path.endsWith('kick')
          ? `${PartyDOPaths.Base}/kick`
          : path.endsWith('transfer-leader')
            ? `${PartyDOPaths.Base}/transfer-leader`
            : PartyDOPaths.State;
  const bodyWithUser = request.method === HttpMethod.Post ? JSON.stringify({ ...partyBody, userId }) : undefined;
  const res = await doFetch(stub, doPath, { method: request.method, body: bodyWithUser });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleNotificationRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.NOTIFICATION_DO;
  if (!ns) return stubJson(env, { notifications: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for notifications');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath =
    path.endsWith('mark-read') ? NotificationDOPaths.MarkRead
    : path.endsWith('list') ? NotificationDOPaths.List
    : path.endsWith('preferences') ? NotificationDOPaths.Preferences
    : NotificationDOPaths.Push;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

const DISCOVERY_GAMES = [
  { id: GameTypeId.Claim, name: GameName.Claim },
  { id: GameTypeId.Poker, name: GameName.Poker },
  { id: GameTypeId.WordSearch, name: GameName.WordSearch },
] as const;

export async function handleDiscoveryRequest(request: Request, env: Env, handlerPath: string): Promise<Response> {
  const url = new URL(request.url, 'http://dummy');
  if (handlerPath.endsWith('/search')) {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const games = q
      ? DISCOVERY_GAMES.filter((g) => g.name.toLowerCase().includes(q) || String(g.id).includes(q))
      : [...DISCOVERY_GAMES];
    return stubJson(env, { games });
  }
  if (handlerPath.endsWith('/trending')) {
    if (env.DISCOVERY_KV) {
      const raw = await env.DISCOVERY_KV.get('trending');
      if (raw) {
        try {
          const data = JSON.parse(raw) as unknown;
          return stubJson(env, data);
        } catch {
          //
        }
      }
    }
    return stubJson(env, { topGameModes: [], peakOnline: 0, activeGames: 0, featuredTournaments: [], lastUpdated: Date.now() });
  }
  if (handlerPath.endsWith('/featured')) {
    if (env.DISCOVERY_KV) {
      const raw = await env.DISCOVERY_KV.get('featured');
      if (raw) {
        try {
          const data = JSON.parse(raw) as unknown;
          return stubJson(env, data);
        } catch {
          //
        }
      }
    }
    return stubJson(env, { games: [...DISCOVERY_GAMES.slice(0, 2)], banner: null });
  }
  return stubJson(env, { games: [...DISCOVERY_GAMES], trending: [] });
}

export async function handleInventoryRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.INVENTORY_DO;
  if (!ns) return stubJson(env, { items: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for inventory');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.includes('add-item')
    ? `${InventoryDOPaths.Base}/add-item`
    : path.includes('remove-item')
      ? `${InventoryDOPaths.Base}/remove-item`
      : path.includes('gift')
        ? InventoryDOPaths.Gift
        : path.includes('trade')
          ? InventoryDOPaths.Trade
          : path.includes('list')
            ? InventoryDOPaths.List
            : InventoryDOPaths.Equip;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleMarketplaceRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.MARKETPLACE_DO;
  if (!ns) return stubJson(env, { listings: [] });
  const stub = ns.get(ns.idFromName('market'));
  const listPath = path.endsWith('list');
  const historyPath = path.endsWith('history');
  const buyPath = path.endsWith('buy');
  const sellPath = path.endsWith('sell');
  let body: string | undefined;
  if (request.method === HttpMethod.Post) {
    const raw = await request.text();
    if (buyPath || sellPath) {
      const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
      const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for marketplace');
      if (authResult instanceof Response) return authResult;
      const userId = authResult.userId;
      const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
      body = JSON.stringify(buyPath ? { ...parsed, buyerId: userId } : { ...parsed, sellerId: userId });
    } else {
      body = raw;
    }
  }
  if (historyPath) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for history');
    if (authResult instanceof Response) return authResult;
    const doPath = `${MarketplaceDOPaths.History}?userId=${encodeURIComponent(authResult.userId)}`;
    const res = await doFetch(stub, doPath, { method: HttpMethod.Get });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  const doPath = listPath ? MarketplaceDOPaths.List : buyPath ? MarketplaceDOPaths.Buy : sellPath ? MarketplaceDOPaths.Sell : MarketplaceDOPaths.History;
  const res = await doFetch(stub, doPath, { method: request.method, body });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleTournamentRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.TOURNAMENT_DO;
  if (!ns) return stubJson(env, { tournaments: [] });
  const tournamentId = extractIdFromPath(path, ApiEndpoint.Tournament.Base);
  if (!tournamentId) return new Response(JSON.stringify({ error: 'Tournament ID required' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  const stub = ns.get(ns.idFromName(tournamentId));

  if (path.includes('distribute-prizes') && request.method === HttpMethod.Post) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
    if (authResult instanceof Response) return authResult;
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const winnersRes = await doFetch(stub, TournamentDOPaths.Winners, { method: HttpMethod.Get });
    const winnersData = (await winnersRes.json().catch(() => ({}))) as { winners?: Array<{ userId: string; place: number; prizeAmount: number }>; error?: string };
    if (winnersData.error || !Array.isArray(winnersData.winners) || winnersData.winners.length === 0) {
      return stubJson(env, winnersData.error ? { error: winnersData.error } : { distributed: 0, message: 'No winners' }, winnersRes.status === 200 ? HttpStatus.BadRequest : winnersRes.status);
    }
    let distributed = 0;
    for (const w of winnersData.winners) {
      const result = await earnGP(env, w.userId, w.prizeAmount, `Tournament ${tournamentId} place ${w.place}`, {
        tournamentId,
        place: w.place,
        [MetadataField.IdempotencyKey]: `tournament-${tournamentId}-${w.userId}-${w.place}`,
      });
      if (result.success) distributed++;
    }
    return stubJson(env, { distributed, total: winnersData.winners.length });
  }

  const segment = path.includes('start') ? 'start' : path.includes('result') ? 'result' : path.endsWith('register') ? 'register' : 'bracket';
  const doPath =
    segment === 'start'
      ? TournamentDOPaths.Start
      : segment === 'result'
        ? TournamentDOPaths.Result
        : segment === 'register'
          ? TournamentDOPaths.Register
          : TournamentDOPaths.Bracket;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleSettingsRequest(request: Request, env: Env, path: string): Promise<Response> {
  const ns = env.SETTINGS_DO;
  if (!ns) return stubJson(env, { settings: {} });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for settings');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const doPath = path.includes('update') ? SettingsDOPaths.Update : SettingsDOPaths.Get;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? await request.text() : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}


export async function handleAdminRequest(request: Request, env: Env, path: string): Promise<Response> {
  const adminAuthTraceEnabled = isAdminAuthTraceRequest(request);
  logInfo(
    '[AdminAuthFlow:H] admin handler entered',
    getStackTrace(),
    {
      path,
      method: request.method,
      hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
    },
    adminAuthTraceEnabled
  );
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    logWarn(
      '[AdminAuthFlow:I] admin request rejected by requireAuth',
      getStackTrace(),
      {
        path,
        status: authResult.status,
        hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
      },
      adminAuthTraceEnabled || LOG_ADMIN_AUTH
    );
    return authResult;
  }
  const kv = env.MODERATION_KV;
  if (path.includes('moderation/report') && request.method === HttpMethod.Post) {
    if (!kv) return stubJson(env, { error: 'Moderation not configured' }, HttpStatus.ServiceUnavailable);
    let body: { reporterId: string; targetId: string; reason: string; category?: string };
    try { body = await request.json() as typeof body; } catch { return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest); }
    const { reporterId, targetId, reason } = body;
    if (!reporterId || !targetId || !reason) return stubJson(env, { error: 'reporterId, targetId, reason required' }, HttpStatus.BadRequest);
    const reportId = crypto.randomUUID();
    await kv.put(`${KvKeyPrefix.ReportPending}${reportId}`, JSON.stringify({ reportId, reporterId, targetId, reason, category: body.category ?? 'other', createdAt: Date.now() }));
    return stubJson(env, { reportId, submitted: true });
  }
  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    logWarn(
      '[AdminAuthFlow:J] admin request rejected by adminCheck',
      getStackTrace(),
      {
        path,
        userId: adminCheck.userId,
        error: adminCheck.error,
      },
      adminAuthTraceEnabled || LOG_ADMIN_AUTH
    );
    return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
      status: HttpStatus.Forbidden,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const adminPathParts = extractPathParts(path, ApiEndpoint.Admin.Base);
  if (adminPathParts[0] === 'users' && adminPathParts[2] === 'status' && request.method === HttpMethod.Post) {
    const targetUserId = adminPathParts[1];
    if (!targetUserId) {
      return stubJson(env, { error: 'Target user ID is required' }, HttpStatus.BadRequest);
    }
    if (!env.FIREBASE_PROJECT_ID) {
      return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
    }
    const authHeader = await getFirestoreAuthHeader(env);
    if (!authHeader) {
      return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
    }

    let body: { isAdmin?: boolean };
    try {
      body = await request.json() as { isAdmin?: boolean };
    } catch {
      return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    if (typeof body.isAdmin !== 'boolean') {
      return stubJson(env, { error: 'isAdmin must be boolean' }, HttpStatus.BadRequest);
    }

    const targetUserUrl = getFirestoreUserUrl(env.FIREBASE_PROJECT_ID, targetUserId);
    const updateUrl = `${targetUserUrl}?updateMask.fieldPaths=isAdmin&updateMask.fieldPaths=updatedAt`;
    const updateResponse = await fetch(updateUrl, {
      method: HttpMethod.Patch,
      headers: {
        [HttpHeader.Authorization]: authHeader,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        fields: {
          isAdmin: { booleanValue: body.isAdmin },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });
    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text().catch(() => '');
      logWarn('Admin user status update failed', getStackTrace(), { status: updateResponse.status, errorBody, targetUserId }, true);
      return stubJson(env, { error: `${ErrorMessage.FirestoreErrorPrefix} ${updateResponse.status}` }, updateResponse.status);
    }
    await updateResponse.text().catch(() => undefined);

    const adminActivityUrl = getFirestoreAdminActivityCollectionUrl(env.FIREBASE_PROJECT_ID);
    const activityResponse = await fetch(adminActivityUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Authorization]: authHeader,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        fields: {
          callerId: { stringValue: adminCheck.userId },
          targetUserId: { stringValue: targetUserId },
          action: { stringValue: body.isAdmin ? 'grant_admin' : 'revoke_admin' },
          timestamp: { timestampValue: new Date().toISOString() },
        },
      }),
    });
    if (!activityResponse.ok) {
      const errorBody = await activityResponse.text().catch(() => '');
      logWarn('Admin activity write failed after status update', getStackTrace(), { status: activityResponse.status, errorBody, targetUserId }, true);
    } else {
      await activityResponse.text().catch(() => undefined);
    }

    return stubJson(env, { success: true });
  }
  if (path === ApiEndpoint.Admin.DashboardData && request.method === HttpMethod.Get) {
    logInfo(
      '[AdminAuthFlow:K] admin dashboard authorized',
      getStackTrace(),
      {
        path,
        userId: adminCheck.userId,
      },
      adminAuthTraceEnabled
    );
    if (!env.FIREBASE_PROJECT_ID) {
      return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
    }
    const authHeader = await getFirestoreAuthHeader(env);
    if (!authHeader) {
      return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
    }

    const usersUrl = getFirestoreUsersCollectionUrl(env.FIREBASE_PROJECT_ID);
    const usersResponse = await fetch(usersUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: authHeader,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
    });

    if (!usersResponse.ok) {
      const errorBody = await usersResponse.text().catch(() => '');
      logWarn('Admin dashboard users fetch failed', getStackTrace(), { status: usersResponse.status, errorBody }, true);
      return stubJson(env, { error: `${ErrorMessage.FirestoreErrorPrefix} ${usersResponse.status}` }, usersResponse.status);
    }

    const usersData = await usersResponse.json().catch(() => ({} as Record<string, unknown>)) as {
      documents?: Array<{ name?: string; fields?: Record<string, { stringValue?: string; booleanValue?: boolean; timestampValue?: string }> }>;
    };

    const users = (usersData.documents ?? []).map((doc) => {
      const fields = doc.fields ?? {};
      const uid = (doc.name ?? '').split('/').pop() ?? '';
      const email = fields.email?.stringValue ?? '';
      const displayName = (fields.displayName?.stringValue ?? email) || 'Unknown User';
      const isAdmin = fields.isAdmin?.booleanValue === true;
      const photoURL = fields.photoURL?.stringValue;
      const lastLoginAt = fields.lastLoginAt?.timestampValue ? Date.parse(fields.lastLoginAt.timestampValue) : undefined;
      return { uid, email, displayName, isAdmin, photoURL, lastLogin: Number.isNaN(lastLoginAt) ? undefined : lastLoginAt };
    });

    const activityUrl = getFirestoreAdminActivityCollectionUrl(env.FIREBASE_PROJECT_ID);
    const activityResponse = await fetch(`${activityUrl}?pageSize=50`, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: authHeader,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
    });

    const userEmailById = new Map(users.map((item) => [item.uid, item.email]));
    let activity: Array<{ timestamp: number; adminEmail: string; action: string; targetEmail: string; targetUid: string }> = [];
    if (activityResponse.ok) {
      const activityData = await activityResponse.json().catch(() => ({} as Record<string, unknown>)) as {
        documents?: Array<{ fields?: Record<string, { stringValue?: string; timestampValue?: string }> }>;
      };
      activity = (activityData.documents ?? []).map((doc) => {
        const fields = doc.fields ?? {};
        const callerId = fields.callerId?.stringValue ?? '';
        const targetUserId = fields.targetUserId?.stringValue ?? '';
        const actionRaw = fields.action?.stringValue ?? '';
        const timestampRaw = fields.timestamp?.timestampValue;
        const timestamp = timestampRaw ? Date.parse(timestampRaw) : Date.now();
        const action = actionRaw === 'grant_admin' || actionRaw === 'grant' ? 'grant' : 'revoke';
        return {
          timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
          adminEmail: userEmailById.get(callerId) ?? 'unknown',
          action,
          targetEmail: userEmailById.get(targetUserId) ?? 'unknown',
          targetUid: targetUserId,
        };
      });
      activity.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      const errorBody = await activityResponse.text().catch(() => '');
      logWarn('Admin dashboard activity fetch failed', getStackTrace(), { status: activityResponse.status, errorBody }, true);
    }

    return stubJson(env, { users, activity });
  }
  if (path.includes('moderation/queue') && request.method === HttpMethod.Get) {
    if (!kv) return stubJson(env, { reports: [] });
    const list = await kv.list({ prefix: KvKeyPrefix.ReportPending, limit: 100 });
    const reports: unknown[] = [];
    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (raw) {
        try {
          reports.push(JSON.parse(raw));
        } catch {
          void 0;
        }
      }
    }
    return stubJson(env, { reports });
  }
  if (path.includes('moderation/') && path.includes('/resolve') && request.method === HttpMethod.Post) {
    const parts = extractPathParts(path, ApiEndpoint.Admin.Base);
    const reportId = parts[0] === 'moderation' && parts[2] === 'resolve' ? parts[1] : null;
    const reportKey = reportId ? `${KvKeyPrefix.ReportPending}${reportId}` : '';
    if (!kv || !reportId) return stubJson(env, { error: 'Report ID required' }, HttpStatus.BadRequest);
    let body: { action: string; moderatorId?: string };
    try { body = await request.json() as typeof body; } catch { return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest); }
    const raw = await kv.get(reportKey);
    if (!raw) return stubJson(env, { error: 'Report not found' }, HttpStatus.NotFound);
    const report = JSON.parse(raw) as Record<string, unknown>;
    await kv.delete(reportKey);
    await kv.put(`${KvKeyPrefix.ReportResolved}${reportId}`, JSON.stringify({ ...report, resolvedAt: Date.now(), action: body.action, moderatorId: body.moderatorId }));
    return stubJson(env, { resolved: true, reportId });
  }
  if (path.includes('transparency/dashboard') && request.method === HttpMethod.Get) {
    const audit = new AuditTrailService(env);
    const { events, total, error } = await audit.queryEvents(adminCheck.userId, 'admin', {
      actorId: 'system',
      category: 'transparency',
      limit: 50,
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    });
    if (error) return stubJson(env, { error, verifications: [] }, HttpStatus.InternalServerError);
    return stubJson(env, { verifications: events, total });
  }
  if (path.includes('credits/plan') && request.method === HttpMethod.Post) {
    if (!env.CREDITS_DO) {
      return stubJson(env, { error: 'Credits DO not configured' }, HttpStatus.ServiceUnavailable);
    }
    let planBody: { userId: string; tier: string };
    try {
      planBody = (await request.json()) as typeof planBody;
    } catch {
      return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const { userId, tier } = planBody;
    if (!userId || !tier) {
      return stubJson(env, { error: 'userId and tier required' }, HttpStatus.BadRequest);
    }
    const creditsStub = env.CREDITS_DO.get(env.CREDITS_DO.idFromName(userId));
    const res = await doFetch(creditsStub, CreditsDOPaths.PlanStateSet, {
      method: HttpMethod.Post,
      body: JSON.stringify({ tier }),
    });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (path.includes('ai/catalog') && request.method === HttpMethod.Patch) {
    if (!env.AI_CATALOG_KV) {
      return stubJson(env, { error: 'AI catalog KV not configured' }, HttpStatus.ServiceUnavailable);
    }
    let body: { provider?: AICatalogProviderEntry; providers?: AICatalogProviderEntry[] };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return stubJson(env, { error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const toMerge: AICatalogProviderEntry[] = body.providers
      ? body.providers
      : body.provider
        ? [body.provider]
        : [];
    if (toMerge.length === 0) {
      return stubJson(env, { error: 'provider or providers required' }, HttpStatus.BadRequest);
    }
    const catalog = await getCatalogFromEnv(env);
    const byId = new Map(catalog.providers.map((p) => [p.id, p]));
    for (const p of toMerge) {
      if (p?.id && typeof p.id === 'string') {
        byId.set(p.id, p as AICatalogProviderEntry);
      }
    }
    const merged: typeof catalog = {
      ...catalog,
      providers: Array.from(byId.values()),
    };
    await saveCatalogToKV(env, merged);
    return stubJson(env, { ok: true, providers: merged.providers.length });
  }
  return stubJson(env, { ok: true });
}

export async function handleHealthDetailRequest(request: Request, env: Env, _path: string): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) return authResult;
  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
      status: HttpStatus.Forbidden,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const checks: Record<string, { status: string; latencyMs?: number }> = {};
  if (env.RATE_LIMIT_KV) {
    const t0 = Date.now();
    try {
      await env.RATE_LIMIT_KV.get(KvKeyPrefix.HealthPing);
      checks.kv = { status: 'ok', latencyMs: Date.now() - t0 };
    } catch {
      checks.kv = { status: 'error' };
    }
  } else {
    checks.kv = { status: 'not_configured' };
  }
  if (env.LOBBY_DO) checks.lobbyDo = { status: 'bound' };
  if (env.CREDITS_DO) checks.creditsDo = { status: 'bound' };
  if (env.AUDIT_LOG_DO) checks.auditLogDo = { status: 'bound' };
  if (env.PENALTY_DO) checks.penaltyDo = { status: 'bound' };
  return stubJson(env, { status: 'ok', version: '1.0', checks });
}

export async function handleComplianceRequest(request: Request, env: Env, _path: string): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for compliance');
  if (authResult instanceof Response) return authResult;

  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: HttpStatus.Forbidden,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (request.method !== HttpMethod.Get && request.method !== HttpMethod.Post) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const auditService = new AuditTrailService(env);

  let body: { startDate?: string; endDate?: string; reportType?: 'pci' | 'gdpr' | 'soc2' } = {};
  if (request.method === HttpMethod.Post) {
    try {
      body = await request.json() as typeof body;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  } else {
    const url = new URL(request.url);
    body.startDate = url.searchParams.get('startDate') || undefined;
    body.endDate = url.searchParams.get('endDate') || undefined;
    body.reportType = (url.searchParams.get('reportType') as typeof body.reportType) || undefined;
  }

  const startDate = body.startDate ? new Date(body.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = body.endDate ? new Date(body.endDate) : new Date();
  const reportType = body.reportType || 'soc2';

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response(JSON.stringify({ error: 'Invalid date format' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const result = await auditService.generateComplianceReport(startDate, endDate, reportType);
  return new Response(JSON.stringify(result), {
    status: result.error ? HttpStatus.InternalServerError : HttpStatus.Ok,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}
