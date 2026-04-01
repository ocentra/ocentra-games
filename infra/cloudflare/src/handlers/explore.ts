import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
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

import { listMatchesLogic, listBenchmarksLogic, type ExploreStorage } from '@/logic/explore';

function createExploreStorage(env: Env): ExploreStorage {
  return {
    async list(options) {
      return await env.MATCHES_BUCKET.list(options);
    },
    async get(key) {
      return await env.MATCHES_BUCKET.get(key);
    },
  };
}

export async function handleListMatches(request: Request, env: Env): Promise<Response> {
  const storage = createExploreStorage(env);
  const result = await listMatchesLogic({ maxMatches: 1000, batchLimit: 100 }, storage);

  if (!result.success) {
    logError('Error listing matches', getStackTrace(), new Error(result.error));
    return new Response(
      JSON.stringify({
        success: false,
        error: result.error,
        matches: [],
        count: 0,
      }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      matches: result.matches,
      count: result.count,
      total_fetched: result.total_fetched,
    }),
    {
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    }
  );
}

export async function handleListBenchmarks(request: Request, env: Env): Promise<Response> {
  const requestUrl = new URL(request.url);
  const matchType = requestUrl.searchParams.get('type') || 'ai_vs_ai';
  const gameType = requestUrl.searchParams.get('game_type');
  const limit = Math.min(parseInt(requestUrl.searchParams.get('limit') || '100', 10), 1000);

  const storage = createExploreStorage(env);
  const result = await listBenchmarksLogic(
    {
      matchType,
      gameType,
      limit,
      maxMatches: 10000,
      batchLimit: 100,
    },
    storage
  );

  if (!result.success) {
    logError('Error loading benchmarks', getStackTrace(), new Error(result.error));
    return new Response(
      JSON.stringify({
        success: false,
        error: result.error,
        benchmarks: [],
        count: 0,
      }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      benchmarks: result.benchmarks,
      count: result.count,
      returned: result.returned,
      stats: result.stats,
      match_type: result.match_type,
      game_type: result.game_type,
    }),
    {
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    }
  );
}
