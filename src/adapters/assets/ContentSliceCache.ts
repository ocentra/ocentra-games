import { IndexedDBService } from '@ocentra/storage-domain/core/IndexedDBService';
import { DB_NAMES, STORE_NAMES, DB_VERSIONS } from '@ocentra/storage-domain/idb/idbConstants';
import { contentCacheSchema } from '@ocentra/storage-domain/idb/idbSchema';
import type { NativeStorageBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const NATIVE_KEY_PREFIX = 'content-slice:';

interface SliceRecord {
  url: string;
  data: unknown;
  cachedAt: number;
  ttlMs: number;
}

interface NativeSliceRecord {
  data: unknown;
  cachedAt: number;
  ttlMs: number;
}

let nativeBackend: NativeStorageBackend | null = null;
let service: IndexedDBService | null = null;
let initPromise: Promise<void> | null = null;
let preferNativeBackend = false;

/** Call this during mobile bootstrap to enable AsyncStorage-backed slice caching. */
export function setNativeContentSliceCacheBackend(backend: NativeStorageBackend): void {
  nativeBackend = backend;
}

export function setPreferNativeContentSliceCache(value: boolean): void {
  preferNativeBackend = value;
}

function getService(): IndexedDBService {
  if (!service) {
    const dbName = DB_NAMES.CONTENT_CACHE;
    const dbConfig = contentCacheSchema[dbName];
    service = new IndexedDBService({
      dbName,
      version: dbConfig.version ?? DB_VERSIONS.V1,
      stores: Object.fromEntries(
        Object.entries(dbConfig.stores).map(([storeName, storeConfig]) => [
          storeName,
          {
            keyPath: storeConfig.keyPath,
            indexes: storeConfig.indexes ?? [],
          },
        ])
      ),
    });
  }
  return service;
}

export async function initContentSliceCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  if (initPromise) return initPromise;
  initPromise = getService().openDB().then(() => undefined);
  return initPromise;
}

async function getNativeSlice<T>(url: string): Promise<T | null> {
  if (!nativeBackend) return null;
  try {
    const raw = await nativeBackend.get(`${NATIVE_KEY_PREFIX}${url}`);
    if (!raw) return null;
    const str = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    const record = JSON.parse(str) as NativeSliceRecord;
    if (Date.now() - record.cachedAt > record.ttlMs) return null;
    return record.data as T;
  } catch {
    return null;
  }
}

async function setNativeSlice(url: string, data: unknown, ttlMs: number): Promise<void> {
  if (!nativeBackend) return;
  try {
    const record: NativeSliceRecord = { data, cachedAt: Date.now(), ttlMs };
    await nativeBackend.set(`${NATIVE_KEY_PREFIX}${url}`, JSON.stringify(record));
  } catch {
    // non-fatal
  }
}

export async function getCachedSlice<T>(url: string): Promise<T | null> {
  const native = await getNativeSlice<T>(url);
  if (native !== null) return native;
  if (nativeBackend && preferNativeBackend) return null;

  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await getService().openDB();
    return new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAMES.SLICES, 'readonly');
      const req = tx.objectStore(STORE_NAMES.SLICES).get(url);
      req.onsuccess = () => {
        const record = req.result as SliceRecord | undefined;
        if (!record) { resolve(null); return; }
        const expired = Date.now() - record.cachedAt > record.ttlMs;
        resolve(expired ? null : (record.data as T));
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedSlice(url: string, data: unknown, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  void setNativeSlice(url, data, ttlMs);
  if (nativeBackend && preferNativeBackend) return;

  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getService().openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAMES.SLICES, 'readwrite');
      const record: SliceRecord = { url, data, cachedAt: Date.now(), ttlMs };
      const req = tx.objectStore(STORE_NAMES.SLICES).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // non-fatal
  }
}

export async function clearContentSliceCache(): Promise<void> {
  if (nativeBackend) {
    try {
      const keys = await nativeBackend.keys({ prefix: NATIVE_KEY_PREFIX });
      await Promise.all(keys.map((key) => nativeBackend!.delete(key)));
    } catch {
      // non-fatal
    }
  }

  if (nativeBackend && preferNativeBackend) return;

  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getService().openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAMES.SLICES, 'readwrite');
      tx.objectStore(STORE_NAMES.SLICES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // non-fatal
  }
}
