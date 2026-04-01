import type { IndexedDBConfig } from '@/types/config';
import { getLogger } from '@/logger/runtime';
import { TRANSACTION_MODES, VALIDATION_LIMITS, ERROR_MESSAGES } from '@/constants/validation';

export type { IndexedDBConfig, IndexedDBStoreConfig } from '@/types/config';

type StoreInstance = Map<string, IDBDatabase>;

const dbInstances: StoreInstance = new Map();

export class IndexedDBService {
  private config: IndexedDBConfig;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(config: IndexedDBConfig) {
    this.config = config;
  }

  async openDB(): Promise<IDBDatabase> {
    return this.openDBInternal();
  }

  private async openDBInternal(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      throw new Error(
        'IndexedDB not available. Ensure you are running in a browser or Electron renderer.'
      );
    }
    const log = getLogger();
    const cacheKey = `${this.config.dbName}_v${this.config.version}`;

    if (this.db) {
      try {
        this.db.transaction([Object.keys(this.config.stores)[0]], TRANSACTION_MODES.READONLY);
        return this.db;
      } catch {
        this.db = null;
      }
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    const cachedDb = dbInstances.get(cacheKey);
    if (cachedDb) {
      try {
        cachedDb.transaction([Object.keys(this.config.stores)[0]], TRANSACTION_MODES.READONLY);
        this.db = cachedDb;
        return cachedDb;
      } catch {
        dbInstances.delete(cacheKey);
      }
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        this.initPromise = null;
        log.error(`[IndexedDBService] Failed to open DB: ${this.config.dbName}`, request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        dbInstances.set(cacheKey, this.db);

        this.db.onclose = () => {
          dbInstances.delete(cacheKey);
          this.db = null;
        };

        this.db.onerror = (event) => {
          log.error(`[IndexedDBService] Database error: ${this.config.dbName}`, event);
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion ?? this.config.version;

        if (oldVersion === 0) {
          for (const [storeName, storeConfig] of Object.entries(this.config.stores)) {
            if (!db.objectStoreNames.contains(storeName)) {
              const store = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
              if (storeConfig.indexes) {
                for (const index of storeConfig.indexes) {
                  store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
                }
              }
              log.info(`[IndexedDBService] Created object store: ${storeName} in ${this.config.dbName}`);
            }
          }
        } else if (this.config.migrations != null && transaction != null) {
          for (const migration of this.config.migrations) {
            if (oldVersion < migration.toVersion && newVersion >= migration.toVersion) {
              try {
                log.info(
                  `[IndexedDBService] Running migration from v${migration.fromVersion} to v${migration.toVersion}`
                );
                const result = migration.migrate(db, transaction);
                if (result instanceof Promise) {
                  result.catch((error) => {
                    log.error('[IndexedDBService] Migration failed:', error);
                    throw error;
                  });
                }
              } catch (error) {
                log.error('[IndexedDBService] Migration error:', error);
                throw error;
              }
            }
          }
        }

        if (transaction != null) {
          for (const [storeName, storeConfig] of Object.entries(this.config.stores)) {
            if (!db.objectStoreNames.contains(storeName)) {
              const store = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
              if (storeConfig.indexes) {
                for (const index of storeConfig.indexes) {
                  store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
                }
              }
              log.info(`[IndexedDBService] Created object store: ${storeName} in ${this.config.dbName}`);
            } else if (storeConfig.indexes) {
              const store = transaction.objectStore(storeName);
              for (const index of storeConfig.indexes) {
                if (!store.indexNames.contains(index.name)) {
                  store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
                  log.info(`[IndexedDBService] Created index: ${index.name} on ${storeName}`);
                }
              }
            }
          }
        }
      };
    });

    return this.initPromise;
  }

  private validateStoreName(storeName: string): void {
    if (this.config.stores[storeName] == null) {
      throw new Error(`${ERROR_MESSAGES.INVALID_STORE_NAME}: ${storeName}`);
    }
    if (
      typeof storeName !== 'string' ||
      storeName.length > VALIDATION_LIMITS.MAX_STORE_NAME_LENGTH
    ) {
      throw new Error(`${ERROR_MESSAGES.INVALID_STORE_NAME}: invalid format`);
    }
  }

  private validateKey(key: string): void {
    if (
      typeof key !== 'string' ||
      key.length === 0 ||
      key.length > VALIDATION_LIMITS.MAX_KEY_LENGTH
    ) {
      throw new Error(
        `${ERROR_MESSAGES.INVALID_KEY_FORMAT}: key length must be 1-${VALIDATION_LIMITS.MAX_KEY_LENGTH}`
      );
    }
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    const log = getLogger();
    this.validateStoreName(storeName);
    this.validateKey(key);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READONLY);
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => {
          log.warn(`[IndexedDBService] Failed to get from ${storeName}:`, { key });
          reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
        };

        request.onsuccess = () => {
          resolve(request.result ?? null);
        };
      });
    } catch (error) {
      log.warn(`[IndexedDBService] Error getting from ${storeName}:`, { key, error });
      return null;
    }
  }

  async set<T>(storeName: string, value: T): Promise<void> {
    const log = getLogger();
    this.validateStoreName(storeName);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READWRITE);
        const store = transaction.objectStore(storeName);
        const request = store.put(value);
        let settled = false;

        transaction.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        transaction.onabort = () => {
          if (!settled) {
            settled = true;
            reject(new Error('Transaction aborted'));
          }
        };

        transaction.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${transaction.error}`));
          }
        };

        request.onerror = () => {
          const err = request.error;
          const isQuotaExceeded =
            err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
          if (isQuotaExceeded) {
            log.error(
              `[IndexedDBService] Quota exceeded in ${storeName}. Consider evicting old entries.`,
              err
            );
          }
          log.error(`[IndexedDBService] Failed to set in ${storeName}:`, err);
          if (!settled) {
            settled = true;
            reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${err}`));
          }
        };
      });
    } catch (error) {
      log.error(`[IndexedDBService] Error setting in ${storeName}:`, { error });
      throw error;
    }
  }

  async delete(storeName: string, key: string): Promise<void> {
    const log = getLogger();
    this.validateStoreName(storeName);
    this.validateKey(key);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READWRITE);
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        let settled = false;

        transaction.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        transaction.onabort = () => {
          if (!settled) {
            settled = true;
            reject(new Error('Transaction aborted'));
          }
        };

        transaction.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${transaction.error}`));
          }
        };

        request.onerror = () => {
          log.warn(`[IndexedDBService] Failed to delete from ${storeName}:`, { key });
          if (!settled) {
            settled = true;
            reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
          }
        };
      });
    } catch (error) {
      log.warn(`[IndexedDBService] Error deleting from ${storeName}:`, { key, error });
      throw error;
    }
  }

  async clear(storeName: string): Promise<void> {
    const log = getLogger();
    this.validateStoreName(storeName);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READWRITE);
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        let settled = false;

        transaction.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };

        transaction.onabort = () => {
          if (!settled) {
            settled = true;
            reject(new Error('Transaction aborted'));
          }
        };

        transaction.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${transaction.error}`));
          }
        };

        request.onerror = () => {
          log.error(`[IndexedDBService] Failed to clear ${storeName}:`, request.error);
          if (!settled) {
            settled = true;
            reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
          }
        };
      });
    } catch (error) {
      log.error(`[IndexedDBService] Error clearing ${storeName}:`, { error });
      throw error;
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const log = getLogger();
    this.validateStoreName(storeName);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READONLY);
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => {
          log.warn(`[IndexedDBService] Failed to getAll from ${storeName}:`);
          reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
        };

        request.onsuccess = () => resolve(request.result ?? []);
      });
    } catch (error) {
      log.warn(`[IndexedDBService] Error getAll from ${storeName}:`, { error });
      return [];
    }
  }

  async count(storeName: string): Promise<number> {
    const log = getLogger();
    this.validateStoreName(storeName);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READONLY);
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onerror = () => {
          log.warn(`[IndexedDBService] Failed to count ${storeName}:`);
          reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
        };

        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      log.warn(`[IndexedDBService] Error counting ${storeName}:`, { error });
      return 0;
    }
  }

  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    query: IDBKeyRange | string | number
  ): Promise<T[]> {
    const log = getLogger();
    this.validateStoreName(storeName);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READONLY);
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(query);

        request.onerror = () => {
          log.warn(`[IndexedDBService] Failed to query ${indexName} in ${storeName}:`);
          reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
        };

        request.onsuccess = () => resolve(request.result ?? []);
      });
    } catch (error) {
      log.warn(`[IndexedDBService] Error querying ${indexName} in ${storeName}:`, { error });
      return [];
    }
  }

  async iterateByIndex<T>(
    storeName: string,
    indexName: string,
    direction: 'next' | 'prev' = 'next',
    callback: (value: T) => boolean | void
  ): Promise<void> {
    const log = getLogger();
    this.validateStoreName(storeName);
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], TRANSACTION_MODES.READONLY);
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.openCursor(null, direction);

        request.onerror = () => {
          log.warn(`[IndexedDBService] Failed to iterate ${indexName} in ${storeName}:`);
          reject(new Error(`${ERROR_MESSAGES.DATABASE_ERROR}: ${request.error}`));
        };

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor != null) {
            const shouldContinue = callback(cursor.value);
            if (shouldContinue !== false) {
              cursor.continue();
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      log.warn(`[IndexedDBService] Error iterating ${indexName} in ${storeName}:`, { error });
      throw error;
    }
  }

  async transaction<T>(
    storeNames: string[],
    mode: 'readonly' | 'readwrite',
    operations: (tx: {
      get: <T>(storeName: string, key: string) => Promise<T | null>;
      set: <T>(storeName: string, value: T) => Promise<void>;
      delete: (storeName: string, key: string) => Promise<void>;
      getAll: <T>(storeName: string) => Promise<T[]>;
    }) => Promise<T>
  ): Promise<T> {
    const log = getLogger();
    for (const storeName of storeNames) {
      this.validateStoreName(storeName);
    }

    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode);

      const transactionOps = {
        get: <T>(storeName: string, key: string): Promise<T | null> =>
          new Promise((res, rej) => {
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => res(request.result ?? null);
            request.onerror = () => rej(request.error);
          }),
        set: <T>(storeName: string, value: T): Promise<void> =>
          new Promise((res, rej) => {
            const store = transaction.objectStore(storeName);
            const request = store.put(value);
            request.onsuccess = () => res();
            request.onerror = () => rej(request.error);
          }),
        delete: (storeName: string, key: string): Promise<void> =>
          new Promise((res, rej) => {
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => res();
            request.onerror = () => rej(request.error);
          }),
        getAll: <T>(storeName: string): Promise<T[]> =>
          new Promise((res, rej) => {
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => res(request.result ?? []);
            request.onerror = () => rej(request.error);
          }),
      };

      transaction.onerror = () => {
        const err = transaction.error;
        const isQuotaExceeded =
          err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
        if (isQuotaExceeded) {
          log.error(
            '[IndexedDBService] Quota exceeded during transaction. Consider evicting old entries.',
            err
          );
        }
        log.error('[IndexedDBService] Transaction error:', err);
        reject(err);
      };

      transaction.onabort = () => {
        log.warn('[IndexedDBService] Transaction aborted:');
        reject(new Error('Transaction aborted'));
      };

      operations(transactionOps)
        .then((result) => {
          transaction.oncomplete = () => resolve(result);
        })
        .catch((error) => {
          transaction.abort();
          reject(error);
        });
    });
  }

  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}
