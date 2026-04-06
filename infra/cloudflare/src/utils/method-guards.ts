import { HttpHeader, HttpMethod, HttpStatus, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { getCorsHeaders } from '@/utils/cors';
import type { Env } from '@/constants/env';

export function rejectUnsupportedMethod(
  request: Request,
  env: Env,
  allowedMethods: readonly HttpMethod[]
): Response | null {
  if (!allowedMethods.includes(request.method as HttpMethod)) {
    return new Response(ErrorMessage.MethodNotAllowed, {
      status: HttpStatus.MethodNotAllowed,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.TextPlain,
        [HttpHeader.Allow]: allowedMethods.join(', '),
        ...getCorsHeaders(env),
      },
    });
  }

  return null;
}
