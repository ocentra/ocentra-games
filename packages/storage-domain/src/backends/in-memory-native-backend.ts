export interface NativeStorageBackendKeysOptions {
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface NativeStorageBackend {
  get(key: string): Promise<Uint8Array | string | null>;
  set(key: string, value: Uint8Array | string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(options?: NativeStorageBackendKeysOptions): Promise<string[]>;
}

export function createInMemoryNativeBackend(): NativeStorageBackend {
  const store = new Map<string, Uint8Array | string>();

  return {
    async get(key: string): Promise<Uint8Array | string | null> {
      return store.get(key) ?? null;
    },

    async set(key: string, value: Uint8Array | string): Promise<void> {
      store.set(key, value);
    },

    async delete(key: string): Promise<void> {
      store.delete(key);
    },

    async keys(options?: NativeStorageBackendKeysOptions): Promise<string[]> {
      let arr = Array.from(store.keys());
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
