import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { getCatalogFromEnv } from '@/data/ai-catalog';
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

export async function handleAICatalogRequest(request: Request, env: Env): Promise<Response> {
  const requestOrigin = request.headers.get(HttpHeader.Origin) ?? undefined;
  logInfo('AI catalog request', getStackTrace(), { url: request.url }, true);
  try {
    const catalog = await getCatalogFromEnv(env);
    return new Response(JSON.stringify(catalog), {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin),
      },
    });
  } catch (error) {
    logError('AI catalog failed', getStackTrace(), { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: 'Failed to load catalog' }),
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
