import { invoke } from '@tauri-apps/api/core';
import type { NativeStorageBackend, NativeStorageBackendKeysOptions } from '@ocentra/storage-domain/backends/in-memory-native-backend';

export function createTauriContentSliceCacheBackend(): NativeStorageBackend {
  return {
    async get(key: string): Promise<string | null> {
      return await invoke<string | null>('get_cached_slice', { key });
    },

    async set(key: string, value: Uint8Array | string): Promise<void> {
      const content = typeof value === 'string' ? value : new TextDecoder().decode(value);
      await invoke('set_cached_slice', { key, content });
    },

    async delete(key: string): Promise<void> {
      await invoke('delete_cached_slice', { key });
    },

    async keys(options?: NativeStorageBackendKeysOptions): Promise<string[]> {
      return await invoke<string[]>('list_cached_slice_keys', {
        prefix: options?.prefix ?? null,
        limit: options?.limit ?? null,
        offset: options?.offset ?? null,
      });
    },
  };
}
