import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { UserKeysDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { fetchFromDO } from '@/utils/durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { encryptKey, importMasterKey } from '@/logic/ai-keys';
import { putOAuthState, getAndDeleteOAuthState } from '@/data/oauth-state';
import {
  getOAuthConfigForProvider,
  isAllowedOAuthProvider,
} from '@/data/oauth-provider-config';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

export async function handleAIOAuthRequest(request: Request, env: Env, path: string): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  const isStart = path === ApiEndpoint.AI.OAuthStart || path.endsWith('/oauth/start');
  const isCallback = path === ApiEndpoint.AI.OAuthCallback || path.endsWith('/oauth/callback');

  if (isStart) {
    return handleOAuthStart(request, env, requestOrigin);
  }
  if (isCallback) {
    return handleOAuthCallback(request, env, requestOrigin);
  }

  return new Response(JSON.stringify({ error: 'Not Found', message: 'Invalid OAuth path' }), {
    status: HttpStatus.NotFound,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}

async function handleOAuthStart(
  request: Request,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    return authResult;
  }
  const userId = authResult.userId;

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');
  if (!provider || !isAllowedOAuthProvider(provider)) {
    return new Response(
      JSON.stringify({ error: 'Bad Request', message: 'Invalid or unsupported provider' }),
      {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  const config = getOAuthConfigForProvider(env, provider);
  if (!config) {
    return new Response(
      JSON.stringify({ error: 'Service Unavailable', message: 'OAuth not configured for this provider' }),
      {
        status: HttpStatus.ServiceUnavailable,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  if (!env.AI_CATALOG_KV) {
    return new Response(
      JSON.stringify({ error: 'Service Unavailable', message: 'OAuth state storage not configured' }),
      {
        status: HttpStatus.ServiceUnavailable,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  await putOAuthState(env.AI_CATALOG_KV, state, {
    userId,
    providerId: config.providerId,
    nonce,
    createdAt: Date.now(),
  });

  const workerOrigin = url.origin;
  const redirectUri = `${workerOrigin}${ApiEndpoint.AI.OAuthCallback}`;
  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', config.scopes);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('access_type', 'offline');
  authorizeUrl.searchParams.set('prompt', 'consent');

  return new Response(null, {
    status: HttpStatus.Found,
    headers: {
      [HttpHeader.Location]: authorizeUrl.toString(),
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function handleOAuthCallback(
  request: Request,
  env: Env,
  requestOrigin: string | undefined
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const appOrigin = env.APP_ORIGIN ?? env.CORS_ORIGIN ?? '';
  const baseRedirect = appOrigin ? `${appOrigin.replace(/\/+$/, '')}/settings/keys` : null;

  const redirectToApp = (params: Record<string, string>) => {
    if (!baseRedirect) {
      return new Response(
        JSON.stringify({ error: 'Configuration Error', message: 'APP_ORIGIN or CORS_ORIGIN not set' }),
        {
          status: HttpStatus.InternalServerError,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }
    const target = new URL(baseRedirect);
    Object.entries(params).forEach(([k, v]) => target.searchParams.set(k, v));
    return new Response(null, {
      status: HttpStatus.Found,
      headers: {
        [HttpHeader.Location]: target.toString(),
        ...getCorsHeaders(env, requestOrigin),
      },
    });
  };

  if (!code || !state) {
    return redirectToApp({ error: 'missing_params' });
  }

  if (!env.AI_CATALOG_KV) {
    return redirectToApp({ error: 'config_error' });
  }

  const payload = await getAndDeleteOAuthState(env.AI_CATALOG_KV, state);
  if (!payload) {
    return redirectToApp({ error: 'invalid_state' });
  }

  const config = getOAuthConfigForProvider(env, payload.providerId);
  if (!config) {
    return redirectToApp({ error: 'provider_not_configured' });
  }

  const workerOrigin = url.origin;
  const redirectUri = `${workerOrigin}${ApiEndpoint.AI.OAuthCallback}`;

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(config.tokenUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.ContentType]: 'application/x-www-form-urlencoded',
      },
      body: tokenBody.toString(),
    });
  } catch (err) {
    log.logError('OAuth token exchange request failed', getStackTrace(), { error: err });
    return redirectToApp({ error: 'token_exchange_failed' });
  }

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (tokenData.error || !tokenData.access_token) {
    log.logError('OAuth token exchange error', getStackTrace(), {
      error: tokenData.error,
      description: tokenData.error_description,
    });
    return redirectToApp({ error: tokenData.error ?? 'token_exchange_denied' });
  }

  const expiresAt = tokenData.expires_in
    ? Date.now() + tokenData.expires_in * 1000
    : undefined;
  const tokenPayload = JSON.stringify({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? undefined,
    expires_at: expiresAt,
  });

  if (!env.USER_KEYS_DO || !env.AI_MASTER_KEY) {
    return redirectToApp({ error: 'storage_not_configured' });
  }

  try {
    const masterKey = await importMasterKey(env.AI_MASTER_KEY);
    const encrypted = await encryptKey(tokenPayload, masterKey);
    const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted.ciphertext)));
    const ivB64 = btoa(String.fromCharCode(...encrypted.iv));

    const doId = env.USER_KEYS_DO.idFromName(payload.userId);
    const stub = env.USER_KEYS_DO.get(doId);
    const doResponse = await fetchFromDO(stub, UserKeysDO.Store, {
      method: HttpMethod.Post,
      body: JSON.stringify({
        providerId: config.providerId,
        ciphertext: ciphertextB64,
        iv: ivB64,
      }),
      correlationId: getCurrentContext()?.correlationId,
    });

    if (!doResponse.ok) {
      const errText = await doResponse.text();
      log.logError('OAuth store keys failed', getStackTrace(), { status: doResponse.status, errText });
      return redirectToApp({ error: 'store_failed' });
    }
    await doResponse.text().catch(() => undefined);
  } catch (err) {
    log.logError('OAuth encrypt or store failed', getStackTrace(), { error: err });
    return redirectToApp({ error: 'store_failed' });
  }

  return redirectToApp({ connected: config.providerId });
}
