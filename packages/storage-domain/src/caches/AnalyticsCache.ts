import { BaseCache, type CacheConfig } from '@/core/BaseCache';
import { DB_NAMES, STORE_NAMES, KEY_PATHS, INDEX_NAMES, DB_VERSIONS, CACHE_LIMITS, CACHE_KEYS } from '@/idb/idbConstants';

export interface AnalyticsCacheData {
  logs: unknown[];
  stats: unknown | null;
  timestamp: number;
  oldestLogTimestamp?: number;
  newestLogTimestamp?: number;
  lastSyncTimestamp?: number;
}

interface CacheRecord extends Record<string, unknown> {
  key: string;
  data: AnalyticsCacheData;
  timestamp: number;
}

export class AnalyticsCache extends BaseCache<CacheRecord> {
  private static instance: AnalyticsCache | null = null;

  private constructor() {
    const config: CacheConfig = {
      dbName: DB_NAMES.ANALYTICS_CACHE,
      storeName: STORE_NAMES.ANALYTICS,
      version: DB_VERSIONS.V1,
      keyPath: KEY_PATHS.KEY,
      indexName: INDEX_NAMES.TIMESTAMP,
    };
    super(config, 'AnalyticsCache');
  }

  static getInstance(): AnalyticsCache {
    if (!AnalyticsCache.instance) {
      AnalyticsCache.instance = new AnalyticsCache();
    }
    return AnalyticsCache.instance;
  }

  async getCachedData(): Promise<AnalyticsCacheData | null> {
    try {
      const result = await super.get(CACHE_KEYS.ANALYTICS_CACHE);
      if (result && result.data) {
        const cache = result.data;
        if (!this.isExpired(result, CACHE_LIMITS.ANALYTICS_CACHE_EXPIRY_MS, (r) => r.timestamp)) {
          return cache;
        }
      }
      return null;
    } catch (error) {
      this.logWarn('Failed to get cache', { error });
      return null;
    }
  }

  async setCachedData(data: AnalyticsCacheData): Promise<void> {
    try {
      await super.set({
        key: CACHE_KEYS.ANALYTICS_CACHE,
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logError('Failed to set cache', { error });
      throw error;
    }
  }

  async clearCachedData(): Promise<void> {
    try {
      await super.delete(CACHE_KEYS.ANALYTICS_CACHE);
    } catch (error) {
      this.logWarn('Failed to clear cache', { error });
      throw error;
    }
  }
}

export async function getAnalyticsCache(): Promise<AnalyticsCacheData | null> {
  return AnalyticsCache.getInstance().getCachedData();
}

export async function setAnalyticsCache(data: AnalyticsCacheData): Promise<void> {
  return AnalyticsCache.getInstance().setCachedData(data);
}

export async function clearAnalyticsCache(): Promise<void> {
  return AnalyticsCache.getInstance().clearCachedData();
}
