import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ImageCache } from '@ocentra/storage-domain/caches/ImageCacheService';
import { AnalyticsCache } from '@ocentra/storage-domain/caches/AnalyticsCache';
import { IndexedDBService } from '@ocentra/storage-domain/core/IndexedDBService';
import { bootstrapModelStorage } from '@ocentra/storage-domain/bootstrap/bootstrapModelStorage';
import type { ModelCacheAdapter } from '@ocentra/storage-domain/model-cache/ModelCacheAdapter';
import { MODEL_KEY_PATHS, MODEL_STORE_NAMES } from '@ocentra/storage-domain/model-cache/model-store-config';
import type { NativeStorageBackend } from '@ocentra/storage-domain/backends/in-memory-native-backend';
import { modelCacheSchema, schema, DBNames } from '@ocentra/storage-domain/idb/idbSchema';
import { DB_NAMES, STORE_NAMES } from '@ocentra/storage-domain/idb/idbConstants';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_STORAGE = false;

let storageReady = false;

let mobileBackendFactory: (() => NativeStorageBackend | Promise<NativeStorageBackend>) | null = null;

export function setMobileBackendFactory(
  factory: () => NativeStorageBackend | Promise<NativeStorageBackend>
): void {
  mobileBackendFactory = factory;
}

export function isStorageReady(): boolean {
  return storageReady;
}

export function __testingSetStorageReady(value: boolean): void {
  storageReady = value;
}

export function __setStorageReadyTrue(): void {
  storageReady = true;
}

const logInfo = (message: string, data?: unknown) => {
  log.logInfo(`[storageBootstrap] ${message}`, getStackTrace(), data, LOG_STORAGE);
};

const logError = (message: string, data?: unknown) => {
  log.logError(`[storageBootstrap] ${message}`, getStackTrace(), data);
};

export function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function warmUpIndexedDB(): Promise<void> {
  if (!hasIndexedDB()) {
    logInfo('IndexedDB unavailable, skipping warmup');
    return;
  }
  return new Promise((resolve) => {
    const testDbName = '__idb_warmup__';
    const request = indexedDB.open(testDbName, 1);

    request.onsuccess = () => {
      const db = request.result;
      db.close();
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => {
        logInfo('IndexedDB warmed up');
        resolve();
      };
      deleteRequest.onerror = () => {
        logInfo('IndexedDB warmed up (cleanup skipped)');
        resolve();
      };
    };

    request.onerror = () => {
      logInfo('IndexedDB warmup completed');
      resolve();
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('__temp__')) {
        db.createObjectStore('__temp__');
      }
    };
  });
}

export async function initializeImageCache(): Promise<void> {
  if (!hasIndexedDB()) {
    logInfo('IndexedDB unavailable, skipping ImageCache (BaseCache.isSupported: browser-only unless alternative backend)');
    return;
  }
  try {
    const dbName = DB_NAMES.IMAGE_CACHE;
    const dbConfig = schema[dbName];

    if (!dbConfig) {
      throw new Error(`Schema not found for ${dbName}`);
    }

    const service = new IndexedDBService({
      dbName,
      version: dbConfig.version,
      stores: Object.fromEntries(
        Object.entries(dbConfig.stores).map(([storeName, storeConfig]) => [
          storeName,
          {
            keyPath: storeConfig.keyPath,
            indexes: storeConfig.indexes || [],
          },
        ])
      ),
    });

    await service.openDB();

    const imageCache = ImageCache.getInstance();
    await imageCache.initialize();
    logInfo('ImageCache initialized');
  } catch (error) {
    logError('Failed to initialize ImageCache', { error });
  }
}

export async function initializeAnalyticsCache(): Promise<void> {
  if (!hasIndexedDB()) {
    logInfo('IndexedDB unavailable, skipping AnalyticsCache (BaseCache.isSupported: browser-only unless alternative backend)');
    return;
  }
  try {
    const analyticsCache = AnalyticsCache.getInstance();
    await analyticsCache.initialize();
    logInfo('AnalyticsCache initialized');
  } catch (error) {
    logError('Failed to initialize AnalyticsCache', { error });
  }
}

export async function initializeModelCache(modelCache: ModelCacheAdapter): Promise<void> {
  const { bootstrapModelStorage: bootstrap } = await import(
    '@ocentra/storage-domain/bootstrap/bootstrapModelStorage'
  );
  await bootstrap({ modelCache });
}

function deleteIDBDatabase(dbName: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve(); // best-effort
    req.onblocked = () => resolve();
  });
}

export async function bootstrapModelCacheWithIDB(): Promise<void> {
  const dbName = DBNames.DB_MODELS;
  const dbConfig = modelCacheSchema[dbName];
  const metadataStoreConfig = dbConfig.stores[STORE_NAMES.METADATA];
  const stores: Record<
  string,
  { keyPath: string; indexes: { name: string; keyPath: string | string[]; unique?: boolean }[] }
  > = {
    [MODEL_STORE_NAMES.FILES]: { keyPath: MODEL_KEY_PATHS.URL, indexes: [] },
    [MODEL_STORE_NAMES.MANIFEST]: { keyPath: MODEL_KEY_PATHS.REPO, indexes: [] },
    [MODEL_STORE_NAMES.INFERENCE_SETTINGS]: { keyPath: MODEL_KEY_PATHS.ID, indexes: [] },
  };
  if (metadataStoreConfig) {
    stores[STORE_NAMES.METADATA] = {
      keyPath: metadataStoreConfig.keyPath,
      indexes: metadataStoreConfig.indexes ?? [],
    };
  }

  try {
    await bootstrapModelStorage({
      config: { dbName, version: dbConfig.version, stores },
    });
    logInfo('ModelCache (IDB) initialized');
  } catch {
    // Version mismatch from a stale browser DB — delete and recreate
    logInfo('ModelCache (IDB) open failed, deleting stale DB and retrying');
    try {
      await deleteIDBDatabase(dbName);
      await bootstrapModelStorage({
        config: { dbName, version: dbConfig.version, stores },
      });
      logInfo('ModelCache (IDB) initialized after reset');
    } catch (retryError) {
      logError('Failed to initialize ModelCache', { error: retryError });
    }
  }
}

export function isProduction(): boolean {
  return typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV !== true;
}

export function getMobileBackendFactory(): (() => NativeStorageBackend | Promise<NativeStorageBackend>) | null {
  return mobileBackendFactory;
}
