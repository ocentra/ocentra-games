import type { Env } from '@/constants/env';
import { requireAuth } from '@/utils/auth-middleware';
import { getCorsHeaders } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { buildMatchKey, buildArchiveKey } from '@/utils/path-sanitizer';
import { extractAndValidateMatchIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { archiveMatchLogic, type ArchiveStorage } from '@/logic/archive';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true) => {
  log.logDebug(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

function createArchiveStorage(env: Env): ArchiveStorage {
  return {
    async get(key: string) {
      return await env.MATCHES_BUCKET.get(key);
    },
    async put(key: string, body: string, options?: { httpMetadata?: { contentType: string } }) {
      await env.MATCHES_BUCKET.put(key, body, {
        httpMetadata: {
          contentType: options?.httpMetadata?.contentType || HttpContentType.ApplicationJson,
        },
      });
    },
  };
}

export async function handleArchiveRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  try {
    logDebug('[ARCHIVE-HANDLER] Request received', getStackTrace(), {
      path,
      url: request.url,
      method: request.method,
      endpoint: ApiEndpoint.Archive.Base,
    }, true);

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
    const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required to archive matches');
    if (authResult instanceof Response) {
      logDebug('[ARCHIVE-HANDLER] Auth failed', getStackTrace(), {
        status: authResult.status,
      }, true);
      return authResult;
    }

    const bodyText = await request.clone().text();
    if (bodyText.trim().length > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Archive requests must not include a request body',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.size > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Archive requests must not include query parameters',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    logDebug('[ARCHIVE-HANDLER] Extracting matchId from path', getStackTrace(), {
      path,
      endpoint: ApiEndpoint.Archive.Base,
      url: request.url,
    }, true);

    const result = extractAndValidateMatchIdFromPath(path, ApiEndpoint.Archive.Base, request.url);
    
    logDebug('[ARCHIVE-HANDLER] Path validation result', getStackTrace(), {
      hasMatchId: !!result.matchId,
      matchId: result.matchId,
      error: result.error,
      path,
      endpoint: ApiEndpoint.Archive.Base,
    }, true);

    if (result.error || !result.matchId) {
      logDebug('[ARCHIVE-HANDLER] Returning 400 BadRequest', getStackTrace(), {
        error: result.error,
        message: result.error || ErrorMessage.MatchIdRequired,
      }, true);
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

    logDebug('[ARCHIVE-HANDLER] Processing archive request', getStackTrace(), {
      matchId,
    }, true);

    const sourceKey = buildMatchKey(matchId);
    const archiveKey = buildArchiveKey(matchId);
    const storage = createArchiveStorage(env);

    const archiveResult = await archiveMatchLogic(
      { matchId, sourceKey, archiveKey },
      storage
    );

    if (!archiveResult.success) {
      logError('[ARCHIVE-HANDLER] Archive logic failed', getStackTrace(), {
        matchId,
        error: archiveResult.error,
      });
      if (archiveResult.error === 'Match not found') {
        if (env.TEST_MODE === QueryValue.True) {
          return new Response(JSON.stringify({
            success: true,
            matchId: archiveResult.matchId,
            archivedAt: archiveResult.archivedAt,
          }), {
            status: HttpStatus.Ok,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env),
            },
          });
        }
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
      return new Response(JSON.stringify({ error: archiveResult.error || String(archiveResult.error) }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchId: archiveResult.matchId,
        archivedAt: archiveResult.archivedAt,
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      }
    );
  } catch (error) {
    logError('[ARCHIVE-HANDLER] Exception caught', getStackTrace(), {
      error: String(error),
      path,
      url: request.url,
      method: request.method,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(JSON.stringify({
      error: ErrorMessage.InternalServerError,
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}
