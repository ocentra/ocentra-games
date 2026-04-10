import type { Env } from '@/constants/env';
import { extractTokenFromHeader, verifyAuth } from '@/utils/auth';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getFirestoreUserUrl } from '@/utils/firebase';
import { HttpHeader, HttpContentType, HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestTokenPrefix } from '@ocentra/endpoint-domain/constants/auth';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { KvKeyPrefix, CacheLimits } from '@/constants/rate-limit';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { consumeResponseBody } from '@/utils/consume-response-body';
import { getFirestoreAuthHeader } from '@/utils/firebase-service-auth';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_KV_CACHE_OPERATIONS = false;

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

interface AdminCacheEntry {
  isAdmin: boolean;
  cachedAt: number;
  lastAccessed: number;
}

const adminCache = new Map<string, AdminCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = CacheLimits.AdminCacheMaxSize;
const EVICTION_SIZE = Math.max(1, Math.floor(MAX_CACHE_SIZE * 0.2));

export async function checkAdminStatus(
  request: Request,
  env: Env
): Promise<{ isAdmin: boolean; userId: string; error?: string }> {
  const isDevWithAuthDisabled = (
    env.ENVIRONMENT === Environment.Development &&
    env.DISABLE_AUTH === QueryValue.True
  );

  if (isDevWithAuthDisabled) {
    return { isAdmin: true, userId: 'dev-admin' };
  }

  const authHeader = request.headers.get(HttpHeader.Authorization);
  const token = extractTokenFromHeader(authHeader);

  if (env.TEST_MODE === QueryValue.True && token?.match(new RegExp(`^${TestTokenPrefix.Test}[^:]+:admin$`))) {
    const userId = token.slice(TestTokenPrefix.Test.length, token.lastIndexOf(':admin'));
    return { isAdmin: true, userId };
  }

  if (!env.FIREBASE_PROJECT_ID) {
    return { isAdmin: false, userId: '', error: ErrorMessage.FirebaseNotConfigured };
  }

  const authResult = await verifyAuth(request, env.FIREBASE_PROJECT_ID, env);
  if (authResult.error || !authResult.userId) {
    return { isAdmin: false, userId: '', error: authResult.error || ErrorMessage.AuthenticationRequired };
  }

  const userId = authResult.userId;

  if (env.TEST_MODE === QueryValue.True) {
    if (env.ADMIN_USER_IDS) {
      const adminUserIds = env.ADMIN_USER_IDS.split(',').map(id => id.trim());
      const isAdmin = adminUserIds.includes(userId);
      return { isAdmin, userId };
    }
    return { isAdmin: false, userId };
  }

  const cached = adminCache.get(userId);
  const now = Date.now();
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    cached.lastAccessed = now;
    return { isAdmin: cached.isAdmin, userId };
  }

      if (env.ADMIN_CACHE_KV) {
        try {
          const kvKey = `${KvKeyPrefix.Admin}${userId}`;
          const kvCached = await env.ADMIN_CACHE_KV.get(kvKey, 'json') as { isAdmin: boolean; cachedAt: number } | null;
          if (kvCached && now - kvCached.cachedAt < CACHE_TTL_MS) {
            adminCache.set(userId, { isAdmin: kvCached.isAdmin, cachedAt: kvCached.cachedAt, lastAccessed: now });
            return { isAdmin: kvCached.isAdmin, userId };
          }
        } catch (error) {
          logWarn(ErrorMessage.FailedToGetAdminStatusFromKvCache, getStackTrace(), error, LOG_KV_CACHE_OPERATIONS);
        }
      }

  try {
    const projectId = env.FIREBASE_PROJECT_ID;
    const firestoreUrl = getFirestoreUserUrl(projectId, userId);

    const authHeader = await getFirestoreAuthHeader(env);
    if (!authHeader) {
      return { isAdmin: false, userId, error: ErrorMessage.FirebaseNotConfigured };
    }

    const response = await fetch(firestoreUrl, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Authorization]: authHeader,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
    });

    if (!response.ok) {
      await consumeResponseBody(response);
      if (response.status === HttpStatus.NotFound) {
        return { isAdmin: false, userId, error: ErrorMessage.UserDocumentNotFound };
      }
      return { isAdmin: false, userId, error: `${ErrorMessage.FirestoreErrorPrefix} ${response.status}` };
    }

    const data = await response.json() as {
      fields?: {
        isAdmin?: {
          booleanValue?: boolean;
        };
      };
    };
    const isAdmin = data.fields?.isAdmin?.booleanValue === true || false;
    const cachedAt = now;

    if (adminCache.size >= MAX_CACHE_SIZE) {
      const entries = Array.from(adminCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      for (let i = 0; i < EVICTION_SIZE && i < entries.length; i++) {
        adminCache.delete(entries[i][0]);
      }
    }

    adminCache.set(userId, { isAdmin, cachedAt, lastAccessed: now });

    if (env.ADMIN_CACHE_KV) {
      env.ADMIN_CACHE_KV.put(`${KvKeyPrefix.Admin}${userId}`, JSON.stringify({
        isAdmin,
        cachedAt
      }), { expirationTtl: CacheLimits.AdminCacheTtlSeconds }).catch((error) => {
        logWarn(ErrorMessage.FailedToCacheAdminStatusInKv, getStackTrace(), error, LOG_KV_CACHE_OPERATIONS);
      });
    }

    return { isAdmin, userId };
  } catch (error) {
    return {
      isAdmin: false,
      userId,
      error: error instanceof Error ? error.message : ErrorMessage.FailedToCheckAdminStatus,
    };
  }
}
