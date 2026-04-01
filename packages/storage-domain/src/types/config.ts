export interface IndexedDBStoreConfig {
  keyPath: string;
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    unique?: boolean;
  }>;
}

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: Record<string, IndexedDBStoreConfig>;
  migrations?: Array<{
    fromVersion: number;
    toVersion: number;
    migrate: (db: IDBDatabase, transaction: IDBTransaction) => Promise<void> | void;
  }>;
}

export interface CacheConfig {
  dbName: string;
  storeName: string;
  version: number;
  keyPath: string;
  indexName?: string;
  maxSize?: number;
  additionalIndexes?: Array<{
    name: string;
    keyPath: string | string[];
    unique?: boolean;
  }>;
}

export interface CacheStats {
  count: number;
  totalSize: number;
}

