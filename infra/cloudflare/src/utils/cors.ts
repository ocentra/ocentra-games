import type { Env } from '@/constants/env';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { CorsOrigin, CorsMethods, CorsHeaders } from '@/constants/cors';
import { HttpHeader, HttpContentType, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { SecurityHeaderValue, CorsMaxAge } from '@/constants/security-headers';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_CORS_WARNINGS = false;
const LOG_CORS_INFO = false;

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

/**
 * Validates CORS origin as a prerequisite (fail-fast).
 * In production, rejects invalid origins with 403 Forbidden BEFORE processing.
 * This follows the "chicken cooking" rule - validate prerequisites before processing.
 * 
 * @returns Response with 403 Forbidden if origin is invalid in production, null if valid
 */
export function validateCorsOrigin(env: Env, requestOrigin: string | null): Response | null {
  const isProduction = env.ENVIRONMENT === Environment.Production;
  if (!isProduction) {
    // Development mode: allow all origins (permissive)
    return null;
  }

  const allowedOrigin = env.CORS_ORIGIN;
  if (!allowedOrigin || allowedOrigin === CorsOrigin.Wildcard) {
    logError('CORS validation failed: Production requires specific CORS_ORIGIN (cannot be wildcard)', getStackTrace(), {
      allowedOrigin,
      requestOrigin
    });
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'CORS configuration error'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      }
    });
  }

  // In production, Origin header is required for CORS requests
  if (!requestOrigin || requestOrigin.trim() === '') {
    logWarn('CORS validation failed: Missing Origin header in production', getStackTrace(), {
      allowedOrigin,
      requestOrigin
    }, true);
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'Origin header required'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      }
    });
  }

  // Check exact match first
  if (requestOrigin === allowedOrigin) {
    return null; // Valid origin
  }

  // Check whitelist if configured
  if (env.CORS_ALLOWED_ORIGINS) {
    const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
    for (const allowed of allowedOrigins) {
      if (allowed === requestOrigin) return null;
      // Support suffix matching (e.g., .ocentra-games.pages.dev)
      if (allowed.startsWith('.') && requestOrigin.endsWith(allowed)) {
        return null;
      }
    }
  }

  // Reject invalid origin in production
  logWarn('CORS validation failed: Origin not allowed in production', getStackTrace(), {
    requestOrigin,
    allowedOrigin,
    allowedOrigins: env.CORS_ALLOWED_ORIGINS
  }, true);

  return new Response(JSON.stringify({
    error: ErrorMessage.Forbidden,
    message: 'Origin not allowed'
  }), {
    status: HttpStatus.Forbidden,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      // Don't set CORS headers for rejected origins
    }
  });
}

export function getCorsHeaders(env: Env | undefined, requestOrigin?: string): Record<string, string> {
  if (!env) {
    logWarn('getCorsHeaders called with undefined env, using safe fallback', getStackTrace(), undefined, LOG_CORS_WARNINGS);
    return {
      [HttpHeader.AccessControlAllowOrigin]: CorsOrigin.Wildcard,
      [HttpHeader.AccessControlAllowMethods]: CorsMethods.All,
      [HttpHeader.AccessControlAllowHeaders]: CorsHeaders.Default,
      [HttpHeader.AccessControlAllowCredentials]: QueryValue.True,
      [HttpHeader.AccessControlMaxAge]: CorsMaxAge.Default,
      [HttpHeader.XContentTypeOptions]: SecurityHeaderValue.NoSniff,
      [HttpHeader.XFrameOptions]: SecurityHeaderValue.Deny,
    };
  }

  const allowedOrigin = env.CORS_ORIGIN || CorsOrigin.Wildcard;
  const isProduction = env.ENVIRONMENT === Environment.Production;

  if (isProduction && allowedOrigin === CorsOrigin.Wildcard) {
    logError(ErrorMessage.CorsOriginCannotBeWildcardInProduction, getStackTrace(), undefined);
  }

  if (isProduction && requestOrigin && requestOrigin !== allowedOrigin) {
    logWarn(`${ErrorMessage.CorsOriginMismatch}: ${requestOrigin} attempted access (allowed: ${allowedOrigin})`, getStackTrace(), undefined, LOG_CORS_WARNINGS);
  }

  let origin: string | null = allowedOrigin;
  if (isProduction) {
    if (!requestOrigin || requestOrigin.trim() === '') {
      origin = null;
    } else if (requestOrigin !== allowedOrigin) {
      logWarn(`${ErrorMessage.CorsOriginMismatch}: ${requestOrigin} not allowed, using configured origin ${allowedOrigin}`, getStackTrace(), undefined, LOG_CORS_WARNINGS);
      origin = null;
    } else {
      origin = requestOrigin;
    }
  } else if (!isProduction && allowedOrigin === CorsOrigin.Wildcard) {
    if (requestOrigin) {
      if (env.CORS_ALLOWED_ORIGINS) {
        const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
        if (allowedOrigins.includes(requestOrigin)) {
          origin = requestOrigin;
        } else {
          logWarn(`${ErrorMessage.OriginNotInWhitelistButAllowingDevMode}: ${requestOrigin}`, getStackTrace(), undefined, LOG_CORS_WARNINGS);
          origin = requestOrigin;
        }
      } else {
        logInfo(`${ErrorMessage.AllowingOriginDevelopmentModeNoWhitelist}: ${requestOrigin}`, getStackTrace(), undefined, LOG_CORS_INFO);
        origin = requestOrigin;
      }
    } else {
      origin = CorsOrigin.Wildcard;
    }
  } else if (!isProduction && requestOrigin && allowedOrigin !== CorsOrigin.Wildcard) {
    if (requestOrigin === allowedOrigin) {
      origin = requestOrigin;
    } else {
      logWarn(`${ErrorMessage.OriginDoesntMatchConfiguredButAllowingDevMode}: ${requestOrigin} (configured: ${allowedOrigin})`, getStackTrace(), undefined, LOG_CORS_WARNINGS);
      origin = requestOrigin;
    }
  } else if (!isProduction && !requestOrigin && allowedOrigin !== CorsOrigin.Wildcard) {
    origin = CorsOrigin.Wildcard;
  }

  const headers: Record<string, string> = {
    [HttpHeader.AccessControlAllowMethods]: CorsMethods.All,
    [HttpHeader.AccessControlAllowHeaders]: CorsHeaders.Default,
    [HttpHeader.AccessControlAllowCredentials]: QueryValue.True,
    [HttpHeader.AccessControlMaxAge]: CorsMaxAge.Default,
    [HttpHeader.XContentTypeOptions]: SecurityHeaderValue.NoSniff,
    [HttpHeader.XFrameOptions]: SecurityHeaderValue.Deny,
  };

  if (origin !== null) {
    headers[HttpHeader.AccessControlAllowOrigin] = origin;
  }

  return headers;
}

export function getSafeCorsHeaders(env: Env | undefined, requestOrigin?: string): Record<string, string> {
  try {
    return getCorsHeaders(env, requestOrigin);
  } catch (error) {
    logError('getSafeCorsHeaders caught exception, using fallback', getStackTrace(), error);
    return {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.AccessControlAllowOrigin]: CorsOrigin.Wildcard,
      [HttpHeader.AccessControlAllowMethods]: CorsMethods.All,
      [HttpHeader.AccessControlAllowHeaders]: CorsHeaders.Default,
      [HttpHeader.AccessControlAllowCredentials]: QueryValue.True,
      [HttpHeader.AccessControlMaxAge]: CorsMaxAge.Default,
    };
  }
}
