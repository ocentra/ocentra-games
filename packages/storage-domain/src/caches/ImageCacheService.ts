import { BaseCache, type CacheConfig } from '@/core/BaseCache';
import { DB_NAMES, STORE_NAMES, INDEX_NAMES, DB_VERSIONS, CACHE_LIMITS, DEFAULT_CONTENT_TYPES } from '@/idb/idbConstants';
import { IndexedDBService } from '@/core/IndexedDBService';

export const ImageVariant = {
  Icon: 'icon',
  Full: 'full',
} as const;

export type ImageVariant = typeof ImageVariant[keyof typeof ImageVariant];

export const ProcessingState = {
  NotProcessed: 'not_processed',
  Processing: 'processing',
  Processed: 'processed',
} as const;

export type ProcessingState = typeof ProcessingState[keyof typeof ProcessingState];

export interface CachedImage extends Record<string, unknown> {
  id: string;
  variant: ImageVariant;
  blob: Blob;
  etag?: string;
  hash: string;
  cachedAt: number;
  size: number;
  contentType: string;
  processingState: ProcessingState;
  path?: string;
}

export interface ImageCacheManifestEntry {
  hashPrefix: string;
  totalImages: number;
  totalSize: number;
  variants: Record<ImageVariant, number>;
  lastScanned: number;
  lastUpdated: number;
  manifestVersion: number;
}

export class ImageCache extends BaseCache<CachedImage> {
  private static instance: ImageCache | null = null;
  private manifestService: IndexedDBService | null = null;
  private static readonly CURRENT_MANIFEST_VERSION = 2;
  private pendingManifestUpdates = new Set<string>();
  private manifestUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MANIFEST_UPDATE_DEBOUNCE_MS = 2000;
  private static readonly LOG_IMAGE = false;

  protected override logInfo(message: string, data?: unknown): void {
    if (ImageCache.LOG_IMAGE) {
      super.logInfo(message, data);
    }
  }

  protected override logWarn(message: string, data?: unknown): void {
    if (ImageCache.LOG_IMAGE) {
      super.logWarn(message, data);
    }
  }

  protected override logError(message: string, data?: unknown): void {
    if (ImageCache.LOG_IMAGE) {
      super.logError(message, data);
    }
  }

  private constructor() {
    const config: CacheConfig = {
      dbName: DB_NAMES.IMAGE_CACHE,
      storeName: STORE_NAMES.IMAGES,
      version: DB_VERSIONS.V1,
      keyPath: 'id',
      indexName: INDEX_NAMES.CACHED_AT,
      additionalIndexes: [
        { name: 'hash', keyPath: 'hash', unique: false },
        { name: 'variant', keyPath: 'variant', unique: false },
        { name: 'processingState', keyPath: 'processingState', unique: false },
        { name: 'hash_variant', keyPath: ['hash', 'variant'], unique: true },
      ],
    };
    super(config, 'ImageCache');
  }

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  async getCachedImageByHash(hash: string, variant: ImageVariant = ImageVariant.Full): Promise<CachedImage | null> {
    try {
      const id = `${hash}:${variant}`;
      return await super.get(id);
    } catch (error) {
      this.logWarn('Error getting cached image by hash', { hash, variant, error });
      return null;
    }
  }

  async cacheImage(
    hash: string,
    blob: Blob,
    variant: ImageVariant,
    etag?: string,
    contentType?: string,
    processingState: ProcessingState = ProcessingState.Processed,
    path?: string
  ): Promise<void> {
    try {
      const id = `${hash}:${variant}`;

      const existing = await super.get(id);
      if (existing && existing.hash === hash) {
        const updates: Partial<CachedImage> = {};
        if (path && existing.path !== path) {
          updates.path = path;
        }
        if (Object.keys(updates).length > 0) {
          const updated = { ...existing, ...updates };
          await super.set(updated);
        }
        return;
      }

      const cachedImage: CachedImage = {
        id,
        variant,
        blob,
        etag,
        hash,
        cachedAt: Date.now(),
        size: blob.size,
        contentType: contentType || blob.type || DEFAULT_CONTENT_TYPES.IMAGE_PNG,
        processingState,
        path,
      };

      await super.set(cachedImage);
      const pathInfo = path ? ` path:${path}` : '';
      this.logInfo(`Cached image: hash:${hash.substring(0, 8)}... [${variant}]${pathInfo} (${(blob.size / 1024).toFixed(2)}KB)`);

      const hashPrefix = hash.substring(0, 2);
      this.scheduleManifestUpdate(hashPrefix);

      await this.evictOldEntries();
    } catch (error) {
      this.logError('Error caching image', { hash, variant, error });
      throw error;
    }
  }

  async invalidateCacheByHash(hash: string, variant?: ImageVariant): Promise<void> {
    try {
      if (variant) {
        const id = `${hash}:${variant}`;
        await super.delete(id);
        this.logInfo(`Invalidated cache for hash:${hash.substring(0, 8)}... [${variant}]`);
      } else {
        const allVariants = await this.queryByIndex<CachedImage>('hash', hash);
        await Promise.all(allVariants.map(item => super.delete(item.id as string)));
        this.logInfo(`Invalidated all ${allVariants.length} variants for hash:${hash.substring(0, 8)}...`);
      }

      const hashPrefix = hash.substring(0, 2);
      this.scheduleManifestUpdate(hashPrefix);
    } catch (error) {
      this.logWarn('Error invalidating cache by hash', { hash, variant, error });
    }
  }

  async clearCache(): Promise<void> {
    try {
      await super.clear();
      this.logInfo('Cleared all cached images');
    } catch (error) {
      this.logError('Error clearing cache', { error });
      throw error;
    }
  }

  private async evictOldEntries(): Promise<void> {
    try {
      await Promise.all([
        this.evictByCount(
          CACHE_LIMITS.MAX_IMAGE_CACHE_SIZE,
          INDEX_NAMES.CACHED_AT,
          (value) => value.hash
        ),
        this.evictBySize(
          CACHE_LIMITS.DEFAULT_MAX_CACHE_SIZE_BYTES,
          INDEX_NAMES.CACHED_AT,
          (value) => value.hash,
          (value) => value.size
        ),
      ]);
    } catch (error) {
      this.logWarn('Error evicting old entries', { error });
    }
  }

  async calculateImageHash(blob: Blob): Promise<string> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      this.logError('Error calculating image hash', { error });
      throw error;
    }
  }

  private async getManifestService(): Promise<IndexedDBService> {
    if (!this.manifestService) {
      this.manifestService = new IndexedDBService({
        dbName: DB_NAMES.IMAGE_CACHE,
        version: DB_VERSIONS.V1,
        stores: {
          [STORE_NAMES.IMAGES]: {
            keyPath: 'id',
            indexes: [
              { name: 'hash', keyPath: 'hash', unique: false },
              { name: 'variant', keyPath: 'variant', unique: false },
              { name: 'cachedAt', keyPath: 'cachedAt', unique: false },
              { name: 'processingState', keyPath: 'processingState', unique: false },
              { name: 'hash_variant', keyPath: ['hash', 'variant'], unique: true },
            ],
          },
          [STORE_NAMES.MANIFEST]: {
            keyPath: 'hashPrefix',
            indexes: [
              { name: 'lastScanned', keyPath: 'lastScanned', unique: false },
            ],
          },
        },
      });
      await this.manifestService.openDB();
    }
    return this.manifestService;
  }

  async getManifestEntry(hashPrefix: string): Promise<ImageCacheManifestEntry | null> {
    try {
      const service = await this.getManifestService();
      return await service.get<ImageCacheManifestEntry>(STORE_NAMES.MANIFEST, hashPrefix);
    } catch (error) {
      this.logWarn('Error getting manifest entry', { hashPrefix, error });
      return null;
    }
  }

  async addManifestEntry(hashPrefix: string, entry: ImageCacheManifestEntry): Promise<void> {
    try {
      const service = await this.getManifestService();
      if (entry.hashPrefix !== hashPrefix) {
        entry.hashPrefix = hashPrefix;
      }
      if (entry.manifestVersion !== ImageCache.CURRENT_MANIFEST_VERSION) {
        entry.manifestVersion = ImageCache.CURRENT_MANIFEST_VERSION;
      }
      entry.lastUpdated = Date.now();
      await service.set<ImageCacheManifestEntry>(STORE_NAMES.MANIFEST, entry);
    } catch (error) {
      this.logError('Error adding manifest entry', { hashPrefix, error });
      throw error;
    }
  }

  private scheduleManifestUpdate(hashPrefix: string): void {
    this.pendingManifestUpdates.add(hashPrefix);

    if (this.manifestUpdateTimer) {
      clearTimeout(this.manifestUpdateTimer);
    }

    this.manifestUpdateTimer = setTimeout(() => {
      const prefixes = Array.from(this.pendingManifestUpdates);
      this.pendingManifestUpdates.clear();
      this.manifestUpdateTimer = null;

      for (const prefix of prefixes) {
        void this.updateManifestForHashPrefix(prefix).catch(err => {
          this.logWarn('Failed to update manifest', { hashPrefix: prefix, error: err });
        });
      }
    }, ImageCache.MANIFEST_UPDATE_DEBOUNCE_MS);
  }

  async updateManifestForHashPrefix(hashPrefix: string): Promise<void> {
    try {
      const allImages = await this.getAll();
      const prefixImages = allImages.filter(img => {
        const imgHash = img.hash as string;
        return imgHash && imgHash.startsWith(hashPrefix);
      });

      const variants: Record<ImageVariant, number> = {
        [ImageVariant.Icon]: 0,
        [ImageVariant.Full]: 0,
      };

      let totalSize = 0;
      for (const img of prefixImages) {
        const variant = img.variant as ImageVariant;
        if (variant in variants) {
          variants[variant] = (variants[variant] || 0) + 1;
        }
        totalSize += (img.size as number) || 0;
      }

      const manifestEntry: ImageCacheManifestEntry = {
        hashPrefix,
        totalImages: prefixImages.length,
        totalSize,
        variants,
        lastScanned: Date.now(),
        lastUpdated: Date.now(),
        manifestVersion: ImageCache.CURRENT_MANIFEST_VERSION,
      };

      await this.addManifestEntry(hashPrefix, manifestEntry);
    } catch (error) {
      this.logWarn('Error updating manifest for hash prefix', { hashPrefix, error });
    }
  }

  async getManifestEntryLazy(hashPrefix: string): Promise<ImageCacheManifestEntry | null> {
    const manifest = await this.getManifestEntry(hashPrefix);
    if (manifest && Date.now() - manifest.lastScanned < 60000) {
      return manifest;
    }
    return null;
  }

  async ensureManifestForHashPrefix(hashPrefix: string, force: boolean = false): Promise<ImageCacheManifestEntry | null> {
    if (!force) {
      const cached = await this.getManifestEntryLazy(hashPrefix);
      if (cached) return cached;
    }

    await this.updateManifestForHashPrefix(hashPrefix);
    return await this.getManifestEntry(hashPrefix);
  }
}
