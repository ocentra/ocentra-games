import type { SecretAdapter } from '@ocentra/credentials-domain/SecretAdapter';

type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<string | null>;

interface ElectronAPI {
  getSecret?: (providerId: string, key: string) => Promise<string | null>;
  storeSecret?: (providerId: string, key: string, value: string) => Promise<void>;
}

export class KeychainSecretAdapter implements SecretAdapter {
  async getSecret(providerId: string, key: string): Promise<string | null> {
    const tauri = (globalThis as { __TAURI__?: { invoke?: TauriInvoke } }).__TAURI__;
    if (tauri?.invoke) {
      try {
        return await tauri.invoke('get_secret', { providerId, key });
      } catch {
        return null;
      }
    }

    const electronAPI = (globalThis as { electronAPI?: ElectronAPI }).electronAPI;
    if (electronAPI?.getSecret) {
      return electronAPI.getSecret(providerId, key);
    }

    return null;
  }

  async storeSecret(providerId: string, key: string, value: string): Promise<void> {
    const tauri = (globalThis as { __TAURI__?: { invoke?: TauriInvoke } }).__TAURI__;
    if (tauri?.invoke) {
      await tauri.invoke('store_secret', { providerId, key, value });
      return;
    }

    const electronAPI = (globalThis as { electronAPI?: ElectronAPI }).electronAPI;
    if (electronAPI?.storeSecret) {
      await electronAPI.storeSecret(providerId, key, value);
    }
  }
}
