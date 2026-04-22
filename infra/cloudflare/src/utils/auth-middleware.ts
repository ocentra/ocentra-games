import type { Env } from '@/constants/env';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { CorsOrigin, CorsMethods, CorsHeaders } from '@/constants/cors';
import { verifyAuth } from '@/utils/auth';
import { getSafeCorsHeaders } from '@/utils/cors';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';

const log = Logger.instance;
log.register(import.meta.url);

const ADMIN_AUTH_TRACE_HEADER_VALUE = 'admin-auth-flow';
const LOG_AUTH_WARNINGS = false;

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

import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';

export type AuthResult = { userId: string } | Response;

function isAdminAuthTraceRequest(request: Request): boolean {
  return request.headers.get(HttpHeader.XEnableAbortDebug) === ADMIN_AUTH_TRACE_HEADER_VALUE;
}

export async function requireAuth(
  request: Request,
  env: Env | undefined,
  requestOrigin?: string,
  customMessage?: string
): Promise<AuthResult> {
  try {
    const authTraceEnabled = isAdminAuthTraceRequest(request);
    if (!env) {
      logError('requireAuth called with undefined env', getStackTrace(), undefined);
      const headers = getSafeCorsHeaders(undefined, requestOrigin);
      return new Response(JSON.stringify({
        error: ErrorMessage.Unauthorized,
        message: 'Authentication configuration error'
      }), { 
        status: HttpStatus.Unauthorized, 
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers
        }
      });
    }

    const isDevWithAuthDisabled = (
      env.ENVIRONMENT === Environment.Development &&
      env.DISABLE_AUTH === QueryValue.True
    );

    console.log(`[requireAuth] path=${new URL(request.url).pathname} method=${request.method} env=${env.ENVIRONMENT} disableAuth=${env.DISABLE_AUTH} isDevWithAuthDisabled=${isDevWithAuthDisabled}`);

    if (isDevWithAuthDisabled) {
      logInfo(
        '[AdminAuthFlow:F] requireAuth bypassed in development',
        getStackTrace(),
        {
          path: new URL(request.url).pathname,
          hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
        },
        authTraceEnabled
      );
      return { userId: 'dev-admin' };
    }

    // In TEST_MODE, we don't need FIREBASE_PROJECT_ID - test tokens are verified differently
    const isTestMode = env.TEST_MODE === QueryValue.True;

    if (!isTestMode && !env.FIREBASE_PROJECT_ID) {
      logWarn('requireAuth: FIREBASE_PROJECT_ID not configured and TEST_MODE not enabled', getStackTrace(), undefined, LOG_AUTH_WARNINGS);
      const headers = getSafeCorsHeaders(env, requestOrigin);
      return new Response(JSON.stringify({
        error: ErrorMessage.Unauthorized,
        message: customMessage || ErrorMessage.AuthenticationRequired
      }), {
        status: HttpStatus.Unauthorized,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers
        }
      });
    }

    try {
      // Pass empty string for projectId in test mode - verifyAuth handles TEST_MODE separately
      const projectId = env.FIREBASE_PROJECT_ID || '';
      logInfo(
        '[AdminAuthFlow:F] requireAuth start',
        getStackTrace(),
        {
          path: new URL(request.url).pathname,
          hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
          testMode: env.TEST_MODE === QueryValue.True,
        },
        authTraceEnabled
      );
      const authResult = await verifyAuth(request, projectId, env);
      if (authResult.error || !authResult.userId) {
        logWarn(
          '[AdminAuthFlow:G] token verification failed',
          getStackTrace(),
          {
            hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
            error: authResult.error,
            path: new URL(request.url).pathname,
            testMode: env.TEST_MODE === QueryValue.True,
          },
          authTraceEnabled || LOG_AUTH_WARNINGS
        );
        const headers = getSafeCorsHeaders(env, requestOrigin);
        return new Response(JSON.stringify({
          error: ErrorMessage.Unauthorized,
          message: authResult.error || customMessage || ErrorMessage.AuthenticationRequired
        }), { 
          status: HttpStatus.Unauthorized, 
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...headers
          }
        });
      }
      logInfo(
        '[AdminAuthFlow:G] token verified',
        getStackTrace(),
        {
          path: new URL(request.url).pathname,
          userId: authResult.userId,
        },
        authTraceEnabled
      );
      return { userId: authResult.userId };
    } catch (error) {
      logError(ErrorMessage.AuthenticationCheckFailed, getStackTrace(), error);
      const headers = getSafeCorsHeaders(env, requestOrigin);
      const errorMessage = error instanceof Error ? error.message : ErrorMessage.AuthenticationCheckFailed;
      return new Response(JSON.stringify({
        error: ErrorMessage.Unauthorized,
        message: errorMessage.includes('CORS') ? ErrorMessage.CorsConfigurationError : ErrorMessage.AuthenticationRequired
      }), { 
        status: HttpStatus.Unauthorized, 
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers
        }
      });
    }
  } catch (error) {
    logError(ErrorMessage.RequireAuthFailed, getStackTrace(), error);
    try {
      const headers = getSafeCorsHeaders(env, requestOrigin);
      return new Response(JSON.stringify({
        error: ErrorMessage.Unauthorized,
        message: ErrorMessage.AuthenticationCheckFailed
      }), { 
        status: HttpStatus.Unauthorized, 
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...headers
        }
      });
    } catch {
      return new Response(JSON.stringify({
        error: ErrorMessage.Unauthorized,
        message: ErrorMessage.AuthenticationCheckFailed
      }), { 
        status: HttpStatus.Unauthorized, 
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.AccessControlAllowOrigin]: CorsOrigin.Wildcard,
          [HttpHeader.AccessControlAllowMethods]: CorsMethods.All,
          [HttpHeader.AccessControlAllowHeaders]: CorsHeaders.Default
        }
      });
    }
  }
}
