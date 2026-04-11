import type { Env } from '@/constants/env';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { getCorsHeaders } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, CacheControl } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { DataDeletionConfirmRequestSchema } from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { extractIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { exportUserDataLogic, deleteUserDataLogic, type DataStorage } from '@/logic/data';
import { rejectUnsupportedMethod } from '@/utils/method-guards';

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

const OPENAPI_USER_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function normalizeOpenApiUserId(value: string): string | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    //
  }
  return OPENAPI_USER_ID_PATTERN.test(decoded) ? decoded : null;
}

function createDataStorage(env: Env): DataStorage {
  return {
    async list(options) {
      return await env.MATCHES_BUCKET.list(options);
    },
    async get(key) {
      return await env.MATCHES_BUCKET.get(key);
    },
    async delete(key) {
      await env.MATCHES_BUCKET.delete(key);
    },
  };
}

export async function handleDataExportRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) {
    return methodCheck;
  }

  const authResult = await requireAuth(request, env, undefined, 'Authentication required for data export');
  if (authResult instanceof Response) {
    return authResult;
  }
  const userId = authResult.userId;

  const pathResult = normalizeOpenApiUserId(extractIdFromPath(path, ApiEndpoint.DataExport.Base) ?? '');
  if (!pathResult) {
    logDebug('Data export validation failed', getStackTrace(), {
      path,
      error: 'invalid userId',
      url: request.url,
    }, false);
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: ErrorMessage.UserIdRequired
    }), { status: HttpStatus.BadRequest, headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }
  const requestedUserId = pathResult;
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.size > 0) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'Data export requests must not include query parameters',
    }), {
      status: HttpStatus.BadRequest,
      headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson }
    });
  }

  const requestBody = await request.clone().text();
  if (requestBody.trim().length > 0) {
    return new Response(JSON.stringify({
      error: ErrorMessage.BadRequest,
      message: 'Data export requests must not include a request body',
    }), {
      status: HttpStatus.BadRequest,
      headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson }
    });
  }

  const adminCheck = await checkAdminStatus(request, env);
  const isAdmin = adminCheck.isAdmin;

  if (!isAdmin && userId !== requestedUserId) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'You can only export your own data'
    }), { status: HttpStatus.Forbidden, headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
  }

  if (request.method !== HttpMethod.Get) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.Allow]: HttpMethod.Get,
        ...getCorsHeaders(env),
      },
    });
  }

  const storage = createDataStorage(env);
  const exportResult = await exportUserDataLogic({ userId: requestedUserId }, storage);

  if (exportResult.error) {
    logError(`Failed to export data for ${requestedUserId}`, getStackTrace(), new Error(exportResult.error));
    return new Response(JSON.stringify({ error: exportResult.error }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  return new Response(
    JSON.stringify({
      user_id: exportResult.user_id,
      matches: exportResult.matches,
      disputes: exportResult.disputes,
      exported_at: exportResult.exported_at,
    }),
    {
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.CacheControl]: CacheControl.PrivateShortTerm,
        ...getCorsHeaders(env),
      },
    }
  );
}

export async function handleDataDeletionRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  logDebug('[DATA-DELETE] Handler entry point', getStackTrace(), {
    path,
    url: request.url,
    method: request.method,
    endpoint: ApiEndpoint.Data.Base,
    timestamp: Date.now()
  }, true);
  
  try {
    const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Delete]);
    if (methodCheck) {
      return methodCheck;
    }

    logDebug('[DATA-DELETE] Request received', getStackTrace(), {
      path,
      url: request.url,
      method: request.method,
      endpoint: ApiEndpoint.Data.Base,
    }, true);
    
    logDebug('[DATA-DELETE] After first logDebug', getStackTrace(), { path }, true);

    const authResult = await requireAuth(request, env, undefined, 'Authentication required for data deletion');
    if (authResult instanceof Response) {
      logDebug('[DATA-DELETE] Auth failed', getStackTrace(), {
        status: authResult.status,
      }, true);
      return authResult;
    }
    const authenticatedUserId = authResult.userId;

    logDebug('[DATA-DELETE] Extracting userId from path', getStackTrace(), {
      path,
      endpoint: ApiEndpoint.Data.Base,
      url: request.url,
    }, true);

    const userIdResult = normalizeOpenApiUserId(extractIdFromPath(path, ApiEndpoint.Data.Base) ?? '');
    
    logDebug('[DATA-DELETE] Path validation result', getStackTrace(), {
      hasId: !!userIdResult,
      id: userIdResult,
      error: userIdResult ? null : 'invalid userId',
      path,
      endpoint: ApiEndpoint.Data.Base,
      authenticatedUserId,
    }, true);

    if (!userIdResult) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: ErrorMessage.UserIdRequired
      }), { status: HttpStatus.BadRequest, headers: { ...getCorsHeaders(env), [HttpHeader.ContentType]: HttpContentType.ApplicationJson } });
    }
    let userId = userIdResult;

  const adminCheck = await checkAdminStatus(request, env);
  const isAdmin = adminCheck.isAdmin;

  if (userId && !isAdmin && authenticatedUserId !== userId) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'You can only delete your own data'
    }), { status: HttpStatus.Forbidden, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
  }

  if (!userId) {
    userId = authenticatedUserId;
  }

  if (!userId) {
    return new Response(ErrorMessage.UserIdRequired, { status: HttpStatus.BadRequest, headers: getCorsHeaders(env) });
  }

  const requestUrl = new URL(request.url);
  for (const key of requestUrl.searchParams.keys()) {
    if (key !== 'confirm') {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Unexpected query parameters',
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) }
      });
    }
  }
  const queryConfirm = requestUrl.searchParams.get('confirm') === 'true';
  let confirm = queryConfirm;

  const requestBody = await request.clone().text();
  if (requestBody.trim().length > 0) {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Invalid JSON body',
        issues: [],
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) }
      });
    }

    const bodyValidation = DataDeletionConfirmRequestSchema.safeParse(parsedBody);
    if (!bodyValidation.success) {
      return new Response(JSON.stringify({
        error: ErrorMessage.BadRequest,
        message: 'Invalid request payload',
        issues: bodyValidation.error.issues,
      }), {
        status: HttpStatus.BadRequest,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) }
      });
    }
    confirm = bodyValidation.data.confirm === true || queryConfirm;
  }

  if (!confirm) {
    return new Response(
      JSON.stringify({ error: 'Confirmation required. Set confirm=true in request body or query param.' }),
      { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } }
    );
  }

  const storage = createDataStorage(env);
  const result = await deleteUserDataLogic({ userId }, storage);

  if (!result.success) {
    logError(`Failed to delete data for ${userId}`, getStackTrace(), new Error(result.error));
    return new Response(JSON.stringify({ error: result.error }), {
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
        deleted_items: result.deleted_items,
        deleted_at: result.deleted_at,
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
    logError('[DATA-DELETE] Exception caught in handler', getStackTrace(), {
      path,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    
    logError('[DATA-DELETE] Exception caught', getStackTrace(), {
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
