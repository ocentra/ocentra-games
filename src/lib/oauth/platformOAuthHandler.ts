import { PlatformRuntime, getPlatformRuntime } from '@ocentra/app-core/platform';
import { createPlatformSecretAdapter } from '@/adapters/credentials/createPlatformSecretAdapter';

export async function handleOAuthCallback(params: URLSearchParams): Promise<void> {
  const adapter = createPlatformSecretAdapter();
  const token = params.get('access_token');
  const providerId = params.get('provider') ?? 'oauth';
  if (adapter?.storeSecret && token) {
    await adapter.storeSecret(providerId, 'access_token', token);
  }
}

export function registerMobileOAuthDeepLink(scheme: string = 'ocentra'): void {
  const runtime = getPlatformRuntime();
  if (runtime !== PlatformRuntime.Mobile) return;

  const cap = (globalThis as {
    Capacitor?: { Plugins?: { App?: { addListener?: (event: string, cb: (data: { url: string }) => void) => void } } };
  }).Capacitor;

  cap?.Plugins?.App?.addListener?.('appUrlOpen', (data) => {
    const callbackPrefix = `${scheme}://oauth/callback`;
    if (data.url.startsWith(callbackPrefix)) {
      const queryString = data.url.slice(callbackPrefix.length).replace(/^[?]/, '');
      void handleOAuthCallback(new URLSearchParams(queryString));
    }
  });
}
