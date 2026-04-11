import type { Env } from '@/constants/env'
import { getCorsHeaders } from '@/utils/cors'
import { validateZodBody } from '@/utils/zod-validation';
import { HttpMethod, HttpHeader, HttpContentType, HttpAuthScheme, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { TestTokenPrefix } from '@ocentra/endpoint-domain/constants/auth';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { LogsApiLimits, LogsApiDataset, LogsApiSafeErrorMessages, LogsApiFallback, LogLevel, LogsApiSeparator, LogsApiKvKeyPrefix } from '@/constants/logs-api';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { RequestLimits } from '@/constants/request-limits';
import { getAnalyticsEngineSqlUrl } from '@/utils/cloudflare-api';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { LogsBatchRequestSchema } from '@ocentra/endpoint-domain/schemas/worker-contracts';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_LOGS_WARNINGS = false;

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
  writeLogToAnalyticsLogic,
  parseSinceLogic,
  queryLogsLogic,
  sanitizeErrorLogic,
  validateApiKeyLogic,
  getClientIdLogic,
  getStatsFromAnalyticsEngineLogic,
  type LogsAnalytics,
  type LogsFetch,
  type LogEntry,
  type LogQuery,
  type LogStats,
} from '@/logic/logs';
import type { RateLimiter } from '@/utils/rate-limiter-interface';
import { createRateLimiter } from '@/utils/rate-limiter-factory';

function sanitizeError(error: unknown): string {
  const result = sanitizeErrorLogic({
    error,
    safeMessages: LogsApiSafeErrorMessages,
    separator: LogsApiSeparator.Colon,
    fallbackMessage: LogsApiFallback.InternalError,
    unknownError: ErrorMessage.UnknownError,
  });
  if (result.sanitized === LogsApiFallback.InternalError) {
    logError('Sanitized error', getStackTrace(), { error });
  }
  return result.sanitized;
}

function validateApiKey(request: Request, env: Env): boolean {
  const authHeader = request.headers.get(HttpHeader.Authorization);
  if (env.TEST_MODE === QueryValue.True && authHeader?.startsWith(`${HttpAuthScheme.Bearer} ${TestTokenPrefix.Test}`)) {
    return true;
  }
  const result = validateApiKeyLogic({
    authHeader,
    expectedKey: env.LOGS_API_KEY,
    bearerScheme: HttpAuthScheme.Bearer,
    spaceSeparator: LogsApiSeparator.Space,
  });
  if (!result.valid && result.error) {
    logWarn(result.error, getStackTrace(), undefined, LOG_LOGS_WARNINGS);
  }
  return result.valid;
}

async function checkRateLimit(env: Env, clientId: string, rateLimiter?: RateLimiter): Promise<boolean> {
  let limiter: RateLimiter;
  try {
    limiter = rateLimiter || createRateLimiter(env);
  } catch (error) {
    logError('Rate limiter not configured, denying request for safety', getStackTrace(), { clientId, error });
    return false;
  }

  try {
    const result = await limiter.check({
      key: `${LogsApiKvKeyPrefix.RateLimit}${clientId}`,
      limit: LogsApiLimits.RateLimitMaxRequests,
      windowSeconds: LogsApiLimits.RateLimitWindowMs / 1000,
    });
    return result.allowed;
  } catch (error) {
    logError('[LOGS] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { clientId, error: String(error) });
    return false;
  }
}

function getClientId(request: Request): string {
  const result = getClientIdLogic({
    cfConnectingIp: request.headers.get(HttpHeader.CFConnectingIP),
    userAgent: request.headers.get(HttpHeader.UserAgent),
    unknownFallback: LogsApiFallback.Unknown,
    maxUserAgentLength: 50,
  });
  return result.clientId;
}

function getSingleQueryParam(env: Env, requestOrigin: string | undefined, requestUrl: URL, key: string): { value?: string; errorResponse?: Response } {
  const values = requestUrl.searchParams.getAll(key);
  if (values.length > 1) {
    return {
      errorResponse: new Response(JSON.stringify({ error: ErrorMessage.BadRequest, message: `Unexpected query parameter: ${key}` }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }),
    };
  }
  return { value: values[0] };
}


function createLogsAnalytics(env: Env): LogsAnalytics | null {
  if (!env.ANALYTICS) {
    return null
  }
  const analytics = env.ANALYTICS
  return {
    writeDataPoint(data) {
      analytics.writeDataPoint(data)
    },
  }
}

function writeToAnalyticsEngine(env: Env, entry: LogEntry): void {
  const analytics = createLogsAnalytics(env)
  if (!analytics) {
    logWarn('Analytics Engine binding not available', getStackTrace(), undefined, LOG_LOGS_WARNINGS)
    return
  }

  const result = writeLogToAnalyticsLogic(
    {
      entry,
      maxLogSize: LogsApiLimits.MaxLogSize,
      maxStackSize: LogsApiLimits.MaxStackSize,
      maxArgsSize: LogsApiLimits.MaxArgsSize,
      maxBlobSize: LogsApiLimits.MaxBlobSize,
    },
    analytics
  )

  if (!result.success && result.error) {
    logError('Failed to write to Analytics Engine', getStackTrace(), result.error)
  }
}


function createLogsFetch(): LogsFetch {
  return {
    fetch: fetch,
  }
}

async function queryAnalyticsEngine(env: Env, query: LogQuery): Promise<LogEntry[]> {
  if (!env.ANALYTICS) {
    logError('ANALYTICS binding not available', getStackTrace(), undefined)
    return []
  }
  if (!env.CLOUDFLARE_ACCOUNT_ID) {
    logError('CLOUDFLARE_ACCOUNT_ID not configured - cannot query Analytics Engine', getStackTrace(), undefined)
    return []
  }
  if (!env.CLOUDFLARE_API_TOKEN) {
    logError('CLOUDFLARE_API_TOKEN not configured - cannot query Analytics Engine. Create an API token at https://dash.cloudflare.com/profile/api-tokens, then run: wrangler secret put CLOUDFLARE_API_TOKEN --env development', getStackTrace(), undefined)
    return []
  }

  try {
    const fetchImpl = createLogsFetch()
    const result = await queryLogsLogic(
      {
        query,
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: env.CLOUDFLARE_API_TOKEN,
        datasetName: LogsApiDataset.Logs,
        analyticsEngineSqlUrl: getAnalyticsEngineSqlUrl,
        parseSince: (since: string) => {
          const parseResult = parseSinceLogic({ since })
          return {
            success: parseResult.success,
            timestamp: parseResult.timestamp,
            error: parseResult.error,
          }
        },
        defaultLimit: LogsApiLimits.DefaultQueryLimit,
        maxLimit: LogsApiLimits.MaxQueryLimit,
      },
      fetchImpl
    )

    if (!result.success) {
      logError('Failed to query Analytics Engine', getStackTrace(), result.error)
      return []
    }

    return result.logs || []
  } catch (error) {
    logError('Failed to query Analytics Engine', getStackTrace(), sanitizeError(error))
    return []
  }
}

async function getStatsFromAnalyticsEngine(env: Env): Promise<LogStats> {
  if (!env.ANALYTICS || !env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    const missing = [];
    if (!env.ANALYTICS) missing.push('ANALYTICS');
    if (!env.CLOUDFLARE_ACCOUNT_ID) missing.push('CLOUDFLARE_ACCOUNT_ID');
    if (!env.CLOUDFLARE_API_TOKEN) missing.push('CLOUDFLARE_API_TOKEN');
    logError(`Missing required configuration: ${missing.join(', ')}`, getStackTrace(), undefined);
    return {
      total_logs: 0,
      by_level: {} as Record<LogLevel, number>,
      by_source: {},
      by_context: {},
      oldest_timestamp: null,
      newest_timestamp: null,
    };
  }

  const fetchImpl: LogsFetch = {
    fetch: fetch,
  };

  const result = await getStatsFromAnalyticsEngineLogic({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    datasetName: LogsApiDataset.Logs,
    analyticsEngineSqlUrl: getAnalyticsEngineSqlUrl,
    oneDayAgoMs: Date.now() - (24 * 60 * 60 * 1000),
    separator: LogsApiSeparator.Colon,
    fetchImpl,
  });

  if (!result.success || !result.stats) {
    logError('Failed to get stats from Analytics Engine', getStackTrace(), result.error);
    return {
      total_logs: 0,
      by_level: {} as Record<LogLevel, number>,
      by_source: {},
      by_context: {},
      oldest_timestamp: null,
      newest_timestamp: null,
    };
  }

  return {
    total_logs: result.stats.total_logs,
    by_level: result.stats.by_level as Record<LogLevel, number>,
    by_source: result.stats.by_source,
    by_context: result.stats.by_context,
    oldest_timestamp: result.stats.oldest_timestamp,
    newest_timestamp: result.stats.newest_timestamp,
  };
}

export async function handleLogsRequest(request: Request, env: Env, executionContext?: ExecutionContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const pathname = requestUrl.pathname;
  const requestOrigin = request.headers.get(HttpHeader.Origin)
  const validPaths = [
    ApiEndpoint.Logs.Base,
    ApiEndpoint.Logs.Query,
    ApiEndpoint.Logs.Stats,
  ] as const

  type ValidLogPath = typeof validPaths[number]

  if (!validPaths.includes(pathname as ValidLogPath)) {
    return new Response(JSON.stringify({ error: ErrorMessage.NotFound }), {
      status: HttpStatus.NotFound,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    })
  }

  const supportedMethods = pathname === ApiEndpoint.Logs.Base
    ? [HttpMethod.Get, HttpMethod.Post]
    : [HttpMethod.Get];
  const methodCheck = rejectUnsupportedMethod(request, env, supportedMethods);
  if (methodCheck) return methodCheck;

  if (request.method === HttpMethod.Post) {
    const contentLength = request.headers.get(HttpHeader.ContentLength)
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size >= RequestLimits.MaxRequestSizeBytes) {
        const sizeMB = RequestLimits.MaxRequestSizeBytes / 1024 / 1024
        return new Response(JSON.stringify({
          error: ErrorMessage.PayloadTooLarge,
          message: `${ErrorMessage.RequestBodyExceedsMaximumSizePrefix} ${sizeMB}MB`
        }), {
          status: HttpStatus.PayloadTooLarge,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        })
      }
    }
  }

  if (!validateApiKey(request, env)) {
    return new Response(JSON.stringify({ error: ErrorMessage.Unauthorized }), {
      status: HttpStatus.Unauthorized,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.WwwAuthenticate]: HttpAuthScheme.Bearer,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    })
  }

  const clientId = getClientId(request)
  const rateLimited = !(await checkRateLimit(env, clientId))

  if (rateLimited) {
    return new Response(JSON.stringify({ error: ErrorMessage.RateLimitExceeded }), {
      status: HttpStatus.TooManyRequests,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    })
  }

  try {
    if (pathname === ApiEndpoint.Logs.Base && request.method === HttpMethod.Post) {
      const validation = await validateZodBody(request, env, LogsBatchRequestSchema);
      if (validation.errorResponse) return validation.errorResponse;
      const body = validation.data!;

      if ('logs' in body && Array.isArray(body.logs)) {
        if (body.logs.length > LogsApiLimits.MaxBatchSize) {
          return new Response(JSON.stringify({ error: `Batch size exceeds maximum of ${LogsApiLimits.MaxBatchSize}` }), {
            status: HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          })
        }

        const writePromises = body.logs.map((entry: LogEntry) => {
          if (entry.message && entry.message.length > LogsApiLimits.MaxLogSize) {
            entry.message = entry.message.substring(0, LogsApiLimits.MaxLogSize)
          }
          return Promise.resolve(writeToAnalyticsEngine(env, entry))
        })

        if (executionContext) {
          executionContext.waitUntil(Promise.all(writePromises))
        } else {
          await Promise.all(writePromises)
        }

        return new Response(JSON.stringify({ success: true, stored: body.logs.length }), {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        })
      } else if ('id' in body) {
        const entry = body as LogEntry
        if (entry.message && entry.message.length > LogsApiLimits.MaxLogSize) {
          entry.message = entry.message.substring(0, LogsApiLimits.MaxLogSize)
        }

        const writePromise = Promise.resolve(writeToAnalyticsEngine(env, entry))
        if (executionContext) {
          executionContext.waitUntil(writePromise)
        } else {
          await writePromise
        }

        return new Response(JSON.stringify({ success: true }), {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        })
      } else {
        return new Response(JSON.stringify({ error: ErrorMessage.BadRequest }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        })
      }
    }

    if (pathname === ApiEndpoint.Logs.Base && request.method === HttpMethod.Get) {
      const logs = await queryAnalyticsEngine(env, {});
      return new Response(JSON.stringify({ logs }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      });
    }

    if (pathname === ApiEndpoint.Logs.Query && request.method === HttpMethod.Get) {
      const query: LogQuery = {}
      const levelParam = getSingleQueryParam(env, requestOrigin || undefined, requestUrl, QueryParam.Level)
      if (levelParam.errorResponse) return levelParam.errorResponse
      if (levelParam.value) query.level = levelParam.value as LogLevel
      const sourceParam = getSingleQueryParam(env, requestOrigin || undefined, requestUrl, QueryParam.Source)
      if (sourceParam.errorResponse) return sourceParam.errorResponse
      if (sourceParam.value) query.source = sourceParam.value
      const contextParam = getSingleQueryParam(env, requestOrigin || undefined, requestUrl, QueryParam.Context)
      if (contextParam.errorResponse) return contextParam.errorResponse
      if (contextParam.value) query.context = contextParam.value
      const sinceParam = getSingleQueryParam(env, requestOrigin || undefined, requestUrl, QueryParam.Since)
      if (sinceParam.errorResponse) return sinceParam.errorResponse
      if (sinceParam.value) query.since = sinceParam.value as string
      const limitParam = getSingleQueryParam(env, requestOrigin || undefined, requestUrl, QueryParam.Limit)
      if (limitParam.errorResponse) return limitParam.errorResponse
      if (limitParam.value) {
        const parsedLimit = Number.parseInt(limitParam.value, 10)
        if (!Number.isInteger(parsedLimit)) {
          return new Response(JSON.stringify({ error: ErrorMessage.BadRequest, message: `Invalid query parameter: ${QueryParam.Limit}` }), {
            status: HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          })
        }
        query.limit = parsedLimit
      }

      const logs = await queryAnalyticsEngine(env, query)

      return new Response(JSON.stringify({ logs }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      })
    }

    if (pathname === ApiEndpoint.Logs.Stats && request.method === HttpMethod.Get) {
      const stats = await getStatsFromAnalyticsEngine(env)

      return new Response(JSON.stringify(stats), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      })
    }

    return new Response(JSON.stringify({ error: ErrorMessage.NotFound }), {
      status: HttpStatus.NotFound,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    })
  } catch (error) {
    logError('Request failed', getStackTrace(), sanitizeError(error))
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    })
  }
}

