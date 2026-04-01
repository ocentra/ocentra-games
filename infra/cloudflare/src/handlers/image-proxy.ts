import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpStatus, HttpHeader, HttpContentType, CacheControl } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { proxyImageLogic, type ImageProxyFetch } from '@/logic/image-proxy';

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

export async function handleImageProxyRequest(
  request: Request,
  env: Env,
  requestOrigin?: string | null
): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    const imageUrl = requestUrl.searchParams.get('url');

    const fetchImpl: ImageProxyFetch = {
      fetch: fetch.bind(globalThis),
    };

    const proxyResult = await proxyImageLogic(
      {
        imageUrl: imageUrl || '',
        allowedDomains: ['googleusercontent.com', 'facebook.com', 'fbcdn.net'],
        userAgent: 'Cloudflare-Worker/1.0',
        defaultContentType: HttpContentType.ImageJpeg,
      },
      fetchImpl
    );

    if (!proxyResult.success) {
      const status = proxyResult.statusCode || HttpStatus.BadRequest;
      return new Response(JSON.stringify({ error: proxyResult.error }), {
        status,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      });
    }

    return new Response(proxyResult.imageData, {
      status: HttpStatus.Ok,
      headers: {
        [HttpHeader.ContentType]: proxyResult.contentType || HttpContentType.ImageJpeg,
        [HttpHeader.CacheControl]: CacheControl.PublicLongTerm,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  } catch (error) {
    logError('Error in handleImageProxyRequest', getStackTrace(), error);
    return new Response(JSON.stringify({ error: ErrorMessage.InternalServerError }), {
      status: HttpStatus.InternalServerError,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        ...getCorsHeaders(env, requestOrigin || undefined),
      },
    });
  }
}
