import type { Env } from '@/constants/env';
import { validateSchemaBody } from '@/utils/schema-validation';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { checkAdminStatus } from '@/utils/admin-check';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { KvKeyPrefix } from '@ocentra/boundary-domain/constants/kv-key-prefixes';
import { getCatalogFromEnv, saveCatalogToKV } from '@/data/ai-catalog';
import type { AICatalogProviderEntry } from '@/data/ai-catalog-types';
import { AuditTrailService } from '@/services/AuditTrailService';
import { getFirestoreUsersCollectionUrl, getFirestoreAdminActivityCollectionUrl, getFirestoreUserUrl } from '@/utils/firebase';
import { getFirestoreAuthHeader } from '@/utils/firebase-service-auth';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import {
  LOG_ADMIN_AUTH,
  OPENAPI_USER_ID_PATTERN,
  doFetch,
  isAdminAuthTraceRequest,
  stubJson,
} from '@/handlers/feature-handlers-helpers';
import {
  AdminAICatalogRequestSchema,
  AdminBaseRequestSchema,
  AdminCreditsPlanRequestSchema,
  AdminModerationReportRequestSchema,
  AdminModerationResolveRequestSchema,
  AdminUserStatusRequestSchema,
  ComplianceReportRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { CreditsDO as CreditsDOPaths } from '@ocentra/endpoint-domain/constants/cloudflare-do';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: ReturnType<typeof getStackTrace>, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: ReturnType<typeof getStackTrace>, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

async function handleAdminModerationReportRequest(request: Request, env: Env, kv: KVNamespace | undefined): Promise<Response> {
  if (!kv) return stubJson(env, { error: 'Moderation not configured' }, HttpStatus.ServiceUnavailable);
  const { data: modReportData, errorResponse: modReportErr } = await validateSchemaBody(request.clone(), env, AdminModerationReportRequestSchema);
  if (modReportErr) return modReportErr;
  const body = modReportData! as { reporterId: string; targetId: string; reason: string; category?: string };
  const { reporterId, targetId, reason } = body;
  if (!reporterId || !targetId || !reason) return stubJson(env, { error: 'reporterId, targetId, reason required' }, HttpStatus.BadRequest);
  const reportId = crypto.randomUUID();
  await kv.put(`${KvKeyPrefix.ReportPending}${reportId}`, JSON.stringify({ reportId, reporterId, targetId, reason, category: body.category ?? 'other', createdAt: Date.now() }));
  return stubJson(env, { reportId, submitted: true });
}

async function handleAdminUserStatusRequest(request: Request, env: Env, adminCheck: { userId: string }, path: string): Promise<Response> {
  const adminPathParts = extractPathParts(path, ApiEndpoint.Admin.Base);
  const targetUserId = adminPathParts[1];
  if (!targetUserId || !OPENAPI_USER_ID_PATTERN.test(targetUserId)) {
    return stubJson(env, { error: 'Target user ID is required' }, HttpStatus.BadRequest);
  }
  const { data, errorResponse: bodyResultError } = await validateSchemaBody(request, env, AdminUserStatusRequestSchema);
  if (bodyResultError) return bodyResultError;
  const body = data!;
  if (typeof body.isAdmin !== 'boolean') {
    return stubJson(env, { error: 'isAdmin must be boolean' }, HttpStatus.BadRequest);
  }
  if (env.TEST_MODE === QueryValue.True) {
    return stubJson(env, { success: true });
  }
  if (!env.FIREBASE_PROJECT_ID) {
    return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
  }
  const authHeader = await getFirestoreAuthHeader(env);
  if (!authHeader) {
    return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
  }
  const targetUserUrl = getFirestoreUserUrl(env.FIREBASE_PROJECT_ID, targetUserId);
  const updateUrl = `${targetUserUrl}?updateMask.fieldPaths=isAdmin&updateMask.fieldPaths=updatedAt`;
  const updateResponse = await fetch(updateUrl, {
    method: HttpMethod.Patch,
    headers: {
      [HttpHeader.Authorization]: authHeader,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({
      fields: {
        isAdmin: { booleanValue: body.isAdmin },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!updateResponse.ok) {
    const errorBody = await updateResponse.text().catch(() => '');
    logWarn('Admin user status update failed', getStackTrace(), { status: updateResponse.status, errorBody, targetUserId }, true);
    return stubJson(env, { error: `${ErrorMessage.FirestoreErrorPrefix} ${updateResponse.status}` }, updateResponse.status);
  }
  await updateResponse.text().catch(() => undefined);

  const adminActivityUrl = getFirestoreAdminActivityCollectionUrl(env.FIREBASE_PROJECT_ID);
  const activityResponse = await fetch(adminActivityUrl, {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.Authorization]: authHeader,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({
      fields: {
        callerId: { stringValue: adminCheck.userId },
        targetUserId: { stringValue: targetUserId },
        action: { stringValue: body.isAdmin ? 'grant_admin' : 'revoke_admin' },
        timestamp: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!activityResponse.ok) {
    const errorBody = await activityResponse.text().catch(() => '');
    logWarn('Admin activity write failed after status update', getStackTrace(), { status: activityResponse.status, errorBody, targetUserId }, true);
  } else {
    await activityResponse.text().catch(() => undefined);
  }
  return stubJson(env, { success: true });
}

async function handleAdminDashboardDataRequest(env: Env, adminCheck: { userId: string }, adminAuthTraceEnabled: boolean): Promise<Response> {
  logInfo(
    '[AdminAuthFlow:K] admin dashboard authorized',
    getStackTrace(),
    {
      path: ApiEndpoint.Admin.DashboardData,
      userId: adminCheck.userId,
    },
    adminAuthTraceEnabled
  );
  const authHeader = await getFirestoreAuthHeader(env);
  if (!env.FIREBASE_PROJECT_ID || !authHeader) {
    if (env.TEST_MODE === 'true') {
      return stubJson(env, { users: [], activity: [] });
    }
    return stubJson(env, { error: ErrorMessage.FirebaseNotConfigured }, HttpStatus.ServiceUnavailable);
  }

  const usersUrl = getFirestoreUsersCollectionUrl(env.FIREBASE_PROJECT_ID);
  const usersResponse = await fetch(usersUrl, {
    method: HttpMethod.Get,
    headers: {
      [HttpHeader.Authorization]: authHeader,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
  });

  if (!usersResponse.ok) {
    const errorBody = await usersResponse.text().catch(() => '');
    logWarn('Admin dashboard users fetch failed', getStackTrace(), { status: usersResponse.status, errorBody }, true);
    return stubJson(env, { error: `${ErrorMessage.FirestoreErrorPrefix} ${usersResponse.status}` }, usersResponse.status);
  }

  const usersData = await usersResponse.json().catch(() => ({} as Record<string, unknown>)) as {
    documents?: Array<{ name?: string; fields?: Record<string, { stringValue?: string; booleanValue?: boolean; timestampValue?: string }> }>;
  };

  const users = (usersData.documents ?? []).map((doc) => {
    const fields = doc.fields ?? {};
    const uid = (doc.name ?? '').split('/').pop() ?? '';
    const email = fields.email?.stringValue ?? '';
    const displayName = (fields.displayName?.stringValue ?? email) || 'Unknown User';
    const isAdmin = fields.isAdmin?.booleanValue === true;
    const photoURL = fields.photoURL?.stringValue;
    const lastLoginAt = fields.lastLoginAt?.timestampValue ? Date.parse(fields.lastLoginAt.timestampValue) : undefined;
    return { uid, email, displayName, isAdmin, photoURL, lastLogin: Number.isNaN(lastLoginAt) ? undefined : lastLoginAt };
  });

  const activityUrl = getFirestoreAdminActivityCollectionUrl(env.FIREBASE_PROJECT_ID);
  const activityResponse = await fetch(`${activityUrl}?pageSize=50`, {
    method: HttpMethod.Get,
    headers: {
      [HttpHeader.Authorization]: authHeader,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
  });

  const userEmailById = new Map(users.map((item) => [item.uid, item.email]));
  let activity: Array<{ timestamp: number; adminEmail: string; action: string; targetEmail: string; targetUid: string }> = [];
  if (activityResponse.ok) {
    const activityData = await activityResponse.json().catch(() => ({} as Record<string, unknown>)) as {
      documents?: Array<{ fields?: Record<string, { stringValue?: string; timestampValue?: string }> }>;
    };
    activity = (activityData.documents ?? []).map((doc) => {
      const fields = doc.fields ?? {};
      const callerId = fields.callerId?.stringValue ?? '';
      const targetUserId = fields.targetUserId?.stringValue ?? '';
      const actionRaw = fields.action?.stringValue ?? '';
      const timestampRaw = fields.timestamp?.timestampValue;
      const timestamp = timestampRaw ? Date.parse(timestampRaw) : Date.now();
      const action = actionRaw === 'grant_admin' || actionRaw === 'grant' ? 'grant' : 'revoke';
      return {
        timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp,
        adminEmail: userEmailById.get(callerId) ?? 'unknown',
        action,
        targetEmail: userEmailById.get(targetUserId) ?? 'unknown',
        targetUid: targetUserId,
      };
    });
    activity.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    const errorBody = await activityResponse.text().catch(() => '');
    logWarn('Admin dashboard activity fetch failed', getStackTrace(), { status: activityResponse.status, errorBody }, true);
  }

  return stubJson(env, { users, activity });
}

async function handleAdminModerationQueueRequest(env: Env, kv: KVNamespace | undefined): Promise<Response> {
  if (!kv) return stubJson(env, { reports: [] });
  const list = await kv.list({ prefix: KvKeyPrefix.ReportPending, limit: 100 });
  const reports: unknown[] = [];
  for (const key of list.keys) {
    const raw = await kv.get(key.name);
    if (raw) {
      try {
        reports.push(JSON.parse(raw));
      } catch {
        void 0;
      }
    }
  }
  return stubJson(env, { reports });
}

async function handleAdminModerationResolveRequest(request: Request, env: Env, kv: KVNamespace | undefined, path: string): Promise<Response> {
  const parts = extractPathParts(path, ApiEndpoint.Admin.Base);
  const reportId = parts[0] === 'moderation' && parts[2] === 'resolve' ? parts[1] : null;
  const reportKey = reportId ? `${KvKeyPrefix.ReportPending}${reportId}` : '';
  if (!kv || !reportId) return stubJson(env, { error: 'Report ID required' }, HttpStatus.BadRequest);
  const { data, errorResponse: bodyResultError } = await validateSchemaBody(request, env, AdminModerationResolveRequestSchema);
  if (bodyResultError) return bodyResultError;
  const body = data!;
  const raw = await kv.get(reportKey);
  if (!raw) return stubJson(env, { error: 'Report not found' }, HttpStatus.NotFound);
  const report = JSON.parse(raw) as Record<string, unknown>;
  await kv.delete(reportKey);
  await kv.put(`${KvKeyPrefix.ReportResolved}${reportId}`, JSON.stringify({ ...report, resolvedAt: Date.now(), action: body.action, moderatorId: body.moderatorId }));
  return stubJson(env, { resolved: true, reportId });
}

export async function handleHealthDetailRequest(request: Request, env: Env, _path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get]);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) return authResult;
  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
      status: HttpStatus.Forbidden,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  const checks: Record<string, { status: string; latencyMs?: number }> = {};
  if (env.RATE_LIMIT_KV) {
    const t0 = Date.now();
    try {
      await env.RATE_LIMIT_KV.get(KvKeyPrefix.HealthPing);
      checks.kv = { status: 'ok', latencyMs: Date.now() - t0 };
    } catch {
      checks.kv = { status: 'error' };
    }
  } else {
    checks.kv = { status: 'not_configured' };
  }
  if (env.LOBBY_DO) checks.lobbyDo = { status: 'bound' };
  if (env.CREDITS_DO) checks.creditsDo = { status: 'bound' };
  if (env.AUDIT_LOG_DO) checks.auditLogDo = { status: 'bound' };
  if (env.PENALTY_DO) checks.penaltyDo = { status: 'bound' };
  return stubJson(env, { status: 'ok', version: '1.0', checks });
}

export async function handleComplianceRequest(request: Request, env: Env, _path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post]);
  if (methodCheck) return methodCheck;
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required for compliance');
  if (authResult instanceof Response) return authResult;

  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
      status: HttpStatus.Forbidden,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const auditService = new AuditTrailService(env);
  let body: { startDate?: string; endDate?: string; reportType?: 'pci' | 'gdpr' | 'soc2' } = {};

  if (request.method === HttpMethod.Post) {
    const { data, errorResponse } = await validateSchemaBody(request.clone(), env, ComplianceReportRequestSchema);
    if (errorResponse) return errorResponse;
    body = data! as typeof body;
  } else {
    const url = new URL(request.url);
    body.startDate = url.searchParams.get('startDate') || undefined;
    body.endDate = url.searchParams.get('endDate') || undefined;
    body.reportType = (url.searchParams.get('reportType') as typeof body.reportType) || undefined;
  }

  const startDate = body.startDate ? new Date(body.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = body.endDate ? new Date(body.endDate) : new Date();
  const reportType = body.reportType || 'soc2';

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response(JSON.stringify({ error: 'Invalid date format' }), {
      status: HttpStatus.BadRequest,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }

  const result = await auditService.generateComplianceReport(startDate, endDate, reportType);
  return new Response(JSON.stringify(result), {
    status: result.error ? HttpStatus.InternalServerError : HttpStatus.Ok,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}

async function handleAdminTransparencyDashboardRequest(env: Env, adminCheck: { userId: string }): Promise<Response> {
  const audit = new AuditTrailService(env);
  const { events, total, error } = await audit.queryEvents(adminCheck.userId, 'admin', {
    actorId: 'system',
    category: 'transparency',
    limit: 50,
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  });
  if (error) return stubJson(env, { error, verifications: [] }, HttpStatus.InternalServerError);
  return stubJson(env, { verifications: events, total });
}

async function handleAdminCreditsPlanRequest(request: Request, env: Env): Promise<Response> {
  if (!env.CREDITS_DO) {
    return stubJson(env, { error: 'Credits DO not configured' }, HttpStatus.ServiceUnavailable);
  }
  const { data: planBody, errorResponse: bodyResultError } = await validateSchemaBody(request, env, AdminCreditsPlanRequestSchema);
  if (bodyResultError) return bodyResultError;
  const { userId, tier } = planBody!;
  if (!userId || !tier) {
    return stubJson(env, { error: 'userId and tier required' }, HttpStatus.BadRequest);
  }
  const creditsStub = env.CREDITS_DO.get(env.CREDITS_DO.idFromName(userId));
  const res = await doFetch(creditsStub, CreditsDOPaths.PlanStateSet, {
    method: HttpMethod.Post,
    body: JSON.stringify({ tier }),
  });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify(data), { status: res.status, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) } });
}

async function handleAdminAICatalogRequest(request: Request, env: Env): Promise<Response> {
  if (!env.AI_CATALOG_KV) {
    return stubJson(env, { error: 'AI catalog KV not configured' }, HttpStatus.ServiceUnavailable);
  }
  const { data: body, errorResponse: bodyResultError } = await validateSchemaBody(request, env, AdminAICatalogRequestSchema);
  if (bodyResultError) return bodyResultError;
  const toMerge: AICatalogProviderEntry[] = (body!.providers
    ? body!.providers
    : body!.provider
      ? [body!.provider]
      : []) as unknown as AICatalogProviderEntry[];
  if (toMerge.length === 0) {
    return stubJson(env, { ok: true, providers: (await getCatalogFromEnv(env)).providers.length });
  }
  const catalog = await getCatalogFromEnv(env);
  const byId = new Map(catalog.providers.map((p) => [p.id, p]));
  for (const p of toMerge) {
    if (p?.id && typeof p.id === 'string') {
      byId.set(p.id, p as AICatalogProviderEntry);
    }
  }
  const merged: typeof catalog = {
    ...catalog,
    providers: Array.from(byId.values()),
  };
  await saveCatalogToKV(env, merged);
  return stubJson(env, { ok: true, providers: merged.providers.length });
}

export async function handleAdminRequest(request: Request, env: Env, path: string): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post, HttpMethod.Patch]);
  if (methodCheck) return methodCheck;
  const adminAuthTraceEnabled = isAdminAuthTraceRequest(request);
  logInfo(
    '[AdminAuthFlow:H] admin handler entered',
    getStackTrace(),
    {
      path,
      method: request.method,
      hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
    },
    adminAuthTraceEnabled
  );
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    logWarn(
      '[AdminAuthFlow:I] admin request rejected by requireAuth',
      getStackTrace(),
      {
        path,
        status: authResult.status,
        hasAuthorizationHeader: Boolean(request.headers.get(HttpHeader.Authorization)),
      },
      adminAuthTraceEnabled || LOG_ADMIN_AUTH
    );
    return authResult;
  }
  const kv = env.MODERATION_KV;
  if (path.includes('moderation/report') && request.method === HttpMethod.Post) {
    return handleAdminModerationReportRequest(request, env, kv);
  }
  const adminCheck = await checkAdminStatus(request, env);
  if (!adminCheck.isAdmin) {
    logWarn(
      '[AdminAuthFlow:J] admin request rejected by adminCheck',
      getStackTrace(),
      {
        path,
        userId: adminCheck.userId,
        error: adminCheck.error,
      },
      adminAuthTraceEnabled || LOG_ADMIN_AUTH
    );
    return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
      status: HttpStatus.Forbidden,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
    });
  }
  if (path === ApiEndpoint.Admin.Base && request.method === HttpMethod.Post) {
    const { errorResponse } = await validateSchemaBody(request.clone(), env, AdminBaseRequestSchema);
    if (errorResponse) return errorResponse;
  }
  const adminPathParts = extractPathParts(path, ApiEndpoint.Admin.Base);
  if (adminPathParts[0] === 'users' && adminPathParts[2] === 'status' && request.method === HttpMethod.Post) {
    return handleAdminUserStatusRequest(request, env, adminCheck, path);
  }
  if (path === ApiEndpoint.Admin.DashboardData && request.method === HttpMethod.Get) {
    return handleAdminDashboardDataRequest(env, adminCheck, adminAuthTraceEnabled);
  }
  if (path.includes('moderation/queue') && request.method === HttpMethod.Get) {
    return handleAdminModerationQueueRequest(env, kv);
  }
  if (path.includes('moderation/') && path.includes('/resolve') && request.method === HttpMethod.Post) {
    return handleAdminModerationResolveRequest(request, env, kv, path);
  }
  if (path.includes('transparency/dashboard') && request.method === HttpMethod.Get) {
    return handleAdminTransparencyDashboardRequest(env, adminCheck);
  }
  if (path.includes('credits/plan') && request.method === HttpMethod.Post) {
    return handleAdminCreditsPlanRequest(request, env);
  }
  if (path.includes('ai/catalog') && request.method === HttpMethod.Patch) {
    return handleAdminAICatalogRequest(request, env);
  }
  return stubJson(env, { ok: true });
}
