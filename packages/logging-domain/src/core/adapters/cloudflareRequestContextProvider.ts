import type { RequestContextProvider, RequestContext } from '@ocentra/logging-domain/core/requestContextProvider';

export interface CloudflareRequestContextFunctions {
  getCurrentContext: () => RequestContext | null;
}

export class CloudflareRequestContextProvider implements RequestContextProvider {
  constructor(private contextFunctions: CloudflareRequestContextFunctions) {}

  getCurrentContext(): RequestContext | null {
    return this.contextFunctions.getCurrentContext();
  }
}
