import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { asIdempotencyKey, type IdempotencyKey } from '@ocentra/endpoint-domain/constants/idempotency';
import { getCorsHeaders } from '@/utils/cors';
import type { Env } from '@/constants/env';
import { validateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';

export function requireIdempotencyKey(
  key: string | null | undefined,
  request: Request,
  env: Env
): Response | IdempotencyKey {
  if (!key || typeof key !== 'string') {
    const requestOrigin = request.headers.get(HttpHeader.Origin);
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Idempotency key is required',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }
  const validation = validateIdempotencyKey(key);
  if (!validation.valid) {
    const requestOrigin = request.headers.get(HttpHeader.Origin);
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: validation.error || 'Invalid idempotency key format',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }
  return asIdempotencyKey(key.trim());
}

export function validateAndRejectIdempotencyKey(
  key: IdempotencyKey,
  request: Request,
  env: Env
): Response | null {
  const validation = validateIdempotencyKey(key);
  if (!validation.valid) {
    const requestOrigin = request.headers.get(HttpHeader.Origin);
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: validation.error || 'Invalid idempotency key format',
    }), {
      status: HttpStatus.BadRequest,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }
  return null;
}
