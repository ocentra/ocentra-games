import type { Env } from '@/constants/env';
import { HttpHeader, HttpContentType, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import {
  CloudflareRouteManifest,
} from '@ocentra/endpoint-domain/constants/cloudflare-route-manifest';
import {
  CloudflareHandlerKey,
  MiddlewareKey,
  RouteMatch,
} from '@ocentra/endpoint-domain/constants/cloudflare-route-keys';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HealthStatus } from '@ocentra/endpoint-domain/constants/health';
import { getCorsHeaders } from '@/utils/cors';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { requireAuth } from '@/utils/auth-middleware';
import { generateOpenApiJson, generateSwaggerHtml } from '@/utils/openapi';
import { templates } from '@/templates/loader';
import { handleLogsRequest } from '@/handlers/logs';
import { handleHomepageRequest } from '@/handlers/homepage';
import { handleListMatches, handleListBenchmarks } from '@/handlers/explore';
import { handleMatchRequest, handleAnonymizeRequest } from '@/handlers/matches';
import { handleDisputeRequest } from '@/handlers/disputes';
import { handleSignedUrlRequest } from '@/handlers/signed-url';
import { handleArchiveRequest } from '@/handlers/archive';
import { handleDataExportRequest, handleDataDeletionRequest } from '@/handlers/data';
import { handleAIRequest } from '@/handlers/ai';
import { handleAIKeysRequest } from '@/handlers/ai-keys';
import { handleAIEscrowRequest } from '@/handlers/ai-escrow';
import { handleAICatalogRequest } from '@/handlers/ai-catalog';
import { handleAIOAuthRequest } from '@/handlers/ai-oauth';
import { handleAIGenerateRequest } from '@/handlers/ai-generate';
import { handleLeaderboardRequest } from '@/handlers/leaderboard';
import { handlePlayerRequest } from '@/handlers/players';
import { handleCreditsRequest } from '@/handlers/credits';
import { handleBadgesRequest } from '@/handlers/badges';
import { handleTestRequest } from '@/handlers/test';
import { handleImageProxyRequest } from '@/handlers/image-proxy';
import { handleSyncRequest } from '@/handlers/sync';
import { handleReplayRequest } from '@/handlers/replay';
import { handleTransparencyRequest } from '@/handlers/transparency';
import { handleWsRequest } from '@/handlers/ws';
import { handlePaymentRequest } from '@/handlers/payments';
import { handleStripeWebhookRequest } from '@/handlers/webhooks-stripe';
import {
  handleLobbyRequest,
  handleMatchmakingRequest,
  handlePresenceRequest,
  handleFriendsRequest,
  handleAuditRequest,
  handleProgressionRequest,
  handleRewardRequest,
  handlePersonalizationRequest,
  handleAnalyticsRequest,
  handleSecurityRequest,
  handleFraudRequest,
  handleAntiCheatRequest,
  handleProfileRequest,
  handleMessageRequest,
  handleFeedRequest,
  handlePartyRequest,
  handleNotificationRequest,
  handleDiscoveryRequest,
  handleInventoryRequest,
  handleMarketplaceRequest,
  handleTournamentRequest,
  handleSettingsRequest,
} from '@/handlers/feature-handlers';
import {
  handleAdminRequest,
  handleComplianceRequest,
  handleHealthDetailRequest,
} from '@/handlers/feature-handlers-admin';
import { handleAdminProductRequest } from '@/handlers/admin-products';
import { handleAssetsRequest } from '@/handlers/assets';
import { handleSlicesRequest } from '@/handlers/slices';
import { handleShopRequest } from '@/handlers/shop';
import {
  Router,
  type RouteHandler,
  exactPath,
  includes,
  combineMatchers,
  pathWithParam,
} from '@/utils/router';
import { emitMetrics, checkAlertThresholds } from '@/monitoring/system';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
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

import { MetricsCollector } from '@/monitoring/metrics-collector';

async function authMiddleware(request: Request, env: Env): Promise<Response | null> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
  const authResult = await requireAuth(request, env, requestOrigin, ErrorMessage.AuthenticationRequired);
  if (authResult instanceof Response) {
    return authResult;
  }
  return null;
}

async function devOnlyMiddleware(request: Request, env: Env): Promise<Response | null> {
  const requestPath = new URL(request.url).pathname;
  const devOnlyMethodMap: Record<string, readonly HttpMethod[] | undefined> = {
    [ApiEndpoint.Test.SeedProducts]: [HttpMethod.Post],
    [ApiEndpoint.Test.SeedAndRedeem]: [HttpMethod.Post],
    [ApiEndpoint.Test.SeedPromo]: [HttpMethod.Post],
    [ApiEndpoint.Test.ClearDebugLogs]: [HttpMethod.Delete],
    [ApiEndpoint.Test.FlushDebugLogs]: [HttpMethod.Post],
    [ApiEndpoint.Test.GetDebugLogs]: [HttpMethod.Get],
    [ApiEndpoint.Test.ClearAll]: [HttpMethod.Delete],
  };
  const allowedMethods = devOnlyMethodMap[requestPath];
  if (allowedMethods) {
    const methodError = rejectUnsupportedMethod(request, env, allowedMethods);
    if (methodError) {
      return methodError;
    }
  }

  if (env.ENVIRONMENT !== Environment.Development) {
    return new Response(JSON.stringify({
      error: ErrorMessage.Forbidden,
      message: ErrorMessage.TestEndpointsDevOnly
    }), {
      status: HttpStatus.Forbidden,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env),
      },
    });
  }
  return null;
}

function withHandlerPath(
  handler: (request: Request, env: Env, handlerPath: string, requestOrigin?: string) => Promise<Response>
): (request: Request, env: Env, context?: { path?: string; url?: URL; requestOrigin?: string }) => Promise<Response> {
  return (request, env, context) =>
    handler(request, env, context?.path ?? new URL(request.url).pathname, context?.requestOrigin);
}

function createMatcherFromSpec(spec: (typeof CloudflareRouteManifest)[number]): (path: string, method: string) => boolean {
  let matcher: (path: string, method: string) => boolean;
  if (spec.match === RouteMatch.Prefix) {
    matcher = pathWithParam(spec.path) as (path: string, method: string) => boolean;
  } else if (spec.match === RouteMatch.Exact) {
    const paths = spec.paths ?? [spec.path];
    matcher = (path: string) => paths.includes(path);
  } else if (spec.match === RouteMatch.PrefixAndIncludes && spec.includes) {
    matcher = combineMatchers(pathWithParam(spec.path), includes(spec.includes));
  } else {
    matcher = exactPath(spec.path) as (path: string, method: string) => boolean;
  }
  return matcher;
}

const HANDLER_MAP: Record<string, RouteHandler> = {
  [CloudflareHandlerKey.Homepage]: handleHomepageRequest,
  [CloudflareHandlerKey.Explore]: (request, env) => {
    const url = new URL(request.url);
    return Promise.resolve(new Response(templates.matchExplorer(url.origin), {
      headers: { [HttpHeader.ContentType]: HttpContentType.TextHtml, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.ExploreLeaderboard]: (request, env) => {
    const url = new URL(request.url);
    return Promise.resolve(new Response(templates.leaderboardExplorer(url.origin), {
      headers: { [HttpHeader.ContentType]: HttpContentType.TextHtml, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.ExploreBenchmark]: (request, env) => {
    const url = new URL(request.url);
    return Promise.resolve(new Response(templates.benchmarkExplorer(url.origin), {
      headers: { [HttpHeader.ContentType]: HttpContentType.TextHtml, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.ExploreMatches]: handleListMatches,
  [CloudflareHandlerKey.ExploreBenchmarks]: handleListBenchmarks,
  [CloudflareHandlerKey.Matches]: withHandlerPath(handleMatchRequest),
  [CloudflareHandlerKey.Anonymize]: withHandlerPath(handleAnonymizeRequest),
  [CloudflareHandlerKey.Disputes]: withHandlerPath(handleDisputeRequest),
  [CloudflareHandlerKey.SignedUrl]: withHandlerPath(handleSignedUrlRequest),
  [CloudflareHandlerKey.Archive]: withHandlerPath(handleArchiveRequest),
  [CloudflareHandlerKey.DataExport]: withHandlerPath(handleDataExportRequest),
  [CloudflareHandlerKey.Data]: withHandlerPath(handleDataDeletionRequest),
  [CloudflareHandlerKey.AI]: withHandlerPath(handleAIRequest),
  [CloudflareHandlerKey.AICatalog]: (request, env) => handleAICatalogRequest(request, env),
  [CloudflareHandlerKey.AIOAuth]: (request, env, context) =>
    handleAIOAuthRequest(request, env, context?.path ?? new URL(request.url).pathname),
  [CloudflareHandlerKey.AIKeys]: (request, env, context) =>
    handleAIKeysRequest(request, env, context?.path ?? new URL(request.url).pathname),
  [CloudflareHandlerKey.AIEscrow]: withHandlerPath(handleAIEscrowRequest),
  [CloudflareHandlerKey.AIGenerate]: withHandlerPath(handleAIGenerateRequest),
  [CloudflareHandlerKey.Leaderboard]: withHandlerPath(handleLeaderboardRequest),
  [CloudflareHandlerKey.Players]: withHandlerPath(handlePlayerRequest),
  [CloudflareHandlerKey.Credits]: withHandlerPath((req, env, path) => handleCreditsRequest(req, env, path)),
  [CloudflareHandlerKey.Badges]: withHandlerPath(handleBadgesRequest),
  [CloudflareHandlerKey.Logs]: (request, env, context: { executionContext?: ExecutionContext } | undefined) =>
    handleLogsRequest(request, env, context?.executionContext),
  [CloudflareHandlerKey.Slices]: withHandlerPath(handleSlicesRequest),
  [CloudflareHandlerKey.Assets]: withHandlerPath(handleAssetsRequest),
  [CloudflareHandlerKey.AssetsManifestUrl]: (request, env) => {
    return Promise.resolve(new Response(JSON.stringify({ error: ErrorMessage.NotFound }), {
      status: HttpStatus.NotFound,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.Test]: withHandlerPath(handleTestRequest),
  [CloudflareHandlerKey.Docs]: (request, env) => {
    const baseUrl = new URL(request.url).origin;
    const html = generateSwaggerHtml(baseUrl);
    return Promise.resolve(new Response(html, {
      headers: { [HttpHeader.ContentType]: HttpContentType.TextHtml, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.Openapi]: (request, env) => {
    const spec = generateOpenApiJson();
    return Promise.resolve(new Response(spec, {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.Health]: (request, env) => {
    logInfo('Health check requested', getStackTrace(), { path: request.url }, true);
    return Promise.resolve(new Response(JSON.stringify({ status: HealthStatus.Ok }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.AppVersion]: (_request, env) => {
    const version = env.APP_VERSION ?? '0.1.0';
    return Promise.resolve(new Response(JSON.stringify({ version }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }));
  },
  [CloudflareHandlerKey.ImageProxy]: (request, env, context: { requestOrigin?: string } | undefined) =>
    handleImageProxyRequest(request, env, context?.requestOrigin),
  [CloudflareHandlerKey.Sync]: withHandlerPath(handleSyncRequest),
  [CloudflareHandlerKey.Replay]: withHandlerPath(handleReplayRequest),
  [CloudflareHandlerKey.Transparency]: withHandlerPath(handleTransparencyRequest),
  [CloudflareHandlerKey.Ws]: withHandlerPath(handleWsRequest),
  [CloudflareHandlerKey.Payment]: withHandlerPath(handlePaymentRequest),
  [CloudflareHandlerKey.StripeWebhook]: (request, env) => handleStripeWebhookRequest(request, env),
  [CloudflareHandlerKey.Lobby]: withHandlerPath(handleLobbyRequest),
  [CloudflareHandlerKey.Matchmaking]: withHandlerPath(handleMatchmakingRequest),
  [CloudflareHandlerKey.Presence]: withHandlerPath(handlePresenceRequest),
  [CloudflareHandlerKey.Friends]: withHandlerPath(handleFriendsRequest),
  [CloudflareHandlerKey.Audit]: withHandlerPath(handleAuditRequest),
  [CloudflareHandlerKey.Compliance]: withHandlerPath(handleComplianceRequest),
  [CloudflareHandlerKey.Progression]: withHandlerPath(handleProgressionRequest),
  [CloudflareHandlerKey.Reward]: withHandlerPath(handleRewardRequest),
  [CloudflareHandlerKey.Personalization]: withHandlerPath(handlePersonalizationRequest),
  [CloudflareHandlerKey.Analytics]: withHandlerPath(handleAnalyticsRequest),
  [CloudflareHandlerKey.Security]: withHandlerPath(handleSecurityRequest),
  [CloudflareHandlerKey.Fraud]: withHandlerPath(handleFraudRequest),
  [CloudflareHandlerKey.AntiCheat]: withHandlerPath(handleAntiCheatRequest),
  [CloudflareHandlerKey.Profile]: withHandlerPath(handleProfileRequest),
  [CloudflareHandlerKey.Message]: withHandlerPath(handleMessageRequest),
  [CloudflareHandlerKey.Feed]: withHandlerPath(handleFeedRequest),
  [CloudflareHandlerKey.Party]: withHandlerPath(handlePartyRequest),
  [CloudflareHandlerKey.Notification]: withHandlerPath(handleNotificationRequest),
  [CloudflareHandlerKey.Discovery]: withHandlerPath(handleDiscoveryRequest),
  [CloudflareHandlerKey.Inventory]: withHandlerPath(handleInventoryRequest),
  [CloudflareHandlerKey.Marketplace]: withHandlerPath(handleMarketplaceRequest),
  [CloudflareHandlerKey.Tournament]: withHandlerPath(handleTournamentRequest),
  [CloudflareHandlerKey.Settings]: withHandlerPath(handleSettingsRequest),
  [CloudflareHandlerKey.Admin]: withHandlerPath(handleAdminRequest),
  [CloudflareHandlerKey.AdminProducts]: withHandlerPath(handleAdminProductRequest),
  [CloudflareHandlerKey.Shop]: withHandlerPath(handleShopRequest),
  [CloudflareHandlerKey.HealthDetail]: withHandlerPath(handleHealthDetailRequest),
};

export function createRouter(metricsCollector: MetricsCollector): Router {
  const router = new Router();

  const metricsHandler: (request: Request, env: Env) => Promise<Response> = (request, env) => {
    const methodError = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
    if (methodError) {
      return Promise.resolve(methodError);
    }
    const metrics = metricsCollector.getMetrics();
    const alerts = checkAlertThresholds(metrics);
    emitMetrics(metrics, env).catch(err =>
      logError(ErrorMessage.FailedToEmitMetrics, getStackTrace(), err)
    );
    return Promise.resolve(new Response(JSON.stringify({ metrics, alerts }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }));
  };

  const alertsHandler: (request: Request, env: Env) => Promise<Response> = (request, env) => {
    const methodError = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
    if (methodError) {
      return Promise.resolve(methodError);
    }
    const metrics = metricsCollector.getMetrics();
    const alerts = checkAlertThresholds(metrics);
    if (alerts.length > 0 && env.ALERT_WEBHOOK_URL) {
      emitMetrics(metrics, env).catch(err =>
        logError(ErrorMessage.FailedToSendAlerts, err)
      );
    }
    return Promise.resolve(new Response(JSON.stringify({ alerts }), {
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    }));
  };

  const handlerMap: Record<string, RouteHandler> = {
    ...HANDLER_MAP,
    [CloudflareHandlerKey.Metrics]: metricsHandler,
    [CloudflareHandlerKey.Alerts]: alertsHandler,
  };

  for (const spec of CloudflareRouteManifest) {
    const handler = handlerMap[spec.handlerKey];
    if (!handler) {
      throw new Error(`No handler for route manifest key: ${spec.handlerKey}`);
    }
    const matcher = createMatcherFromSpec(spec);
    const middleware: ((request: Request, env: Env) => Promise<Response | null>)[] = [];
    if (spec.middleware?.includes(MiddlewareKey.Auth)) {
      middleware.push(authMiddleware);
    }
    if (spec.middleware?.includes(MiddlewareKey.DevOnly)) {
      middleware.push(devOnlyMiddleware);
    }
    router.add({
      matcher,
      handler,
      middleware: middleware.length > 0 ? middleware : undefined,
      priority: spec.priority,
      allowedMethods: spec.method ? [spec.method] : undefined,
    });
  }

  return router;
}
