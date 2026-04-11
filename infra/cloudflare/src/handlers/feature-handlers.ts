import type { Env } from '@/constants/env';
import { validateZodBody } from '@/utils/zod-validation';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { GameName, GameTypeId } from '@ocentra/endpoint-domain/constants/game';
import { extractAndValidateIdFromPath, extractIdFromPath, extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import {
  LobbyDO as LobbyDOPaths,
  MatchmakingDO as MatchmakingDOPaths,
  PresenceDO as PresenceDOPaths,
  AuditLogDO as AuditLogDOPaths,
  ProgressionDO as ProgressionDOPaths,
  RewardDO as RewardDOPaths,
  RewardDOSegment,
  ActivityFeedDO as ActivityFeedDOPaths,
  PartyDO as PartyDOPaths,
  PartyDOSegment,
  NotificationDO as NotificationDOPaths,
  InventoryDO as InventoryDOPaths,
  InventoryDOSegment,
  MarketplaceDO as MarketplaceDOPaths,
  TournamentDO as TournamentDOPaths,
  TournamentDOSegment,
  SettingsDO as SettingsDOPaths,
  CreditsDO as CreditsDOPaths,
  PenaltyDO as PenaltyDOPaths,
  FraudDetectionDO as FraudDetectionDOPaths,
  AntiCheatDO as AntiCheatDOPaths,
  ProfileDO as ProfileDOPaths,
  ProfileDOSegment,
  MessageDO as MessageDOPaths,
  MessageDOSegment,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { MissionsDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { getCatalogFromEnv, saveCatalogToKV } from '@/data/ai-catalog';
import type { AICatalogProviderEntry } from '@/data/ai-catalog-types';
import { AuditTrailService } from '@/services/AuditTrailService';
import { getPersonalizedContentFromData, getChurnPredictionFromData } from '@/logic/retention';
import { earnGP } from '@/handlers/credits';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';
import {
  AdminAICatalogRequestSchema,
  AdminBaseRequestSchema,
  AdminCreditsPlanRequestSchema,
  AdminModerationReportRequestSchema,
  AdminUserStatusRequestSchema,
  AntiCheatAnalyzeRequestSchema,
  FeedFanoutRequestSchema,
  FeedAppendRequestSchema,
  FeedReportRequestSchema,
  FraudCheckRequestSchema,
  MatchmakingLeaveRequestSchema,
  MatchmakingQueueRequestSchema,
  MessageSendRequestSchema,
  NotificationActionRequestSchema,
  NotificationMarkReadRequestSchema,
  NotificationPreferencesRequestSchema,
  NotificationPushRequestSchema,
  PartyActionRequestSchema,
  PresenceStatusUpdateRequestSchema,
  PresenceTypingRequestSchema,
  ProfileAvatarRequestSchema,
  ProfileBadgeRequestSchema,
  ProfileStatsRequestSchema,
  ProfileUpdateRequestSchema,
  ProgressionXpRequestSchema,
  RoomCreateRequestSchema,
  RoomJoinRequestSchema,
  RoomLeaveRequestSchema,
  RoomSpectateRequestSchema,
  SecurityPenaltyIssueRequestSchema,
  SettingsUpdateRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { AuditEventSchema } from '@ocentra/endpoint-domain/schemas/audit';
import { getFirestoreUsersCollectionUrl, getFirestoreAdminActivityCollectionUrl, getFirestoreUserUrl } from '@/utils/firebase';
import { getFirestoreAuthHeader } from '@/utils/firebase-service-auth';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { z } from 'zod';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { createFlowContext } from '@/flows/core/FlowContext';
import { FlowRunner } from '@/flows/core/FlowRunner';
import { RewardClaimFlow } from '@/flows/reward-claim-flow';
import { InventoryTransferFlow } from '@/flows/inventory-transfer-flow';
import {
  DEFAULT_REGION,
  DEFAULT_SHARD,
  LOBBY_SHARD_COUNT,
  OPENAPI_USER_ID_PATTERN,
  doFetch,
  getLobbyShardKey,
  getPresenceShardKey,
  isAdminAuthTraceRequest,
  isBlockedBy,
  parseConversationTargets,
  LOG_ADMIN_AUTH,
  stubJson,
  normalizeOpenApiPathSegment,
  validateOpenApiUserIdPath,
} from '@/handlers/feature-handlers-helpers';
import { IdempotencyKeySchema } from '@ocentra/endpoint-domain/schemas/common';
const log = Logger.instance;
log.register(import.meta.url);
const flowRunner = new FlowRunner();
const rewardClaimFlow = new RewardClaimFlow();
const inventoryTransferFlow = new InventoryTransferFlow();

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

export async function handleLobbyRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Lobby request', getStackTrace(), { path });
  const supportedMethods = (path.includes('join') || path.includes('leave') || path.includes('spectate'))
    ? [HttpMethod.Post]
    : [HttpMethod.Get, HttpMethod.Post];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;
  const ns = env.LOBBY_DO;
  if (!ns) {
    logDebug('Lobby: DO not configured, returning empty rooms', getStackTrace(), { path });
    return stubJson(env, { rooms: [] });
  }
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for lobby');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;
  const parts = path.split('/').filter(Boolean);
  const roomIdFromPath = (path.includes('join') || path.includes('leave') || path.includes('spectate')) ? (parts[3] ?? '') : '';
  const isJoin = path.includes('join');
  const isLeave = path.includes('leave');
  const isSpectate = path.includes('spectate');
  const shardKey = roomIdFromPath && (isJoin || isLeave || isSpectate) ? getLobbyShardKey(roomIdFromPath) : DEFAULT_SHARD;
  let bodyText: string | undefined;
  if (request.method === HttpMethod.Post) {
    const isCreateRoom = path.includes('rooms') && !isJoin && !isLeave && !isSpectate;
    if (isCreateRoom) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, RoomCreateRequestSchema);
      if (errorResponse) return errorResponse;
      const body = data!;
      const roomId = body.roomId ?? crypto.randomUUID();
      const shardForCreate = getLobbyShardKey(roomId);
      const lobbyBodyText = JSON.stringify({
        ...body,
        roomId,
      });
      const stubCreate = ns.get(ns.idFromName(shardForCreate));
      const doPathCreate = LobbyDOPaths.Rooms(shardForCreate);
      const resCreate = await doFetch(stubCreate, doPathCreate, { method: HttpMethod.Post, body: lobbyBodyText });
      const dataCreate = await resCreate.json().catch(() => ({}));
      return new Response(JSON.stringify(dataCreate), { status: resCreate.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    if (isJoin || isLeave) {
      const { data, errorResponse } = await validateZodBody(
        request.clone(),
        env,
        isJoin ? RoomJoinRequestSchema : RoomLeaveRequestSchema
      );
      if (errorResponse) return errorResponse;
      bodyText = JSON.stringify(data!);
    }
    if (isSpectate) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, RoomSpectateRequestSchema);
      if (errorResponse) return errorResponse;
      bodyText = JSON.stringify(data!);
    }
  }
  if (request.method === HttpMethod.Get && !isJoin && !isLeave) {
    const query = authUserId ? `?userId=${encodeURIComponent(authUserId)}` : '';
    const allRooms: Array<{ roomId: string; roomType: string; maxPlayers: number; currentPlayers: number; currentSpectators: number; gameStatus: string; hostId: string; gameType?: string; isPrivate?: boolean; createdAt: number }> = [];
    for (let i = 0; i < LOBBY_SHARD_COUNT; i++) {
      const sk = `lobby-${i}`;
      const stub = ns.get(ns.idFromName(sk));
      const res = await doFetch(stub, LobbyDOPaths.Rooms(sk) + query, { method: HttpMethod.Get });
      const data = (await res.json().catch(() => ({}))) as { rooms?: typeof allRooms };
      if (Array.isArray(data.rooms)) allRooms.push(...data.rooms);
    }
    return new Response(JSON.stringify({ rooms: allRooms }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  const doPath = isJoin ? LobbyDOPaths.Join(shardKey, roomIdFromPath) : isLeave ? LobbyDOPaths.Leave(shardKey, roomIdFromPath) : isSpectate ? LobbyDOPaths.Spectate(shardKey, roomIdFromPath) : LobbyDOPaths.Rooms(shardKey);
  const stub = ns.get(ns.idFromName(shardKey));
  const res = await doFetch(stub, doPath, { method: request.method, body: bodyText });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleMatchmakingRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Matchmaking request', getStackTrace(), { path });
  const supportedMethods = path.endsWith('status')
    ? [HttpMethod.Get]
    : path.endsWith('leave')
      ? [HttpMethod.Post]
      : path.endsWith('queue')
        ? [HttpMethod.Post, HttpMethod.Delete]
        : [HttpMethod.Get, HttpMethod.Post, HttpMethod.Delete];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for matchmaking');
  if (authResult instanceof Response) return authResult;
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
  let validatedBody: string | undefined;
  if (method === HttpMethod.Post || method === HttpMethod.Put) {
    if (isLeave) {
      const { data, errorResponse } = await validateZodBody(
        request.clone(),
        env,
        MatchmakingLeaveRequestSchema
      );
      if (errorResponse) return errorResponse;
      const body = data!;
      validatedBody = JSON.stringify({ userId: body.userId, ticketId: body.ticketId });
    } else {
      const { data, errorResponse } = await validateZodBody(
        request.clone(),
        env,
        MatchmakingQueueRequestSchema
      );
      if (errorResponse) return errorResponse;
      const body = data!;
      validatedBody = JSON.stringify({
        userId: body.userId,
        displayName: body.displayName,
        elo: body.elo,
        gameType: body.gameType ?? (typeof body.game_type === 'number' ? String(body.game_type) : undefined),
      });
    }
  }
  const res = await doFetch(stub, doPath, { method, body: validatedBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleFriendsRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Friends request', getStackTrace(), { path });
  const supportedMethods = path.startsWith(ApiEndpoint.Users.Base)
    ? [HttpMethod.Post]
    : [HttpMethod.Get, HttpMethod.Post, HttpMethod.Delete];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for friends');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  if (env.TEST_MODE === QueryValue.True && request.method === HttpMethod.Post && path.includes('/friends')) {
    const friendId = path.split('/').filter(Boolean).slice(-1)[0] ?? '';
    return stubJson(env, { friends: friendId ? [{ friendId, status: 'accepted' }] : [] });
  }
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
    const { data: bData, errorResponse: bErr } = await validateZodBody(request.clone(), env, z.object({
      userId: z.string().min(1).optional(),
      targetId: z.string().min(1).optional(),
    }).strict());
    if (bErr) return bErr;
    const res = await doFetch(stub, doPath, { method: HttpMethod.Post, body: JSON.stringify({ ...bData, userId, targetId }) });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (path.startsWith(friendsBase)) {
    if (env.TEST_MODE === QueryValue.True && request.method === HttpMethod.Post) {
      const friendId = friendsSegments[0] ?? '';
      return stubJson(env, { friends: friendId ? [{ friendId, status: 'accepted' }] : [] });
    }
    if (request.method === HttpMethod.Get) {
      const doPath = PresenceDOPaths.Friends(shardKey) + `?userId=${encodeURIComponent(userId)}`;
      const res = await doFetch(stub, doPath, { method: HttpMethod.Get });
      const data = await res.json().catch(() => ({}));
      if (res.status === HttpStatus.NotFound && env.TEST_MODE === QueryValue.True) {
        return stubJson(env, { friends: [] });
      }
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    const friendId = friendsSegments[0] ?? '';
    if (!friendId) return new Response(JSON.stringify({ error: 'Friend id required' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    if (request.method === HttpMethod.Post) {
      const doPath = PresenceDOPaths.Friends(shardKey);
      const { data: fPData, errorResponse: fPErr } = await validateZodBody(request.clone(), env, z.object({
        userId: z.string().min(1).optional(),
        displayName: z.string().min(1).optional(),
      }).strict());
      if (fPErr) return fPErr;
      const res = await doFetch(stub, doPath, { method: HttpMethod.Post, body: JSON.stringify({ ...fPData, userId, friendId }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === HttpStatus.NotFound && env.TEST_MODE === QueryValue.True) {
        return stubJson(env, { friends: [{ friendId, status: 'accepted' }] });
      }
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    if (request.method === HttpMethod.Delete) {
      const doPath = PresenceDOPaths.Friends(shardKey);
      const { data: fDData, errorResponse: fDErr } = await validateZodBody(request.clone(), env, z.object({
        userId: z.string().min(1).optional(),
      }).strict());
      if (fDErr) return fDErr;
      const res = await doFetch(stub, doPath, { method: HttpMethod.Delete, body: JSON.stringify({ ...fDData, userId, friendId }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === HttpStatus.NotFound && env.TEST_MODE === QueryValue.True) {
        return stubJson(env, { removed: true, friends: [] });
      }
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
  }
  return new Response(JSON.stringify({ error: 'Not Found' }), { status: HttpStatus.NotFound, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handlePresenceRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Presence request', getStackTrace(), { path });
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
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
    const { data, errorResponse: bodyResultError } = await validateZodBody(request, env, PresenceTypingRequestSchema); if (bodyResultError) return bodyResultError;
    const body = data!;
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
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for presence');
  if (authResult instanceof Response) return authResult;
  const userIdValidation = validateOpenApiUserIdPath(path, ApiEndpoint.Presence.Base, request, env);
  if (userIdValidation.response) return userIdValidation.response;
  const userId = userIdValidation.userId!;
  const shardKey = userId ? getPresenceShardKey(userId) : DEFAULT_SHARD;
  const stub = ns.get(ns.idFromName(shardKey));
  const doPath = path.endsWith('friends') ? PresenceDOPaths.Friends(shardKey) : path.endsWith('block') ? PresenceDOPaths.Block(shardKey) : PresenceDOPaths.Status(shardKey, userId);
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (path.endsWith('friends')) {
      const { data: friendBody, errorResponse: friendError } = await validateZodBody(request.clone(), env, z.object({ friendId: z.string().min(1) }).strict());
      if (friendError) return friendError;
      validatedGenericBody = JSON.stringify(friendBody);
    } else if (path.endsWith('block')) {
      const { data: blockBody, errorResponse: blockError } = await validateZodBody(request.clone(), env, z.object({ targetId: z.string().min(1) }).strict());
      if (blockError) return blockError;
      validatedGenericBody = JSON.stringify(blockBody);
    } else {
      const { data: statusBody, errorResponse: statusError } = await validateZodBody(request.clone(), env, PresenceStatusUpdateRequestSchema);
      if (statusError) return statusError;
      validatedGenericBody = JSON.stringify(statusBody);
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleAuditRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
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
  const isQueryPath = path.endsWith('query');
  const doPath = isQueryPath ? AuditLogDOPaths.Query : path.endsWith('log') ? AuditLogDOPaths.Log : AuditLogDOPaths.StoreEvent;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (isQueryPath) {
      const bodyText = await request.clone().text();
      validatedGenericBody = bodyText.trim().length > 0 ? bodyText : JSON.stringify({ filters: {} });
    } else {
      const { data: eventData, errorResponse: eventError } = await validateZodBody(request.clone(), env, AuditEventSchema);
      if (eventError) return eventError;
      validatedGenericBody = JSON.stringify(eventData);
    }
  }
  const res = await doFetch(stub, doPath, {
    method: isQueryPath && request.method === HttpMethod.Get ? HttpMethod.Post : request.method,
    body: isQueryPath && request.method === HttpMethod.Get ? JSON.stringify({ filters: {} }) : validatedGenericBody,
  });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleProgressionRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const ns = env.PROGRESSION_DO;
  if (!ns) return stubJson(env, { xp: 0, level: 1 });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for progression');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const isBasePath = path === ApiEndpoint.Progression.Base || path.replace(/\/$/, '') === ApiEndpoint.Progression.Base;
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
                : request.method === HttpMethod.Post && isBasePath
                  ? ProgressionDOPaths.Xp
                  : ProgressionDOPaths.Get;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (doPath === ProgressionDOPaths.Xp) {
      const { data: xpData, errorResponse: xpError } = await validateZodBody(request.clone(), env, ProgressionXpRequestSchema);
      if (xpError) return xpError;
      const amount = typeof xpData?.xpAwarded === 'number' ? xpData.xpAwarded : typeof xpData?.amount === 'number' ? xpData.amount : 0;
      if (amount <= 0) {
        return new Response(JSON.stringify({ error: 'amount or xpAwarded is required' }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      validatedGenericBody = JSON.stringify({
        amount,
        ...(typeof xpData?.reason === 'string' ? { reason: xpData.reason } : {}),
        ...(typeof xpData?.idempotencyKey === 'string' ? { idempotencyKey: xpData.idempotencyKey } : {}),
      });
    } else if (doPath === ProgressionDOPaths.UnlockSkill || doPath === ProgressionDOPaths.UpdateAchievement) {
      validatedGenericBody = await request.clone().text();
    } else {
      const { data: genData, errorResponse: genError } = await validateZodBody(request.clone(), env, z.object({}).strict());
      if (genError) return genError;
      validatedGenericBody = JSON.stringify(genData);
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handlePersonalizationRequest(request: Request, env: Env, _path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
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
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
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
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
  if (path.includes('profile')) return handleAnalyticsProfileRequest(request, env);
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleSecurityRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;

  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for security');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;

  const pathParts = extractPathParts(path, ApiEndpoint.Security.Base);
  const ns = env.PENALTY_DO;
  const targetUserId = pathParts[1] && pathParts[0] === 'profile' ? pathParts[1] : authUserId;
  if (pathParts[1] && pathParts[0] === 'profile') {
    const validatedTarget = validateOpenApiUserIdPath(path, ApiEndpoint.Security.Base, request, env);
    if (validatedTarget.response) return validatedTarget.response;
  }
  if (pathParts[0] === 'penalty' && pathParts[1] && pathParts[1] !== 'issue') {
    const validatedTarget = validateOpenApiUserIdPath(path, ApiEndpoint.Security.Base, request, env);
    if (validatedTarget.response) return validatedTarget.response;
  }

  if (path === ApiEndpoint.Security.Base) {
    if (request.method === HttpMethod.Get) {
      if (!ns) return stubJson(env, { penalties: [] });
      const shard = ns.get(ns.idFromName(authUserId));
      const res = await doFetch(shard, PenaltyDOPaths.Status, { method: HttpMethod.Get });
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (request.method === HttpMethod.Post) {
      const { data, errorResponse } = await validateZodBody(request, env, SecurityPenaltyIssueRequestSchema);
      if (errorResponse) return errorResponse;
      const body = data!;
      const issueUserId = body.userId ?? authUserId;
      const payload = {
        ...body,
        userId: issueUserId,
        issuedBy: body.issuedBy ?? authUserId,
      };
      if (!ns) {
        return stubJson(env, { issued: true, penaltyId: crypto.randomUUID() });
      }
      const shard = ns.get(ns.idFromName(issueUserId));
      const res = await doFetch(shard, PenaltyDOPaths.Issue, { method: HttpMethod.Post, body: JSON.stringify(payload) });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  if (path === ApiEndpoint.Security.Dashboard || pathParts[0] === 'dashboard') {
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    return stubJson(env, { dashboard: { penalties: 0, appeals: 0, reviewed: 0 } });
  }

  if ((path === ApiEndpoint.Security.Penalty || pathParts[0] === 'penalty') && request.method === HttpMethod.Get) {
    if (!ns) return stubJson(env, { penalties: [] });
    const shard = ns.get(ns.idFromName(targetUserId));
    const res = await doFetch(shard, PenaltyDOPaths.Status, { method: HttpMethod.Get });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[0] === 'penalty' && pathParts[1] === 'issue' && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, SecurityPenaltyIssueRequestSchema);
    if (errorResponse) return errorResponse;
    const body = data!;
    const issueUserId = body.userId;
    const payload = {
      ...body,
      issuedBy: body.issuedBy ?? authUserId,
    };
    if (!ns) {
      return stubJson(env, { issued: true, penaltyId: crypto.randomUUID() });
    }
    const shard = ns.get(ns.idFromName(issueUserId));
    const res = await doFetch(shard, PenaltyDOPaths.Issue, { method: HttpMethod.Post, body: JSON.stringify(payload) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[0] === 'appeal' && pathParts[1] !== 'review' && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(
      request,
      env,
      z.object({
        penaltyId: z.string().min(1),
        reason: z.string().min(1).max(1024),
      }).strict()
    );
    if (errorResponse) return errorResponse;
    const body = data!;
    if (!ns) {
      return stubJson(env, { received: true, appealId: crypto.randomUUID() });
    }
    const shard = ns.get(ns.idFromName(authUserId));
    const res = await doFetch(shard, PenaltyDOPaths.Appeal, { method: HttpMethod.Post, body: JSON.stringify(body) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (path === ApiEndpoint.Security.AppealReview || (pathParts[0] === 'appeal' && pathParts[1] === 'review')) {
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const { data, errorResponse } = await validateZodBody(
      request,
      env,
      z.object({
        userId: z.string().min(1),
        appealId: z.string().min(1),
        action: z.enum(['approve', 'deny']),
        moderatorId: z.string().min(1).optional(),
      }).strict()
    );
    if (errorResponse) return errorResponse;
    const body = data!;
    if (!ns) {
      return stubJson(env, { reviewed: true, appealId: body.appealId, action: body.action });
    }
    const shard = ns.get(ns.idFromName(body.userId));
    const res = await doFetch(shard, PenaltyDOPaths.ReviewAppeal, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        appealId: body.appealId,
        action: body.action,
        moderatorId: body.moderatorId ?? adminCheck.userId,
      }),
    });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[0] === 'profile') {
    if (!ns) return stubJson(env, { penalties: [] });
    const shard = ns.get(ns.idFromName(targetUserId));
    const res = await doFetch(shard, PenaltyDOPaths.Status, { method: HttpMethod.Get });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleFraudRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;

  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for fraud');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;

  const pathParts = extractPathParts(path, ApiEndpoint.Fraud.Base);
  const ns = env.FRAUD_DETECTION_DO;
  const targetUserId = authUserId;
  if (pathParts[0] === 'risk') {
    const validatedTarget = normalizeOpenApiPathSegment(pathParts[1] ?? '');
    if (!validatedTarget) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'User ID required',
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const targetUserId = validatedTarget;
    if (request.method === HttpMethod.Get) {
      if (!ns) return stubJson(env, { risk: 'low', score: 0 });
      const shard = ns.get(ns.idFromName(targetUserId));
      const res = await doFetch(shard, FraudDetectionDOPaths.Risk, { method: HttpMethod.Get });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  if (path === ApiEndpoint.Fraud.Base) {
    if (request.method === HttpMethod.Get) {
      if (!ns) return stubJson(env, { risk: 'low', score: 0 });
      const shard = ns.get(ns.idFromName(targetUserId));
      const res = await doFetch(shard, FraudDetectionDOPaths.Risk, { method: HttpMethod.Get });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (request.method === HttpMethod.Post) {
      const { data, errorResponse } = await validateZodBody(
        request,
        env,
        z.object({
          amount: z.coerce.number().nonnegative().optional(),
          paymentMethod: z.string().min(1).max(64).optional(),
          currency: z.string().min(1).max(64).optional(),
        }).strict()
      );
      if (errorResponse) return errorResponse;
      const body = data!;
      if (!ns) return stubJson(env, { risk: 'low', score: 0 });
      const shard = ns.get(ns.idFromName(authUserId));
      const res = await doFetch(shard, FraudDetectionDOPaths.Check, { method: HttpMethod.Post, body: JSON.stringify(body) });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  if (pathParts[0] === 'check' && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, FraudCheckRequestSchema);
    if (errorResponse) return errorResponse;
    const body = data!;
    if (!ns) return stubJson(env, { risk: 'low', score: 0 });
    const shard = ns.get(ns.idFromName(authUserId));
    const res = await doFetch(shard, FraudDetectionDOPaths.Check, { method: HttpMethod.Post, body: JSON.stringify(body) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleAntiCheatRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;

  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for anti-cheat');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;

  const pathParts = extractPathParts(path, ApiEndpoint.AntiCheat.Base);
  const ns = env.ANTI_CHEAT_DO;
  const targetUserId = authUserId;
  if (pathParts[0] === 'status') {
    const validatedTarget = normalizeOpenApiPathSegment(pathParts[1] ?? '');
    if (!validatedTarget) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'User ID required',
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const targetUserId = validatedTarget;
    if (request.method === HttpMethod.Get) {
      if (!ns) return stubJson(env, { status: 'clear', trustScore: 100 });
      const shard = ns.get(ns.idFromName(targetUserId));
      const res = await doFetch(shard, AntiCheatDOPaths.Status, { method: HttpMethod.Get });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  if (path === ApiEndpoint.AntiCheat.Base) {
    if (request.method === HttpMethod.Get) {
      if (!ns) return stubJson(env, { status: 'clear', trustScore: 100 });
      const shard = ns.get(ns.idFromName(targetUserId));
      const res = await doFetch(shard, AntiCheatDOPaths.Status, { method: HttpMethod.Get });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (request.method === HttpMethod.Post) {
      const { data, errorResponse } = await validateZodBody(request, env, AntiCheatAnalyzeRequestSchema);
      if (errorResponse) return errorResponse;
      const body = data!;
      if (!ns) return stubJson(env, { risk: 'low', score: 0, trustScore: 100 });
      const shard = ns.get(ns.idFromName(authUserId));
      const res = await doFetch(shard, AntiCheatDOPaths.Analyze, { method: HttpMethod.Post, body: JSON.stringify(body) });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  if (pathParts[0] === 'analyze' && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, AntiCheatAnalyzeRequestSchema);
    if (errorResponse) return errorResponse;
    const body = data!;
    if (!ns) return stubJson(env, { risk: 'low', score: 0, trustScore: 100 });
    const shard = ns.get(ns.idFromName(authUserId));
    const res = await doFetch(shard, AntiCheatDOPaths.Analyze, { method: HttpMethod.Post, body: JSON.stringify(body) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[0] === 'report' && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(
      request,
      env,
      z.object({
        reporterId: z.string().min(1).optional(),
        targetId: z.string().min(1).max(128),
        reason: z.string().min(1).max(512),
        matchId: z.string().min(1).max(128).optional(),
      }).strict()
    );
    if (errorResponse) return errorResponse;
    const body = data!;
    const payload = { reporterId: authUserId, ...body };
    if (!ns) return stubJson(env, { received: true });
    const shard = ns.get(ns.idFromName(authUserId));
    const res = await doFetch(shard, AntiCheatDOPaths.Report, { method: HttpMethod.Post, body: JSON.stringify(payload) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleProfileRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;

  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for profile');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;

  const pathParts = extractPathParts(path, ApiEndpoint.Profile.Base);
  const profileUserId = pathParts[0] ?? authUserId;
  const ns = env.PROFILE_DO;
  if (!ns) return stubJson(env, { displayName: '', avatarUrl: '' });
  if (pathParts[0]) {
    const validatedTarget = validateOpenApiUserIdPath(path, ApiEndpoint.Profile.Base, request, env);
    if (validatedTarget.response) return validatedTarget.response;
  }

  const stub = ns.get(ns.idFromName(profileUserId));

  if (!pathParts[1] && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, ProfileUpdateRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.Update, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.Update && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, ProfileUpdateRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.Update, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.Avatar && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, ProfileAvatarRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.Avatar, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.GetSocialCard && request.method === HttpMethod.Get) {
    const url = new URL(request.url);
    const res = await doFetch(stub, `${ProfileDOPaths.GetSocialCard}?viewerId=${encodeURIComponent(url.searchParams.get('viewerId') ?? '')}`, {
      method: HttpMethod.Get,
    });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.AddBadge && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, ProfileBadgeRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.AddBadge, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.UpdateStats && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, ProfileStatsRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.UpdateStats, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (request.method === HttpMethod.Get) {
    const res = await doFetch(stub, ProfileDOPaths.Get, { method: HttpMethod.Get });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleMessageRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;

  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for messages');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;

  const pathParts = extractPathParts(path, ApiEndpoint.Message.Base);
  const conversationId = pathParts[0] ?? 'default';
  const ns = env.MESSAGE_DO;
  if (!ns) return stubJson(env, { messages: [] });

  const stub = ns.get(ns.idFromName(conversationId));

  if (!pathParts[1] && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, MessageSendRequestSchema);
    if (errorResponse) return errorResponse;
    const blockedTargets = parseConversationTargets(conversationId, authUserId);
    for (const targetUserId of blockedTargets) {
      if (await isBlockedBy(env, targetUserId, authUserId)) {
        return new Response(JSON.stringify({ error: 'Sender blocked by recipient' }), {
          status: HttpStatus.Forbidden,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
    }
    const res = await doFetch(stub, MessageDOPaths.Send, {
      method: HttpMethod.Post,
      body: JSON.stringify({ senderId: authUserId, content: data!.content }),
    });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === MessageDOSegment.Send && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, MessageSendRequestSchema);
    if (errorResponse) return errorResponse;
    const blockedTargets = parseConversationTargets(conversationId, authUserId);
    for (const targetUserId of blockedTargets) {
      if (await isBlockedBy(env, targetUserId, authUserId)) {
        return new Response(JSON.stringify({ error: 'Sender blocked by recipient' }), {
          status: HttpStatus.Forbidden,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
    }
    const res = await doFetch(stub, MessageDOPaths.Send, {
      method: HttpMethod.Post,
      body: JSON.stringify({ senderId: authUserId, content: data!.content }),
    });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === MessageDOSegment.ReadReceipt && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(
      request,
      env,
      z.object({
        messageIds: z.array(z.string().min(1).max(128)).default([]),
      }).strict()
    );
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, MessageDOPaths.ReadReceipt, {
      method: HttpMethod.Post,
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (request.method === HttpMethod.Get) {
    const listQuerySchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      before: z.string().min(1).optional(),
    }).strict();
    const queryResult = listQuerySchema.safeParse({
      limit: new URL(request.url).searchParams.get('limit') ?? undefined,
      before: new URL(request.url).searchParams.get('before') ?? undefined,
    });
    if (!queryResult.success) {
      return new Response(JSON.stringify({
        error: 'Invalid query parameters',
        issues: queryResult.error.issues,
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const query = new URLSearchParams();
    query.set('limit', String(queryResult.data.limit));
    if (queryResult.data.before) query.set('before', queryResult.data.before);
    const res = await doFetch(stub, `${MessageDOPaths.List}?${query.toString()}`, { method: HttpMethod.Get });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

export async function handleRewardRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const ns = env.REWARD_DO;
  if (!ns) return stubJson(env, { available: true, claimed: false });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for rewards');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  const rewardParts = extractPathParts(path, ApiEndpoint.Rewards.Base);
  const missionParts = extractPathParts(path, ApiEndpoint.Missions.Base);
  const rewardPath = rewardParts.join('/');
  const isDailyClaim = path === ApiEndpoint.Rewards.Base || rewardPath === RewardDOSegment.DailyClaim;
  const isStreakFreeze = rewardPath === RewardDOSegment.StreakFreeze;
  const isBattlePassClaim = rewardPath === RewardDOSegment.BattlePassClaim;
  const isBattlePassXp = rewardPath === RewardDOSegment.BattlePassXp;
  const isBattlePass = rewardPath === RewardDOSegment.BattlePass;
  const isMissionProgress = missionParts[0] !== undefined && missionParts[missionParts.length - 1] === MissionsDOSegment.Progress;
  const isMissionClaim = missionParts.length >= 2 && missionParts[missionParts.length - 1] === MissionsDOSegment.Claim;

  let parsedBody: Record<string, unknown> | undefined;
  if (request.method === HttpMethod.Post) {
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      try {
        const json = JSON.parse(rawBody) as unknown;
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body', issues: [] }), {
            status: HttpStatus.BadRequest,
            headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
          });
        }
        parsedBody = json as Record<string, unknown>;
      } catch {
        return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body', issues: [] }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
    } else {
      parsedBody = {};
    }

    if (isDailyClaim) {
      const flowResult = await flowRunner.run(
        rewardClaimFlow,
        createFlowContext({
          env,
          request,
          authUserId: userId,
          path,
          method: request.method,
          origin: requestOrigin,
          operationId: typeof parsedBody.idempotencyKey === 'string' ? parsedBody.idempotencyKey : undefined,
        }),
        { ...(typeof parsedBody.idempotencyKey === 'string' ? { idempotencyKey: parsedBody.idempotencyKey } : {}), ...(typeof parsedBody.userId === 'string' ? { userId: parsedBody.userId } : {}), kind: 'daily-claim' }
      );
      return new Response(JSON.stringify(flowResult.body), {
        status: flowResult.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (isStreakFreeze) {
      const flowResult = await flowRunner.run(
        rewardClaimFlow,
        createFlowContext({
          env,
          request,
          authUserId: userId,
          path,
          method: request.method,
          origin: requestOrigin,
        }),
        { kind: 'streak-freeze' }
      );
      return new Response(JSON.stringify(flowResult.body), {
        status: flowResult.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (isBattlePassClaim) {
      const tier = typeof parsedBody.tier === 'number' ? Math.floor(parsedBody.tier) : Number.NaN;
      if (!Number.isInteger(tier) || tier < 0) {
        return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid request payload', issues: [] }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      const flowResult = await flowRunner.run(
        rewardClaimFlow,
        createFlowContext({
          env,
          request,
          authUserId: userId,
          path,
          method: request.method,
          origin: requestOrigin,
          operationId: typeof parsedBody.idempotencyKey === 'string' ? parsedBody.idempotencyKey : undefined,
        }),
        {
          tier,
          ...(typeof parsedBody.idempotencyKey === 'string' ? { idempotencyKey: parsedBody.idempotencyKey } : {}),
          ...(typeof parsedBody.userId === 'string' ? { userId: parsedBody.userId } : {}),
          kind: 'battle-pass-claim',
        }
      );
      return new Response(JSON.stringify(flowResult.body), {
        status: flowResult.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (isBattlePassXp) {
      const amount = typeof parsedBody.amount === 'number' ? Math.floor(parsedBody.amount) : Number.NaN;
      if (!Number.isInteger(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid request payload', issues: [] }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      const res = await doFetch(stub, RewardDOPaths.BattlePassXp, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          amount,
          ...(typeof parsedBody.idempotencyKey === 'string' ? { idempotencyKey: parsedBody.idempotencyKey } : {}),
        }),
      });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (isMissionProgress) {
      const missionId = typeof parsedBody.missionId === 'string' ? parsedBody.missionId : '';
      if (!missionId) {
        return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid request payload', issues: [] }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      const res = await doFetch(stub, RewardDOPaths.MissionProgress, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          missionId,
          ...(typeof parsedBody.progress === 'number' ? { progress: Math.floor(parsedBody.progress) } : {}),
          ...(typeof parsedBody.increment === 'number' ? { increment: Math.floor(parsedBody.increment) } : {}),
        }),
      });
      const result = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(result), {
        status: res.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    if (isMissionClaim) {
      const missionId = typeof parsedBody.missionId === 'string' ? parsedBody.missionId : '';
      if (!missionId) {
        return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid request payload', issues: [] }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      const flowResult = await flowRunner.run(
        rewardClaimFlow,
        createFlowContext({
          env,
          request,
          authUserId: userId,
          path,
          method: request.method,
          origin: requestOrigin,
          operationId: typeof parsedBody.idempotencyKey === 'string' ? parsedBody.idempotencyKey : undefined,
        }),
        {
          missionId,
          ...(typeof parsedBody.idempotencyKey === 'string' ? { idempotencyKey: parsedBody.idempotencyKey } : {}),
          ...(typeof parsedBody.userId === 'string' ? { userId: parsedBody.userId } : {}),
          kind: 'mission-claim',
        }
      );
      return new Response(JSON.stringify(flowResult.body), {
        status: flowResult.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  const doPath = isDailyClaim
    ? RewardDOPaths.DailyClaim
    : isStreakFreeze
      ? RewardDOPaths.StreakFreeze
      : isBattlePassClaim
        ? RewardDOPaths.BattlePassClaim
        : isBattlePassXp
          ? RewardDOPaths.BattlePassXp
          : isBattlePass
            ? RewardDOPaths.BattlePass
            : isMissionProgress
              ? RewardDOPaths.MissionProgress
              : isMissionClaim
                ? RewardDOPaths.MissionClaim
                : path.startsWith(ApiEndpoint.Missions.Base)
                  ? RewardDOPaths.MissionsList
                  : RewardDOPaths.Daily;
  const res = await doFetch(stub, doPath, { method: request.method, body: request.method === HttpMethod.Post ? JSON.stringify(parsedBody ?? {}) : undefined });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) }
  });
}

export async function handleFeedRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  if (request.method === HttpMethod.Post && path.endsWith('/fanout')) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for feed fanout');
    if (authResult instanceof Response) return authResult;
    const actorId = authResult.userId;
    const { data, errorResponse: bodyError } = await validateZodBody(request, env, FeedFanoutRequestSchema);
    if (bodyError) return bodyError;
    const body = data!;

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
  const doPath = request.method === HttpMethod.Get || path.endsWith('list') ? ActivityFeedDOPaths.List : ActivityFeedDOPaths.Append;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (doPath === ActivityFeedDOPaths.Append) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, FeedAppendRequestSchema);
      if (errorResponse) return errorResponse;
      validatedGenericBody = JSON.stringify(data);
    } else {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, FeedReportRequestSchema);
      if (errorResponse) return errorResponse;
      validatedGenericBody = JSON.stringify(data);
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handlePartyRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const ns = env.PARTY_DO;
  if (!ns) return stubJson(env, { partyId: '', members: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for party');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const partyId = extractIdFromPath(path, ApiEndpoint.Party.Base);
  if (!partyId && request.method === HttpMethod.Post) {
    const { errorResponse: createBodyError } = await validateZodBody(
      request.clone(),
      env,
      z.object({
        action: z.string().min(1).optional(),
        inviteeId: z.string().min(1).optional(),
        targetId: z.string().min(1).optional(),
        newLeaderId: z.string().min(1).optional(),
      }).strict()
    );
    if (createBodyError) return createBodyError;
    const newPartyId = crypto.randomUUID();
    const stub = ns.get(ns.idFromName(newPartyId));
    const body = JSON.stringify({ userId, partyId: newPartyId });
    const res = await doFetch(stub, PartyDOPaths.Create, { method: HttpMethod.Post, body });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (data.error) return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    return new Response(JSON.stringify({ partyId: newPartyId }), { status: HttpStatus.Ok, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (!partyId) return stubJson(env, { partyId: '', members: [] });
  let partyBody = {};
  if (request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request, env, PartyActionRequestSchema);
    if (errorResponse) return errorResponse;
    partyBody = data || {};
  }
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
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const ns = env.NOTIFICATION_DO;
  if (!ns) return stubJson(env, { notifications: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for notifications');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  if (path === ApiEndpoint.Notification.Base && request.method === HttpMethod.Get) {
    const res = await doFetch(stub, NotificationDOPaths.List, { method: HttpMethod.Get });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  const doPath =
    path.endsWith('mark-read') ? NotificationDOPaths.MarkRead
      : path.endsWith('list') ? NotificationDOPaths.List
        : path.endsWith('preferences') ? NotificationDOPaths.Preferences
          : NotificationDOPaths.Push;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (doPath === NotificationDOPaths.Push) {
      const { data: pushData, errorResponse: pushError } = await validateZodBody(request.clone(), env, NotificationPushRequestSchema);
      if (pushError) return pushError;
      validatedGenericBody = JSON.stringify(pushData);
    } else if (doPath === NotificationDOPaths.MarkRead) {
      const { data: markReadData, errorResponse: markReadError } = await validateZodBody(request.clone(), env, NotificationMarkReadRequestSchema);
      if (markReadError) return markReadError;
      validatedGenericBody = JSON.stringify(markReadData);
    } else if (doPath === NotificationDOPaths.Preferences) {
      const { data: preferencesData, errorResponse: preferencesError } = await validateZodBody(request.clone(), env, NotificationPreferencesRequestSchema);
      if (preferencesError) return preferencesError;
      validatedGenericBody = JSON.stringify(preferencesData);
    } else {
      const { data: genData, errorResponse: genError } = await validateZodBody(request.clone(), env, NotificationActionRequestSchema);
      if (genError) return genError;
      validatedGenericBody = JSON.stringify(genData);
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

const DISCOVERY_GAMES = [
  { id: GameTypeId.Claim, name: GameName.Claim },
  { id: GameTypeId.Poker, name: GameName.Poker },
  { id: GameTypeId.WordSearch, name: GameName.WordSearch },
] as const;

export async function handleDiscoveryRequest(request: Request, env: Env, handlerPath: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
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
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const ns = env.INVENTORY_DO;
  if (!ns) return stubJson(env, { items: [] });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for inventory');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  if (path === ApiEndpoint.Inventory.Base && request.method === HttpMethod.Get) {
    const res = await doFetch(stub, InventoryDOPaths.List, { method: HttpMethod.Get });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  const isGift = path.endsWith(`/${InventoryDOSegment.Gift}`);
  const isTrade = path.endsWith(`/${InventoryDOSegment.Trade}`);
  const isAddItem = path.endsWith(`/${InventoryDOSegment.AddItem}`);
  const isRemoveItem = path.endsWith(`/${InventoryDOSegment.RemoveItem}`);
  const isList = path === ApiEndpoint.Inventory.List || path.endsWith(`/${InventoryDOSegment.List}`);
  if (request.method === HttpMethod.Post && (isGift || isTrade)) {
    if (isGift) {
      const { data, errorResponse } = await validateZodBody(
        request,
        env,
        z.object({
          itemId: z.string().min(1),
          targetUserId: z.string().min(1),
          idempotencyKey: IdempotencyKeySchema.optional(),
        }).strict()
      );
      if (errorResponse) return errorResponse;
      const body = data! as { itemId: string; targetUserId: string; idempotencyKey?: string };
      const flowResult = await flowRunner.run(
        inventoryTransferFlow,
        createFlowContext({
          env,
          request,
          authUserId: userId,
          path,
          method: request.method,
          origin: requestOrigin,
          operationId: body.idempotencyKey,
        }),
        { ...body, kind: 'gift' }
      );
      return new Response(JSON.stringify(flowResult.body), {
        status: flowResult.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    const { data, errorResponse } = await validateZodBody(
      request,
      env,
      z.object({
        myItemId: z.string().min(1),
        theirItemId: z.string().min(1),
        targetUserId: z.string().min(1),
        idempotencyKey: IdempotencyKeySchema.optional(),
      }).strict()
    );
    if (errorResponse) return errorResponse;
    const body = data! as { myItemId: string; theirItemId: string; targetUserId: string; idempotencyKey?: string };
    const flowResult = await flowRunner.run(
      inventoryTransferFlow,
      createFlowContext({
        env,
        request,
        authUserId: userId,
        path,
        method: request.method,
        origin: requestOrigin,
        operationId: body.idempotencyKey,
      }),
      { ...body, kind: 'trade' }
    );
    return new Response(JSON.stringify(flowResult.body), {
      status: flowResult.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const doPath = isAddItem
    ? InventoryDOPaths.AddItem
    : isRemoveItem
      ? InventoryDOPaths.RemoveItem
      : isList
        ? InventoryDOPaths.List
        : InventoryDOPaths.Equip;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (isAddItem) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({
        itemId: z.string().min(1),
        type: z.string().min(1),
        count: z.number().int().nonnegative().optional(),
        slot: z.string().min(1).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        idempotencyKey: IdempotencyKeySchema.optional(),
      }).strict());
      if (errorResponse || !data) return errorResponse!;
      validatedGenericBody = JSON.stringify({ ...data, operationId: data.idempotencyKey });
    } else if (isRemoveItem) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({
        itemId: z.string().min(1),
        idempotencyKey: IdempotencyKeySchema.optional(),
      }).strict());
      if (errorResponse || !data) return errorResponse!;
      validatedGenericBody = JSON.stringify({ ...data, operationId: data.idempotencyKey });
    } else {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({
        itemId: z.string().min(1),
        slot: z.string().min(1),
        idempotencyKey: IdempotencyKeySchema.optional(),
      }).strict());
      if (errorResponse || !data) return errorResponse!;
      validatedGenericBody = JSON.stringify({ ...data, operationId: data.idempotencyKey });
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleMarketplaceRequest(request: Request, env: Env, path: string): Promise<Response> {
  const supportedMethods = path.endsWith('buy') || path.endsWith('sell')
    ? [HttpMethod.Post]
    : path.endsWith('list') || path.endsWith('history')
      ? [HttpMethod.Get]
      : [HttpMethod.Get, HttpMethod.Post];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for marketplace');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;
  const ns = env.MARKETPLACE_DO;
  if (!ns) return stubJson(env, { listings: [] });
  const stub = ns.get(ns.idFromName('market'));
  const listPath = path.endsWith('list');
  const historyPath = path.endsWith('history');
  const buyPath = path.endsWith('buy');
  const sellPath = path.endsWith('sell');
  let body: string | undefined;
  if (request.method === HttpMethod.Post) {
    if (buyPath) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({ listingId: z.string().min(1) }).strict());
      if (errorResponse || !data) return errorResponse!;
      body = JSON.stringify({ ...data, buyerId: authUserId });
    } else if (sellPath) {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({
        itemId: z.string().min(1),
        itemType: z.string().min(1).optional(),
        price: z.coerce.number().nonnegative().optional(),
        currency: z.string().min(1).optional(),
      }).strict());
      if (errorResponse || !data) return errorResponse!;
      body = JSON.stringify({ ...data, sellerId: authUserId });
    } else {
      const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({}).strict());
      if (errorResponse || !data) return errorResponse!;
      body = JSON.stringify(data);
    }
  }

  if (historyPath) {
    const doPathHistory = `${MarketplaceDOPaths.History}?userId=${encodeURIComponent(authUserId)}`;
    const resHistory = await doFetch(stub, doPathHistory, { method: HttpMethod.Get });
    const dataHistory = await resHistory.json().catch(() => ({}));
    return new Response(JSON.stringify(dataHistory), {
      status: resHistory.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) }
    });
  }

  const doPath = listPath ? MarketplaceDOPaths.List : buyPath ? MarketplaceDOPaths.Buy : sellPath ? MarketplaceDOPaths.Sell : MarketplaceDOPaths.History;
  const res = await doFetch(stub, doPath, { method: request.method, body });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleTournamentRequest(request: Request, env: Env, path: string): Promise<Response> {
  const segment = path.endsWith(`/${TournamentDOSegment.Start}`)
    ? 'start'
    : path.endsWith(`/${TournamentDOSegment.Result}`)
      ? 'result'
      : path.endsWith(`/${TournamentDOSegment.Register}`)
        ? 'register'
        : path.endsWith('distribute-prizes')
          ? 'distribute-prizes'
          : 'bracket';
  const supportedMethods = segment === 'bracket' ? [HttpMethod.Get] : [HttpMethod.Post];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for tournaments');
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult.userId;
  const ns = env.TOURNAMENT_DO;
  if (!ns) return stubJson(env, { tournaments: [] });
  const tournamentIdResult = extractAndValidateIdFromPath(path, ApiEndpoint.Tournament.Base, 'tournamentId', request.url);
  if (!tournamentIdResult.id) {
    return new Response(JSON.stringify({ error: tournamentIdResult.error ?? 'Tournament ID required' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const tournamentId = tournamentIdResult.id;
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

  const doPath =
    segment === 'start'
      ? TournamentDOPaths.Start
      : segment === 'result'
        ? TournamentDOPaths.Result
        : segment === 'register'
          ? TournamentDOPaths.Register
          : TournamentDOPaths.Bracket;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (segment === 'register') {
      const { data: registerData, errorResponse: registerError } = await validateZodBody(
        request.clone(),
        env,
        z.object({
          userId: z.string().min(1).optional(),
          displayName: z.string().min(1).optional(),
          elo: z.coerce.number().int().optional(),
        }).strict()
      );
      if (registerError) return registerError;
      const body = registerData!;
      validatedGenericBody = JSON.stringify({
        userId: body.userId ?? authUserId,
        displayName: body.displayName,
        elo: body.elo,
      });
    } else if (segment === 'start') {
      const { errorResponse: startError } = await validateZodBody(request.clone(), env, z.object({}).strict());
      if (startError) return startError;
      validatedGenericBody = JSON.stringify({});
    } else {
      const { data: genData, errorResponse: genError } = await validateZodBody(request.clone(), env, z.object({}).strict());
      if (genError) return genError;
      validatedGenericBody = JSON.stringify(genData);
    }
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleSettingsRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const ns = env.SETTINGS_DO;
  if (!ns) return stubJson(env, { settings: {} });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for settings');
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;
  const stub = ns.get(ns.idFromName(userId));
  if (path === ApiEndpoint.Settings.Base && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request.clone(), env, SettingsUpdateRequestSchema);
    if (errorResponse) return errorResponse;
    const body = data!;
    const settingsBody = {
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
      ...(body.notifications !== undefined ? { notifications: body.notifications } : {}),
      ...(body.notificationsEnabled !== undefined && body.notifications === undefined ? { notifications: body.notificationsEnabled } : {}),
      ...(body.soundEnabled !== undefined ? { soundEnabled: body.soundEnabled } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
    };
    const res = await doFetch(stub, SettingsDOPaths.Update, { method: HttpMethod.Post, body: JSON.stringify(settingsBody) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (path !== ApiEndpoint.Settings.Base) {
    const validatedTarget = validateOpenApiUserIdPath(path, ApiEndpoint.Settings.Base, request, env);
    if (validatedTarget.response) return validatedTarget.response;
  }
  const doPath = path.includes('update') ? SettingsDOPaths.Update : SettingsDOPaths.Get;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    const { data: genData, errorResponse: genError } = await validateZodBody(request.clone(), env, SettingsUpdateRequestSchema);
    if (genError) return genError;
    const body = genData!;
    validatedGenericBody = JSON.stringify({
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
      ...(body.notifications !== undefined ? { notifications: body.notifications } : {}),
      ...(body.notificationsEnabled !== undefined && body.notifications === undefined ? { notifications: body.notificationsEnabled } : {}),
      ...(body.soundEnabled !== undefined ? { soundEnabled: body.soundEnabled } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
    });
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}


export async function handleAdminRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post, HttpMethod.Patch]);
  if (methodCheck) return methodCheck;
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
    const { data: modReportData, errorResponse: modReportErr } = await validateZodBody(request.clone(), env, AdminModerationReportRequestSchema);
    if (modReportErr) return modReportErr;
    const body = modReportData! as { reporterId: string; targetId: string; reason: string; category?: string };
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
  if (path === ApiEndpoint.Admin.Base && request.method === HttpMethod.Post) {
    const { errorResponse } = await validateZodBody(request.clone(), env, AdminBaseRequestSchema);
    if (errorResponse) return errorResponse;
  }
  const adminPathParts = extractPathParts(path, ApiEndpoint.Admin.Base);
  if (adminPathParts[0] === 'users' && adminPathParts[2] === 'status' && request.method === HttpMethod.Post) {
    const targetUserId = adminPathParts[1];
    if (!targetUserId || !OPENAPI_USER_ID_PATTERN.test(targetUserId)) {
      return stubJson(env, { error: 'Target user ID is required' }, HttpStatus.BadRequest);
    }
    const { data, errorResponse: bodyResultError } = await validateZodBody(request, env, AdminUserStatusRequestSchema); if (bodyResultError) return bodyResultError;
    const body = data!;
    if (typeof body.isAdmin !== 'boolean') {
      return stubJson(env, { error: 'isAdmin must be boolean' }, HttpStatus.BadRequest);
    }
    if (env.TEST_MODE === QueryValue.True) {
      return stubJson(env, { success: true });
    }
    if (!env.FIREBASE_PROJECT_ID) {
      return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
    }
    const authHeader = await getFirestoreAuthHeader(env);
    if (!authHeader) {
      return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
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
    const authHeader = await getFirestoreAuthHeader(env);
    if (!env.FIREBASE_PROJECT_ID || !authHeader) {
      if (env.TEST_MODE === 'true') {
        return stubJson(env, { users: [], activity: [] });
      }
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
    const { data, errorResponse: bodyResultError } = await validateZodBody(request, env, z.object({ action: z.string(), moderatorId: z.string().optional() })); if (bodyResultError) return bodyResultError;
    const body = data!;
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
    const { data: planBody, errorResponse: bodyResultError } = await validateZodBody(request, env, AdminCreditsPlanRequestSchema); if (bodyResultError) return bodyResultError;
    const { userId, tier } = planBody!;
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
    const { data: body, errorResponse: bodyResultError } = await validateZodBody(request, env, AdminAICatalogRequestSchema); if (bodyResultError) return bodyResultError;
    const toMerge: AICatalogProviderEntry[] = (body!.providers
      ? body!.providers
      : body!.provider
        ? [body!.provider]
        : []) as unknown as AICatalogProviderEntry[];
    if (toMerge.length === 0) {
      return stubJson(env, { ok: true, providers: (await getCatalogFromEnv(env)).providers.length });
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
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
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
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
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

  const auditService = new AuditTrailService(env);
  let body: { startDate?: string; endDate?: string; reportType?: 'pci' | 'gdpr' | 'soc2' } = {};

  if (request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateZodBody(request.clone(), env, z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      reportType: z.enum(['pci', 'gdpr', 'soc2']).optional(),
    }).strict());
    if (errorResponse) return errorResponse;
    body = data! as typeof body;
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
