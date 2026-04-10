import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { DOBaseUrl } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { LeaderboardDO as LeaderboardDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { GameName } from '@ocentra/endpoint-domain/constants/game';
import { ValidationPattern } from '@ocentra/endpoint-domain/constants/validation-patterns';
import { extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const DEFAULT_LEADERBOARD_REGION = 'default';

function tierFromScore(score: number): string {
  if (score >= 100000) return 'Master';
  if (score >= 50000) return 'Diamond';
  if (score >= 20000) return 'Platinum';
  if (score >= 5000) return 'Gold';
  if (score >= 1000) return 'Silver';
  return 'Bronze';
}

const log = Logger.instance;
log.register(import.meta.url);

const LOG_LEADERBOARD_WARNINGS = false;

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

import {
  computeLeaderboardLogic,
  type LeaderboardStorage,
  type LeaderboardEntry,
} from '@/logic/leaderboard';

function createLeaderboardStorage(env: Env): LeaderboardStorage {
  return {
    async list(options) {
      return await env.MATCHES_BUCKET.list(options);
    },
    async get(key) {
      return await env.MATCHES_BUCKET.get(key);
    },
  };
}

async function computeLeaderboard(
  env: Env,
  gameType: number,
  aiOnly: boolean = false,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const storage = createLeaderboardStorage(env);
  try {
    return await computeLeaderboardLogic(gameType, aiOnly, limit, storage);
  } catch (error) {
    logWarn(`Error computing leaderboard for gameType ${gameType}`, getStackTrace(), error, LOG_LEADERBOARD_WARNINGS);
    return [];
  }
}

export async function runLeaderboardRefresh(env: Env): Promise<{ shards: number; ok: number }> {
  const ns = env.LEADERBOARD_DO;
  if (!ns) return { shards: 0, ok: 0 };
  const gameTypes = [1, 2, 3];
  let ok = 0;
  for (const gameType of gameTypes) {
    try {
      const entries = await computeLeaderboard(env, gameType, false, 1000);
      const doEntries = entries.map((e) => ({
        userId: e.user_id,
        displayName: e.user_id,
        score: e.score,
      }));
      const shardKey = `lb-${gameType}-${DEFAULT_LEADERBOARD_REGION}`;
      const stub = ns.get(ns.idFromName(shardKey));
      const url = `${DOBaseUrl}${LeaderboardDOPaths.Refresh}`;
      const res = await stub.fetch(url, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({ entries: doEntries }),
      });
      await res.text().catch(() => undefined);
      if (res.ok) ok++;
    } catch (error) {
      logWarn(`Leaderboard refresh failed for gameType ${gameType}`, getStackTrace(), error, true);
    }
  }
  return { shards: gameTypes.length, ok };
}

async function tryLeaderboardDO(
  env: Env,
  gameTypeNum: number,
  action: string,
  userId: string | undefined,
  limit: number,
  range: number,
  seasonId: string | null
): Promise<Response | null> {
  const ns = env.LEADERBOARD_DO;
  if (!ns) return null;
  const shardKey = `lb-${gameTypeNum}-${DEFAULT_LEADERBOARD_REGION}`;
  const stub = ns.get(ns.idFromName(shardKey));
  const headers = { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) };
  try {
    if (action === 'user' && userId) {
      const url = `${DOBaseUrl}${LeaderboardDOPaths.UserRank}?userId=${encodeURIComponent(userId)}`;
      const res = await stub.fetch(url, { method: HttpMethod.Get });
      if (!res.ok) {
        await res.text().catch(() => undefined);
        return null;
      }
      const data = (await res.json()) as { rank: number | null; entry?: { userId: string; displayName: string; score: number; rank: number } };
      if (data.rank == null || !data.entry) return null;
      const e = data.entry;
      return new Response(JSON.stringify({
        user_id: e.userId,
        rank: e.rank,
        tier: tierFromScore(e.score),
        score: e.score,
        wins: 0,
        losses: 0,
        games_played: 0,
        season_id: seasonId || 'current',
      }), { status: HttpStatus.Ok, headers });
    }
    if (action === 'nearby' && userId) {
      const url = `${DOBaseUrl}${LeaderboardDOPaths.Nearby}?userId=${encodeURIComponent(userId)}&window=${range}`;
      const res = await stub.fetch(url, { method: HttpMethod.Get });
      if (!res.ok) {
        await res.text().catch(() => undefined);
        return null;
      }
      const data = (await res.json()) as { entries?: { userId: string; displayName: string; score: number; rank: number }[]; userRank?: number };
      const entries = data.entries ?? [];
      const userRank = data.userRank ?? 0;
      const userEntry = entries.find(e => e.userId === userId);
      if (!userEntry) return null;
      const above = entries.filter(e => e.rank < userRank);
      const below = entries.filter(e => e.rank > userRank);
      const mapEntry = (e: { userId: string; displayName: string; score: number; rank: number }) => ({
        user_id: e.userId,
        rank: e.rank,
        tier: tierFromScore(e.score),
        score: e.score,
        wins: 0,
        losses: 0,
        games_played: 0,
      });
      return new Response(JSON.stringify({
        above: above.map(mapEntry),
        user: mapEntry(userEntry),
        below: below.map(mapEntry),
      }), { status: HttpStatus.Ok, headers });
    }
    if (action !== 'user' && action !== 'nearby') {
      const url = `${DOBaseUrl}${LeaderboardDOPaths.Top}?limit=${limit}&offset=0`;
      const res = await stub.fetch(url, { method: HttpMethod.Get });
      if (!res.ok) {
        await res.text().catch(() => undefined);
        return null;
      }
      const data = (await res.json()) as { entries?: { userId: string; displayName: string; score: number; rank: number }[]; total?: number };
      const entries = (data.entries ?? []).map(e => ({
        user_id: e.userId,
        rank: e.rank,
        tier: tierFromScore(e.score),
        score: e.score,
        wins: 0,
        losses: 0,
        games_played: 0,
      }));
      return new Response(JSON.stringify({
        game_type: gameTypeNum,
        season_id: seasonId || 'current',
        entries,
        total_entries: data.total ?? entries.length,
        last_updated: new Date().toISOString(),
        ai_only: false,
      }), { status: HttpStatus.Ok, headers });
    }
  } catch {
    return null;
  }
  return null;
}

export async function handleLeaderboardRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
  try {
    const requestUrl = new URL(request.url);
    const allowedQueryParams = new Set(['season_id', 'limit', 'tier', 'range', 'ai_only']);
    const unexpectedQueryParams = Array.from(requestUrl.searchParams.keys()).filter((name) => !allowedQueryParams.has(name));
    if (unexpectedQueryParams.length > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: `Unexpected query parameter(s): ${unexpectedQueryParams.join(', ')}`,
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const pathParts = extractPathParts(path, ApiEndpoint.Leaderboard.Base);
    const gameType = pathParts[0];
    const action = pathParts[1];
    const userId = pathParts[2];

    if (!/^\d+$/.test(gameType)) {
      return new Response(JSON.stringify({
        error: 'Invalid game type',
        message: 'Game type must be a number (0=CLAIM, 1=Poker, 2=WordSearch, etc.)',
        available_game_types: {
          0: GameName.Claim,
          1: GameName.Poker,
          2: GameName.WordSearch,
        }
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const gameTypeNum = parseInt(gameType, 10);
    if (gameTypeNum > 2) {
      return new Response(JSON.stringify({
        error: 'Invalid game type',
        message: 'Game type must be one of 0=CLAIM, 1=Poker, or 2=WordSearch.',
        available_game_types: {
          0: GameName.Claim,
          1: GameName.Poker,
          2: GameName.WordSearch,
        }
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const seasonId = requestUrl.searchParams.get('season_id');
    if (seasonId !== null && !ValidationPattern.SeasonId.test(seasonId)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'season_id must be current or a season-* identifier',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const limitParam = requestUrl.searchParams.get('limit');
    if (limitParam !== null && !/^\d+$/.test(limitParam)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'limit must be an integer',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const rangeParam = requestUrl.searchParams.get('range');
    if (rangeParam !== null && !/^\d+$/.test(rangeParam)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'range must be an integer',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const aiOnlyParam = requestUrl.searchParams.get('ai_only');
    if (aiOnlyParam !== null && aiOnlyParam !== 'true' && aiOnlyParam !== 'false') {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'ai_only must be true or false',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const limit = Math.min(parseInt(limitParam || '100', 10), 1000);
    const aiOnly = aiOnlyParam === 'true' || action === 'ai';
    const range = parseInt(rangeParam || '5', 10);
    const tierParam = requestUrl.searchParams.get('tier');
    const allowedTiers = new Set(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']);
    if (action === 'tier' && (!tierParam || !allowedTiers.has(tierParam))) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'tier must be one of Bronze, Silver, Gold, Platinum, Diamond, Master',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    if (!aiOnly) {
      const doResponse = await tryLeaderboardDO(env, gameTypeNum, action ?? '', userId, limit, range, seasonId);
      if (doResponse !== null) return doResponse;
    }

    if (action === 'user' && userId) {
      const entries = await computeLeaderboard(env, gameTypeNum, aiOnly, 10000);
      const userEntry = entries.find(e => e.user_id === userId || e.public_key === userId);
      
      if (!userEntry) {
        return new Response(JSON.stringify({
          error: 'User not found',
          user_id: userId,
        }), {
          status: HttpStatus.NotFound,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }

      return new Response(JSON.stringify({
        user_id: userEntry.user_id,
        rank: userEntry.rank,
        tier: userEntry.tier,
        score: userEntry.score,
        wins: userEntry.wins,
        losses: userEntry.losses,
        games_played: userEntry.games_played,
        season_id: seasonId || 'current',
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
      } else if (action === 'nearby' && userId) {
        const entries = await computeLeaderboard(env, gameTypeNum, aiOnly, 10000);
        const userIndex = entries.findIndex(e => e.user_id === userId || e.public_key === userId);
        const mapEntry = (e: { user_id: string; score: number; rank: number }) => ({
          user_id: e.user_id,
          rank: e.rank,
          tier: tierFromScore(e.score),
          score: e.score,
          wins: 0,
          losses: 0,
          games_played: 0,
        });
        
        if (userIndex === -1) {
          const userEntry = entries[0];
          if (!userEntry) {
            return new Response(JSON.stringify({
              above: [],
              user: {
                user_id: userId,
                rank: 1,
                tier: tierFromScore(0),
                score: 0,
                wins: 0,
                losses: 0,
                games_played: 0,
              },
              below: [],
            }), {
              status: HttpStatus.Ok,
              headers: {
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                ...getCorsHeaders(env),
              },
            });
          }
          return new Response(JSON.stringify({
            above: [],
            user: mapEntry(userEntry),
            below: entries.slice(1, 1 + range).map(mapEntry),
          }), {
            status: HttpStatus.Ok,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env),
            },
          });
        }

      const start = Math.max(0, userIndex - range);
      const end = Math.min(entries.length, userIndex + range + 1);
      const nearby = entries.slice(start, end);
      return new Response(JSON.stringify({
        above: nearby.filter((_, i) => i < userIndex - start).map(mapEntry),
        user: mapEntry(entries[userIndex]),
        below: nearby.filter((_, i) => i > userIndex - start).map(mapEntry),
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    } else {
      const entries = await computeLeaderboard(env, gameTypeNum, aiOnly, limit);

      if (entries.length > 0 && !aiOnly) {
        try {
          const { checkAndAwardLeaderboardBadges } = await import('@/utils/leaderboard-badges');
          const badgeResult = await checkAndAwardLeaderboardBadges(env, entries, gameTypeNum);
          if (badgeResult.awarded.length > 0) {
            logInfo(`Awarded ${badgeResult.awarded.length} leaderboard badges for gameType ${gameTypeNum}`, getStackTrace(), undefined, false);
          }
          if (badgeResult.errors.length > 0) {
            logWarn(`Badge errors: ${badgeResult.errors.join(', ')}`, getStackTrace(), undefined, LOG_LEADERBOARD_WARNINGS);
          }
        } catch (error) {
          logWarn('Failed to check leaderboard badges', getStackTrace(), error, LOG_LEADERBOARD_WARNINGS);
        }
      }

      return new Response(JSON.stringify({
        game_type: gameTypeNum,
        season_id: seasonId || 'current',
        entries,
        total_entries: entries.length,
        last_updated: new Date().toISOString(),
        ai_only: aiOnly,
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
  } catch (error) {
    logError('Error computing leaderboard', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}
