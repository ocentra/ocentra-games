import { createApiClient } from '@ocentra/api-domain/createApiClient';
import { createPlatformAuthBridge } from '@/adapters/auth/createPlatformAuthBridge';

export function setupApiClientWithAuthBridge(): void {
  const bridge = createPlatformAuthBridge();
  const getAuthToken = () => bridge.getAuthToken();
  createApiClient({ getAuthToken });
  (globalThis as Record<string, unknown>).__OCENTRA_GET_AUTH_TOKEN = getAuthToken;
}

