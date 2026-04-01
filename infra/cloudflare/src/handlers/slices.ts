import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { readSliceText, slicePathToR2Key } from '@/logic/assets/slice-loader';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

function logInfo(message: string, stackTrace: StackTrace, data?: unknown) {
  log.logInfo(message, stackTrace, data);
}

function logWarn(message: string, stackTrace: StackTrace, data?: unknown) {
  log.logWarn(message, stackTrace, data);
}

function jsonResponse(env: Env, data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env),
    },
  });
}

function isSlicesPath(path: string): boolean {
  return path.startsWith(ApiEndpoint.Slices.Base);
}

export async function handleSlicesRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  if (request.method !== HttpMethod.Get) {
    return jsonResponse(env, { error: 'Method not allowed' }, HttpStatus.MethodNotAllowed);
  }

  if (!env.ASSETS_BUCKET) {
    return jsonResponse(env, { error: 'Assets bucket not configured' }, HttpStatus.ServiceUnavailable);
  }

  if (!isSlicesPath(path)) {
    return jsonResponse(env, { error: 'Not found' }, HttpStatus.NotFound);
  }

  const r2Key = slicePathToR2Key(path);
  if (!r2Key) {
    logWarn('[Slices] No R2 key for path', getStackTrace(), { path });
    return jsonResponse(env, { error: 'Not found' }, HttpStatus.NotFound);
  }

  const text = await readSliceText(env, r2Key);
  if (!text) {
    return jsonResponse(env, { error: 'Not found' }, HttpStatus.NotFound);
  }

  try {
    const data = JSON.parse(text) as unknown;
    return jsonResponse(env, data, HttpStatus.Ok);
  } catch (err) {
    logWarn('[Slices] Invalid JSON in slice', getStackTrace(), { r2Key, error: String(err) });
    return jsonResponse(env, { error: 'Invalid slice data' }, HttpStatus.InternalServerError);
  }
}
