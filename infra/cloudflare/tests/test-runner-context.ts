import type { RequestContext } from '@/logging/request-context';

let threadContext: RequestContext | null = null;

export function setCurrentContext(ctx: RequestContext | null): void {
  threadContext = ctx;
}

export function getCurrentContext(): RequestContext | null {
  return threadContext;
}
