import type { Env } from '@/constants/env';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
import { getCorsHeaders } from '@/utils/cors';

export function isEmergencyShutdownEnabled(env: Env, request?: Request): boolean {
  if (request && env.ENVIRONMENT !== Environment.Production) {
    const testKillSwitchHeader = request.headers.get(HttpHeader.XTestKillSwitch);
    if (testKillSwitchHeader === 'true') {
      return true;
    }
    if (testKillSwitchHeader === 'false') {
      return false;
    }
  }
  return env.EMERGENCY_SHUTDOWN === QueryValue.True;
}

export function isStateChangingMethod(method: string): boolean {
  return method === HttpMethod.Post ||
    method === HttpMethod.Put ||
    method === HttpMethod.Delete;
}

export function createShutdownResponse(request: Request, env: Env): Response {
  const requestOrigin = request.headers.get(HttpHeader.Origin);
  
  return new Response(JSON.stringify({
    error: ErrorMessage.ServiceUnavailable,
    message: 'Service temporarily unavailable due to emergency shutdown',
  }), {
    status: HttpStatus.ServiceUnavailable,
    headers: {
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      ...getCorsHeaders(env, requestOrigin || undefined),
    },
  });
}
