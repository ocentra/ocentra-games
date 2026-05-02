import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { validateSchemaBody } from '@/utils/schema-validation';
import { requireAuth } from '@/utils/auth-middleware';
import {
  HttpStatus,
  HttpHeader,
  HttpContentType,
  HttpMethod,
} from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  CreditsDO as CreditsDOPaths,
  DOBaseUrl,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import {
  AIEscrowReserveRequestSchema,
  AIEscrowConsumeRequestSchema,
} from '@ocentra/endpoint-domain/schemas/ai-escrow';
import { getCatalogFromEnv, calculateAICost } from '@/data/ai-catalog';
import { ESCROW_TIMEOUT_MS, ESCROW_BUFFER, AC_PER_USD } from '@/constants/ai-escrow';
import { DEFAULT_PLAN_TIERS, getAllowanceRemaining, isPeriodExpired, type UserPlanState } from '@/config/plan-tiers';
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

const cors = (env: Env) => ({ [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) });

async function doFetch(
  stub: DurableObjectStub,
  path: string,
  options: { method?: string; body?: string } = {}
): Promise<Response> {
  const url = `${DOBaseUrl}${path}`;
  const res = await stub.fetch(url, {
    method: options.method ?? HttpMethod.Get,
    body: options.body,
    headers: options.body ? { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } : undefined,
  });
  const body = await res.text().catch(() => '');
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export async function handleAIEscrowRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  logInfo('AI escrow request', getStackTrace(), { path, method: request.method });
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    logWarn('AI escrow auth rejected', getStackTrace(), { path });
    return authResult;
  }
  const userId = authResult.userId;

  if (!env.CREDITS_DO) {
    logError('AI escrow: Credits DO not configured', getStackTrace(), { path });
    return new Response(JSON.stringify({ error: 'Credits service unavailable' }), {
      status: HttpStatus.ServiceUnavailable,
      headers: cors(env),
    });
  }

  const creditsStub = env.CREDITS_DO.get(env.CREDITS_DO.idFromName(userId));

  if (path === ApiEndpoint.AI.EscrowReserve && request.method === HttpMethod.Post) {
    const validation = await validateSchemaBody(request, env, AIEscrowReserveRequestSchema);
      if (validation.errorResponse) return validation.errorResponse;
      const { modelVersion, estimatedInputTokens, estimatedOutputTokens, idempotencyKey } = validation.data!;
    if (!modelVersion?.trim()) {
      return new Response(JSON.stringify({ error: 'Invalid or missing model version' }), {
        status: HttpStatus.BadRequest,
        headers: cors(env),
      });
    }
    const catalog = await getCatalogFromEnv(env);
    if (!catalog.pricing[modelVersion]) {
      return new Response(JSON.stringify({ error: 'Unknown model for pricing', modelVersion }), {
        status: HttpStatus.NotFound,
        headers: cors(env),
      });
    }
    const estimatedCost = calculateAICost(catalog, modelVersion, estimatedInputTokens, estimatedOutputTokens);
    const expiresAt = Date.now() + ESCROW_TIMEOUT_MS;
    const estimatedTokens = estimatedInputTokens + estimatedOutputTokens;
    const planRes = await doFetch(creditsStub, CreditsDOPaths.PlanStateGet, { method: HttpMethod.Get });
    const planData = planRes.ok ? (await planRes.json().catch(() => null)) as UserPlanState | { tier: null } | null : (await planRes.text().catch(() => undefined), null);
    const plan = planData && planData.tier != null && typeof (planData as UserPlanState).periodStart === 'number' ? (planData as UserPlanState) : null;
    const tierConfig = plan ? DEFAULT_PLAN_TIERS[plan.tier] : null;
    const now = Date.now();
    const stateForAllowance = plan && !isPeriodExpired(plan.periodStart, now) ? plan : plan ? { ...plan, periodStart: now, tokensUsedThisPeriod: 0 } : null;
    const allowanceRemaining = stateForAllowance && tierConfig ? getAllowanceRemaining(stateForAllowance, tierConfig, now) : 0;
    if (plan && tierConfig && allowanceRemaining >= estimatedTokens) {
      const res = await doFetch(creditsStub, CreditsDOPaths.EscrowReserve, {
        method: HttpMethod.Post,
        body: JSON.stringify({
          userId,
          reservedAmount: 0,
          modelVersion,
          expiresAt,
          idempotencyKey,
          useAllowance: true,
          estimatedTokens,
        }),
      });
      const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string; escrowId?: string; reservedAmount?: number; expiresAt?: number; already_processed?: boolean };
      if (!res.ok) {
        logWarn('AI escrow reserve (allowance): Credits DO rejected', getStackTrace(), { path, status: res.status, data });
        return new Response(JSON.stringify(data), { status: res.status, headers: cors(env) });
      }
      logInfo('AI escrow reserve (allowance) success', getStackTrace(), { userId, escrowId: data.escrowId });
      return new Response(JSON.stringify({
        escrowId: data.escrowId,
        reservedAmount: 0,
        expiresAt: data.expiresAt,
        useAllowance: true,
        ...(data.already_processed !== undefined && { already_processed: data.already_processed }),
      }), { status: HttpStatus.Ok, headers: cors(env) });
    }
    const reservedAmount = Math.max(1, Math.ceil(estimatedCost * ESCROW_BUFFER * AC_PER_USD));
    const res = await doFetch(creditsStub, CreditsDOPaths.EscrowReserve, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        userId,
        reservedAmount,
        modelVersion,
        expiresAt,
        idempotencyKey,
      }),
    });
    const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string; escrowId?: string; reservedAmount?: number; expiresAt?: number; already_processed?: boolean };
    if (!res.ok) {
      logWarn('AI escrow reserve: Credits DO rejected', getStackTrace(), { path, status: res.status, data });
      return new Response(JSON.stringify(data), { status: res.status, headers: cors(env) });
    }
    logInfo('AI escrow reserve success', getStackTrace(), { userId, escrowId: data.escrowId, reservedAmount: data.reservedAmount });
    return new Response(JSON.stringify({
      escrowId: data.escrowId,
      reservedAmount: data.reservedAmount,
      expiresAt: data.expiresAt,
      ...(data.already_processed !== undefined && { already_processed: data.already_processed }),
    }), { status: HttpStatus.Ok, headers: cors(env) });
  }

  if (path === ApiEndpoint.AI.EscrowConsume && request.method === HttpMethod.Post) {
    const validationConsume = await validateSchemaBody(request, env, AIEscrowConsumeRequestSchema);
      if (validationConsume.errorResponse) return validationConsume.errorResponse;
      const { escrowId, actualInputTokens, actualOutputTokens } = validationConsume.data!;
    const getRes = await doFetch(creditsStub, CreditsDOPaths.EscrowGet(escrowId));
    const escrow = (await getRes.json().catch(() => null)) as { modelVersion?: string } | null;
    if (!getRes.ok || !escrow?.modelVersion) {
      logWarn('AI escrow consume: escrow not found', getStackTrace(), { path, escrowId, getStatus: getRes.ok });
      return new Response(JSON.stringify({ error: 'Escrow not found' }), {
        status: HttpStatus.NotFound,
        headers: cors(env),
      });
    }
    const catalogConsume = await getCatalogFromEnv(env);
    const actualCost = Math.max(0, Math.ceil(calculateAICost(catalogConsume, escrow.modelVersion, actualInputTokens, actualOutputTokens) * AC_PER_USD));
    const settleRes = await doFetch(creditsStub, CreditsDOPaths.EscrowSettle, {
      method: HttpMethod.Post,
      body: JSON.stringify({ escrowId, actualCost, promptHash: '' }),
    });
    const settleData = await settleRes.json().catch(() => ({})) as { success?: boolean; charged?: number; refunded?: number; new_balance?: number; error?: string };
    if (!settleRes.ok) {
      logWarn('AI escrow consume: settle rejected', getStackTrace(), { path, escrowId, status: settleRes.status, settleData });
      return new Response(JSON.stringify(settleData), { status: settleRes.status, headers: cors(env) });
    }
    logInfo('AI escrow consume success', getStackTrace(), { userId, escrowId, charged: settleData.charged, newBalance: settleData.new_balance });
    return new Response(JSON.stringify({
      charged: settleData.charged,
      refunded: settleData.refunded,
      newBalance: settleData.new_balance,
    }), { status: HttpStatus.Ok, headers: cors(env) });
  }

  logDebug('AI escrow path not matched', getStackTrace(), { path });
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: cors(env),
  });
}
