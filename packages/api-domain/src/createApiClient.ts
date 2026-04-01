import type { GetAuthToken } from './httpClient';
import { initHttpClient } from './httpClient';

export interface CreateApiClientOptions {
  getAuthToken: GetAuthToken;
}

export function createApiClient(options: CreateApiClientOptions): void {
  initHttpClient({ getAuthToken: options.getAuthToken });
}
