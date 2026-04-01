import { IndexedDBService } from '@/core/IndexedDBService';
import { DB_NAMES, STORE_NAMES } from '@/idb/idbConstants';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;

export interface IndexedDBFileEntry {
  url: string;
  blob: Blob;
}

export interface CachedAsset {
  guid: string;
  path: string;
  content: string;
}

export interface CachedManifest {
  key: string;
  content: string;
  cachedAt: number;
  expiresAt: number;
  assetGuids: string[];
  etag?: string | null;
}

const ASSET_MANIFEST_CACHE_KEY = 'asset-manifest';
const GUID_ASSET_URL_PATTERN = /^\/Resources\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.asset$/i;

export class AssetCache {
  private static instance: AssetCache | null = null;
  private dbService: IndexedDBService;
  private static readonly LOG_ASSET_CACHE = false;

  private constructor() {
    const dbConfig = {
      dbName: DB_NAMES.MODELS,
      version: 3,
      stores: {
        [STORE_NAMES.FILES]: {
          keyPath: 'url',
          indexes: [],
        },
        [STORE_NAMES.MANIFEST]: {
          keyPath: 'key',
          indexes: [],
        },
      },
    };
    this.dbService = new IndexedDBService(dbConfig);
  }

  static getInstance(): AssetCache {
    if (!AssetCache.instance) {
      AssetCache.instance = new AssetCache();
    }
    return AssetCache.instance;
  }

  async initialize(): Promise<void> {
    await this.dbService.openDB();
  }

  private logInfo(message: string, data?: unknown): void {
    if (AssetCache.LOG_ASSET_CACHE) {
      log.logInfo(`[AssetCache] ${message}`, getStackTrace(), data);
    }
  }

  private logWarn(message: string, data?: unknown): void {
    if (AssetCache.LOG_ASSET_CACHE) {
      log.logWarn(`[AssetCache] ${message}`, getStackTrace(), data);
    }
  }

  private logError(message: string, data?: unknown): void {
    if (AssetCache.LOG_ASSET_CACHE) {
      log.logError(`[AssetCache] ${message}`, getStackTrace(), data);
    }
  }

  async getCachedAssetByGuid(guid: string): Promise<CachedAsset | null> {
    try {
      const url = `/Resources/${guid}.asset`;
      const entry = await this.dbService.get<IndexedDBFileEntry>(STORE_NAMES.FILES, url);
      if (!entry || !entry.blob) {
        return null;
      }
      const content = await entry.blob.text();
      const path = url.replace('/Resources/', '');
      return { guid, path, content };
    } catch (error) {
      this.logWarn('Error getting cached asset by GUID', { guid, error });
      return null;
    }
  }

  async getCachedAssetByPath(path: string): Promise<CachedAsset | null> {
    try {
      const url = path.startsWith('/') ? path : `/Resources/${path}`;
      const entry = await this.dbService.get<IndexedDBFileEntry>(STORE_NAMES.FILES, url);
      if (!entry || !entry.blob) {
        return null;
      }
      const content = await entry.blob.text();
      const guidMatch = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      const guid = guidMatch ? guidMatch[1] : '';
      return { guid, path, content };
    } catch (error) {
      this.logWarn('Error getting cached asset by path', { path, error });
      return null;
    }
  }

  async cacheAsset(
    guid: string,
    path: string,
    content: string,
    contentType: string = 'application/json'
  ): Promise<void> {
    try {
      const url = path.startsWith('/') ? path : `/Resources/${path}`;
      const contentBlob = new Blob([content], { type: contentType });

      const entry: IndexedDBFileEntry = {
        url,
        blob: contentBlob,
      };

      await this.dbService.set(STORE_NAMES.FILES, entry);
      this.logInfo(`Cached asset: guid:${guid.substring(0, 8)}... path:${path} (${(content.length / 1024).toFixed(2)}KB)`);
    } catch (error) {
      this.logError('Error caching asset', { guid, path, error });
      throw error;
    }
  }

  async batchCacheAssets(assets: Array<{ guid: string; path: string; content: string }>): Promise<void> {
    try {
      for (const asset of assets) {
        await this.cacheAsset(asset.guid, asset.path, asset.content);
      }
      this.logInfo(`Batch cached ${assets.length} assets`);
    } catch (error) {
      this.logError('Error batch caching assets', { count: assets.length, error });
      throw error;
    }
  }

  async getCachedManifest(key: string = ASSET_MANIFEST_CACHE_KEY): Promise<CachedManifest | null> {
    try {
      return await this.dbService.get<CachedManifest>(STORE_NAMES.MANIFEST, key);
    } catch (error) {
      this.logWarn('Error getting cached manifest', { key, error });
      return null;
    }
  }

  async cacheManifest(
    content: string,
    expiresAt: number,
    assetGuids: string[],
    key: string = ASSET_MANIFEST_CACHE_KEY,
    etag: string | null = null
  ): Promise<void> {
    try {
      const entry: CachedManifest = {
        key,
        content,
        cachedAt: Date.now(),
        expiresAt,
        assetGuids: [...new Set(assetGuids)],
        etag,
      };
      await this.dbService.set(STORE_NAMES.MANIFEST, entry);
      this.logInfo('Cached manifest', {
        key,
        assetCount: entry.assetGuids.length,
        expiresAt,
      });
    } catch (error) {
      this.logError('Error caching manifest', { key, error });
      throw error;
    }
  }

  async removeStaleAssets(validGuids: string[]): Promise<string[]> {
    try {
      const valid = new Set(validGuids.map((guid) => guid.toLowerCase()));
      const entries = await this.dbService.getAll<IndexedDBFileEntry>(STORE_NAMES.FILES);
      const removed: string[] = [];

      for (const entry of entries) {
        const match = entry.url.match(GUID_ASSET_URL_PATTERN);
        if (!match) {
          continue;
        }

        const guid = match[1].toLowerCase();
        if (valid.has(guid)) {
          continue;
        }

        await this.dbService.delete(STORE_NAMES.FILES, entry.url);
        removed.push(match[1]);
      }

      if (removed.length > 0) {
        this.logInfo('Removed stale cached assets', { removed });
      }

      return removed;
    } catch (error) {
      this.logWarn('Error removing stale cached assets', { error });
      return [];
    }
  }
}
