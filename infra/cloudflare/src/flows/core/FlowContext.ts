import type { Env } from '@/constants/env';
import type { RequestContext } from '@/logging/request-context';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';

export interface FlowRequestMetadata {
  method: string;
  path: string;
  origin?: string;
  correlationId?: string;
}

export interface FlowContext {
  env: Env;
  request: Request;
  metadata: FlowRequestMetadata;
  requestContext?: RequestContext;
  authUserId?: string;
  operationId?: string;
}

export interface CreateFlowContextInput {
  env: Env;
  request: Request;
  requestContext?: RequestContext;
  authUserId?: string;
  operationId?: string;
  method?: string;
  path?: string;
  origin?: string;
}

export function createFlowContext(input: CreateFlowContextInput): FlowContext {
  const url = new URL(input.request.url);
  const requestContext = input.requestContext;

  return {
    env: input.env,
    request: input.request,
    requestContext,
    authUserId: input.authUserId,
    operationId: input.operationId,
    metadata: {
      method: input.method ?? input.request.method,
      path: input.path ?? url.pathname,
      origin: input.origin ?? input.request.headers.get(HttpHeader.Origin) ?? undefined,
      correlationId: requestContext?.correlationId,
    },
  };
}
