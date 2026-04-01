import type { IndexedDBConfig } from '@/types/config';
import type { CacheConfig, CacheStats } from '@/types/config';
import { IndexedDBService } from '@/core/IndexedDBService';
import { getLogger } from '@/logger/runtime';

export type { CacheConfig, CacheStats } from '@/types/config';

export class BaseCache<TRecord extends Record<string, unknown>> {
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
  protected readonly dbService: IndexedDBService;
  protected readonly config: CacheConfig;
  protected readonly logModule: string;

  constructor(config: CacheConfig, logModule: string) {
    this.config = config;
    this.logModule = logModule;

    const indexes: Array<{ name: string; keyPath: string | string[]; unique?: boolean }> = [];
    if (config.indexName != null) {
      indexes.push({ name: config.indexName, keyPath: config.indexName, unique: false });
    }
    if (config.additionalIndexes != null) {
      indexes.push(...config.additionalIndexes);
    }

    const dbConfig: IndexedDBConfig = {
      dbName: config.dbName,
      version: config.version,
      stores: {
        [config.storeName]: {
          keyPath: config.keyPath,
          indexes,
        },
      },
    };

    this.dbService = new IndexedDBService(dbConfig);
  }

  async initialize(): Promise<void> {
    await this.dbService.openDB();
  }

  protected logInfo(message: string, data?: unknown): void {
    getLogger().info(`[${this.logModule}] ${message}`, data);
  }

  protected logWarn(message: string, data?: unknown): void {
    getLogger().warn(`[${this.logModule}] ${message}`, data);
  }

  protected logError(message: string, data?: unknown): void {
    getLogger().error(`[${this.logModule}] ${message}`, data);
  }

  async get(key: string): Promise<TRecord | null> {
    try {
      return await this.dbService.get<TRecord>(this.config.storeName, key);
    } catch (error) {
      this.logWarn('Get error', { key, error });
      return null;
    }
  }

  async set(record: TRecord): Promise<void> {
    try {
      await this.dbService.set(this.config.storeName, record);
    } catch (error) {
      this.logError('Set error', { error });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.dbService.delete(this.config.storeName, key);
    } catch (error) {
      this.logWarn('Delete error', { key, error });
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.dbService.clear(this.config.storeName);
    } catch (error) {
      this.logError('Clear error', { error });
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const result = await this.get(key);
      return result !== null;
    } catch (error) {
      this.logWarn('Has error', { key, error });
      return false;
    }
  }

  async getAll(): Promise<TRecord[]> {
    try {
      return await this.dbService.getAll<TRecord>(this.config.storeName);
    } catch (error) {
      this.logWarn('GetAll error', { error });
      return [];
    }
  }

  async count(): Promise<number> {
    try {
      return await this.dbService.count(this.config.storeName);
    } catch (error) {
      this.logWarn('Count error', { error });
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const records = await this.getAll();
      const totalSize = records.reduce((sum, record) => {
        const size = (record as { size?: number }).size ?? 0;
        return sum + size;
      }, 0);
      return { count: records.length, totalSize };
    } catch (error) {
      this.logWarn('GetStats error', { error });
      return { count: 0, totalSize: 0 };
    }
  }

  async queryByIndex<T = TRecord>(
    indexName: string,
    query: IDBKeyRange | string | number
  ): Promise<T[]> {
    try {
      return await this.dbService.queryByIndex<T>(
        this.config.storeName,
        indexName,
        query
      );
    } catch (error) {
      this.logWarn('QueryByIndex error', { indexName, error });
      return [];
    }
  }

  async iterateByIndex(
    indexName: string,
    direction: 'next' | 'prev',
    callback: (value: TRecord) => boolean | void
  ): Promise<void> {
    try {
      await this.dbService.iterateByIndex(
        this.config.storeName,
        indexName,
        direction,
        callback
      );
    } catch (error) {
      this.logWarn('IterateByIndex error', { indexName, error });
      throw error;
    }
  }

  async evictByCount(
    maxCount: number,
    indexName: string,
    getKey: (record: TRecord) => string
  ): Promise<number> {
    try {
      const count = await this.count();
      if (count <= maxCount) return 0;

      const deleteCount = count - maxCount;
      const toDelete: string[] = [];

      await this.iterateByIndex(indexName, 'next', (value) => {
        if (toDelete.length < deleteCount) {
          toDelete.push(getKey(value));
          return true;
        }
        return false;
      });

      if (toDelete.length > 0) {
        await Promise.all(toDelete.map((key) => this.delete(key)));
        this.logInfo(`Evicted ${toDelete.length} entries (count limit: ${maxCount})`);
      }
      return toDelete.length;
    } catch (error) {
      this.logWarn('EvictByCount error', { maxCount, indexName, error });
      return 0;
    }
  }

  async evictBySize(
    maxSize: number,
    indexName: string,
    getKey: (record: TRecord) => string,
    getSize: (record: TRecord) => number
  ): Promise<number> {
    try {
      const stats = await this.getStats();
      if (stats.totalSize <= maxSize) return 0;

      const toDelete: string[] = [];
      let currentSize = stats.totalSize;

      await this.iterateByIndex(indexName, 'next', (record) => {
        if (currentSize > maxSize) {
          toDelete.push(getKey(record));
          currentSize -= getSize(record);
          return true;
        }
        return false;
      });

      if (toDelete.length > 0) {
        await Promise.all(toDelete.map((key) => this.delete(key)));
        this.logInfo(
          `Evicted ${toDelete.length} entries (size limit: ${(maxSize / 1024 / 1024).toFixed(2)}MB)`
        );
      }
      return toDelete.length;
    } catch (error) {
      this.logWarn('EvictBySize error', { maxSize, indexName, error });
      return 0;
    }
  }

  protected isExpired(
    record: TRecord,
    expiryMs: number,
    getTimestamp: (record: TRecord) => number
  ): boolean {
    const timestamp = getTimestamp(record);
    const age = Date.now() - timestamp;
    return age >= expiryMs;
  }
}
