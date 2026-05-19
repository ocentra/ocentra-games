import type { Env } from '@/constants/env';
import { validateSchemaBody } from '@/utils/schema-validation';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { GameName, GameTypeId } from '@ocentra/endpoint-domain/constants/game';
import { ParamName } from '@ocentra/endpoint-domain/constants/paths';
import { extractAndValidateIdFromPath, extractIdFromPath, extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import {
  ActivityFeedDO as ActivityFeedDOPaths,
  InventoryDO as InventoryDOPaths,
  InventoryDOSegment,
  MarketplaceDO as MarketplaceDOPaths,
  NotificationDO as NotificationDOPaths,
  NotificationDOSegment,
  PartyDO as PartyDOPaths,
  PartyDOSegment,
  PresenceDO as PresenceDOPaths,
  RewardDO as RewardDOPaths,
  RewardDOSegment,
  SettingsDO as SettingsDOPaths,
  SettingsDOSegment,
  TournamentDO as TournamentDOPaths,
  TournamentDOSegment,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { MissionsDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  FeedAppendRequestSchema,
  FeedFanoutRequestSchema,
  FeedReportRequestSchema,
  DiscoverySearchQuerySchema,
  InventoryEquipItemRequestSchema,
  InventoryGiftRequestSchema,
  InventoryTradeRequestSchema,
  MarketplaceBuyRequestSchema,
  MarketplaceEmptyRequestSchema,
  MarketplaceSellRequestSchema,
  NotificationActionRequestSchema,
  NotificationMarkReadRequestSchema,
  NotificationPreferencesRequestSchema,
  NotificationPushRequestSchema,
  PartyActionRequestSchema,
  RewardDailyClaimRequestSchema,
  SettingsUpdateRequestSchema,
  TournamentRegisterRequestSchema,
  TournamentResultRequestSchema,
  TournamentStartRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { createFlowContext } from '@/flows/core/FlowContext';
import { FlowRunner } from '@/flows/core/FlowRunner';
import { RewardClaimFlow } from '@/flows/reward-claim-flow';
import { InventoryTransferFlow } from '@/flows/inventory-transfer-flow';
import { TournamentPrizeDistributionFlow } from '@/flows/tournament-prize-distribution-flow';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import {
  doFetch,
  getPresenceShardKey,
  isBlockedBy,
  stubJson,
  validateOpenApiUserIdPath,
} from '@/handlers/feature-handlers-helpers';

const flowRunner = new FlowRunner();
const rewardClaimFlow = new RewardClaimFlow();
const inventoryTransferFlow = new InventoryTransferFlow();
const tournamentPrizeDistributionFlow = new TournamentPrizeDistributionFlow();

function rejectClientTrustedWorkflowMutation(env: Env, requestOrigin: string | undefined, message: string): Response {
  return new Response(JSON.stringify({
    error: ErrorMessage.Forbidden,
    message,
  }), {
    status: HttpStatus.Forbidden,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env, requestOrigin) },
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

  if (request.method === HttpMethod.Post && isBattlePassXp) {
    return rejectClientTrustedWorkflowMutation(env, requestOrigin, 'Battle pass XP must be issued by trusted server workflows');
  }

  if (request.method === HttpMethod.Post && isMissionProgress) {
    return rejectClientTrustedWorkflowMutation(env, requestOrigin, 'Mission progress must be issued by trusted server workflows');
  }

  let parsedBody: Record<string, unknown> | undefined;
  if (request.method === HttpMethod.Post) {
    if (isDailyClaim) {
      const { data: dailyData, errorResponse: dailyError } = await validateSchemaBody(request.clone(), env, RewardDailyClaimRequestSchema);
      if (dailyError) return dailyError;
      const dailyBody = (dailyData ?? {}) as { idempotencyKey?: string; userId?: string };
      const flowResult = await flowRunner.run(
        rewardClaimFlow,
        createFlowContext({
          env,
          request,
          authUserId: userId,
          path,
          method: request.method,
          origin: requestOrigin,
          operationId: typeof dailyBody.idempotencyKey === 'string' ? dailyBody.idempotencyKey : undefined,
        }),
        {
          ...(typeof dailyBody.idempotencyKey === 'string' ? { idempotencyKey: dailyBody.idempotencyKey } : {}),
          ...(typeof dailyBody.userId === 'string' ? { userId: dailyBody.userId } : {}),
          kind: 'daily-claim',
        }
      );
      return new Response(JSON.stringify(flowResult.body), {
        status: flowResult.status,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }

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
  if (request.method === HttpMethod.Post && path.endsWith(ApiEndpoint.Feed.Fanout)) {
    const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for feed fanout');
    if (authResult instanceof Response) return authResult;
    const actorId = authResult.userId;
    const { data, errorResponse: bodyError } = await validateSchemaBody(request, env, FeedFanoutRequestSchema);
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
  const doPath = request.method === HttpMethod.Get || path.endsWith(ApiEndpoint.Feed.List) ? ActivityFeedDOPaths.List : ActivityFeedDOPaths.Append;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (doPath === ActivityFeedDOPaths.Append) {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, FeedAppendRequestSchema);
      if (errorResponse) return errorResponse;
      validatedGenericBody = JSON.stringify(data);
    } else {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, FeedReportRequestSchema);
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
    const { errorResponse: createBodyError } = await validateSchemaBody(request.clone(), env, PartyActionRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, PartyActionRequestSchema);
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
        : path.endsWith(PartyDOSegment.Kick)
          ? `${PartyDOPaths.Base}/${PartyDOSegment.Kick}`
          : path.endsWith(PartyDOSegment.TransferLeader)
            ? `${PartyDOPaths.Base}/${PartyDOSegment.TransferLeader}`
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
    path.endsWith(NotificationDOSegment.MarkRead) ? NotificationDOPaths.MarkRead
      : path.endsWith(NotificationDOSegment.List) ? NotificationDOPaths.List
        : path.endsWith(NotificationDOSegment.Preferences) ? NotificationDOPaths.Preferences
          : NotificationDOPaths.Push;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (doPath === NotificationDOPaths.Push) {
      const { data: pushData, errorResponse: pushError } = await validateSchemaBody(request.clone(), env, NotificationPushRequestSchema);
      if (pushError) return pushError;
      validatedGenericBody = JSON.stringify(pushData);
    } else if (doPath === NotificationDOPaths.MarkRead) {
      const { data: markReadData, errorResponse: markReadError } = await validateSchemaBody(request.clone(), env, NotificationMarkReadRequestSchema);
      if (markReadError) return markReadError;
      validatedGenericBody = JSON.stringify(markReadData);
    } else if (doPath === NotificationDOPaths.Preferences) {
      const { data: preferencesData, errorResponse: preferencesError } = await validateSchemaBody(request.clone(), env, NotificationPreferencesRequestSchema);
      if (preferencesError) return preferencesError;
      validatedGenericBody = JSON.stringify(preferencesData);
    } else {
      const { data: genData, errorResponse: genError } = await validateSchemaBody(request.clone(), env, NotificationActionRequestSchema);
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
  if (handlerPath.endsWith(ApiEndpoint.Discovery.Search)) {
      const queryResult = DiscoverySearchQuerySchema.safeParse({
        [QueryParam.Search]: url.searchParams.get(QueryParam.Search) ?? undefined,
      });
      if (!queryResult.success) {
        return new Response(JSON.stringify({
          success: false,
          error: ErrorMessage.BadRequest,
          message: 'Invalid request payload',
          issues: queryResult.error.issues,
        }), {
          status: HttpStatus.BadRequest,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
        });
      }
      const q = (queryResult.data[QueryParam.Search] ?? '').toLowerCase();
      const games = q
        ? DISCOVERY_GAMES.filter((g) => g.name.toLowerCase().includes(q) || String(g.id).includes(q))
        : [...DISCOVERY_GAMES];
    return stubJson(env, { games });
  }
  if (handlerPath.endsWith(ApiEndpoint.Discovery.Trending)) {
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
  if (handlerPath.endsWith(ApiEndpoint.Discovery.Featured)) {
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
      const { data, errorResponse } = await validateSchemaBody(request, env, InventoryGiftRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request, env, InventoryTradeRequestSchema);
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
  if (request.method === HttpMethod.Post && isAddItem) {
    return rejectClientTrustedWorkflowMutation(env, requestOrigin, 'Inventory items must be issued by trusted server workflows');
  }
  if (request.method === HttpMethod.Post && isRemoveItem) {
    return rejectClientTrustedWorkflowMutation(env, requestOrigin, 'Inventory item removal must be issued by trusted server workflows');
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
    const { data, errorResponse } = await validateSchemaBody(request.clone(), env, InventoryEquipItemRequestSchema);
    if (errorResponse || !data) return errorResponse!;
    validatedGenericBody = JSON.stringify({ ...data, operationId: data.idempotencyKey });
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

export async function handleMarketplaceRequest(request: Request, env: Env, path: string): Promise<Response> {
  const supportedMethods = path === ApiEndpoint.Marketplace.Buy || path === ApiEndpoint.Marketplace.Sell
    ? [HttpMethod.Post]
    : path === ApiEndpoint.Marketplace.List || path === ApiEndpoint.Marketplace.History
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
  const listPath = path === ApiEndpoint.Marketplace.List;
  const historyPath = path === ApiEndpoint.Marketplace.History;
  const buyPath = path === ApiEndpoint.Marketplace.Buy;
  const sellPath = path === ApiEndpoint.Marketplace.Sell;
  let body: string | undefined;
  if (request.method === HttpMethod.Post) {
    if (buyPath) {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, MarketplaceBuyRequestSchema);
      if (errorResponse || !data) return errorResponse!;
      body = JSON.stringify({ ...data, buyerId: authUserId });
    } else if (sellPath) {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, MarketplaceSellRequestSchema);
      if (errorResponse || !data) return errorResponse!;
      body = JSON.stringify({ ...data, sellerId: authUserId });
    } else {
      const { data, errorResponse } = await validateSchemaBody(request.clone(), env, MarketplaceEmptyRequestSchema);
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
  const tournamentPathParts = extractPathParts(path, ApiEndpoint.Tournament.Base);
  const segment =
    tournamentPathParts.length === 0 || tournamentPathParts.length === 1
      ? TournamentDOSegment.Bracket
      : tournamentPathParts.length === 2 && tournamentPathParts[1] === TournamentDOSegment.Start
        ? TournamentDOSegment.Start
        : tournamentPathParts.length === 2 && tournamentPathParts[1] === TournamentDOSegment.Result
          ? TournamentDOSegment.Result
          : tournamentPathParts.length === 2 && tournamentPathParts[1] === TournamentDOSegment.Register
            ? TournamentDOSegment.Register
            : tournamentPathParts.length === 2 && tournamentPathParts[1] === TournamentDOSegment.DistributePrizes
              ? TournamentDOSegment.DistributePrizes
        : tournamentPathParts.length === 2 && tournamentPathParts[1] === TournamentDOSegment.Bracket
          ? TournamentDOSegment.Bracket
          : null;
  if (!segment) {
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: HttpStatus.NotFound, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  const supportedMethods = segment === TournamentDOSegment.Bracket ? [HttpMethod.Get] : [HttpMethod.Post];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  let authUserId = '';
  if (!(segment === TournamentDOSegment.Bracket && request.method === HttpMethod.Get)) {
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for tournaments');
    if (authResult instanceof Response) return authResult;
    authUserId = authResult.userId;
  }
  const ns = env.TOURNAMENT_DO;
  if (!ns) return stubJson(env, { tournaments: [] });
  const tournamentIdResult = extractAndValidateIdFromPath(path, ApiEndpoint.Tournament.Base, ParamName.TournamentId, request.url);
  if (!tournamentIdResult.id) {
    return new Response(JSON.stringify({ error: tournamentIdResult.error ?? 'Tournament ID required' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const tournamentId = tournamentIdResult.id;
  const stub = ns.get(ns.idFromName(tournamentId));

  if (
    request.method === HttpMethod.Post &&
    (
      segment === TournamentDOSegment.Start ||
      segment === TournamentDOSegment.Result ||
      segment === TournamentDOSegment.DistributePrizes
    )
  ) {
    const adminCheck = await checkAdminStatus(request, env);
    if (!adminCheck.isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: HttpStatus.Forbidden,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
  }

  if (segment === TournamentDOSegment.DistributePrizes && request.method === HttpMethod.Post) {
    const flowResult = await flowRunner.run(
      tournamentPrizeDistributionFlow,
      createFlowContext({
        env,
        request,
        authUserId,
        path,
        method: request.method,
        origin: requestOrigin,
        operationId: `tournament-${tournamentId}`,
      }),
      { tournamentId }
    );
    return new Response(JSON.stringify(flowResult.body), {
      status: flowResult.status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const doPath =
    segment === TournamentDOSegment.Start
      ? TournamentDOPaths.Start
      : segment === TournamentDOSegment.Result
        ? TournamentDOPaths.Result
        : segment === TournamentDOSegment.Register
          ? TournamentDOPaths.Register
          : TournamentDOPaths.Bracket;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    if (segment === TournamentDOSegment.Register) {
      const { data: registerData, errorResponse: registerError } = await validateSchemaBody(request.clone(), env, TournamentRegisterRequestSchema);
      if (registerError) return registerError;
      const body = registerData!;
      validatedGenericBody = JSON.stringify({
        userId: body.userId ?? authUserId,
        displayName: body.displayName,
        elo: body.elo,
      });
    } else if (segment === TournamentDOSegment.Start) {
      const { errorResponse: startError } = await validateSchemaBody(request.clone(), env, TournamentStartRequestSchema);
      if (startError) return startError;
      validatedGenericBody = JSON.stringify({});
    } else {
      const { data: genData, errorResponse: genError } = await validateSchemaBody(request.clone(), env, TournamentResultRequestSchema);
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
    const { data, errorResponse } = await validateSchemaBody(request.clone(), env, SettingsUpdateRequestSchema);
    if (errorResponse) return errorResponse;
    const body = data!;
    const settingsBody = {
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
      ...(body.notifications !== undefined ? { notifications: body.notifications } : {}),
      ...(body.notificationsEnabled !== undefined && body.notifications === undefined ? { notifications: body.notificationsEnabled } : {}),
      ...(body.soundEnabled !== undefined ? { soundEnabled: body.soundEnabled } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.preferredServerRegion !== undefined ? { preferredServerRegion: body.preferredServerRegion } : {}),
    };
    const res = await doFetch(stub, SettingsDOPaths.Update, { method: HttpMethod.Post, body: JSON.stringify(settingsBody) });
    const result = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(result), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }
  if (path !== ApiEndpoint.Settings.Base) {
    const validatedTarget = validateOpenApiUserIdPath(path, ApiEndpoint.Settings.Base, request, env);
    if (validatedTarget.response) return validatedTarget.response;
  }
  const doPath = path.includes(SettingsDOSegment.Update) ? SettingsDOPaths.Update : SettingsDOPaths.Get;
  let validatedGenericBody = undefined;
  if (request.method === HttpMethod.Post || request.method === HttpMethod.Put || request.method === HttpMethod.Patch) {
    const { data: genData, errorResponse: genError } = await validateSchemaBody(request.clone(), env, SettingsUpdateRequestSchema);
    if (genError) return genError;
    const body = genData!;
    validatedGenericBody = JSON.stringify({
      ...(body.theme !== undefined ? { theme: body.theme } : {}),
      ...(body.notifications !== undefined ? { notifications: body.notifications } : {}),
      ...(body.notificationsEnabled !== undefined && body.notifications === undefined ? { notifications: body.notificationsEnabled } : {}),
      ...(body.soundEnabled !== undefined ? { soundEnabled: body.soundEnabled } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.preferredServerRegion !== undefined ? { preferredServerRegion: body.preferredServerRegion } : {}),
    });
  }
  const res = await doFetch(stub, doPath, { method: request.method, body: validatedGenericBody });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}
