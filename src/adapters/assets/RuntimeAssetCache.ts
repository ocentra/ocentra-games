export interface RuntimeEntryIndexCacheEntry {
  content: string;
  cachedAt: number;
  expiresAt: number;
  assetGuids: string[];
  etag?: string | null;
}

export interface RuntimeCachedAsset {
  guid: string;
  path: string;
  content: Uint8Array;
  contentType: string;
}

export interface RuntimeAssetCache {
  initialize(): Promise<void>;
  getCachedEntryIndex(): Promise<RuntimeEntryIndexCacheEntry | null>;
  cacheEntryIndex(content: string, expiresAt: number, assetGuids: string[], etag?: string | null): Promise<void>;
  getCachedAssetByGuid(guid: string): Promise<RuntimeCachedAsset | null>;
  cacheAsset(guid: string, path: string, content: Uint8Array, contentType?: string): Promise<void>;
  removeStaleAssets(validGuids: string[]): Promise<string[]>;
}
