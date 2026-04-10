import type { Env } from '@/constants/env'; // TEST
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { validateZodBody } from '@/utils/zod-validation';

import {
  CreditsEarnRequestSchema,
  CreditsConsumeRequestSchema,
  CreditsPurchaseRequestSchema,
  CreditsRedeemRequestSchema,
  CreditsConsumeGPRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { ValidationPattern } from '@ocentra/endpoint-domain/constants/validation-patterns';

import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ParamName } from '@ocentra/endpoint-domain/constants/paths';
import { extractAndValidateIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { buildSafeBucketKey } from '@/utils/path-sanitizer';
import { consumeResponseBody } from '@/utils/consume-response-body';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_CREDITS_WARNINGS = false;
const LOG_CREDITS_OPERATIONS = true;
const LOG_DIAG_CREDITS_BALANCE = false;

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

import { RateLimitPrefix, CreditsRateLimit } from '@/constants/rate-limit';
import { CreditAction, Currency, TransactionType } from '@ocentra/endpoint-domain/constants/credits';
import { CreditsDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { MetadataField, type IdempotencyKey } from '@ocentra/endpoint-domain/constants/idempotency';
import type { RateLimiter } from '@/utils/rate-limiter-interface';
import { createRateLimiter } from '@/utils/rate-limiter-factory';
import { fetchFromCreditsDO } from '@/utils/durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { requireIdempotencyKey, validateAndRejectIdempotencyKey } from '@/utils/idempotency-validator';
import { validateAndExtractIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { formatConsumedACDescription } from '@ocentra/endpoint-domain/utils/credit-descriptions';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
const USER_ID_PATH_PATTERN = ValidationPattern.UserId;
import {
  type CreditBalance,
  type CreditTransaction,
  type CreditStorage,
  earnGPLogic,
  purchaseCreditsLogic,
} from '@/logic/credits';
import { redeemPromoLogic } from '@/logic/promo-redeem';

function createCreditStorage(env: Env): CreditStorage {
  return {
    async getBalance(userId: string): Promise<CreditBalance> {
      const key = buildSafeBucketKey(BucketPath.UserCredits, `${userId}.json`);
      try {
        const object = await env.MATCHES_BUCKET.get(key);
        if (object) {
          const balance = JSON.parse(await object.text()) as CreditBalance;
          return balance;
        }
      } catch (error) {
        logWarn(`Error loading balance for ${userId}`, getStackTrace(), error, LOG_CREDITS_WARNINGS);
      }
      return {
        user_id: userId,
        gp_balance: 0,
        ac_balance: 0,
        last_updated: new Date().toISOString(),
        total_gp_earned: 0,
        total_ac_purchased: 0,
        total_ac_spent: 0,
      };
    },

    async saveBalance(balance: CreditBalance): Promise<void> {
      const key = buildSafeBucketKey(BucketPath.UserCredits, `${balance.user_id}.json`);
      await env.MATCHES_BUCKET.put(key, JSON.stringify(balance, null, 2), {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      });
    },

    async addTransaction(transaction: CreditTransaction): Promise<void> {
      const key = buildSafeBucketKey(BucketPath.UserTransactions, transaction.user_id, `${transaction.transaction_id}.json`);
      await env.MATCHES_BUCKET.put(key, JSON.stringify(transaction, null, 2), {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      });
    },

    async getTransactions(userId: string, limit: number): Promise<CreditTransaction[]> {
      const prefix = buildSafeBucketKey(BucketPath.UserTransactions, userId);
      const listResult = await env.MATCHES_BUCKET.list({ prefix, limit });

      const transactions: CreditTransaction[] = [];

      for (const object of listResult.objects) {
        try {
          const obj = await env.MATCHES_BUCKET.get(object.key);
          if (obj) {
            const transaction = JSON.parse(await obj.text()) as CreditTransaction;
            transactions.push(transaction);
          }
        } catch (error) {
          logWarn(`Error loading transaction ${object.key}`, getStackTrace(), error, LOG_CREDITS_WARNINGS);
        }
      }

      transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return transactions.slice(0, limit);
    },
  };
}

async function deriveFallbackIdempotencyKey(seed: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(seed));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function resolveIdempotencyKey(
  headerValue: string | null,
  request: Request,
  env: Env,
  seed: unknown
): Promise<Response | IdempotencyKey> {
  if (headerValue) {
    const keyRequirement = requireIdempotencyKey(headerValue, request, env);
    return keyRequirement;
  }

  const fallbackKey = await deriveFallbackIdempotencyKey(seed);
  const validation = validateAndExtractIdempotencyKey(fallbackKey);
  if (!validation.valid) {
    return requireIdempotencyKey(fallbackKey, request, env);
  }

  return validation.key;
}


export async function getCreditBalance(env: Env, userId: string): Promise<CreditBalance> {
  if (!env.CREDITS_DO) {
    throw new Error('CREDITS_DO not configured');
  }

  const creditsId = env.CREDITS_DO.idFromName(userId);
  const creditsStub = env.CREDITS_DO.get(creditsId);
  const response = await fetchFromCreditsDO(creditsStub, CreditsDO.Balance, {
    method: HttpMethod.Get,
    correlationId: getCurrentContext()?.correlationId,
  });

  if (!response.ok) {
    await consumeResponseBody(response);
    throw new Error(`Failed to get balance: ${response.status}`);
  }

  const balanceData = await response.json() as { gp_balance: number; ac_balance: number; total_gp_earned?: number; total_ac_purchased?: number; total_ac_spent?: number };
  return {
    user_id: userId,
    gp_balance: Math.round(balanceData.gp_balance),
    ac_balance: Math.round(balanceData.ac_balance),
    last_updated: new Date().toISOString(),
    total_gp_earned: Math.round(balanceData.total_gp_earned ?? balanceData.gp_balance),
    total_ac_purchased: Math.round(balanceData.total_ac_purchased ?? balanceData.ac_balance),
    total_ac_spent: Math.round(balanceData.total_ac_spent ?? 0),
  };
}

export async function earnGP(
  env: Env,
  userId: string,
  gpAmount: number,
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; transaction_id?: string; new_balance?: number; error?: string }> {
  const providedKey = metadata?.[MetadataField.IdempotencyKey] as string | undefined;
  const keyValidation = validateAndExtractIdempotencyKey(providedKey);
  if (!keyValidation.valid) {
    return { success: false, error: keyValidation.error };
  }

  const validatedMetadata = metadata ? {
    ...metadata,
    [MetadataField.IdempotencyKey]: keyValidation.key,
  } : undefined;

  const result = await earnGPLogic(
    { userId, gpAmount, description, metadata: validatedMetadata },
    env
  );

  if (!result.success && result.error) {
    logError(`Failed to earn GP for user ${userId}`, getStackTrace(), new Error(result.error));
    return result;
  }

  if (result.success && result.transaction_id) {
    const storage = createCreditStorage(env);
    try {
      const transaction: CreditTransaction = {
        transaction_id: result.transaction_id,
        user_id: userId,
        type: TransactionType.Earned,
        amount: gpAmount,
        currency: Currency.GP,
        description,
        timestamp: new Date().toISOString(),
        metadata: validatedMetadata,
      };
      await storage.addTransaction(transaction);
    } catch (error) {
      logWarn('[CREDITS-EARN] Failed to archive transaction to R2', getStackTrace(), { userId, error: String(error) }, LOG_CREDITS_WARNINGS);
    }
  }

  return result;
}

// Schemas moved to @ocentra/endpoint-domain/schemas/worker-contracts

async function handleCreditsRedeem(
  request: Request,
  env: Env,
  userId: string,
  requestOrigin: string | null
): Promise<Response> {
  const { data, errorResponse } = await validateZodBody(request, env, CreditsRedeemRequestSchema);
  if (errorResponse) return errorResponse;
  const { code } = data!;
  const redeemResult = await redeemPromoLogic({ code, userId }, env);
  const cors = getCorsHeaders(env, requestOrigin || undefined);

  if (!redeemResult.success) {
    return new Response(JSON.stringify({ error: redeemResult.error ?? 'Redeem failed' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...cors },
    });
  }
  return new Response(JSON.stringify({
    success: true,
    already_redeemed: redeemResult.already_redeemed,
    ac_added: redeemResult.ac_added,
    gp_added: redeemResult.gp_added,
    new_ac_balance: redeemResult.new_ac_balance,
    new_gp_balance: redeemResult.new_gp_balance,
  }), {
    status: HttpStatus.Ok,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...cors },
  });
}

export async function handleCreditsRequest(
  request: Request,
  env: Env,
  path: string,
  rateLimiter?: RateLimiter
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) {
    return methodCheck;
  }

  const requestOrigin = request.headers.get(HttpHeader.Origin);
  const authResult = await requireAuth(request, env, undefined, 'Authentication required');
  if (authResult instanceof Response) {
    return authResult;
  }
  const authenticatedUserId = authResult.userId;

  if (request.method === HttpMethod.Post && path === ApiEndpoint.Credits.Redeem) {
    return handleCreditsRedeem(request, env, authenticatedUserId, requestOrigin);
  }

  const result = extractAndValidateIdFromPath(path, ApiEndpoint.Credits.Base, ParamName.UserId, request.url);
  if (result.error || !result.id || !USER_ID_PATH_PATTERN.test(result.id)) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: result.error || 'User ID required'
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }

  const userId = result.id;

  if (authenticatedUserId !== userId) {
    return new Response(JSON.stringify({
      error: 'Forbidden',
      message: 'You can only access your own credit data'
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }

  const action = path.split('/').pop() || CreditAction.Balance;
  
  logDebug(`[CREDITS-HANDLER] Request received`, getStackTrace(), {
    path,
    url: request.url,
    method: request.method,
    action,
    userId,
    hasCreditsDO: !!env.CREDITS_DO,
    creditsDOType: typeof env.CREDITS_DO,
    envKeys: Object.keys(env).filter(k => k.includes('CREDIT') || k.includes('DO'))
  }, LOG_CREDITS_OPERATIONS);
  
  try {
    if (action === CreditAction.Balance || action === userId) {
      if (!env.CREDITS_DO) {
        return new Response(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Credits service not configured'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      if (!env.CREDITS_DO) {
        logError(`[CREDITS-BALANCE] CREDITS_DO not configured for user ${userId}`, getStackTrace());
        return new Response(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Credits service not configured'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const creditsId = env.CREDITS_DO.idFromName(userId);
      const creditsStub = env.CREDITS_DO.get(creditsId);

      logDebug(`[CREDITS-BALANCE] Fetching balance from DO`, getStackTrace(), {
        userId,
        creditsId: creditsId.toString(),
        doPath: CreditsDO.Balance,
        hasCreditsStub: !!creditsStub
      }, LOG_CREDITS_OPERATIONS);

      try {
        const response = await fetchFromCreditsDO(creditsStub, CreditsDO.Balance, {
          method: HttpMethod.Get,
          correlationId: getCurrentContext()?.correlationId,
        });
        if (!response.ok) {
          await consumeResponseBody(response);
          logError(`Failed to get balance for user ${userId}`, getStackTrace(), { status: response.status });
          return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: 'Failed to retrieve balance'
          }), {
            status: HttpStatus.InternalServerError,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          });
        }

        const balanceData = await response.json() as { gp_balance: number; ac_balance: number; total_gp_earned?: number; total_ac_purchased?: number; total_ac_spent?: number };
        logInfo('[DIAG] credits balance', getStackTrace(), { userId, creditsId: creditsId.toString(), gp_balance: balanceData.gp_balance }, LOG_DIAG_CREDITS_BALANCE);
        const balance: CreditBalance = {
          user_id: userId,
          gp_balance: Math.round(balanceData.gp_balance),
          ac_balance: Math.round(balanceData.ac_balance),
          last_updated: new Date().toISOString(),
          total_gp_earned: Math.round(balanceData.total_gp_earned ?? balanceData.gp_balance),
          total_ac_purchased: Math.round(balanceData.total_ac_purchased ?? balanceData.ac_balance),
          total_ac_spent: Math.round(balanceData.total_ac_spent ?? 0),
        };

        return new Response(JSON.stringify(balance), {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      } catch (error) {
        logError(`[CREDITS-BALANCE] Exception details`, getStackTrace(), {
          userId,
          error: String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          creditsId: creditsId.toString(),
          doPath: CreditsDO.Balance
        });
        logError(`Failed to get balance for user ${userId}`, getStackTrace(), error);
        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to retrieve balance'
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }
    } else if (action === CreditAction.Purchase && request.method === HttpMethod.Post) {
      let limiter: RateLimiter;
      try {
        limiter = rateLimiter || createRateLimiter(env);
      } catch (error) {
        logError('Rate limiter not configured, denying request for safety', getStackTrace(), { userId, operation: 'purchase', error });
        return new Response('Too Many Requests', { 
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      let rateLimitResult;
      try {
        rateLimitResult = await limiter.check({
          key: `${RateLimitPrefix.CreditsPurchase}${userId}`,
          limit: CreditsRateLimit.PurchaseLimit,
          windowSeconds: CreditsRateLimit.PurchaseWindowMs / 1000,
        });
      } catch (error) {
        logError('[CREDITS-PURCHASE] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { userId, error: String(error) });
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit check unavailable. Request denied for safety.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Purchase rate limit exceeded. Please try again later.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
            [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const contentType = request.headers.get(HttpHeader.ContentType) || '';
      logDebug('[CREDITS-PURCHASE] Request body inspection', getStackTrace(), {
        userId,
        contentType,
        bodyUsed: request.bodyUsed,
        hasBody: request.body! !== null,
        method: request.method
      }, LOG_CREDITS_OPERATIONS);

      const { data: body, errorResponse: bodyError } = await validateZodBody(request, env, CreditsPurchaseRequestSchema);
      if (bodyError) return bodyError;
      if (!env.CREDITS_DO) {

        return new Response(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Credits service not configured'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

        const idempotencyKeyHeader = request.headers.get(HttpHeader.IdempotencyKey);
        const keyRequirement = await resolveIdempotencyKey(idempotencyKeyHeader, request, env, {
          userId,
          amount: body!.amount,
          currency: body!.currency,
          ac_amount: body!.ac_amount,
          payment_method: body!.payment_method ?? null,
        });
        if (keyRequirement instanceof Response) {
          return keyRequirement;
        }
        const idempotencyKey = keyRequirement;

      const validationError = validateAndRejectIdempotencyKey(idempotencyKey, request, env);
      if (validationError) {
        return validationError;
      }

      const keyValidation = validateAndExtractIdempotencyKey(idempotencyKey);
      const validatedIdempotencyKey = keyValidation.valid ? keyValidation.key : undefined;

      const storage = createCreditStorage(env);

      logDebug('[CREDITS-PURCHASE-REQUEST] Starting purchase', getStackTrace(), {
        userId,
        acAmount: body!.ac_amount,
        usdAmount: body!.amount,
        paymentMethod: body!.payment_method,
        hasIdempotencyKey: !!validatedIdempotencyKey,
        hasCreditsDO: !!env.CREDITS_DO
      }, LOG_CREDITS_OPERATIONS);

      let purchaseResult;
      try {
        purchaseResult = await purchaseCreditsLogic(
          {
            userId,
            acAmount: body!.ac_amount,
            usdAmount: body!.amount,
            paymentMethod: body!.payment_method,
            idempotencyKey: validatedIdempotencyKey,
          },
          env,
          storage
        );
      } catch (error) {
        logError('[CREDITS-PURCHASE-EXCEPTION] Purchase logic threw exception', getStackTrace(), {
          userId,
          acAmount: body!.ac_amount,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid purchase request'
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      logDebug('[CREDITS-PURCHASE-RESULT] Purchase completed', getStackTrace(), {
        userId,
        success: purchaseResult.success,
        error: purchaseResult.error,
        transactionId: purchaseResult.transaction_id,
        newBalance: purchaseResult.new_balance
      }, LOG_CREDITS_OPERATIONS);

      if (!purchaseResult.success) {
        logError('[CREDITS-PURCHASE-FAILURE] Purchase failed', getStackTrace(), {
          userId,
          acAmount: body!.ac_amount,
          error: purchaseResult.error,
          idempotencyKey: validatedIdempotencyKey || undefined,
          hasCreditsDO: !!env.CREDITS_DO
        });
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: purchaseResult.error || 'Purchase failed'
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        already_processed: purchaseResult.already_processed,
        transaction_id: purchaseResult.transaction_id,
        new_balance: purchaseResult.new_balance,
        ac_added: purchaseResult.ac_added,
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
          [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      });
    } else if (action === CreditAction.Consume && request.method === HttpMethod.Post) {
      let limiter: RateLimiter;
      try {
        limiter = rateLimiter || createRateLimiter(env);
      } catch (error) {
        logError('Rate limiter not configured, denying request for safety', getStackTrace(), { userId, operation: 'consume', error });
        return new Response('Too Many Requests', { 
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      let rateLimitResult;
      try {
        rateLimitResult = await limiter.check({
          key: `${RateLimitPrefix.CreditsConsume}${userId}`,
          limit: CreditsRateLimit.ConsumeLimit,
          windowSeconds: CreditsRateLimit.ConsumeWindowMs / 1000,
        });
      } catch (error) {
        logError('[CREDITS-CONSUME] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { userId, error: String(error) });
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit check unavailable. Request denied for safety.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Consume rate limit exceeded. Please try again later.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
            [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const contentType = request.headers.get(HttpHeader.ContentType) || '';
      const bodyLength = request.headers.get(HttpHeader.ContentLength) || '0';
      logDebug('[CREDITS-CONSUME] Request body inspection', getStackTrace(), {
        userId,
        contentType,
        bodyUsed: request.bodyUsed,
        hasBody: request.body! !== null,
        method: request.method
      }, LOG_CREDITS_OPERATIONS);

      const { data: body, errorResponse: bodyError } = await validateZodBody(request, env, CreditsConsumeRequestSchema);
      if (bodyError) return bodyError;
      if (!env.CREDITS_DO) {

        logError('[CREDITS-CONSUME] CREDITS_DO not configured - returning 503', getStackTrace(), {
          userId,
          acAmount: body!.ac_amount,
          hasEnv: !!env,
          envKeys: Object.keys(env).filter(k => k.includes('CREDIT') || k.includes('DO')),
          contentType,
          bodyLength
        });
        return new Response(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Credits service not configured'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const idempotencyKeyHeader = request.headers.get(HttpHeader.IdempotencyKey);
      const keyRequirement = await resolveIdempotencyKey(idempotencyKeyHeader, request, env, {
        userId,
        ac_amount: body!.ac_amount,
        description: body!.description,
        metadata: body!.metadata ?? null,
      });
      if (keyRequirement instanceof Response) {
        return keyRequirement;
      }
      const idempotencyKey = keyRequirement;

      const validationError = validateAndRejectIdempotencyKey(idempotencyKey, request, env);
      if (validationError) {
        return validationError;
      }
      const keyValidation = validateAndExtractIdempotencyKey(idempotencyKey);
      if (!keyValidation.valid) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: keyValidation.error || 'Invalid idempotency key format',
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }
      const consumeId = keyValidation.key;
      const creditsId = env.CREDITS_DO.idFromName(userId);
      const creditsStub = env.CREDITS_DO.get(creditsId);
      const doBody = {
        consumeId,
        amount: body!.ac_amount,
        currency: Currency.AC,
        description: body!.description || formatConsumedACDescription(body!.ac_amount),
        metadata: body!.metadata,
      };
      logDebug('[CREDITS-CONSUME-REQUEST] Starting AC consumption via CreditsDO', getStackTrace(), {
        userId,
        creditsId: creditsId.toString(),
        doPath: CreditsDO.Consume,
        consumeId,
        acAmount: body!.ac_amount,
        hasCreditsStub: !!creditsStub
      }, LOG_CREDITS_OPERATIONS);

      try {
        const response = await fetchFromCreditsDO(creditsStub, CreditsDO.Consume, {
          method: HttpMethod.Post,
          body: JSON.stringify(doBody),
          correlationId: getCurrentContext()?.correlationId,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `CreditsDO error: ${response.status}` })) as { error?: string };
          
          if (response.status === HttpStatus.Conflict && errorData.error?.includes('Insufficient')) {
            let currentBalance = 0;
              try {
                const balanceResponse = await fetchFromCreditsDO(creditsStub, CreditsDO.Balance, {
                  method: HttpMethod.Get,
                  correlationId: getCurrentContext()?.correlationId,
                });
                if (balanceResponse.ok) {
                  const balanceData = await balanceResponse.json() as { ac_balance: number };
                  currentBalance = Math.round(balanceData.ac_balance);
                } else {
                  await consumeResponseBody(balanceResponse);
                }
            } catch (error) {
              logWarn(`[CREDITS-PURCHASE] Failed to get current balance for transaction archive`, getStackTrace(), { userId, error: String(error) }, LOG_CREDITS_WARNINGS);
            }

            return new Response(JSON.stringify({
              error: 'Insufficient Credits',
              message: `Insufficient AC balance. Current: ${currentBalance}, Required: ${body!.ac_amount}`,
              current_balance: currentBalance,
              required: body!.ac_amount,
            }), {
              status: 402,
              headers: {
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                ...getCorsHeaders(env, requestOrigin || undefined),
              },
            });
          }

          logError('[CREDITS-CONSUME-FAILURE] Consumption failed', getStackTrace(), {
            userId,
            acAmount: body!.ac_amount,
            error: errorData.error,
            status: response.status
          });
          return new Response(JSON.stringify({
            error: 'Bad Request',
            message: errorData.error || 'Consumption failed'
          }), {
            status: HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          });
        }

        const result = await response.json() as { success: boolean; already_processed?: boolean; new_balance?: number; error?: string };

        logDebug('[CREDITS-CONSUME-RESULT] Consumption completed', getStackTrace(), {
          userId,
          success: result.success,
          error: result.error,
          transactionId: consumeId,
          newBalance: result.new_balance
        }, LOG_CREDITS_OPERATIONS);

        if (!result.success) {
          logError('[CREDITS-CONSUME-FAILURE] Consumption failed', getStackTrace(), {
            userId,
            acAmount: body!.ac_amount,
            error: result.error
          });
          return new Response(JSON.stringify({
            error: 'Bad Request',
            message: result.error || 'Consumption failed'
          }), {
            status: HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          });
        }

        const storage = createCreditStorage(env);
        try {
          const transaction: CreditTransaction = {
            transaction_id: consumeId,
            user_id: userId,
            type: TransactionType.Consumption,
            amount: -body!.ac_amount,
            currency: Currency.AC,
            description: body!.description || formatConsumedACDescription(body!.ac_amount),
            timestamp: new Date().toISOString(),
            metadata: body!.metadata,
          };
          await storage.addTransaction(transaction);
        } catch (error) {
          logWarn('[CREDITS-CONSUME] Failed to archive transaction to R2', getStackTrace(), { userId, error: String(error) }, LOG_CREDITS_WARNINGS);
        }

        return new Response(JSON.stringify({
          success: true,
          transaction_id: consumeId,
          new_balance: result.new_balance,
          ac_consumed: body!.ac_amount,
        }), {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
            [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      } catch (error) {
        logError(`[CREDITS-CONSUME] Exception details`, getStackTrace(), {
          userId,
          error: String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          creditsId: creditsId.toString(),
          doPath: CreditsDO.Consume,
          consumeId,
          acAmount: body!.ac_amount
        });
        logError(`Failed to consume AC for user ${userId}`, getStackTrace(), error);
        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to process consume request'
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }
    } else if (action === CreditAction.Earn && request.method === HttpMethod.Post) {
      let limiter: RateLimiter;
      try {
        limiter = rateLimiter || createRateLimiter(env);
      } catch (error) {
        logError('Rate limiter not configured, denying request for safety', getStackTrace(), { userId, operation: 'earn', error });
        return new Response('Too Many Requests', { 
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      let rateLimitResult;
      try {
        rateLimitResult = await limiter.check({
          key: `${RateLimitPrefix.CreditsEarn}${userId}`,
          limit: CreditsRateLimit.EarnLimit,
          windowSeconds: CreditsRateLimit.EarnWindowMs / 1000,
        });
      } catch (error) {
        logError('[CREDITS-EARN] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { userId, error: String(error) });
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit check unavailable. Request denied for safety.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Earn GP rate limit exceeded. Please try again later.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
            [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const validation = await validateZodBody(request, env, CreditsEarnRequestSchema);

      if (validation.errorResponse) return validation.errorResponse;
      const body = validation.data!;

      const idempotencyKeyHeader = request.headers.get(HttpHeader.IdempotencyKey);
      const keyRequirement = await resolveIdempotencyKey(idempotencyKeyHeader, request, env, {
        userId,
        gp_amount: body!.gp_amount,
        description: body!.description,
        metadata: body!.metadata ?? null,
      });
      if (keyRequirement instanceof Response) {
        return keyRequirement;
      }
      const idempotencyKey = keyRequirement;

      const validationError = validateAndRejectIdempotencyKey(idempotencyKey, request, env);
      if (validationError) {
        return validationError;
      }

      const earnResult = await earnGPLogic(
        {
          userId,
          gpAmount: body!.gp_amount,
          description: body!.description,
          metadata: {
            ...body!.metadata,
            [MetadataField.IdempotencyKey]: idempotencyKey,
          },
        },
        env
      );

      if (!earnResult.success) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: earnResult.error || 'Failed to earn GP'
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        already_processed: earnResult.already_processed,
        transaction_id: earnResult.transaction_id,
        new_balance: earnResult.new_balance,
      }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
          [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      });
    } else if (action === CreditAction.ConsumeGP && request.method === HttpMethod.Post) {
      let limiter: RateLimiter;
      try {
        limiter = rateLimiter || createRateLimiter(env);
      } catch (error) {
        logError('Rate limiter not configured, denying request for safety', getStackTrace(), { userId, operation: 'consume', error });
        return new Response('Too Many Requests', { 
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      let rateLimitResult;
      try {
        rateLimitResult = await limiter.check({
          key: `${RateLimitPrefix.CreditsConsume}${userId}`,
          limit: CreditsRateLimit.ConsumeLimit,
          windowSeconds: CreditsRateLimit.ConsumeWindowMs / 1000,
        });
      } catch (error) {
        logError('[CREDITS-CONSUME-GP] Rate limiter check failed, denying request for safety (Rule 12.10)', getStackTrace(), { userId, error: String(error) });
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit check unavailable. Request denied for safety.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Consume GP rate limit exceeded. Please try again later.',
        }), {
          status: HttpStatus.TooManyRequests,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
            [HttpHeader.XRateLimitReset]: String(rateLimitResult.resetAt || 0),
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const validation = await validateZodBody(request, env, CreditsConsumeGPRequestSchema);

      if (validation.errorResponse) return validation.errorResponse;
      const body = validation.data!;

      const currency = body.currency || Currency.GP;
      if (currency !== Currency.GP && currency !== Currency.AC) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: 'Currency must be GP or AC'
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      if (!env.CREDITS_DO) {
        logError(`[CREDITS-CONSUME] CREDITS_DO is undefined`, getStackTrace(), {
          userId,
          path,
          url: request.url,
          action,
          method: request.method,
          envKeys: Object.keys(env).filter(k => k.includes('CREDIT') || k.includes('DO')),
          envType: typeof env,
          hasEnv: !!env
        });
        return new Response(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Credits service not configured'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const idempotencyKeyHeader = request.headers.get(HttpHeader.IdempotencyKey);
      const keyRequirement = requireIdempotencyKey(idempotencyKeyHeader, request, env);
      if (keyRequirement instanceof Response) {
        return keyRequirement;
      }
      const idempotencyKey = keyRequirement;

      const validationError = validateAndRejectIdempotencyKey(idempotencyKey, request, env);
      if (validationError) {
        return validationError;
      }
      const keyValidation = validateAndExtractIdempotencyKey(idempotencyKey);
      if (!keyValidation.valid) {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: keyValidation.error || 'Invalid idempotency key format',
        }), {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }
      const consumeId = keyValidation.key;
      const creditsId = env.CREDITS_DO.idFromName(userId);
      const creditsStub = env.CREDITS_DO.get(creditsId);
      const doBody = {
        consumeId,
        amount: body!.amount,
        currency,
        description: body!.description,
        metadata: body!.metadata,
      };
      logDebug(`[CREDITS-CONSUME] Fetching consume from DO`, getStackTrace(), {
        userId,
        creditsId: creditsId.toString(),
        doPath: CreditsDO.Consume,
        consumeId,
        amount: body!.amount,
        currency,
        hasCreditsStub: !!creditsStub,
        hasEnvCreditsDO: !!env.CREDITS_DO
      }, LOG_CREDITS_OPERATIONS);

      try {
        const response = await fetchFromCreditsDO(creditsStub, CreditsDO.Consume, {
          method: HttpMethod.Post,
          body: JSON.stringify(doBody),
          correlationId: getCurrentContext()?.correlationId,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `CreditsDO error: ${response.status}` })) as { error?: string };
          const errorMessage = errorData.error || `Failed to consume ${currency}`;
          
          if (response.status === HttpStatus.Conflict && errorMessage.includes('Insufficient')) {
            let currentBalance = 0;
              try {
                const balanceResponse = await fetchFromCreditsDO(creditsStub, CreditsDO.Balance, {
                  method: HttpMethod.Get,
                  correlationId: getCurrentContext()?.correlationId,
                });
                if (balanceResponse.ok) {
                  const balanceData = await balanceResponse.json() as { gp_balance?: number; ac_balance?: number };
                  currentBalance = currency === Currency.GP
                    ? Math.round(balanceData.gp_balance ?? 0)
                    : Math.round(balanceData.ac_balance ?? 0);
                } else {
                  await consumeResponseBody(balanceResponse);
                }
            } catch (error) {
              logWarn(`[CREDITS-PURCHASE] Failed to get current balance for transaction archive`, getStackTrace(), { userId, error: String(error) }, LOG_CREDITS_WARNINGS);
            }

            return new Response(JSON.stringify({
              error: errorMessage,
              message: `Insufficient ${currency} balance. Current: ${currentBalance}, Required: ${body!.amount}`,
              current_balance: currentBalance,
              required: body!.amount,
            }), {
              status: HttpStatus.Conflict,
              headers: {
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                ...getCorsHeaders(env, requestOrigin || undefined),
              },
            });
          }

          return new Response(JSON.stringify({
            error: response.status === HttpStatus.Conflict ? errorMessage : 'Bad Request',
            message: errorMessage
          }), {
            status: response.status === HttpStatus.Conflict ? HttpStatus.Conflict : HttpStatus.BadRequest,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          });
        }

        const result = await response.json() as { success: boolean; already_processed?: boolean; new_balance?: number; error?: string };
        return new Response(JSON.stringify({
          success: result.success,
          already_processed: result.already_processed,
          new_balance: result.new_balance,
        }), {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.XRateLimitRemaining]: String(rateLimitResult.remaining || 0),
            [HttpHeader.XRateLimitReset]: String(Math.floor((rateLimitResult.resetAt || 0) / 1000)),
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      } catch (error) {
        logError(`[CREDITS-CONSUME] Exception details`, getStackTrace(), {
          userId,
          error: String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          creditsId: creditsId.toString(),
          doPath: CreditsDO.Consume,
          consumeId,
          amount: body!.amount,
          currency
        });
        logError(`Failed to consume ${currency} for user ${userId}`, getStackTrace(), error);
        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to process consume request'
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }
    } else if (action === CreditAction.Transactions) {
      if (!env.CREDITS_DO) {
        return new Response(JSON.stringify({
          error: 'Service Unavailable',
          message: 'CreditsDO not configured'
        }), {
          status: HttpStatus.ServiceUnavailable,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }

      const creditsId = env.CREDITS_DO.idFromName(userId);
      const creditsStub = env.CREDITS_DO.get(creditsId);
      const url = new URL(request.url);
      const limit = url.searchParams.get('limit') || '50';
      const transactionsPath = `${CreditsDO.Transactions}?limit=${limit}`;

      try {
        const response = await fetchFromCreditsDO(creditsStub, transactionsPath, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.XUserId]: userId,
          },
          correlationId: getCurrentContext()?.correlationId,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          logError(`[CREDITS-TRANSACTIONS] CreditsDO error`, getStackTrace(), {
            userId,
            status: response.status,
            error: errorText
          });
          return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: 'Failed to retrieve transactions'
          }), {
            status: HttpStatus.InternalServerError,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          });
        }

        const result = await response.json() as { transactions: CreditTransaction[]; count: number };
        return new Response(JSON.stringify({
          user_id: userId,
          transactions: result.transactions,
          count: result.count,
        }), {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      } catch (error) {
        logError(`[CREDITS-TRANSACTIONS] Exception calling CreditsDO`, getStackTrace(), {
          userId,
          error: String(error)
        });
        return new Response(JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to retrieve transactions'
        }), {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        });
      }
    } else {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Unknown action: ${action}`
      }), {
        status: HttpStatus.NotFound,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      });
    }
  } catch (error) {
    logError('[CREDITS-HANDLER] Unhandled exception in handleCreditsRequest', getStackTrace(), {
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorStack: error instanceof Error ? error.stack : undefined,
      path,
      method: request.method,
      contentType: request.headers.get(HttpHeader.ContentType),
      bodyUsed: request.bodyUsed,
      userId: authenticatedUserId
    });
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }
}
