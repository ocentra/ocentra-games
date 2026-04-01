import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ParamName } from '@ocentra/endpoint-domain/constants/paths';
import { extractAndValidateIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_PLAYERS_WARNINGS = false;

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

import { getCreditBalance } from '@/handlers/credits';
import {
  computePlayerStatsLogic,
  computeLearningProgressLogic,
  generatePerformanceReportLogic,
  type PlayerStorage,
} from '@/logic/players';

function createPlayerStorage(env: Env): PlayerStorage {
  return {
    async list(options) {
      return await env.MATCHES_BUCKET.list(options);
    },
    async get(key) {
      return await env.MATCHES_BUCKET.get(key);
    },
  };
}

async function computePlayerStats(
  env: Env,
  userId: string,
  gameType?: number
): Promise<Awaited<ReturnType<typeof computePlayerStatsLogic>>> {
  const storage = createPlayerStorage(env);
  try {
    return await computePlayerStatsLogic(userId, gameType, storage);
  } catch (error) {
    logWarn(`Error computing stats for ${userId}`, getStackTrace(), error, LOG_PLAYERS_WARNINGS);
    throw error;
  }
}

async function computeLearningProgress(
  env: Env,
  userId: string
): Promise<Awaited<ReturnType<typeof computeLearningProgressLogic>>> {
  const storage = createPlayerStorage(env);
  return await computeLearningProgressLogic(userId, storage);
}

async function generatePerformanceReport(
  env: Env,
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'
): Promise<Awaited<ReturnType<typeof generatePerformanceReportLogic>>> {
  const storage = createPlayerStorage(env);
  return await generatePerformanceReportLogic(userId, period, storage);
}

export async function handlePlayerRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const authResult = await requireAuth(request, env, undefined, 'Authentication required');
  if (authResult instanceof Response) {
    return authResult;
  }
  const authenticatedUserId = authResult.userId;

  const result = extractAndValidateIdFromPath(path, ApiEndpoint.Players.Base, ParamName.UserId, request.url);
  if (result.error || !result.id) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: result.error || 'User ID required'
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const userId = result.id;

  if (authenticatedUserId !== userId) {
    return new Response(JSON.stringify({
      error: 'Forbidden',
      message: 'You can only access your own player data'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const action = path.split('/').pop() || 'stats';
  const requestUrl = new URL(request.url);
  const gameType = requestUrl.searchParams.get('game_type');
  const period = (requestUrl.searchParams.get('period') || 'all_time') as 'daily' | 'weekly' | 'monthly' | 'all_time';

  try {
    if (action === 'stats' || action === userId) {
      const stats = await computePlayerStats(env, userId, gameType ? parseInt(gameType, 10) : undefined);
      const credits = await getCreditBalance(env, userId);
      
      const statsWithCredits = {
        ...stats,
        credits: {
          gp_balance: credits.gp_balance,
          ac_balance: credits.ac_balance,
          total_gp_earned: credits.total_gp_earned,
          total_ac_purchased: credits.total_ac_purchased,
          total_ac_spent: credits.total_ac_spent,
        },
      };
      
      return new Response(JSON.stringify(statsWithCredits), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    } else if (action === 'learning') {
      const learning = await computeLearningProgress(env, userId);
      return new Response(JSON.stringify(learning), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    } else if (action === 'report') {
      const report = await generatePerformanceReport(env, userId, period);
      return new Response(JSON.stringify(report), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    } else {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Unknown action: ${action}`
      }), {
        status: HttpStatus.NotFound,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
  } catch (error) {
    logError('Error processing player request', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}
