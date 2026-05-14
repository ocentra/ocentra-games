import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import type { ResourceRequest } from '@ocentra/network-domain/router-types';
import { loadDesktopPlatformAssetRuntime } from '@/adapters/assets/loadDesktopPlatformAssetRuntime';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';
import { measureRuntimeAssetOperation } from '@/adapters/assets/RuntimeAssetTelemetry';
import { getEntryIndexUrl, type StorageConfig } from '@/services/storage/StorageConfig';
import {
  type PlatformAssetFetchOptions,
  type PlatformAssetRequest,
  type PlatformAssetRuntime as IPlatformAssetRuntime,
  type PlatformAssetRuntimeDebugInfo,
  resolveAssetDownloadUrl,
  getSliceUrl,
  parseEntryIndexPayload,
  parseHomePageGamesPayload,
  parseGameCatalogPayload,
  parseAppPageSlicePayload,
  parseGamePagePayload,
  parseGameEnginePayload,
  prefetchCoreSlicesInternal,
  responseToArrayBuffer,
  fetchJsonSlice,
  runWithConcurrency,
  DEFAULT_PLATFORM_ASSET_FETCH_CONCURRENCY,
  type JsonSliceFetchOptions,
} from '@/adapters/assets/PlatformAssetRuntimeShared';

export type {
  PlatformAssetFetchOptions,
  PlatformAssetRequest,
  PlatformAssetRuntime,
  PlatformAssetRuntimeDebugInfo,
} from '@/adapters/assets/PlatformAssetRuntimeShared';

async function fetchEntryIndexFromSlices(url: string) {
  const payload = await fetchJsonSlice<unknown>(url, { bypassCache: true });
  return parseEntryIndexPayload(payload);
}

async function fetchValidatedSlice<T>(
  url: string,
  parse: (payload: unknown) => T | null,
  options?: JsonSliceFetchOptions
): Promise<T | null> {
  if (!url) {
    return null;
  }
  const payload = await fetchJsonSlice<unknown>(url, options);
  return parse(payload);
}

async function fetchMobileJsonSlice<T>(
  url: string,
  parse: (payload: unknown) => T | null,
  options?: JsonSliceFetchOptions
): Promise<T | null> {
  return await fetchValidatedSlice(url, parse, options);
}

async function fetchMobileAssetResponse(
  request: Pick<ResourceRequest, 'guid' | 'hash' | 'checksum'>,
  storageConfig: StorageConfig,
  options?: PlatformAssetFetchOptions
): Promise<Response> {
  const resolved = await resolveAssetDownloadUrl(request, storageConfig);
  return await fetch(resolved, options?.cache ? { cache: options.cache } : undefined);
}

function createLazyDesktopRuntime(): IPlatformAssetRuntime {
  let inner: IPlatformAssetRuntime | null = null;
  let loadPromise: Promise<IPlatformAssetRuntime> | null = null;
  const load = (): Promise<IPlatformAssetRuntime> => {
    if (inner) return Promise.resolve(inner);
    if (!loadPromise) {
      loadPromise = loadDesktopPlatformAssetRuntime();
    }
    return loadPromise.then((r) => {
      inner = r;
      return r;
    });
  };
  return {
    getEntryIndex: (sc) => load().then((r) => r.getEntryIndex(sc)),
    getHomePageGames: (sc) => load().then((r) => r.getHomePageGames(sc)),
    getGameCatalog: (sc) => load().then((r) => r.getGameCatalog(sc)),
    getAppPageSlice: (pageId, sc) => load().then((r) => r.getAppPageSlice(pageId, sc)),
    getSelectedGamePage: (gameId, sc) => load().then((r) => r.getSelectedGamePage(gameId, sc)),
    getGameEngine: (gameId, sc) => load().then((r) => r.getGameEngine(gameId, sc)),
    prefetchCoreSlices: (sc) => load().then((r) => r.prefetchCoreSlices(sc)),
    prefetchAssets: (requests, sc, opts) => load().then((r) => r.prefetchAssets(requests, sc, opts)),
    getAssetByGuid: (guid, sc, opts) => load().then((r) => r.getAssetByGuid(guid, sc, opts)),
    getAssetByHash: (hash, sc) => load().then((r) => r.getAssetByHash(hash, sc)),
    getAssetByChecksum: (checksum, sc) => load().then((r) => r.getAssetByChecksum(checksum, sc)),
    batchFetchAssets: (guids, sc, opts) => load().then((r) => r.batchFetchAssets(guids, sc, opts)),
    fetchAsset: (req, sc, opts) => load().then((r) => r.fetchAsset(req, sc, opts)),
    getDebugInfo: (): PlatformAssetRuntimeDebugInfo =>
      inner
        ? inner.getDebugInfo()
        : {
            runtime: 'desktop',
            transportMode: 'desktop-native-fetch',
            sliceCacheMode: 'native-backend',
            imageCacheMode: 'desktop-native',
            supportsNativeFetch: true,
          },
  };
}

class WebPlatformAssetRuntime implements IPlatformAssetRuntime {
  async getEntryIndex(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'entryIndex', async () =>
      fetchEntryIndexFromSlices(getEntryIndexUrl(storageConfig))
    );
  }

  async getHomePageGames(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'homePageGames', async () =>
      fetchValidatedSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.Home),
        parseHomePageGamesPayload,
        { bypassCache: true }
      )
    );
  }

  async getGameCatalog(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'gameCatalog', async () =>
      fetchValidatedSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.Games),
        parseGameCatalogPayload
      )
    );
  }

  async getAppPageSlice(pageId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'appPageSlice', async () =>
      fetchValidatedSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.AppPage(pageId)),
        parseAppPageSlicePayload
      )
    );
  }

  async getSelectedGamePage(gameId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'selectedGamePage', async () =>
      fetchValidatedSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.GamePage(gameId)),
        parseGamePagePayload
      )
    );
  }

  async getGameEngine(gameId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'gameEngine', async () =>
      fetchValidatedSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.GameEngine(gameId)),
        parseGameEnginePayload
      )
    );
  }

  async prefetchCoreSlices(storageConfig: StorageConfig) {
    await measureRuntimeAssetOperation('web', 'prefetchCoreSlices', async () => {
      await prefetchCoreSlicesInternal(this, storageConfig);
    });
  }

  async prefetchAssets(
    requests: PlatformAssetRequest[],
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    await measureRuntimeAssetOperation('web', 'prefetchAssets', async () => {
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
    return await measureRuntimeAssetOperation('web', 'assetByGuid', async () =>
      this.fetchAsset({ guid }, storageConfig, options)
    );
  }

  async getAssetByHash(hash: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'assetByHash', async () =>
      this.fetchAsset({ hash }, storageConfig)
    );
  }

  async getAssetByChecksum(checksum: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('web', 'assetByChecksum', async () =>
      this.fetchAsset({ checksum }, storageConfig)
    );
  }

  async batchFetchAssets(
    guids: string[],
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    return await measureRuntimeAssetOperation('web', 'batchFetchAssets', async () => {
      const results = new Map<string, ArrayBuffer>();
      const limit = options?.fetchConcurrency ?? DEFAULT_PLATFORM_ASSET_FETCH_CONCURRENCY;
      const entries = await runWithConcurrency(guids, limit, async (guid) => {
        const response = await this.fetchAsset({ guid }, storageConfig, options);
        const payload = await responseToArrayBuffer(response);
        return { guid, payload } as const;
      });
      for (const { guid, payload } of entries) {
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
    return await measureRuntimeAssetOperation('web', 'fetchAsset', async () => {
      const resolved = await resolveAssetDownloadUrl(request, storageConfig);
      return fetch(resolved, options?.cache ? { cache: options.cache } : undefined);
    });
  }

  getDebugInfo(): PlatformAssetRuntimeDebugInfo {
    return {
      runtime: 'web',
      transportMode: 'browser-fetch',
      sliceCacheMode: 'indexeddb',
      imageCacheMode: 'indexeddb',
      supportsNativeFetch: false,
    };
  }
}

class MobilePlatformAssetRuntime extends WebPlatformAssetRuntime {
  override async getEntryIndex(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'entryIndex', async () =>
      fetchEntryIndexFromSlices(getEntryIndexUrl(storageConfig))
    );
  }

  override async getHomePageGames(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'homePageGames', async () =>
      fetchMobileJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.Home),
        parseHomePageGamesPayload,
        { bypassCache: true }
      )
    );
  }

  override async getGameCatalog(storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'gameCatalog', async () =>
      fetchMobileJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.Games),
        parseGameCatalogPayload
      )
    );
  }

  override async getAppPageSlice(pageId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'appPageSlice', async () =>
      fetchMobileJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.AppPage(pageId)),
        parseAppPageSlicePayload
      )
    );
  }

  override async getSelectedGamePage(gameId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'selectedGamePage', async () =>
      fetchMobileJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.GamePage(gameId)),
        parseGamePagePayload
      )
    );
  }

  override async getGameEngine(gameId: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'gameEngine', async () =>
      fetchMobileJsonSlice(
        getSliceUrl(storageConfig, ApiEndpoint.Slices.GameEngine(gameId)),
        parseGameEnginePayload
      )
    );
  }

  override async prefetchCoreSlices(storageConfig: StorageConfig) {
    await measureRuntimeAssetOperation('mobile', 'prefetchCoreSlices', async () => {
      await prefetchCoreSlicesInternal(this, storageConfig);
    });
  }

  override async getAssetByGuid(
    guid: string,
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    return await measureRuntimeAssetOperation('mobile', 'assetByGuid', async () =>
      this.fetchAsset({ guid }, storageConfig, options)
    );
  }

  override async getAssetByHash(hash: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'assetByHash', async () =>
      this.fetchAsset({ hash }, storageConfig)
    );
  }

  override async getAssetByChecksum(checksum: string, storageConfig: StorageConfig) {
    return await measureRuntimeAssetOperation('mobile', 'assetByChecksum', async () =>
      this.fetchAsset({ checksum }, storageConfig)
    );
  }

  override async fetchAsset(
    request: Pick<ResourceRequest, 'guid' | 'hash' | 'checksum'>,
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ) {
    return await measureRuntimeAssetOperation('mobile', 'fetchAsset', async () =>
      fetchMobileAssetResponse(request, storageConfig, options)
    );
  }

  override getDebugInfo(): PlatformAssetRuntimeDebugInfo {
    return {
      runtime: 'mobile',
      transportMode: 'mobile-fetch',
      sliceCacheMode: 'native-backend',
      imageCacheMode: 'mobile-native',
      supportsNativeFetch: false,
    };
  }
}

const webRuntime = new WebPlatformAssetRuntime();
const mobileRuntime = new MobilePlatformAssetRuntime();

export function getPlatformAssetRuntime(): IPlatformAssetRuntime {
  const runtime = getPlatformRuntime();
  if (runtime === PlatformRuntime.Desktop && DesktopAssetCache.isAvailable()) {
    return createLazyDesktopRuntime();
  }
  if (runtime === PlatformRuntime.Mobile) {
    return mobileRuntime;
  }
  return webRuntime;
}
