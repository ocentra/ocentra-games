import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { requireAuth } from '@/utils/auth-middleware';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { UserKeysDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { fetchFromDO } from '@/utils/durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { decryptKey, importMasterKey } from '@/logic/ai-keys';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

const OPENAI_COMPATIBLE_BASES: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  perplexity: 'https://api.perplexity.ai',
  xai: 'https://api.x.ai/v1',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  lmstudio: '', // requires custom baseUrl stored in DO
  vllm: '',
  localai: '',
};

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const COHERE_BASE = 'https://api.cohere.ai/v2';

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-2.0-flash',
  google_gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-chat',
  together: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
  fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
  perplexity: 'llama-3.1-sonar-small-128k-online',
  xai: 'grok-2',
  mistral: 'mistral-small-latest',
  cohere: 'command-r',
  openrouter: 'openai/gpt-4o',
};

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
    }),
  });
  const body = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, error: body || res.statusText };
  }
  try {
    const data = JSON.parse(body) as { choices?: { message?: { content?: string } }[] };
    return { ok: true, text: data.choices?.[0]?.message?.content ?? '' };
  } catch {
    return { ok: false, error: 'Invalid response from provider' };
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 1024,
    }),
  });
  const body = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, error: body || res.statusText };
  }
  try {
    const data = JSON.parse(body) as { content?: { type: string; text: string }[] };
    return { ok: true, text: data.content?.find((c) => c.type === 'text')?.text ?? '' };
  } catch {
    return { ok: false, error: 'Invalid response from provider' };
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });
  const body = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, error: body || res.statusText };
  }
  try {
    const data = JSON.parse(body) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return { ok: true, text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' };
  } catch {
    return { ok: false, error: 'Invalid response from provider' };
  }
}

async function callCohere(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const res = await fetch(`${COHERE_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      system_prompt: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 1024,
    }),
  });
  const body = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, error: body || res.statusText };
  }
  try {
    const data = JSON.parse(body) as { message?: { content?: { type: string; text: string }[] } };
    return { ok: true, text: data.message?.content?.find((c) => c.type === 'text')?.text ?? '' };
  } catch {
    return { ok: false, error: 'Invalid response from provider' };
  }
}

export async function handleAIGenerateRequest(
  request: Request,
  env: Env,
  _path: string
): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;

  if (request.method !== HttpMethod.Post) {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Allow]: HttpMethod.Post,
        ...getCorsHeaders(env, requestOrigin),
      },
    });
  }

  if (!env.USER_KEYS_DO || !env.AI_MASTER_KEY) {
    return new Response(
      JSON.stringify({ error: 'Service Unavailable', message: 'AI generate service not configured' }),
      {
        status: HttpStatus.ServiceUnavailable,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  const authResult = await requireAuth(request, env, requestOrigin, 'Authentication required');
  if (authResult instanceof Response) {
    return authResult;
  }
  const userId = authResult.userId;

  let body: { providerId?: string; systemPrompt?: string; userPrompt?: string; model?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON body' }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin),
      },
    });
  }

  const { providerId, systemPrompt, userPrompt, model: requestedModel } = body ?? {};
  if (
    !providerId || typeof providerId !== 'string' ||
    !systemPrompt || typeof systemPrompt !== 'string' ||
    !userPrompt || typeof userPrompt !== 'string'
  ) {
    return new Response(
      JSON.stringify({ error: 'Bad Request', message: 'providerId, systemPrompt, and userPrompt required' }),
      {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  const doId = env.USER_KEYS_DO.idFromName(userId);
  const stub = env.USER_KEYS_DO.get(doId);
  const getRes = await fetchFromDO(stub, UserKeysDO.Get, {
    method: HttpMethod.Post,
    body: JSON.stringify({ providerId }),
    correlationId: getCurrentContext()?.correlationId,
  });
  const getData = (await getRes.json()) as {
    found?: boolean;
    ciphertext?: string;
    iv?: string;
    baseUrl?: string;
  };

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

  let apiKey: string;
  try {
    const ciphertext = Uint8Array.from(atob(getData.ciphertext), (c) => c.charCodeAt(0)).buffer;
    const iv = Uint8Array.from(atob(getData.iv), (c) => c.charCodeAt(0));
    const masterKey = await importMasterKey(env.AI_MASTER_KEY);
    apiKey = await decryptKey({ ciphertext, iv }, masterKey);
  } catch (error) {
    log.logError('Failed to decrypt AI key for generate', getStackTrace(), error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: 'Failed to retrieve key' }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  const providerIdLower = providerId.toLowerCase();
  const model =
    typeof requestedModel === 'string' && requestedModel
      ? requestedModel
      : (DEFAULT_MODELS[providerIdLower] ?? '');

  let result: { ok: boolean; text?: string; error?: string };

  if (providerIdLower === 'anthropic') {
    result = await callAnthropic(apiKey, model, systemPrompt, userPrompt);
  } else if (providerIdLower === 'gemini' || providerIdLower === 'google_gemini') {
    result = await callGemini(apiKey, model, systemPrompt, userPrompt);
  } else if (providerIdLower === 'cohere') {
    result = await callCohere(apiKey, model, systemPrompt, userPrompt);
  } else if (providerIdLower in OPENAI_COMPATIBLE_BASES) {
    const defaultBase = OPENAI_COMPATIBLE_BASES[providerIdLower];
    const baseUrl = getData.baseUrl || defaultBase;
    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'baseUrl required for this provider' }),
        {
          status: HttpStatus.BadRequest,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin),
          },
        }
      );
    }
    result = await callOpenAICompatible(baseUrl, apiKey, model, systemPrompt, userPrompt);
  } else {
    return new Response(
      JSON.stringify({
        error: 'Unprocessable Entity',
        message: 'Provider does not support worker-side generation',
      }),
      {
        status: HttpStatus.UnprocessableEntity,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Bad Gateway', message: result.error ?? 'Provider returned an error' }),
      {
        status: HttpStatus.BadGateway,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin),
        },
      }
    );
  }

  return new Response(JSON.stringify({ text: result.text ?? '', model, providerId }), {
    status: HttpStatus.Ok,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}
