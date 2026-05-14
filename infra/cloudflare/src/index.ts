import type { Env } from '@/constants/env';
import { metricsCollector } from '@/monitoring/metrics-collector';
import { alertOversizedRequest, detectAttackPattern } from '@/monitoring/security';
import { getCorsHeaders, validateCorsOrigin } from '@/utils/cors';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { RequestLimits } from '@/constants/request-limits';
import { RateLimitFallback } from '@/constants/rate-limit';
import { SecurityEventType } from '@/constants/security-events';
import { Logger, getStackTrace, initLogger, flushDebugLogs, flushAllBatchesAndTestLogs, resetRequestCount } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { createRequestContext, setCurrentContext } from '@/logging/request-context';
import { createRouter } from '@/utils/routes';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { EnvironmentValidator } from '@/validators/environment-validator';
import { isEmergencyShutdownEnabled, isStateChangingMethod, createShutdownResponse } from '@/utils/kill-switch';

const router = createRouter(metricsCollector);

let _consoleNoopApplied = false;

const log = Logger.instance;
log.register(import.meta.url);

const LOG_INDEX_WARNINGS = false;
const LOG_DIAG = false;
const LOG_ROUTER_REQUEST_FLOW = false;
const RESPONSE_CORS_HEADERS = [
  HttpHeader.AccessControlAllowOrigin,
  HttpHeader.AccessControlAllowMethods,
  HttpHeader.AccessControlAllowHeaders,
  HttpHeader.AccessControlAllowCredentials,
  HttpHeader.AccessControlMaxAge,
  HttpHeader.AccessControlAllowPrivateNetwork,
] as const;

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

type ResponseWithWebSocket = Response & { webSocket?: WebSocket | null };

function hasWebSocket(response: Response): boolean {
  return Boolean((response as ResponseWithWebSocket).webSocket);
}

function afterBridgeSend(
  response: Response,
  env: Env,
  requestOrigin: string | null
): Response {
  if (hasWebSocket(response)) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const header of RESPONSE_CORS_HEADERS) {
    headers.delete(header);
  }
  const corsHeaders = getCorsHeaders(env, requestOrigin || undefined);
  for (const [header, value] of Object.entries(corsHeaders)) {
    headers.set(header, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { MatchCoordinatorDO } from '@/durable-objects/MatchCoordinatorDO';
export { CreditsDO } from '@/durable-objects/CreditsDO';
export { UserKeysDO } from '@/durable-objects/UserKeysDO';
export { MatchShardDO } from '@/durable-objects/MatchShardDO';
export { PlayerShardDO } from '@/durable-objects/PlayerShardDO';
export { StateSyncCoordinatorDO } from '@/durable-objects/StateSyncCoordinatorDO';
export { PaymentDO } from '@/durable-objects/PaymentDO';
export { LobbyDO } from '@/durable-objects/LobbyDO';
export { MatchmakingDO } from '@/durable-objects/MatchmakingDO';
export { PresenceDO } from '@/durable-objects/PresenceDO';
export { SignalingDO } from '@/durable-objects/SignalingDO';
export { AuditLogDO } from '@/durable-objects/AuditLogDO';
export { ProgressionDO } from '@/durable-objects/ProgressionDO';
export { RewardDO } from '@/durable-objects/RewardDO';
export { AntiCheatDO } from '@/durable-objects/AntiCheatDO';
export { FraudDetectionDO } from '@/durable-objects/FraudDetectionDO';
export { PenaltyDO } from '@/durable-objects/PenaltyDO';
export { ProfileDO } from '@/durable-objects/ProfileDO';
export { MessageDO } from '@/durable-objects/MessageDO';
export { ActivityFeedDO } from '@/durable-objects/ActivityFeedDO';
export { PartyDO } from '@/durable-objects/PartyDO';
export { LeaderboardDO } from '@/durable-objects/LeaderboardDO';
export { NotificationDO } from '@/durable-objects/NotificationDO';
export { InventoryDO } from '@/durable-objects/InventoryDO';
export { MarketplaceDO } from '@/durable-objects/MarketplaceDO';
export { TournamentDO } from '@/durable-objects/TournamentDO';
export { SettingsDO } from '@/durable-objects/SettingsDO';

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
    if (!_consoleNoopApplied && env.ENVIRONMENT === Environment.Production) {
      _consoleNoopApplied = true;
      const noop = () => {};
      console.info = noop;
      console.debug = noop;
      console.warn = noop;
    }

    const url = new URL(request.url);
    logDebug('[DIAG] worker fetch received', getStackTrace(), { path: url.pathname, method: request.method }, LOG_DIAG);

    initLogger(
      env.ANALYTICS,
      env.MATCHES_BUCKET,
      env.ENVIRONMENT,
      env.TEST_MODE,
      env.LOG_LEVEL,
      env
    );

    resetRequestCount();
    const requestContext = createRequestContext(request);
    setCurrentContext(requestContext);

    try {
      try {
        EnvironmentValidator.validate(env);
      } catch (error) {
      logError('Environment validation failed', getStackTrace(), error);
      return afterBridgeSend(
        new Response(JSON.stringify({
          error: ErrorMessage.InternalServerError,
          message: error instanceof Error ? error.message : 'Configuration error',
        }), {
          status: HttpStatus.InternalServerError,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }),
        env,
        request.headers.get(HttpHeader.Origin)
      );
    }

    const requestOrigin = request.headers.get(HttpHeader.Origin);
    const path = url.pathname;

    // CORS validation as prerequisite (fail-fast) - "chicken cooking" rule
    // Must validate BEFORE processing request
    if (request.method !== HttpMethod.Options) {
      const corsValidation = validateCorsOrigin(env, requestOrigin);
      if (corsValidation) {
        logWarn('CORS validation failed - rejecting request before processing', getStackTrace(), {
          method: request.method,
          path,
          origin: requestOrigin,
        }, LOG_INDEX_WARNINGS);
        return afterBridgeSend(corsValidation, env, requestOrigin);
      }
    }

    if (isEmergencyShutdownEnabled(env, request) && isStateChangingMethod(request.method)) {
      logWarn('Emergency shutdown active - rejecting state-changing request', getStackTrace(), {
        method: request.method,
        path,
        origin: requestOrigin,
      }, LOG_INDEX_WARNINGS);
      return afterBridgeSend(createShutdownResponse(request, env), env, requestOrigin);
    }

    try {
      if ((request.method === HttpMethod.Post || request.method === HttpMethod.Put) && request.body) {
        const contentLength = request.headers.get(HttpHeader.ContentLength);
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > RequestLimits.MaxRequestSizeBytes) {
            const ip = request.headers.get(HttpHeader.CFConnectingIP) || RateLimitFallback.Unknown;
            await alertOversizedRequest(size, RequestLimits.MaxRequestSizeBytes, path, env).catch(() => { });
            await detectAttackPattern(ip, SecurityEventType.OversizedRequest, env).catch(() => { });
            const sizeMB = RequestLimits.MaxRequestSizeBytes / 1024 / 1024;
            return afterBridgeSend(
              new Response(JSON.stringify({
                error: ErrorMessage.PayloadTooLarge,
                message: `${ErrorMessage.RequestBodyExceedsMaximumSizePrefix} ${sizeMB}MB`,
              }), {
                status: HttpStatus.PayloadTooLarge,
                headers: {
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  ...getCorsHeaders(env, requestOrigin || undefined),
                },
              }),
              env,
              requestOrigin
            );
          }
        }
      }

      if (request.method === HttpMethod.Options) {
        return afterBridgeSend(
          new Response(null, {
            status: HttpStatus.NoContent,
            headers: getCorsHeaders(env, requestOrigin || undefined),
          }),
          env,
          requestOrigin
        );
      }

      logDebug('[INDEX] About to call router.match', getStackTrace(), {
        path,
        method: request.method,
        url: request.url
      }, LOG_ROUTER_REQUEST_FLOW);

      const response = await router.match(request, env, {
        path,
        url,
        requestOrigin: requestOrigin || undefined,
        executionContext,
      });

      logDebug('[DIAG] worker router.match returned', getStackTrace(), { path, status: response?.status }, LOG_DIAG);

      logDebug('[INDEX] router.match returned', getStackTrace(), {
        path,
        method: request.method,
        hasResponse: !!response,
        status: response?.status
      }, LOG_ROUTER_REQUEST_FLOW);

      if (response) {
        logDebug('[ROUTER] Route matched, returning response', getStackTrace(), {
          path,
          method: request.method,
          status: response.status,
        }, LOG_ROUTER_REQUEST_FLOW);
        if (executionContext.waitUntil) {
          executionContext.waitUntil(flushDebugLogs());
        }
        return afterBridgeSend(response, env, requestOrigin);
      }

      logDebug('[ROUTER] No route matched', getStackTrace(), {
        path,
        method: request.method,
        url: request.url,
      }, LOG_ROUTER_REQUEST_FLOW);

      if (executionContext.waitUntil) {
        executionContext.waitUntil(flushDebugLogs());
      }

      return afterBridgeSend(
        new Response(ErrorMessage.NotFound, {
          status: HttpStatus.NotFound,
          headers: getCorsHeaders(env, requestOrigin || undefined),
        }),
        env,
        requestOrigin
      );
    } catch (error) {
      logError('[INDEX] Exception caught in fetch handler', getStackTrace(), {
        path,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      logError(ErrorMessage.UnhandledError, getStackTrace(), error);

      if (executionContext.waitUntil) {
        executionContext.waitUntil(flushDebugLogs());
      }

      const isCorsError = error instanceof Error &&
        (error.message.includes(ErrorMessage.CorsErrorKeyword) || error.message.includes(ErrorMessage.OriginMismatchKeyword));

      let corsHeaders: Record<string, string> = {};
      try {
        corsHeaders = getCorsHeaders(env, requestOrigin || undefined);
      } catch {
        corsHeaders = { [HttpHeader.ContentType]: HttpContentType.ApplicationJson };
      }

      const statusCode = isCorsError ? HttpStatus.Forbidden : HttpStatus.InternalServerError;
      logDebug('[INDEX] Returning error response', getStackTrace(), {
        path,
        method: request.method,
        statusCode,
        isCorsError,
      }, LOG_ROUTER_REQUEST_FLOW);

      return afterBridgeSend(
        new Response(JSON.stringify({
          error: isCorsError ? ErrorMessage.Forbidden : ErrorMessage.InternalServerError,
          message: error instanceof Error ? error.message : ErrorMessage.UnknownError,
        }), {
          status: statusCode,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...corsHeaders,
          },
        }),
        env,
        request.headers.get(HttpHeader.Origin)
      );
    }
    } finally {
      if (requestContext.runId && requestContext.testName) {
        await flushAllBatchesAndTestLogs();
      }
      setCurrentContext(null);
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    initLogger(
      env.ANALYTICS,
      env.MATCHES_BUCKET,
      env.ENVIRONMENT,
      env.TEST_MODE,
      env.LOG_LEVEL,
      env
    );
    if (env.PAYMENT_DO && env.STRIPE_SECRET_KEY) {
      const { runReconciliation } = await import('@/logic/reconciliation');
      const result = await runReconciliation(env);
      log.logInfo('Reconciliation cron completed', getStackTrace(), result);
      if (result.discrepancy) {
        log.logError('Reconciliation discrepancy: Stripe charges missing in internal ledger', getStackTrace(), result);
      }
    }
    if (env.LEADERBOARD_DO && env.MATCHES_BUCKET) {
      const { runLeaderboardRefresh } = await import('@/handlers/leaderboard');
      const lbResult = await runLeaderboardRefresh(env);
      log.logInfo('Leaderboard cron completed', getStackTrace(), lbResult);
    }
    if (env.AUDIT_ARCHIVE && env.AUDIT_LOG_DO) {
      const now = Date.now();
      const sevenYearsMs = 7 * 365 * 24 * 60 * 60 * 1000;
      await env.AUDIT_ARCHIVE.put('retention/last_run', String(now));
      log.logInfo('Audit 7-year retention: last_run written', getStackTrace(), { cutoff: now - sevenYearsMs });
    }
  },
};
