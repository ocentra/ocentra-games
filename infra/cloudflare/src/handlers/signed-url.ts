import type { Env } from '@/constants/env';
import { checkAdminStatus } from '@/utils/admin-check';
import { getCorsHeaders } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, CacheControl } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiParameterName } from '@ocentra/endpoint-domain/constants/openapi';
import { extractAndValidateMatchIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { generateSignedUrlLogic, type SignedUrlCrypto } from '@/logic/signed-url';

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

export async function handleSignedUrlRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  if (request.method !== HttpMethod.Get) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Get,
        ...getCorsHeaders(env),
      },
    });
  }

  const adminCheck = await checkAdminStatus(request, env);
  if (adminCheck.error || !adminCheck.userId) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Unauthorized,
      message: adminCheck.error || 'Authentication required to generate signed URLs'
    }), {
      status: HttpStatus.Unauthorized,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
        ...getCorsHeaders(env)
      }
    });
  }

  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'Admin access required to generate signed URLs'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
        ...getCorsHeaders(env)
      }
    });
  }

  try {
    const requestBody = await request.clone().text();
    if (requestBody.trim().length > 0) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Signed URL requests must not include a request body',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
          ...getCorsHeaders(env)
        }
      });
    }

    const requestUrl = new URL(request.url);
    for (const key of requestUrl.searchParams.keys()) {
      if (key !== OpenApiParameterName.Expires) {
        return new Response(JSON.stringify({
          error: ErrorMessage.BadRequest,
          message: `Unexpected query parameter: ${key}`,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
            ...getCorsHeaders(env)
          }
        });
      }
    }
    const expiresValues = requestUrl.searchParams.getAll(OpenApiParameterName.Expires);
    if (expiresValues.length > 1) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: `Unexpected query parameter: ${OpenApiParameterName.Expires}`,
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
          ...getCorsHeaders(env)
        }
      });
    }

    const result = extractAndValidateMatchIdFromPath(path, ApiEndpoint.SignedUrl.Base, request.url);
    if (result.error || !result.matchId) {
      logDebug('Signed URL validation failed', getStackTrace(), {
        path,
        error: result.error,
        url: request.url,
      }, false);
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: result.error || ErrorMessage.MatchIdRequired
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
          ...getCorsHeaders(env)
        }
      });
    }
    const matchId = result.matchId;

    const rawExpiration = expiresValues[0] ?? requestUrl.searchParams.get(OpenApiParameterName.Expires);
    if (rawExpiration !== null && !/^[1-9]\d*$/.test(rawExpiration)) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: `${OpenApiParameterName.Expires} must be a positive integer`,
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
          ...getCorsHeaders(env)
        }
      });
    }
    const parsedExpiration = rawExpiration ? Number.parseInt(rawExpiration, 10) : 3600;
    const expirationSeconds = Number.isFinite(parsedExpiration) ? parsedExpiration : 3600;
    const maxExpiration = 86400;

    const cryptoImpl: SignedUrlCrypto = {
      importKey: crypto.subtle.importKey.bind(crypto.subtle),
      sign: crypto.subtle.sign.bind(crypto.subtle),
    };

    const baseUrl = requestUrl.toString();
    const generateResult = await generateSignedUrlLogic(
      {
        matchId,
        secret: env.SIGNED_URL_SECRET || '',
        baseUrl,
        expiresIn: expirationSeconds,
        maxExpiration,
      },
      cryptoImpl
    );

    if (!generateResult.success) {
      if (generateResult.error === 'Signed URL secret not configured') {
        return new Response('Signed URL secret not configured', {
          status: HttpStatus.InternalServerError,
          headers: getCorsHeaders(env),
        });
      }
      return new Response(JSON.stringify({ error: generateResult.error }), {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(
      JSON.stringify({
        matchId: generateResult.matchId,
        signedUrl: generateResult.signedUrl,
        expiresIn: generateResult.expiresIn,
        expiresAt: generateResult.expiresAt,
      }),
      {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
          ...getCorsHeaders(env),
        },
      }
    );
  } catch (error) {
    logError('Error in handleSignedUrlRequest', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
        ...getCorsHeaders(env),
      },
    });
  }
}
