import type { Env } from '@/constants/env';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { getCorsHeaders } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { StorageBucketName } from '@ocentra/boundary-domain/constants/buckets';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { QueryParam, QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { Logger, getStackTrace, clearDebugLogs, flushDebugLogs } from '@/logging/domain-logger-init';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_WARNINGS = false;

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

import { clearBucketLogic, type TestStorage } from '@/logic/test';
import { redeemPromoLogic } from '@/logic/promo-redeem';
import { saveProductToKV, setActiveProductIds } from '@/config/products';
import { DEV_SEED_PRODUCTS } from '@/config/dev-seed-products';

function getTestEndpointAllowedMethods(path: string): readonly HttpMethod[] | undefined {
  const testEndpointMethodMap: Record<string, readonly HttpMethod[] | undefined> = {
    [ApiEndpoint.Test.SeedProducts]: [HttpMethod.Post],
    [ApiEndpoint.Test.SeedAndRedeem]: [HttpMethod.Post],
    [`${ApiEndpoint.Test.Base}/seed-and-redeem`]: [HttpMethod.Post],
    [ApiEndpoint.Test.SeedPromo]: [HttpMethod.Post],
    [`${ApiEndpoint.Test.Base}/seed-promo`]: [HttpMethod.Post],
    [`${ApiEndpoint.Test.Base}/clear-debug-logs`]: [HttpMethod.Delete],
    [`${ApiEndpoint.Test.Base}/flush-debug-logs`]: [HttpMethod.Post],
    [`${ApiEndpoint.Test.Base}/get-debug-logs`]: [HttpMethod.Get],
    [ApiEndpoint.Test.ClearAll]: [HttpMethod.Delete],
  };

  return testEndpointMethodMap[path];
}

export async function handleTestRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const allowedMethods = getTestEndpointAllowedMethods(path);
  if (allowedMethods) {
    const methodCheck = rejectUnsupportedMethod(request, env, allowedMethods);
    if (methodCheck) {
      return methodCheck;
    }
  }

  if (env.ENVIRONMENT !== Environment.Development) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'Test endpoints are only available in development environment'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  if (path === ApiEndpoint.Test.SeedProducts && request.method === HttpMethod.Post) {
    if (!env.PRODUCT_KV) {
      return new Response(JSON.stringify({ error: 'PRODUCT_KV not configured' }), {
        status: HttpStatus.ServiceUnavailable,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
      });
    }
    for (const product of DEV_SEED_PRODUCTS) {
      await saveProductToKV(env, product);
    }
    const activeIds = DEV_SEED_PRODUCTS.filter((p) => p.active).map((p) => p.productId);
    await setActiveProductIds(env, activeIds);
    logInfo('Dev seed products written to PRODUCT_KV', getStackTrace(), { count: DEV_SEED_PRODUCTS.length });
    return new Response(JSON.stringify({ ok: true, count: DEV_SEED_PRODUCTS.length }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for test endpoints');
  if (authResult instanceof Response) {
    return authResult;
  }

  if ((path === ApiEndpoint.Test.SeedAndRedeem || path === `${ApiEndpoint.Test.Base}/seed-and-redeem`) && request.method === HttpMethod.Post) {
    if (!env.PROMO_KV || !env.CREDITS_DO) {
      return new Response(JSON.stringify({
        error: ErrorMessage.Forbidden,
        message: 'PROMO_KV and CREDITS_DO required for seed-and-redeem',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    let body: { code?: string; ac?: number; gp?: number };
    try {
      body = (await request.json()) as { code?: string; ac?: number; gp?: number };
    } catch {
      return new Response(JSON.stringify({
        error: 'Invalid JSON',
        message: 'Request body must be JSON with code (string), optional ac (number), optional gp (number)',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'code is required and must be a non-empty string',
      }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    const ac = Math.max(0, Math.floor(Number(body.ac) || 0));
    const gp = Math.max(0, Math.floor(Number(body.gp) || 0));
    const key = `promo:${code}`;
    await env.PROMO_KV.put(key, JSON.stringify({ ac, gp }));
    const userId = authResult.userId;
    const result = await redeemPromoLogic({ code, userId }, env, { ac, gp });
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error ?? 'Redeem failed' }), {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }
    return new Response(JSON.stringify({
      success: true,
      already_redeemed: result.already_redeemed,
      ac_added: result.ac_added,
      gp_added: result.gp_added,
      new_ac_balance: result.new_ac_balance,
      new_gp_balance: result.new_gp_balance,
    }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: 'Admin access required for test endpoints'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }

  const bucketName = env.BUCKET_NAME || 'unknown';

  try {
    if (path === `${ApiEndpoint.Test.Base}/clear-debug-logs` && request.method === HttpMethod.Delete) {
      if (bucketName !== StorageBucketName.TestMatches) {
        return new Response(JSON.stringify({
          error: ErrorMessage.Forbidden,
          message: `Clear operation is only allowed on test bucket (${StorageBucketName.TestMatches})`,
          current_bucket: bucketName,
          required_bucket: StorageBucketName.TestMatches,
          warning: 'This safety check prevents accidental deletion of production data'
        }), {
          status: HttpStatus.Forbidden,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      await clearDebugLogs();
      await flushDebugLogs();

      return new Response(JSON.stringify({
        success: true,
        message: 'Debug logs cleared from R2',
        cleared_at: new Date().toISOString(),
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    if (path === `${ApiEndpoint.Test.Base}/flush-debug-logs` && request.method === HttpMethod.Post) {
      if (bucketName !== StorageBucketName.TestMatches) {
        return new Response(JSON.stringify({
          error: ErrorMessage.Forbidden,
          message: `Flush operation is only allowed on test bucket (${StorageBucketName.TestMatches})`,
          current_bucket: bucketName,
          required_bucket: StorageBucketName.TestMatches,
        }), {
          status: HttpStatus.Forbidden,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      await flushDebugLogs();
      
      const key = `${BucketPath.DebugLogs}test.json`;
      const logFile = await env.MATCHES_BUCKET.get(key);
      const logCount = logFile ? JSON.parse(await logFile.text()).logs?.length || 0 : 0;

      return new Response(JSON.stringify({
        success: true,
        message: 'Debug logs flushed to R2',
        flushed_at: new Date().toISOString(),
        log_count: logCount,
        log_file_exists: logFile !== null,
        log_key: key,
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    if ((path === ApiEndpoint.Test.SeedPromo || path === `${ApiEndpoint.Test.Base}/seed-promo`) && request.method === HttpMethod.Post) {
      if (!env.PROMO_KV) {
        return new Response(JSON.stringify({
          error: ErrorMessage.Forbidden,
          message: 'PROMO_KV not configured',
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      let body: { code?: string; ac?: number; gp?: number };
      try {
        body = (await request.json()) as { code?: string; ac?: number; gp?: number };
      } catch {
        return new Response(JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body must be JSON with code (string), optional ac (number), optional gp (number)',
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (!code) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: 'code is required and must be a non-empty string',
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }
      const ac = Math.max(0, Math.floor(Number(body.ac) || 0));
      const gp = Math.max(0, Math.floor(Number(body.gp) || 0));
      const key = `promo:${code}`;
      await env.PROMO_KV.put(key, JSON.stringify({ ac, gp }));
      return new Response(JSON.stringify({
        success: true,
        message: 'Promo code seeded',
        code,
        ac,
        gp,
        key,
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    if (path === `${ApiEndpoint.Test.Base}/get-debug-logs` && request.method === HttpMethod.Get) {
      const key = `${BucketPath.DebugLogs}test.json`;
      const logFile = await env.MATCHES_BUCKET.get(key);
      
      if (!logFile) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Debug log file not found',
          log_key: key,
        }), {
          status: HttpStatus.NotFound,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }

      const logContent = await logFile.text();
      const logData = JSON.parse(logContent);

      return new Response(JSON.stringify({
        success: true,
        log_count: logData.logs?.length || 0,
        timestamp: logData.timestamp,
        logs: logData.logs || [],
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    if (path === ApiEndpoint.Test.ClearAll && request.method === HttpMethod.Delete) {
      const requestUrl = new URL(request.url);
      const confirm = requestUrl.searchParams.get(QueryParam.Confirm);

      if (confirm !== QueryValue.True) {
        return new Response(JSON.stringify({
          error: 'Confirmation required',
          message: `This will DELETE ALL records from R2. Add ?${QueryParam.Confirm}=${QueryValue.True} to proceed.`,
          warning: '⚠️  THIS IS IRREVERSIBLE! All matches, disputes, evidence, and archived records will be deleted.',
          bucket_name: bucketName,
          endpoint: `${ApiEndpoint.Test.ClearAll}?${QueryParam.Confirm}=${QueryValue.True}`,
          method: HttpMethod.Delete,
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env),
          },
        });
      }

      logWarn(`[TEST] Clearing all records from R2 bucket: ${bucketName}`, getStackTrace(), undefined, LOG_TEST_WARNINGS);
      logWarn(`[TEST] Safety checks passed: ENVIRONMENT=${env.ENVIRONMENT}, BUCKET_NAME=${bucketName}`, getStackTrace(), undefined, LOG_TEST_WARNINGS);

      await clearDebugLogs();

      const prefixes = [BucketPath.Matches, BucketPath.Disputes, BucketPath.Archive, BucketPath.MatchesAnonymized];

      const storage: TestStorage = {
        list: async (options) => {
          const result = await env.MATCHES_BUCKET.list(options);
          return {
            objects: result.objects,
            truncated: result.truncated,
            cursor: 'cursor' in result ? result.cursor : undefined,
          };
        },
        delete: async (key) => {
          await env.MATCHES_BUCKET.delete(key);
        },
      };

      const result = await clearBucketLogic({ prefixes }, storage);

      if (!result.success) {
        logError('Failed to clear bucket', getStackTrace(), result.error);
      } else {
        logWarn(`[TEST] Cleared ${result.deletedCount} records, ${result.errorCount} errors`, getStackTrace(), undefined, LOG_TEST_WARNINGS);
      }

      const deletedCount = result.deletedCount;
      const errorCount = result.errorCount;

      return new Response(JSON.stringify({
        success: true,
        message: 'All records cleared from R2',
        bucket_name: bucketName,
        deleted_count: deletedCount,
        error_count: errorCount,
        cleared_at: new Date().toISOString(),
        warning: 'This operation is irreversible. All data has been deleted.',
        safety_checks: {
          environment: env.ENVIRONMENT,
          bucket_name: bucketName,
          allowed: bucketName === StorageBucketName.TestMatches,
        },
      }), {
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env),
        },
      });
    }

    return new Response(JSON.stringify({
      error: ErrorMessage.NotFound,
      message: 'Unknown test endpoint',
      available_endpoints: [
        `DELETE ${ApiEndpoint.Test.ClearAll}?${QueryParam.Confirm}=${QueryValue.True} - Clear all records from R2`,
        `DELETE ${ApiEndpoint.Test.Base}/clear-debug-logs - Clear debug logs from R2`,
        `POST ${ApiEndpoint.Test.Base}/flush-debug-logs - Flush debug logs to R2`,
        `GET ${ApiEndpoint.Test.Base}/get-debug-logs - Get debug logs from R2`
      ],
    }), {
      status: HttpStatus.NotFound,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  } catch (error) {
    logError('Error in test endpoint', getStackTrace(), { error });
    return new Response(JSON.stringify({
      error: ErrorMessage.InternalServerError
    }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
}
