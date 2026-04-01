import type { RuntimeAssetCache, RuntimeCachedAsset, RuntimeEntryIndexCacheEntry } from '@/adapters/assets/RuntimeAssetCache';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

interface TauriGlobal {
  __TAURI__?: {
    invoke?: TauriInvoke;
  };
}

interface DesktopCachedEntryIndexPayload {
  content: string;
  cachedAt: number;
  expiresAt: number;
  assetGuids: string[];
  etag?: string | null;
}

interface DesktopCachedAssetPayload {
  guid: string;
  path: string;
  content: number[] | Uint8Array;
  contentType?: string;
}

function getTauriInvoke(): TauriInvoke | null {
  return (globalThis as TauriGlobal).__TAURI__?.invoke ?? null;
}

function normalizeBytes(value: number[] | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  return Uint8Array.from(value);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export class DesktopAssetCache implements RuntimeAssetCache {
  static isAvailable(): boolean {
    return typeof getTauriInvoke() === 'function';
  }

  async initialize(): Promise<void> {
    return;
  }

  async getCachedEntryIndex(): Promise<RuntimeEntryIndexCacheEntry | null> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return null;
    }

    const entryIndex = await invoke<DesktopCachedEntryIndexPayload | null>('get_cached_entry_index');
    if (!entryIndex) {
      return null;
    }

    return {
      content: entryIndex.content,
      cachedAt: entryIndex.cachedAt,
      expiresAt: entryIndex.expiresAt,
      assetGuids: entryIndex.assetGuids,
      etag: entryIndex.etag ?? null,
    };
  }

  async cacheEntryIndex(
    content: string,
    expiresAt: number,
    assetGuids: string[],
    etag: string | null = null
  ): Promise<void> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    await invoke('cache_entry_index', {
      content,
      expiresAt,
      assetGuids,
      etag,
    });
  }

  async getCachedAssetByGuid(guid: string): Promise<RuntimeCachedAsset | null> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return null;
    }

    const asset = await invoke<DesktopCachedAssetPayload | null>('get_cached_asset', { guid });
    if (!asset) {
      return null;
    }

    return {
      guid: asset.guid,
      path: asset.path,
      content: normalizeBytes(asset.content),
      contentType: asset.contentType || HttpContentType.ApplicationJson,
    };
  }

  async cacheAsset(
    guid: string,
    path: string,
    content: Uint8Array,
    contentType: string = HttpContentType.ApplicationJson
  ): Promise<void> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    await invoke('cache_asset', {
      guid,
      path,
      content: Array.from(content),
      contentType,
    });
  }

  async removeStaleAssets(validGuids: string[]): Promise<string[]> {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return [];
    }

    return invoke<string[]>('remove_stale_cached_assets', { validGuids });
  }

  async getLocalEntryIndexETag(): Promise<string | null> {
    const entryIndex = await this.getCachedEntryIndex();
    return entryIndex?.etag ?? null;
  }

  async downloadAndCacheEntryIndex(url: string): Promise<RuntimeEntryIndexCacheEntry | null> {
    const response = await fetch(url, {
      headers: await this.getIfNoneMatchHeader(),
    });
    if (response.status === 304) {
      return this.getCachedEntryIndex();
    }
    if (!response.ok) {
      return null;
    }

    const content = await response.text();
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await this.cacheEntryIndex(content, expiresAt, [], response.headers.get('etag'));
    return this.getCachedEntryIndex();
  }

  async isCached(guid: string): Promise<boolean> {
    return (await this.getCachedAssetByGuid(guid)) !== null;
  }

  async downloadAndCacheAsset(guid: string, url: string): Promise<RuntimeCachedAsset | null> {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const content = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || HttpContentType.ApplicationJson;
    await this.cacheAsset(guid, `${guid}.asset`, content, contentType);
    return this.getCachedAssetByGuid(guid);
  }

  async readCachedAsset(guid: string): Promise<ArrayBuffer | null> {
    const asset = await this.getCachedAssetByGuid(guid);
    return asset ? toArrayBuffer(asset.content) : null;
  }

  private async getIfNoneMatchHeader(): Promise<Record<string, string>> {
    const etag = await this.getLocalEntryIndexETag();
    return etag ? { 'If-None-Match': etag } : {};
  }
}
