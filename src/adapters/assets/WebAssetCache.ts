import type { RuntimeAssetCache, RuntimeCachedAsset, RuntimeEntryIndexCacheEntry } from '@/adapters/assets/RuntimeAssetCache';
import { AssetCache } from '@ocentra/storage-domain/caches/AssetCacheService';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class WebAssetCache implements RuntimeAssetCache {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await AssetCache.getInstance().initialize();
    this.initialized = true;
  }

  async getCachedEntryIndex(): Promise<RuntimeEntryIndexCacheEntry | null> {
    await this.initialize();
    return await AssetCache.getInstance().getCachedManifest();
  }

  async cacheEntryIndex(
    content: string,
    expiresAt: number,
    assetGuids: string[],
    etag: string | null = null
  ): Promise<void> {
    await this.initialize();
    await AssetCache.getInstance().cacheManifest(content, expiresAt, assetGuids, undefined, etag);
  }

  async getCachedAssetByGuid(guid: string): Promise<RuntimeCachedAsset | null> {
    await this.initialize();
    const cached = await AssetCache.getInstance().getCachedAssetByGuid(guid);
    if (!cached) {
      return null;
    }

    return {
      guid: cached.guid,
      path: cached.path,
      content: encoder.encode(cached.content),
      contentType: HttpContentType.ApplicationJson,
    };
  }

  async cacheAsset(
    guid: string,
    path: string,
    content: Uint8Array,
    contentType: string = HttpContentType.ApplicationJson
  ): Promise<void> {
    await this.initialize();
    await AssetCache.getInstance().cacheAsset(guid, path, decoder.decode(content), contentType);
  }

  async removeStaleAssets(validGuids: string[]): Promise<string[]> {
    await this.initialize();
    return await AssetCache.getInstance().removeStaleAssets(validGuids);
  }
}
