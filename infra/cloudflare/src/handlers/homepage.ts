import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { generateHomepageHtml } from '@/logic/homepage';
import { extractOriginFromRequest } from '@ocentra/endpoint-domain/utils/url-builder';
import { Logger } from '@/logging/domain-logger-init';
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

export async function handleHomepageRequest(request: Request, env: Env): Promise<Response> {
  const baseUrl = extractOriginFromRequest(request.url);
  const html = generateHomepageHtml(baseUrl, env);
  const requestOrigin = request.headers.get(HttpHeader.Origin) || undefined;
  return new Response(html, {
    headers: {
      [HttpHeader.ContentType]: HttpContentType.TextHtml,
      ...getCorsHeaders(env, requestOrigin),
    },
  });
}
