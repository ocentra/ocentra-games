import type { RequestContext } from '@ocentra/logging-domain/core/requestContextProvider';

let currentContext: RequestContext | null = null;

export function setCurrentContext(ctx: RequestContext | null): void {
  currentContext = ctx;
}

export function getCurrentContext(): RequestContext | null {
  return currentContext;
}

export function createRequestContextProvider(): { getCurrentContext(): RequestContext | null } {
  return {
    getCurrentContext: () => currentContext,
  };
}
