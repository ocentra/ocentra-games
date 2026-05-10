import type { Env } from '@/constants/env';
import { validateSchemaBody } from '@/utils/schema-validation';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { verifyAuth } from '@/utils/auth';
import { checkAdminStatus } from '@/utils/admin-check';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint, UsersSegment } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ParamName } from '@ocentra/endpoint-domain/constants/paths';
import { extractAndValidateIdFromPath, extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import { QueryParam, QueryValue } from '@ocentra/endpoint-domain/constants/query';
import {
  LobbyDO as LobbyDOPaths,
  MatchmakingDO as MatchmakingDOPaths,
  PresenceDO as PresenceDOPaths,
  AuditLogDO as AuditLogDOPaths,
  AuditLogDOSegment,
  ProgressionDO as ProgressionDOPaths,
  ProgressionDOSegment,
  RewardDO as RewardDOPaths,
  LobbyDOSegment,
  AntiCheatDO as AntiCheatDOPaths,
  FraudDetectionDO as FraudDetectionDOPaths,
  PenaltyDO as PenaltyDOPaths,
  ProfileDO as ProfileDOPaths,
  ProfileDOSegment,
  MessageDO as MessageDOPaths,
  MessageDOSegment,
  PresenceDOSegment,
  MatchmakingDOSegment,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { AuditTrailService } from '@/services/AuditTrailService';
import { getPersonalizedContentFromData, getChurnPredictionFromData } from '@/logic/retention';
import {
  AntiCheatAnalyzeRequestSchema,
  AntiCheatReportRequestSchema,
  FraudCheckRequestSchema,
  FraudCheckPreviewRequestSchema,
  MessageListQuerySchema,
  MessageReadReceiptRequestSchema,
  MatchmakingLeaveRequestSchema,
  MatchmakingQueueRequestSchema,
  MessageSendRequestSchema,
  PresenceStatusUpdateRequestSchema,
  PresenceTypingRequestSchema,
  PresenceFriendPathRequestSchema,
  PresenceFriendDeleteRequestSchema,
  PresenceBlockPathRequestSchema,
  PresenceBlockRequestSchema,
  PresenceFriendRequestSchema,
  ProfileAvatarRequestSchema,
  ProfileBadgeRequestSchema,
  ProfileStatsRequestSchema,
  ProfileUpdateRequestSchema,
  ProgressionXpRequestSchema,
  PenaltyAppealRequestSchema,
  PenaltyAppealReviewRequestSchema,
  RoomAddAIRequestSchema,
  RoomCreateRequestSchema,
  RoomJoinRequestSchema,
  RoomLeaveRequestSchema,
  RoomQuickJoinRequestSchema,
  RoomReadyRequestSchema,
  RoomStartRequestSchema,
  RoomSpectateRequestSchema,
  SecurityPenaltyIssueRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { AuditEventSchema } from '@ocentra/endpoint-domain/schemas/audit';
import { EmptyObjectSchema } from '@ocentra/endpoint-domain/schemas/common';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  DEFAULT_REGION,
  DEFAULT_SHARD,
  LOBBY_SHARD_COUNT,
  doFetch,
  getLobbyGameBucketKeys,
  getLobbyRoomShardKey,
  getLobbyShardKey,
  getPresenceShardKey,
  isBlockedBy,
  parseConversationTargets,
  stubJson,
  normalizeOpenApiPathSegment,
  validateOpenApiUserIdPath,
} from '@/handlers/feature-handlers-helpers';
import {
  clampLobbyListLimit,
  encodeLobbyCursor,
  getLobbyRoomActionShardKeys,
  lobbyResponse,
  sortLobbyRooms,
  type LobbyRoomListItem,
} from '@/handlers/feature-handlers-lobby';
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

export async function handleLobbyRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Lobby request', getStackTrace(), { path });
  const parts = path.split('/').filter(Boolean);
  const roomsIndex = parts.findIndex(part => part === LobbyDOSegment.Rooms);
  const roomOrActionSegment = roomsIndex >= 0 ? parts[roomsIndex + 1] ?? '' : '';
  const roomActionSegment = roomsIndex >= 0 ? parts[roomsIndex + 2] ?? '' : '';
  const isQuickJoin = roomOrActionSegment === LobbyDOSegment.QuickJoin;
  const isJoin = roomActionSegment === LobbyDOSegment.Join;
  const isLeave = roomActionSegment === LobbyDOSegment.Leave;
  const isSpectate = roomActionSegment === LobbyDOSegment.Spectate;
  const isReady = roomActionSegment === LobbyDOSegment.Ready;
  const isUnready = roomActionSegment === LobbyDOSegment.Unready;
  const isStart = roomActionSegment === LobbyDOSegment.Start;
  const isAddAI = roomActionSegment === LobbyDOSegment.AddAI;
  const isRoomAction = isJoin || isLeave || isSpectate || isReady || isUnready || isStart || isAddAI;
  const roomIdFromPath = isRoomAction ? roomOrActionSegment : '';
  const supportedMethods = (isQuickJoin || isRoomAction)
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
  let authUserId = '';
  if (request.method === HttpMethod.Get && !isQuickJoin && !isRoomAction) {
    const authHeader = request.headers.get(HttpHeader.Authorization);
    if (authHeader) {
      const optionalAuthResult = await verifyAuth(request, env.FIREBASE_PROJECT_ID || '', env);
      authUserId = optionalAuthResult.userId || '';
    }
  } else {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for lobby');
    if (authResult instanceof Response) return authResult;
    authUserId = authResult.userId;
  }
  const url = new URL(request.url);
  const gameTypeQuery = url.searchParams.get(QueryParam.GameType) ?? '';
  let bodyText: string | undefined;
  if (request.method === HttpMethod.Post) {
    if (isQuickJoin) {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, RoomQuickJoinRequestSchema);
      if (errorResponse) return errorResponse;
      const body = data!;
      const bucketKeys = getLobbyGameBucketKeys(body.gameType);
      for (const shardForQuickJoin of bucketKeys) {
        const stubQuickJoin = ns.get(ns.idFromName(shardForQuickJoin));
        const resQuickJoin = await doFetch(stubQuickJoin, LobbyDOPaths.QuickJoin(shardForQuickJoin), {
          method: HttpMethod.Post,
          body: JSON.stringify({ ...body, createIfMissing: false }),
        });
        if (resQuickJoin.status !== HttpStatus.NotFound) {
          const dataQuickJoin = await resQuickJoin.json().catch(() => ({}));
          logInfo('Lobby quick join routed', getStackTrace(), { gameType: body.gameType, shardKey: shardForQuickJoin, status: resQuickJoin.status });
          return lobbyResponse(env, dataQuickJoin, resQuickJoin.status);
        }
        await resQuickJoin.text().catch(() => undefined);
      }
      if (body.createIfMissing === false) {
        return lobbyResponse(env, { error: 'No joinable room found' }, HttpStatus.NotFound);
      }
      const roomId = body.roomId ?? crypto.randomUUID();
      const shardForCreate = getLobbyRoomShardKey(body.gameType, roomId);
      const stubQuickJoinCreate = ns.get(ns.idFromName(shardForCreate));
      const resQuickJoinCreate = await doFetch(stubQuickJoinCreate, LobbyDOPaths.QuickJoin(shardForCreate), {
        method: HttpMethod.Post,
        body: JSON.stringify({ ...body, roomId, createIfMissing: true }),
      });
      const dataQuickJoinCreate = await resQuickJoinCreate.json().catch(() => ({}));
      logInfo('Lobby quick join created room', getStackTrace(), { gameType: body.gameType, roomId, shardKey: shardForCreate, status: resQuickJoinCreate.status });
      return lobbyResponse(env, dataQuickJoinCreate, resQuickJoinCreate.status);
    }
    const isCreateRoom = roomsIndex >= 0 && roomOrActionSegment === '' && !isRoomAction;
    if (isCreateRoom) {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, RoomCreateRequestSchema);
      if (errorResponse) return errorResponse;
      const body = data!;
      const roomId = body.roomId ?? crypto.randomUUID();
      const shardForCreate = body.gameType ? getLobbyRoomShardKey(body.gameType, roomId) : getLobbyShardKey(roomId);
      const lobbyBodyText = JSON.stringify({
        ...body,
        roomId,
      });
      const stubCreate = ns.get(ns.idFromName(shardForCreate));
      const doPathCreate = LobbyDOPaths.Rooms(shardForCreate);
      const resCreate = await doFetch(stubCreate, doPathCreate, { method: HttpMethod.Post, body: lobbyBodyText });
      const dataCreate = await resCreate.json().catch(() => ({}));
      logInfo('Lobby room create routed', getStackTrace(), { gameType: body.gameType, roomId, shardKey: shardForCreate, status: resCreate.status });
      return lobbyResponse(env, dataCreate, resCreate.status);
    }
    if (isJoin || isLeave || isReady || isUnready || isStart || isAddAI) {
      const { data, errorResponse } = await validateSchemaBody(
        request.clone(),
        env,
        isJoin ? RoomJoinRequestSchema : isLeave ? RoomLeaveRequestSchema : isStart ? RoomStartRequestSchema : isAddAI ? RoomAddAIRequestSchema : RoomReadyRequestSchema
      );
      if (errorResponse) return errorResponse;
      bodyText = JSON.stringify(data!);
    }
    if (isSpectate) {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, RoomSpectateRequestSchema);
      if (errorResponse) return errorResponse;
      bodyText = JSON.stringify(data!);
    }
  }
  if (request.method === HttpMethod.Get && !isRoomAction) {
    const limit = clampLobbyListLimit(url.searchParams.get(QueryParam.Limit));
    const sort = url.searchParams.get(QueryParam.Sort) ?? 'newest';
    const params = new URLSearchParams();
    if (authUserId) params.set('userId', authUserId);
    if (gameTypeQuery) params.set(QueryParam.GameType, gameTypeQuery);
    const modeQuery = url.searchParams.get(QueryParam.Mode);
    if (modeQuery) params.set(QueryParam.Mode, modeQuery);
    const visibilityQuery = url.searchParams.get(QueryParam.Visibility);
    if (visibilityQuery) params.set(QueryParam.Visibility, visibilityQuery);
    const statusQuery = url.searchParams.get(QueryParam.Status);
    if (statusQuery) params.set(QueryParam.Status, statusQuery);
    const searchQuery = url.searchParams.get(QueryParam.Search);
    if (searchQuery) params.set(QueryParam.Search, searchQuery);
    const stakeTypeQuery = url.searchParams.get(QueryParam.StakeType);
    if (stakeTypeQuery) params.set(QueryParam.StakeType, stakeTypeQuery);
    const allowAIQuery = url.searchParams.get(QueryParam.AllowAI);
    if (allowAIQuery !== null) params.set(QueryParam.AllowAI, allowAIQuery);
    const cursorQuery = url.searchParams.get(QueryParam.Cursor);
    if (cursorQuery) params.set(QueryParam.Cursor, cursorQuery);
    params.set(QueryParam.Sort, sort);
    params.set(QueryParam.Limit, String(limit));
    const query = params.size > 0 ? `?${params.toString()}` : '';
    const adminDebug = url.searchParams.get(QueryParam.AdminDebug) === QueryValue.True;
    if (!gameTypeQuery && !adminDebug) {
      return lobbyResponse(env, { rooms: [], nextCursor: null, limit, scope: 'gameType-required' });
    }
    const allRooms: LobbyRoomListItem[] = [];
    let bucketHasMore = false;
    const shardKeys = gameTypeQuery ? getLobbyGameBucketKeys(gameTypeQuery) : Array.from({ length: LOBBY_SHARD_COUNT }, (_, i) => `lobby-${i}`);
    for (const sk of shardKeys) {
      const stub = ns.get(ns.idFromName(sk));
      const res = await doFetch(stub, LobbyDOPaths.Rooms(sk) + query, { method: HttpMethod.Get });
      const data = (await res.json().catch(() => ({}))) as { rooms?: LobbyRoomListItem[]; hasMore?: boolean };
      if (Array.isArray(data.rooms)) allRooms.push(...data.rooms);
      bucketHasMore = bucketHasMore || data.hasMore === true;
    }
    const sortedRooms = sortLobbyRooms(allRooms, sort);
    const rooms = sortedRooms.slice(0, limit);
    const hasMore = bucketHasMore || sortedRooms.length > limit;
    const nextCursor = hasMore && rooms.length > 0 ? encodeLobbyCursor(rooms[rooms.length - 1], sort) : null;
    logInfo('Lobby rooms listed', getStackTrace(), { gameType: gameTypeQuery || undefined, shardCount: shardKeys.length, limit, returned: rooms.length, hasMore });
    return lobbyResponse(env, { rooms, nextCursor, limit });
  }
  const shardKeys = getLobbyRoomActionShardKeys(gameTypeQuery, roomIdFromPath);
  for (const shardKey of shardKeys) {
    const doPath = isJoin
      ? LobbyDOPaths.Join(shardKey, roomIdFromPath)
      : isLeave
        ? LobbyDOPaths.Leave(shardKey, roomIdFromPath)
        : isSpectate
          ? LobbyDOPaths.Spectate(shardKey, roomIdFromPath)
          : isReady
            ? LobbyDOPaths.Ready(shardKey, roomIdFromPath)
            : isUnready
              ? LobbyDOPaths.Unready(shardKey, roomIdFromPath)
              : isStart
                ? LobbyDOPaths.Start(shardKey, roomIdFromPath)
                : isAddAI
                  ? LobbyDOPaths.AddAI(shardKey, roomIdFromPath)
                  : LobbyDOPaths.Rooms(shardKey);
    const stub = ns.get(ns.idFromName(shardKey));
    const res = await doFetch(stub, doPath, { method: request.method, body: bodyText });
    const data = await res.json().catch(() => ({}));
    if (res.status !== HttpStatus.NotFound || shardKey === shardKeys[shardKeys.length - 1]) {
      logInfo('Lobby room action routed', getStackTrace(), { gameType: gameTypeQuery || undefined, roomId: roomIdFromPath, action: roomActionSegment, shardKey, status: res.status });
      return lobbyResponse(env, data, res.status);
    }
  }
  return lobbyResponse(env, { error: 'Room not found' }, HttpStatus.NotFound);
}

export async function handleMatchmakingRequest(request: Request, env: Env, path: string): Promise<Response> {
  logDebug('Matchmaking request', getStackTrace(), { path });
  const isQueuePath = path.endsWith(MatchmakingDOSegment.Queue);
  const isStatusPath = path.endsWith(MatchmakingDOSegment.Status);
  const supportedMethods = isStatusPath
    ? [HttpMethod.Get]
    : path.endsWith(MatchmakingDOSegment.Leave)
      ? [HttpMethod.Post]
      : isQueuePath
        ? [HttpMethod.Get, HttpMethod.Post, HttpMethod.Delete]
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
  const isLeave = path.endsWith(MatchmakingDOSegment.Leave) || (isQueuePath && request.method === HttpMethod.Delete);
  const doPath =
    isQueuePath && request.method === HttpMethod.Post
      ? MatchmakingDOPaths.Queue(DEFAULT_REGION)
      : isLeave
        ? MatchmakingDOPaths.Leave(DEFAULT_REGION) + (search ? search : '')
        : MatchmakingDOPaths.Status(DEFAULT_REGION) + (search ? search : '');
  const method = isLeave ? (request.method === HttpMethod.Delete ? HttpMethod.Delete : HttpMethod.Post) : request.method;
  let validatedBody: string | undefined;
  if (method === HttpMethod.Post || method === HttpMethod.Put) {
    if (isLeave) {
      const { data, errorResponse } = await validateSchemaBody(
        request.clone(),
        env,
        MatchmakingLeaveRequestSchema
      );
      if (errorResponse) return errorResponse;
      const body = data!;
      validatedBody = JSON.stringify({ userId: body.userId, ticketId: body.ticketId });
    } else {
      const { data, errorResponse } = await validateSchemaBody(
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
  const ns = env.PRESENCE_DO;
  const shardKey = getPresenceShardKey(userId);
  const friendsBase = ApiEndpoint.Friends.Base.replace(/\/$/, '');
  const friendsSegments = extractPathParts(path, ApiEndpoint.Friends.Base);
  if (path.startsWith(ApiEndpoint.Users.Base) && path.endsWith(`/${UsersSegment.Block}`)) {
    const validatedTarget = validateOpenApiUserIdPath(path, ApiEndpoint.Users.Base, request, env);
    if (validatedTarget.response) return validatedTarget.response;
    const targetId = validatedTarget.userId!;
    if (!ns) return stubJson(env, { friends: [] });
    const stub = ns.get(ns.idFromName(shardKey));
    const doPath = PresenceDOPaths.Block(shardKey);
    const { data: bData, errorResponse: bErr } = await validateSchemaBody(request.clone(), env, PresenceBlockRequestSchema);
    if (bErr) return bErr;
    const res = await doFetch(stub, doPath, { method: HttpMethod.Post, body: JSON.stringify({ ...bData, userId, targetId }) });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (path.startsWith(friendsBase)) {
    const isFriendsListPath = path === friendsBase;
    if (request.method === HttpMethod.Get) {
      if (!isFriendsListPath) {
        return new Response(JSON.stringify({ error: 'Not Found' }), { status: HttpStatus.NotFound, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
      }
      if (!ns) return stubJson(env, { friends: [] });
      const stub = ns.get(ns.idFromName(shardKey));
      const doPath = PresenceDOPaths.Friends(shardKey) + `?userId=${encodeURIComponent(userId)}`;
      const res = await doFetch(stub, doPath, { method: HttpMethod.Get });
      const data = await res.json().catch(() => ({}));
      if (res.status === HttpStatus.NotFound && env.TEST_MODE === QueryValue.True) {
        return stubJson(env, { friends: [] });
      }
      return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    if (friendsSegments.length !== 1) {
      return new Response(JSON.stringify({ error: 'Friend ID required' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    const friendIdResult = extractAndValidateIdFromPath(path, ApiEndpoint.Friends.Base, ParamName.FriendId, request.url);
    if (!friendIdResult.id) {
      return new Response(JSON.stringify({ error: friendIdResult.error ?? 'Friend ID required' }), { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
    }
    const friendId = friendIdResult.id;
    if (!ns) return stubJson(env, { friends: [] });
    const stub = ns.get(ns.idFromName(shardKey));
    if (request.method === HttpMethod.Post) {
      const doPath = PresenceDOPaths.Friends(shardKey);
      const { data: fPData, errorResponse: fPErr } = await validateSchemaBody(request.clone(), env, PresenceFriendRequestSchema);
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
      const { data: fDData, errorResponse: fDErr } = await validateSchemaBody(request.clone(), env, PresenceFriendDeleteRequestSchema);
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
  const isTyping = path === typingPath || path.endsWith(typingPath);
  if (isTyping && request.method === HttpMethod.Post) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for typing');
    if (authResult instanceof Response) return authResult;
    const fromUserId = authResult.userId;
    const { data, errorResponse: bodyResultError } = await validateSchemaBody(request, env, PresenceTypingRequestSchema); if (bodyResultError) return bodyResultError;
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
  const doPath = path.endsWith(PresenceDOSegment.Friends) ? PresenceDOPaths.Friends(shardKey) : path.endsWith(PresenceDOSegment.Block) ? PresenceDOPaths.Block(shardKey) : PresenceDOPaths.Status(shardKey, userId);
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (path.endsWith(PresenceDOSegment.Friends)) {
      const { data: friendBody, errorResponse: friendError } = await validateSchemaBody(request.clone(), env, PresenceFriendPathRequestSchema);
      if (friendError) return friendError;
      validatedGenericBody = JSON.stringify(friendBody);
    } else if (path.endsWith(PresenceDOSegment.Block)) {
      const { data: blockBody, errorResponse: blockError } = await validateSchemaBody(request.clone(), env, PresenceBlockPathRequestSchema);
      if (blockError) return blockError;
      validatedGenericBody = JSON.stringify(blockBody);
    } else {
      const { data: statusBody, errorResponse: statusError } = await validateSchemaBody(request.clone(), env, PresenceStatusUpdateRequestSchema);
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

  if (path.endsWith(ApiEndpoint.Audit.Verify)) {
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

  if (path.endsWith(ApiEndpoint.Audit.Export)) {
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
  const isQueryPath = path.endsWith(AuditLogDOSegment.Query);
  const doPath = isQueryPath ? AuditLogDOPaths.Query : path.endsWith(AuditLogDOSegment.Log) ? AuditLogDOPaths.Log : AuditLogDOPaths.StoreEvent;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (isQueryPath) {
      const bodyText = await request.clone().text();
      validatedGenericBody = bodyText.trim().length > 0 ? bodyText : JSON.stringify({ filters: {} });
    } else {
      const { data: eventData, errorResponse: eventError } = await validateSchemaBody(request.clone(), env, AuditEventSchema);
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
  const doPath = path.endsWith(ProgressionDOSegment.Xp)
    ? ProgressionDOPaths.Xp
    : path.endsWith(ProgressionDOSegment.Level)
      ? ProgressionDOPaths.Level
      : path.includes(ProgressionDOSegment.UnlockSkill)
        ? ProgressionDOPaths.UnlockSkill
        : path.includes(ProgressionDOSegment.UpdateAchievement)
          ? ProgressionDOPaths.UpdateAchievement
          : path.endsWith(ProgressionDOSegment.Skills)
            ? ProgressionDOPaths.Skills
            : path.endsWith(ProgressionDOSegment.Achievements)
              ? ProgressionDOPaths.Achievements
              : path.endsWith(ProgressionDOSegment.Collections)
                ? ProgressionDOPaths.Collections
                : request.method === HttpMethod.Post && isBasePath
                  ? ProgressionDOPaths.Xp
                  : ProgressionDOPaths.Get;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (doPath === ProgressionDOPaths.Xp) {
      const { data: xpData, errorResponse: xpError } = await validateSchemaBody(request.clone(), env, ProgressionXpRequestSchema);
      if (xpError) return xpError;
      const amount = typeof xpData?.amount === 'number' ? xpData.amount : typeof xpData?.xpAwarded === 'number' ? xpData.xpAwarded : 0;
      validatedGenericBody = JSON.stringify({
        amount,
        ...(typeof xpData?.reason === 'string' ? { reason: xpData.reason } : {}),
        ...(typeof xpData?.idempotencyKey === 'string' ? { idempotencyKey: xpData.idempotencyKey } : {}),
      });
    } else if (doPath === ProgressionDOPaths.UnlockSkill || doPath === ProgressionDOPaths.UpdateAchievement) {
      validatedGenericBody = await request.clone().text();
    } else {
      const { data: genData, errorResponse: genError } = await validateSchemaBody(request.clone(), env, EmptyObjectSchema);
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
  if (path.includes(ApiEndpoint.Analytics.Profile)) return handleAnalyticsProfileRequest(request, env);
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
      const { data, errorResponse } = await validateSchemaBody(request, env, SecurityPenaltyIssueRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, SecurityPenaltyIssueRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, PenaltyAppealRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, PenaltyAppealReviewRequestSchema);
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
      const { data, errorResponse } = await validateSchemaBody(request, env, FraudCheckPreviewRequestSchema);
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

  if (pathParts[0] === 'check' && pathParts.length > 1) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: HttpStatus.NotFound,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[0] === 'check' && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateSchemaBody(request, env, FraudCheckRequestSchema);
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
      const { data, errorResponse } = await validateSchemaBody(request, env, AntiCheatAnalyzeRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, AntiCheatAnalyzeRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, AntiCheatReportRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, ProfileUpdateRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.Update, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.Update && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateSchemaBody(request, env, ProfileUpdateRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.Update, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.Avatar && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateSchemaBody(request, env, ProfileAvatarRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, ProfileBadgeRequestSchema);
    if (errorResponse) return errorResponse;
    const res = await doFetch(stub, ProfileDOPaths.AddBadge, { method: HttpMethod.Post, body: JSON.stringify(data) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), {
      status: res.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  if (pathParts[1] === ProfileDOSegment.UpdateStats && request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateSchemaBody(request, env, ProfileStatsRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, MessageSendRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, MessageSendRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, MessageReadReceiptRequestSchema);
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
    const queryResult = MessageListQuerySchema.safeParse({
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


export { handleRewardRequest, handleFeedRequest, handlePartyRequest, handleNotificationRequest, handleDiscoveryRequest, handleInventoryRequest, handleMarketplaceRequest, handleTournamentRequest, handleSettingsRequest } from './feature-handlers-stateful';


