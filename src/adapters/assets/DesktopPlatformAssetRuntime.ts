import type { ResourceRequest } from '@ocentra/network-domain/router-types';
import type { StorageConfig } from '@/services/storage/StorageConfig';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { setCachedSlice } from '@/adapters/assets/ContentSliceCache';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';
import { measureRuntimeAssetOperation } from '@/adapters/assets/RuntimeAssetTelemetry';
import {
  type PlatformAssetRequest,
  type PlatformAssetFetchOptions,
  type PlatformAssetRuntime,
  type PlatformAssetRuntimeDebugInfo,
  ENTRY_INDEX_TTL_MS,
  resolveAssetDownloadUrl,
  getCachedJsonSlice,
  setCachedJsonSlice,
  getSliceUrl,
  getEntryIndexAssetGuids,
  parseEntryIndexPayload,
  parseHomePageGamesPayload,
  parseGameCatalogPayload,
  parseAppPageSlicePayload,
  parseGamePagePayload,
  parseGameEnginePayload,
  prefetchCoreSlicesInternal,
  toCachedAssetResponse,
  toArrayBufferCopy,
  responseToArrayBuffer,
  toResponse,
  getEntryIndexUrl,
  runWithConcurrency,
  DEFAULT_PLATFORM_ASSET_FETCH_CONCURRENCY,
  type JsonSliceFetchOptions,
} from '@/adapters/assets/PlatformAssetRuntimeShared';
import { fetchJsonSlice } from '@/adapters/assets/PlatformAssetRuntimeShared';

interface DesktopNativeFetchPayload {
  status: number;
  content: number[] | Uint8Array;
  contentType?: string | null;
  etag?: string | null;
}

async function invokeDesktopFetch(url: string, ifNoneMatch?: string | null): Promise<Response> {
  const { invoke } = await import('@tauri-apps/api/core');
  const payload = await invoke<DesktopNativeFetchPayload>('fetch_remote_resource', {
    url,
    ifNoneMatch: ifNoneMatch ?? null,
  });
  const bytes =
    payload.content instanceof Uint8Array ? payload.content : Uint8Array.from(payload.content);
  return toResponse(bytes, payload.status, payload.contentType ?? undefined, payload.etag ?? null);
}

async function fetchDesktopJsonSlice<T>(
  url: string,
  parse: (payload: unknown) => T | null,
  options: JsonSliceFetchOptions = {}
): Promise<T | null> {
  if (!url) {
    return null;
  }

  if (!options.bypassCache) {
    const cached = await getCachedJsonSlice<T>(url);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    const response = await invokeDesktopFetch(url);
    if (!response.ok) {
      await response.text().catch(() => undefined);
      return null;
    }

    const payload = (await response.json()) as unknown;
    const parsed = parse(payload);
    if (parsed !== null) {
      await setCachedJsonSlice(url, parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

async function fetchDesktopAssetResponse(
  request: PlatformAssetRequest,
  storageConfig: StorageConfig,
  ifNoneMatch?: string | null
): Promise<Response> {
  const resolved = await resolveAssetDownloadUrl(request, storageConfig);
  return await invokeDesktopFetch(resolved, ifNoneMatch);
}

async function fetchEntryIndexFromSlices(url: string) {
  const payload = await fetchJsonSlice<unknown>(url);
  return parseEntryIndexPayload(payload);
}

class DesktopPlatformAssetRuntimeImpl implements PlatformAssetRuntime {
  private readonly cache = new DesktopAssetCache();

  async getEntryIndex(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'entryIndex', async () => {
      const url = getEntryIndexUrl(storageConfig);
      if (!url) {
        return null;
      }

      const cachedEntryIndex = await this.cache.getCachedEntryIndex();

      try {
        const response = await invokeDesktopFetch(url, cachedEntryIndex?.etag ?? null);

        if (response.status === 304 && cachedEntryIndex) {
          return parseEntryIndexPayload(JSON.parse(cachedEntryIndex.content));
        }

        if (response.ok) {
          const payload = (await response.json()) as unknown;
          const entryIndex = parseEntryIndexPayload(payload);
          if (!entryIndex) {
            return null;
          }
          const content = JSON.stringify(entryIndex);
          await this.cache.cacheEntryIndex(
            content,
            Date.now() + ENTRY_INDEX_TTL_MS,
            getEntryIndexAssetGuids(entryIndex),
            response.headers.get('etag')
          );
          void setCachedSlice(url, entryIndex);
          return entryIndex;
        }
      } catch {
        void 0;
      }

      if (cachedEntryIndex) {
        return parseEntryIndexPayload(JSON.parse(cachedEntryIndex.content));
      }

      return await fetchEntryIndexFromSlices(url);
    });
  }

  async getHomePageGames(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'homePageGames', async () =>
      fetchDesktopJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.Home),
        parseHomePageGamesPayload,
        { bypassCache: true }
      )
    );
  }

  async getGameCatalog(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'gameCatalog', async () =>
      fetchDesktopJsonSlice(getSliceUrl(storageConfig, ApiEndpoint.Slices.Games), parseGameCatalogPayload)
    );
  }

  async getAppPageSlice(pageId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'appPageSlice', async () =>
      fetchDesktopJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.AppPage(pageId)),
        parseAppPageSlicePayload
      )
    );
  }

  async getSelectedGamePage(gameId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'selectedGamePage', async () =>
      fetchDesktopJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.GamePage(gameId)),
        parseGamePagePayload
      )
    );
  }

  async getGameEngine(gameId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'gameEngine', async () =>
      fetchDesktopJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.GameEngine(gameId)),
        parseGameEnginePayload
      )
    );
  }

  async prefetchCoreSlices(storageConfig: StorageConfig) {
    await measureRuntimeAssetOperation('desktop', 'prefetchCoreSlices', async () => {
      await prefetchCoreSlicesInternal(this, storageConfig);
    });
  }

  async prefetchAssets(
    requests: PlatformAssetRequest[],
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    await measureRuntimeAssetOperation('desktop', 'prefetchAssets', async () => {
      const limit = options?.fetchConcurrency ?? DEFAULT_PLATFORM_ASSET_FETCH_CONCURRENCY;
      await runWithConcurrency(requests, limit, async (request) => {
        try {
          await this.fetchAsset(request, storageConfig, options);
        } catch {
          void 0;
        }
      });
    });
  }

  async getAssetByGuid(
    guid: string,
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    return await measureRuntimeAssetOperation('desktop', 'assetByGuid', async () =>
      this.fetchAsset({ guid }, storageConfig, options)
    );
  }

  async getAssetByHash(hash: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'assetByHash', async () =>
      this.fetchAsset({ hash }, storageConfig)
    );
  }

  async getAssetByChecksum(checksum: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('desktop', 'assetByChecksum', async () =>
      this.fetchAsset({ checksum }, storageConfig)
    );
  }

  async batchFetchAssets(
    guids: string[],
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    return await measureRuntimeAssetOperation('desktop', 'batchFetchAssets', async () => {
      const results = new Map<string, ArrayBuffer>();
      const uncachedGuids: string[] = [];

      if (options?.useGuidCache) {
        await Promise.all(
          guids.map(async (guid) => {
            const cached = await this.cache.getCachedAssetByGuid(guid);
            if (!cached) {
              uncachedGuids.push(guid);
              return;
            }
            results.set(guid, toArrayBufferCopy(cached.content));
          })
        );
      } else {
        uncachedGuids.push(...guids);
      }

      const limit = options?.fetchConcurrency ?? DEFAULT_PLATFORM_ASSET_FETCH_CONCURRENCY;
      const fetched = await runWithConcurrency(uncachedGuids, limit, async (guid) => {
        const response = await this.fetchAsset({ guid }, storageConfig, options);
        const payload = await responseToArrayBuffer(response);
        return { guid, payload } as const;
      });
      for (const { guid, payload } of fetched) {
        if (payload) {
          results.set(guid, payload);
        }
      }

      return results;
    });
  }

  async fetchAsset(
    request: Pick<ResourceRequest, 'guid' | 'hash' | 'checksum'>,
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    return await measureRuntimeAssetOperation('desktop', 'fetchAsset', async () => {
      if (request.guid && options?.useGuidCache) {
        const cached = await this.cache.getCachedAssetByGuid(request.guid);
        if (cached) {
          return toCachedAssetResponse(cached.content, cached.contentType);
        }
      }

      const response = await fetchDesktopAssetResponse(request, storageConfig);

      if (response.ok && request.guid && options?.useGuidCache) {
        const cloned = response.clone();
        void cloned.arrayBuffer().then((buffer) => {
          const contentType = response.headers.get('content-type') ?? HttpContentType.ApplicationJson;
          void this.cache.cacheAsset(
            request.guid!,
            `${request.guid}.asset`,
            new Uint8Array(buffer),
            contentType
          );
        });
      }

      return response;
    });
  }

  getDebugInfo(): PlatformAssetRuntimeDebugInfo {
    return {
      runtime: 'desktop',
      transportMode: 'desktop-native-fetch',
      sliceCacheMode: 'native-backend',
      imageCacheMode: 'desktop-native',
      supportsNativeFetch: true,
    };
  }
}

let instance: PlatformAssetRuntime | null = null;

export function getDesktopPlatformAssetRuntime(): PlatformAssetRuntime {
  if (!instance) {
    instance = new DesktopPlatformAssetRuntimeImpl();
  }
  return instance;
}
