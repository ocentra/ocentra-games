import type {
  NativeStorageBackend,
  NativeStorageBackendKeysOptions,
} from '@/backends/in-memory-native-backend';

export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface AsyncStorageNativeBackendOptions {
  maxItemBytes?: number;
}

const DEFAULT_MAX_ITEM_BYTES = 900 * 1024;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

export function createAsyncStorageNativeBackend(
  asyncStorage: AsyncStorageLike,
  options: AsyncStorageNativeBackendOptions = {}
): NativeStorageBackend {
  const BINARY_PREFIX = '__bin:';
  const maxItemBytes = options.maxItemBytes ?? DEFAULT_MAX_ITEM_BYTES;

  return {
    async get(key: string): Promise<Uint8Array | string | null> {
      const raw = await asyncStorage.getItem(key);
      if (raw === null) return null;
      if (raw.startsWith(BINARY_PREFIX)) {
        const b64 = raw.slice(BINARY_PREFIX.length);
        return base64ToUint8Array(b64);
      }
      return raw;
    },

    async set(key: string, value: Uint8Array | string): Promise<void> {
      const str = value instanceof Uint8Array ? BINARY_PREFIX + uint8ArrayToBase64(value) : value;
      if (str.length > maxItemBytes) {
        throw new Error(
          `AsyncStorageNativeBackend value too large for key "${key}" (${str.length} bytes). Use chunked writes (NativeModelCacheAdapter) or provide a filesystem-native backend for large blobs.`
        );
      }
      await asyncStorage.setItem(key, str);
    },

    async delete(key: string): Promise<void> {
      await asyncStorage.removeItem(key);
    },

    async keys(options?: NativeStorageBackendKeysOptions): Promise<string[]> {
      let arr = await asyncStorage.getAllKeys();
      const prefix = options?.prefix;
      if (prefix) arr = arr.filter((k) => k.startsWith(prefix));
      const offset = options?.offset;
      if (typeof offset === 'number' && offset > 0) {
        arr = arr.slice(offset);
      }
      const limit = options?.limit;
      if (typeof limit === 'number' && limit > 0) arr = arr.slice(0, limit);
      return arr;
    },
  };
}
