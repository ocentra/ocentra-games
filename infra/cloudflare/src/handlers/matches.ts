import type { Env } from '@/constants/env';
import { MetricsCollector } from '@/monitoring/metrics-collector';
import { requireAuth } from '@/utils/auth-middleware';
import { getCorsHeaders } from '@/utils/cors';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { fetchFromDO } from '@/utils/durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { checkMatchInDO } from '@/utils/match-query';
import { isMatchFinalized } from '@/utils/match-state';
import { consumeResponseBody } from '@/utils/consume-response-body';

import { MatchUploadRequestSchema } from '@ocentra/endpoint-domain/schemas/worker-contracts';


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

import { getRateLimitIdentifier, addRateLimitHeaders } from '@/utils/rate-limit';
import { RateLimitPrefix } from '@/constants/rate-limit';
import type { RateLimiter } from '@/utils/rate-limiter-interface';
import { createRateLimiter } from '@/utils/rate-limiter-factory';
import { verifySignature, hexToBytes } from '@/utils/signature';
import { validateMatchRecord } from '@ocentra/endpoint-domain/utils/validation';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { MatchCoordinatorDO, MatchCoordinatorDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { TimeInMs } from '@/constants/time';
import { buildMatchKey, buildAnonymizedMatchKey } from '@/utils/path-sanitizer';
import { extractPathAfterId, extractAndValidateMatchIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { getAIDecisions } from '@/handlers/matches-ai-decisions';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import {
  validateMatchLogic,
  uploadMatchLogic,
  getMatchLogic,
  deleteMatchLogic,
  anonymizeMatchLogic,
  saveAnonymizedMatchLogic,
  type MatchStorage,
} from '@/logic/matches';
import { validateSimpleTokenLogic } from '@/logic/secure-token';

const metricsCollector = new MetricsCollector();

export async function handleMatchRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post, HttpMethod.Put, HttpMethod.Delete]);
  if (methodCheck) return methodCheck;
  const result = extractAndValidateMatchIdFromPath(path, ApiEndpoint.Matches.Base, request.url);

  if (result.error || !result.matchId) {
    logError('[MATCHES] Path validation failed', getStackTrace(), {
      path,
      error: result.error,
      url: request.url
    });
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: result.error || ErrorMessage.MatchIdRequired
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env)
      }
    });
  }

  const matchId = result.matchId;

  const upgradeHeader = request.headers.get(HttpHeader.Upgrade);
  const isWebSocket = upgradeHeader === WebSocketProtocol.WebSocket;
  const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
  
  if (isWebSocket) {
    const connectionHeader = request.headers.get(HttpHeader.Connection);
    if (!connectionHeader) {
      logWarn('[MATCHES] WebSocket upgrade rejected: missing Connection header', getStackTrace(), {
        path,
        matchId,
        url: request.url
      });
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Connection: Upgrade header is required for WebSocket upgrade'
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env)
        }
      });
    }
    
    const connectionValues = connectionHeader.split(',').map(v => v.trim().toLowerCase());
    if (!connectionValues.includes('upgrade')) {
      logWarn('[MATCHES] WebSocket upgrade rejected: Connection header does not contain Upgrade', getStackTrace(), {
        path,
        matchId,
        connectionHeader,
        url: request.url
      });
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Connection header must include "Upgrade" for WebSocket upgrade'
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env)
        }
      });
    }

    if (!requestOrigin || requestOrigin.trim() === '') {
      logWarn('[MATCHES] WebSocket upgrade rejected: missing Origin header', getStackTrace(), {
        path,
        matchId,
        url: request.url
      });
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Origin header is required for WebSocket upgrade'
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env)
        }
      });
    }

    const allowedOrigin = env.CORS_ORIGIN;
    if (allowedOrigin && allowedOrigin !== '*') {
      if (requestOrigin !== allowedOrigin) {
        if (env.CORS_ALLOWED_ORIGINS) {
          const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
          if (!allowedOrigins.includes(requestOrigin)) {
            logWarn('[MATCHES] WebSocket upgrade rejected: origin not in whitelist', getStackTrace(), {
              path,
              matchId,
              requestOrigin,
              allowedOrigins,
              url: request.url
            });
            return new Response(JSON.stringify({
              error: ErrorMessage.Forbidden,
              message: 'Origin not allowed for WebSocket connection'
            }), {
              status: HttpStatus.Forbidden,
              headers: {
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                ...getCorsHeaders(env, requestOrigin)
              }
            });
          }
        } else {
          logWarn('[MATCHES] WebSocket upgrade rejected: origin mismatch', getStackTrace(), {
            path,
            matchId,
            requestOrigin,
            allowedOrigin,
            url: request.url
          });
          return new Response(JSON.stringify({
            error: ErrorMessage.Forbidden,
            message: 'Origin not allowed for WebSocket connection'
          }), {
            status: HttpStatus.Forbidden,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin)
            }
          });
        }
      }
    } else if (allowedOrigin === '*') {
      if (env.CORS_ALLOWED_ORIGINS) {
        const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
        if (!allowedOrigins.includes(requestOrigin)) {
          logWarn('[MATCHES] WebSocket upgrade rejected: origin not in whitelist (wildcard with whitelist)', getStackTrace(), {
            path,
            matchId,
            requestOrigin,
            allowedOrigins,
            url: request.url
          });
          return new Response(JSON.stringify({
            error: ErrorMessage.Forbidden,
            message: 'Origin not allowed for WebSocket connection'
          }), {
            status: HttpStatus.Forbidden,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin)
            }
          });
        }
      } else {
        logError('[MATCHES] WebSocket upgrade rejected: CORS origin cannot be wildcard for WebSocket connections', getStackTrace(), {
          path,
          matchId,
          requestOrigin,
          allowedOrigin,
          url: request.url
        });
        return new Response(JSON.stringify({
          error: ErrorMessage.Forbidden,
          message: 'WebSocket connections require explicit origin configuration'
        }), {
          status: HttpStatus.Forbidden,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin)
          }
        });
      }
    }

    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for WebSocket connection');
    if (authResult instanceof Response) {
      return authResult;
    }
  }
  
  const isMatchCoordination = path.includes(`/${MatchCoordinatorDOSegment.State}`) ||
    path.includes(`/${MatchCoordinatorDOSegment.Create}`) ||
    path.includes(`/${MatchCoordinatorDOSegment.Join}`);

  if (isMatchCoordination && !isWebSocket) {
    const authResult = await requireAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
  }

  if (isWebSocket || isMatchCoordination) {
    const id = env.MATCH_COORDINATOR.idFromName(matchId);
    const stub = env.MATCH_COORDINATOR.get(id);

    const remainingPath = extractPathAfterId(path, ApiEndpoint.Matches.Base, matchId);
    const doPath = `/match/${matchId}${remainingPath ? `/${remainingPath}` : ''}`;

    logDebug('[MATCHES] Routing to MatchCoordinatorDO', getStackTrace(), {
      path,
      matchId,
      remainingPath,
      doPath,
      method: request.method
    }, true);

    const bodyText = request.body ? await request.clone().text() : undefined;
    try {
      const doResponse = await fetchFromDO(stub, doPath, {
        method: request.method as HttpMethod,
        headers: Object.fromEntries(request.headers.entries()),
        body: bodyText,
        correlationId: getCurrentContext()?.correlationId,
      });

      logDebug('[MATCHES] MatchCoordinatorDO response', getStackTrace(), {
        path,
        matchId,
        doPath,
        status: doResponse.status
      }, true);

      return doResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError('[MATCHES] DO fetch failed', getStackTrace(), {
        path,
        matchId,
        doPath,
        error: errorMessage
      });
      
      if (errorMessage.includes('internal error') || errorMessage.includes('reference')) {
        return new Response(JSON.stringify({
          error: ErrorMessage.InternalServerError,
          message: 'Durable Object unavailable'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined)
          }
        });
      }
      
      throw error;
    }
  }

  const remainingPath = extractPathAfterId(path, ApiEndpoint.Matches.Base, matchId);
  if (remainingPath && remainingPath !== 'ai-decisions') {
    return new Response(ErrorMessage.NotFound, { status: HttpStatus.NotFound });
  }

  const requestUrl = new URL(request.url);
  if (request.method !== HttpMethod.Get && requestUrl.searchParams.size > 0) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'Match write requests must not include query parameters',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env)
      }
    });
  }

  if (request.method === HttpMethod.Put || request.method === HttpMethod.Post || request.method === HttpMethod.Delete) {
    const authResult = await requireAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
  }

  if (request.method === HttpMethod.Put || request.method === HttpMethod.Post) {
    return uploadMatch(request, env, matchId);
  }

  if (request.method === HttpMethod.Get) {
    const matchIdPrefix = `${ApiEndpoint.Matches.Base}/${matchId}`;
    const remainingPath = path.startsWith(matchIdPrefix) ? path.slice(matchIdPrefix.length) : '';

    if (remainingPath === '/ai-decisions') {
      return getAIDecisions(request, env, matchId);
    }

    return getMatch(request, env, matchId);
  }

  if (request.method === HttpMethod.Delete) {
    return deleteMatch(request, env, matchId);
  }

  return new Response(ErrorMessage.MethodNotAllowed, {
    status: HttpStatus.MethodNotAllowed,
    headers: {
      [HttpHeader.Allow]: [
        HttpMethod.Get,
        HttpMethod.Post,
        HttpMethod.Put,
        HttpMethod.Delete,
      ].join(', '),
      ...getCorsHeaders(env),
    },
  });
}

function createMatchStorage(env: Env): MatchStorage {
  return {
    async get(key) {
      return await env.MATCHES_BUCKET.get(key);
    },
    async put(key, body, options) {
      await env.MATCHES_BUCKET.put(key, body, {
        httpMetadata: {
          contentType: options?.httpMetadata?.contentType || HttpContentType.ApplicationJson,
        },
      });
    },
    async delete(key) {
      await env.MATCHES_BUCKET.delete(key);
    },
  };
}

async function uploadMatch(request: Request, env: Env, matchId: MatchId): Promise<Response> {
  try {
    const identifier = await getRateLimitIdentifier(request);
    const isTestMode = env.TEST_MODE === 'true';
    const rateLimitPerHour = isTestMode
      ? 1000
      : env.RATE_LIMIT_MATCHES_PER_HOUR
        ? parseInt(env.RATE_LIMIT_MATCHES_PER_HOUR, 10)
        : (env.ENVIRONMENT === Environment.Production ? 100 : 10);

    let limiter: RateLimiter;
    try {
      limiter = createRateLimiter(env);
    } catch (error) {
      logError('Rate limiter not configured, denying request for safety', getStackTrace(), { identifier, error });
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers: getCorsHeaders(env),
      });
    }

    let result;
    try {
      result = await limiter.check({
        key: `${RateLimitPrefix.RateLimit}${identifier}`,
        limit: rateLimitPerHour,
        windowSeconds: TimeInMs.Hour / 1000,
      });
    } catch (error) {
      logError('[MATCHES-UPLOAD] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { identifier, error: String(error) });
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers: getCorsHeaders(env),
      });
    }

    const rateLimit = {
      allowed: result.allowed,
      remaining: result.remaining || 0,
      resetAt: (result.resetAt || 0) * 1000,
    };

    if (!rateLimit.allowed) {
      const headers = getCorsHeaders(env);
      addRateLimitHeaders(headers, rateLimit);
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers,
      });
    }

    const signature = request.headers.get(HttpHeader.Signature) || '';

    if (env.ENVIRONMENT === Environment.Production) {
      if (!env.COORDINATOR_PUBLIC_KEY) {
        return new Response(JSON.stringify({
          error: 'Server Configuration Error',
          message: 'Signature verification not configured. Contact administrator.'
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env)
          }
        });
      }

      if (!signature) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: 'Signature required for match upload in production'
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env)
          }
        });
      }
    }

    let bodyText = '';
    if (env.COORDINATOR_PUBLIC_KEY && signature) {
      bodyText = await request.text();
      const isValid = await verifySignature(bodyText, signature, env.COORDINATOR_PUBLIC_KEY);
      if (!isValid) {
        return new Response('Invalid signature', {
          status: HttpStatus.Unauthorized,
          headers: getCorsHeaders(env),
        });
      }
    } else {
      bodyText = await request.text();
    }
    
    // Validate that it's at least valid JSON and matches the basic structure
    const { errorResponse: matchError } = await validateZodBody(
      new Request(request.url, { method: request.method, body: bodyText, headers: request.headers }),
      env,
      MatchUploadRequestSchema
    );
    if (matchError) return matchError;
    const body = bodyText;
    const key = buildMatchKey(matchId);
    const storage = createMatchStorage(env);

    const validationResult = validateMatchLogic({
      body,
      validateMatchRecord,
    });

    if (!validationResult.success) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: validationResult.error || 'Invalid match record',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const uploadStartTime = Date.now();
    metricsCollector.recordMatchCreated();

    const uploadResult = await uploadMatchLogic(
      {
        matchId,
        body,
        matchKey: key,
        maxSizeBytes: 10 * 1024 * 1024,
      },
      storage
    );

    if (!uploadResult.success) {
      return new Response(uploadResult.error || 'Failed to upload match', {
        status: uploadResult.error?.includes('too large') ? HttpStatus.PayloadTooLarge : HttpStatus.InternalServerError,
        headers: getCorsHeaders(env),
      });
    }

    const uploadLatency = (Date.now() - uploadStartTime) / 1000;
    metricsCollector.recordStorageUpload(true, uploadLatency, uploadResult.sizeBytes || 0);

    const headers = getCorsHeaders(env);
    addRateLimitHeaders(headers, rateLimit);

    return new Response(
      JSON.stringify({
        success: true,
        matchId,
        url: key,
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers,
        },
      }
    );
  } catch (error) {
    logError('Error in uploadMatch', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}

async function getMatch(request: Request, env: Env, matchId: MatchId): Promise<Response> {
  try {
    const identifier = await getRateLimitIdentifier(request);
    const isTestMode = env.TEST_MODE === 'true';

    let limiter: RateLimiter;
    try {
      limiter = createRateLimiter(env);
    } catch (error) {
      logError('Rate limiter not configured, denying request for safety', getStackTrace(), { identifier, error });
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers: getCorsHeaders(env),
      });
    }

    let rateLimitResult;
    try {
      rateLimitResult = await limiter.check({
        key: `${RateLimitPrefix.RateLimit}${identifier}`,
        limit: isTestMode ? 1000 : 100,
        windowSeconds: TimeInMs.Minute / 1000,
      });
    } catch (error) {
      logError('[MATCHES-GET] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { identifier, error: String(error) });
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers: getCorsHeaders(env),
      });
    }

    const rateLimit = {
      allowed: rateLimitResult.allowed,
      remaining: rateLimitResult.remaining || 0,
      resetAt: (rateLimitResult.resetAt || 0) * 1000,
    };

    if (!rateLimit.allowed) {
      const headers = getCorsHeaders(env);
      addRateLimitHeaders(headers, rateLimit);
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers,
      });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get(QueryParam.Token);
    const allowedQueryKeys = new Set<string>([QueryParam.Token]);
    for (const key of url.searchParams.keys()) {
      if (!allowedQueryKeys.has(key)) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: `Unexpected query parameter: ${key}`,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
    }

    const requestBody = await request.clone().text();
    if (requestBody.trim().length > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Match read requests must not include a request body',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    if (!token) {
      const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
      const authResult = await requireAuth(request, env, requestOrigin, 'Token or authentication required to access matches');
      if (authResult instanceof Response) {
        return authResult;
      }
    }

    if (token) {
      if (!env.SIGNED_URL_SECRET) {
        return new Response(JSON.stringify({
          error: ErrorMessage.InternalServerError,
          message: 'Signed URL secret not configured',
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }

      const cryptoImpl = {
        importKey: crypto.subtle.importKey.bind(crypto.subtle),
        sign: crypto.subtle.sign.bind(crypto.subtle),
        verify: crypto.subtle.verify.bind(crypto.subtle),
      };

      const validationResult = await validateSimpleTokenLogic({
        token,
        secret: env.SIGNED_URL_SECRET,
        expectedMatchId: matchId,
        crypto: cryptoImpl,
        hexToBytes,
      });

      if (!validationResult.success) {
        return new Response(JSON.stringify({
          error: ErrorMessage.Unauthorized,
          message: validationResult.error || 'Invalid token',
        }), {
          status: HttpStatus.Unauthorized,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
    }

    const doCheckResult = await checkMatchInDO(matchId, env);

    if (doCheckResult.deleted) {
      return new Response(ErrorMessage.MatchNotFound, {
        status: HttpStatus.NotFound,
        headers: getCorsHeaders(env),
      });
    }

    if (doCheckResult.exists) {
      if (doCheckResult.isActive) {
        logDebug('[MATCHES] Returning active match from DO', getStackTrace(), { matchId }, true);
        const headers = getCorsHeaders(env);
        addRateLimitHeaders(headers, rateLimit);

        return new Response(JSON.stringify(doCheckResult.matchState), {
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...headers,
          },
        });
      }

      if (isMatchFinalized(doCheckResult.matchState?.phase)) {
        logDebug('[MATCHES] Match finalized in DO, checking R2 for authoritative record', getStackTrace(), { matchId }, true);
      }
    }

    const key = buildMatchKey(matchId);
    const storage = createMatchStorage(env);

    const matchResult = await getMatchLogic(
      { matchId, matchKey: key },
      storage
    );

    const headers = getCorsHeaders(env);
    addRateLimitHeaders(headers, rateLimit);

    if (!matchResult.success) {
      if (doCheckResult.exists && doCheckResult.error) {
        logWarn('[MATCHES] DO check had error, R2 also failed', getStackTrace(), { matchId, doError: doCheckResult.error }, true);
      }

      return new Response(JSON.stringify({
        error: matchResult.error || 'Match not found'
      }), {
        status: matchResult.statusCode || HttpStatus.NotFound,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers,
        },
      });
    }

    logDebug('[MATCHES] Returning match from R2', getStackTrace(), { matchId }, true);
    return new Response(JSON.stringify(matchResult.matchData), {
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...headers,
      },
    });
  } catch (error) {
    logError('Error in uploadMatch', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}

async function deleteMatch(request: Request, env: Env, matchId: MatchId): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.size > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Delete requests must not include query parameters',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const bodyText = await request.clone().text();
    if (bodyText.length > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Match delete requests must not include a request body',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const identifier = await getRateLimitIdentifier(request);
    const isTestMode = env.TEST_MODE === 'true';

    let limiter: RateLimiter;
    try {
      limiter = createRateLimiter(env);
    } catch (error) {
      logError('Rate limiter not configured, denying request for safety', getStackTrace(), { identifier, error });
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers: getCorsHeaders(env),
      });
    }

    let rateLimitResult;
    try {
      rateLimitResult = await limiter.check({
        key: `${RateLimitPrefix.RateLimit}${identifier}`,
        limit: isTestMode ? 1000 : 5,
        windowSeconds: TimeInMs.Hour / 1000,
      });
    } catch (error) {
      logError('[MATCHES-GET-BY-ID] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { identifier, error: String(error) });
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers: getCorsHeaders(env),
      });
    }

    const rateLimit = {
      allowed: rateLimitResult.allowed,
      remaining: rateLimitResult.remaining || 0,
      resetAt: (rateLimitResult.resetAt || 0) * 1000,
    };

    if (!rateLimit.allowed) {
      const headers = getCorsHeaders(env);
      addRateLimitHeaders(headers, rateLimit);
      return new Response(ErrorMessage.RateLimitExceeded, {
        status: HttpStatus.TooManyRequests,
        headers,
      });
    }

    const key = buildMatchKey(matchId);
    const storage = createMatchStorage(env);
    let coordinatorDeleteResult: Response | null = null;

      if (env.MATCH_COORDINATOR) {
        const id = env.MATCH_COORDINATOR.idFromName(matchId);
        const stub = env.MATCH_COORDINATOR.get(id);
        coordinatorDeleteResult = await fetchFromDO(stub, MatchCoordinatorDO.Delete(matchId), {
          method: HttpMethod.Delete,
          headers: Object.fromEntries(request.headers.entries()),
          correlationId: getCurrentContext()?.correlationId,
        });

      if (coordinatorDeleteResult.status !== HttpStatus.Ok && coordinatorDeleteResult.status !== HttpStatus.NotFound) {
        return new Response(JSON.stringify({
          error: 'Failed to delete match from coordinator',
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
    }

    const deleteResult = await deleteMatchLogic(
      { matchId, matchKey: key },
      storage
    );

    const headers = getCorsHeaders(env);
    addRateLimitHeaders(headers, rateLimit);

    if (!deleteResult.success) {
      return new Response(JSON.stringify({
        error: deleteResult.error || 'Failed to delete match'
      }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers,
        }
      });
    }

    if (coordinatorDeleteResult) {
      await consumeResponseBody(coordinatorDeleteResult);
    }

    return new Response(JSON.stringify({
      success: true,
      matchId,
    }), {
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...headers,
      },
    });
  } catch (error) {
    logError('Error in handleAnonymizeRequest', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}

export async function handleAnonymizeRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  if (request.method !== HttpMethod.Post) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Post,
        ...getCorsHeaders(env),
      },
    });
  }

  const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required to anonymize matches');
  if (authResult instanceof Response) {
    return authResult;
  }

  const bodyText = await request.clone().text();
  if (bodyText.length > 0) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'Anonymize requests must not include a request body',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env)
      }
    });
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.size > 0) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'Anonymize requests must not include query parameters',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env)
      }
    });
  }

  try {
    const matchIdResult = extractAndValidateMatchIdFromPath(path.replace(ApiEndpoint.Matches.Anonymize(':matchId'), ''), ApiEndpoint.Matches.Base, request.url);
    if (matchIdResult.error || !matchIdResult.matchId) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: matchIdResult.error || ErrorMessage.MatchIdRequired
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env)
        }
      });
    }
    const matchId = matchIdResult.matchId;

    const doCheckResult = await checkMatchInDO(matchId, env);
    if (doCheckResult.deleted) {
      return new Response(JSON.stringify({
        error: ErrorMessage.MatchNotFound,
      }), {
        status: HttpStatus.NotFound,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const matchKey = buildMatchKey(matchId);
    const storage = createMatchStorage(env);

    const matchResult = await getMatchLogic(
      { matchId, matchKey },
      storage
    );

    if (!matchResult.success || !matchResult.matchData) {
      return new Response(JSON.stringify({
        error: ErrorMessage.MatchNotFound,
      }), {
        status: HttpStatus.NotFound,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const matchRecord = matchResult.matchData as Record<string, unknown>;

    const anonymizeResult = anonymizeMatchLogic({ matchRecord });

    if (!anonymizeResult.success || !anonymizeResult.anonymized) {
      return new Response(JSON.stringify({
        error: anonymizeResult.error || 'Failed to anonymize match'
      }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const anonymizedKey = buildAnonymizedMatchKey(matchId);
    const saveResult = await saveAnonymizedMatchLogic(
      {
        anonymizedKey,
        anonymizedData: anonymizeResult.anonymized,
      },
      storage
    );

    if (!saveResult.success) {
      return new Response(JSON.stringify({
        error: saveResult.error || 'Failed to save anonymized match'
      }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const anonymizedUrl = anonymizedKey;

    return new Response(
      JSON.stringify({
        success: true,
        match_id: matchId,
        anonymized_at: new Date().toISOString(),
        anonymized_url: anonymizedUrl,
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  } catch (error) {
    logError('Error in uploadMatch', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}
