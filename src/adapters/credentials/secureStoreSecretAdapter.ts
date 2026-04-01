import type { SecretAdapter } from '@ocentra/credentials-domain/SecretAdapter';

interface CapacitorPreferences {
  get: (opts: { key: string }) => Promise<{ value: string | null }>;
  set: (opts: { key: string; value: string }) => Promise<void>;
}

function storageKey(providerId: string, key: string): string {
  return `ocentra_secret_${providerId}_${key}`;
}

export class SecureStoreSecretAdapter implements SecretAdapter {
  async getSecret(providerId: string, key: string): Promise<string | null> {
    const k = storageKey(providerId, key);

    const cap = (globalThis as { Capacitor?: { Plugins?: { Preferences?: CapacitorPreferences } } }).Capacitor;
    if (cap?.Plugins?.Preferences) {
      try {
        const result = await cap.Plugins.Preferences.get({ key: k });
        return result.value;
      } catch {
        return null;
      }
    }

    return null;
  }

  async storeSecret(providerId: string, key: string, value: string): Promise<void> {
    const k = storageKey(providerId, key);

    const cap = (globalThis as { Capacitor?: { Plugins?: { Preferences?: CapacitorPreferences } } }).Capacitor;
    if (cap?.Plugins?.Preferences) {
      await cap.Plugins.Preferences.set({ key: k, value });
    }
  }
}
