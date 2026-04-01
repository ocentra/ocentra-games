import type { IndexedDBStoreConfig } from '@/types/config';
import type { ModelCacheAdapter } from '@/model-cache/ModelCacheAdapter';
import { IndexedDBService as IndexedDBServiceClass } from '@/core/IndexedDBService';
import { IDBModelCacheAdapter } from '@/model-cache/IDBModelCacheAdapter';
import { setupStorageDomainEventHandlers } from '@/setupStorageDomainEventHandlers';

let storageTeardown: (() => void) | null = null;

export interface BootstrapModelStorageConfig {
  dbName: string;
  version: number;
  stores: Record<string, IndexedDBStoreConfig>;
}

export interface BootstrapModelStorageOptions {
  config?: BootstrapModelStorageConfig;
  modelCache?: ModelCacheAdapter;
}

export async function bootstrapModelStorage(
  options: BootstrapModelStorageOptions
): Promise<void> {
  let modelCache: ModelCacheAdapter;

  if (options.modelCache) {
    modelCache = options.modelCache;
  } else if (options.config) {
    const { config } = options;
    const service = new IndexedDBServiceClass({
      dbName: config.dbName,
      version: config.version,
      stores: config.stores,
    });
    await service.openDB();
    modelCache = new IDBModelCacheAdapter(service);
  } else {
    throw new Error(
      'bootstrapModelStorage requires either config (for web IDB) or modelCache (for desktop/mobile)'
    );
  }

  if (storageTeardown) {
    storageTeardown();
    storageTeardown = null;
  }
  storageTeardown = setupStorageDomainEventHandlers({ modelCache });
}

export function teardownModelStorage(): void {
  if (storageTeardown) {
    storageTeardown();
    storageTeardown = null;
  }
}
