import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { validateSchemaBody } from '@/utils/schema-validation';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { UserKeysDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import {
  AIKeysStoreCustomRequestSchema,
  AIKeysStoreRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts';
import { fetchFromDO } from '@/utils/durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { decryptKey, encryptKey, importMasterKey } from '@/logic/ai-keys';
import { testProviderKey } from '@/data/provider-test-endpoints';
import { getCatalogFromEnv } from '@/data/ai-catalog';
import { Logger } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { rejectUnsupportedMethod } from '@/utils/method-guards';
import { validateWorkerOutboundBaseUrl } from '@/utils/worker-outbound-url-policy';

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

export async function handleAIKeysRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [HttpMethod.Get, HttpMethod.Post, HttpMethod.Delete]);
  if (methodCheck) {
    return methodCheck;
  }

  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    return authResult;
  }
  const userId = authResult.userId;

  if (!env.USER_KEYS_DO || !env.AI_MASTER_KEY) {
    return new Response(
      JSON.stringify({ error: 'Service Unavailable', message: 'AI keys service not configured' }),
      {
        status: HttpStatus.ServiceUnavailable,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      }
    );
  }

  const keysBase = ApiEndpoint.AI.Keys;
  const suffix = path.slice(keysBase.length).replace(/^\/+/, '');
  const parts = suffix ? suffix.split('/') : [];

  if (request.method === HttpMethod.Post && parts.length === 1 && parts[0] === 'custom') {
    return handleStoreCustom(userId, request, env, requestOrigin);
  }
  if (request.method === HttpMethod.Post && parts.length === 0) {
    return handleStore(userId, request, env, requestOrigin);
  }
  if (request.method === HttpMethod.Get && parts.length === 0) {
    return handleList(userId, env, requestOrigin);
  }
  if (request.method === HttpMethod.Delete && parts.length === 1) {
    return handleDelete(userId, parts[0], env, requestOrigin);
  }
  if (request.method === HttpMethod.Post && parts.length === 2 && parts[1] === 'test') {
    return handleTest(userId, parts[0], env, requestOrigin);
  }

  return new Response(JSON.stringify({ error: 'Not Found', message: 'Invalid AI keys path' }), {
    status: HttpStatus.NotFound,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin || undefined),
    },
  });
}

async function handleStore(
  userId: string,
  request: Request,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const validation = await validateSchemaBody(request, env, AIKeysStoreRequestSchema);
  if (validation.errorResponse) return validation.errorResponse;
  const { providerId, apiKey } = validation.data!;

  try {
    const masterKey = await importMasterKey(env.AI_MASTER_KEY!);
    const encrypted = await encryptKey(apiKey, masterKey);
    const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted.ciphertext)));
    const ivB64 = btoa(String.fromCharCode(...encrypted.iv));

    const doId = env.USER_KEYS_DO!.idFromName(userId);
    const stub = env.USER_KEYS_DO!.get(doId);
    const doResponse = await fetchFromDO(stub, UserKeysDO.Store, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        providerId,
        ciphertext: ciphertextB64,
        iv: ivB64,
      }),
      correlationId: getCurrentContext()?.correlationId,
    });

    if (!doResponse.ok) {
      const errText = await doResponse.text();
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: errText || 'Failed to store key' }),
        {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }
    await doResponse.json().catch(() => undefined);

    return new Response(JSON.stringify({ success: true }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to encrypt or store key',
      }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }
}

async function handleStoreCustom(
  userId: string,
  request: Request,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const validation = await validateSchemaBody(request, env, AIKeysStoreCustomRequestSchema);
  if (validation.errorResponse) return validation.errorResponse;
  const { providerId, apiKey, baseUrl } = validation.data!;
  const catalog = await getCatalogFromEnv(env);
  const providerExists = catalog.providers.some((p) => p.id === providerId);
  if (!providerExists) {
    return new Response(
      JSON.stringify({ error: 'Bad Request', message: 'providerId not in catalog' }),
      {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }
  if (baseUrl !== undefined && baseUrl !== '') {
    const baseUrlError = validateWorkerOutboundBaseUrl(baseUrl, env);
    if (baseUrlError) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: baseUrlError }),
        {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }
  }
  try {
    const masterKey = await importMasterKey(env.AI_MASTER_KEY!);
    const encrypted = await encryptKey(apiKey, masterKey);
    const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted.ciphertext)));
    const ivB64 = btoa(String.fromCharCode(...encrypted.iv));

    const doId = env.USER_KEYS_DO!.idFromName(userId);
    const stub = env.USER_KEYS_DO!.get(doId);
    const doPayload: { providerId: string; ciphertext: string; iv: string; baseUrl?: string } = {
      providerId,
      ciphertext: ciphertextB64,
      iv: ivB64,
    };
    if (baseUrl !== undefined && baseUrl !== '') {
      doPayload.baseUrl = baseUrl;
    }
    const doResponse = await fetchFromDO(stub, UserKeysDO.Store, {
      method: HttpMethod.Post,
      body: JSON.stringify(doPayload),
      correlationId: getCurrentContext()?.correlationId,
    });

    if (!doResponse.ok) {
      const errText = await doResponse.text();
      return new Response(
        JSON.stringify({ error: 'Internal Server Error', message: errText || 'Failed to store key' }),
        {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }
    await doResponse.json().catch(() => undefined);

    return new Response(JSON.stringify({ success: true }), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to encrypt or store key',
      }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }
}

async function handleList(
  userId: string,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const doId = env.USER_KEYS_DO!.idFromName(userId);
  const stub = env.USER_KEYS_DO!.get(doId);
  const doResponse = await fetchFromDO(stub, UserKeysDO.List, {
    method: HttpMethod.Get,
    correlationId: getCurrentContext()?.correlationId,
  });
  const data = (await doResponse.json()) as { success?: boolean; providers?: string[] };
  return new Response(
    JSON.stringify({ providers: data.providers ?? [] }),
    {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin),
      },
    }
  );
}

async function handleDelete(
  userId: string,
  providerId: string,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const doId = env.USER_KEYS_DO!.idFromName(userId);
  const stub = env.USER_KEYS_DO!.get(doId);
  const doResponse = await fetchFromDO(stub, UserKeysDO.Delete, {
    method: HttpMethod.Post,
    body: JSON.stringify({ providerId }),
    correlationId: getCurrentContext()?.correlationId,
  });
  await doResponse.json().catch(() => undefined);
  return new Response(JSON.stringify({ success: true }), {
    status: HttpStatus.Ok,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}

async function handleTest(
  userId: string,
  providerId: string,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const doId = env.USER_KEYS_DO!.idFromName(userId);
  const stub = env.USER_KEYS_DO!.get(doId);
  const getRes = await fetchFromDO(stub, UserKeysDO.Get, {
    method: HttpMethod.Post,
    body: JSON.stringify({ providerId }),
    correlationId: getCurrentContext()?.correlationId,
  });
    const getData = (await getRes.json()) as { success?: boolean; found?: boolean; ciphertext?: string; iv?: string; baseUrl?: string };
  if (!getData.found || !getData.ciphertext || !getData.iv) {
    return new Response(
      JSON.stringify({ error: 'Not Found', message: 'No key configured for this provider' }),
      {
        status: HttpStatus.NotFound,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  if (getData.baseUrl) {
    const baseUrlError = validateWorkerOutboundBaseUrl(getData.baseUrl, env);
    if (baseUrlError) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: baseUrlError }),
        {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }
  }

  const ciphertext = Uint8Array.from(atob(getData.ciphertext), (c) => c.charCodeAt(0)).buffer;
  const iv = Uint8Array.from(atob(getData.iv), (c) => c.charCodeAt(0));
  const masterKey = await importMasterKey(env.AI_MASTER_KEY!);
  const apiKey = await decryptKey({ ciphertext, iv }, masterKey);

    const result = await testProviderKey(providerId, apiKey, getData.baseUrl);
  return new Response(JSON.stringify(result), {
    status: HttpStatus.Ok,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}
