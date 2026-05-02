import type { ResourceRequest } from '@ocentra/network-domain/router-types';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import {
  clearAssetDownloadUrlResolveCache,
  getWorkerBaseUrl,
  resolveAssetDownloadUrl,
} from '@ocentra/endpoint-domain/utils/resolve-asset-download-url';
import {
  EntryIndexSchema,
  type AssetIndexResourceEntry,
  type EntryIndexDocument,
} from '@ocentra/game-asset-domain/schemas/entry-index-schema';
import {
  GameCatalogDocumentSchema,
  type GameCatalogDocument,
} from '@ocentra/game-asset-domain/schemas/game-catalog-entry-schema';
import { GameEngineSchema, type GameEngine } from '@ocentra/game-asset-domain/schemas/game-engine-schema';
import { GamePageSchema, type GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import {
  HomePageGamesDocumentSchema,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import { getCachedSlice, setCachedSlice } from '@/adapters/assets/ContentSliceCache';
import { getEntryIndexUrl, type StorageConfig } from '@/services/storage/StorageConfig';

export const ENTRY_INDEX_TTL_MS = 60 * 60 * 1000;

export { clearAssetDownloadUrlResolveCache, getWorkerBaseUrl, resolveAssetDownloadUrl };

export interface PlatformAssetFetchOptions {
  useGuidCache?: boolean;
  fetchConcurrency?: number;
}

export const DEFAULT_PLATFORM_ASSET_FETCH_CONCURRENCY = 12;

export async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) {
        return;
      }
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface PlatformAssetRequest {
  guid?: string;
  hash?: string;
  checksum?: string;
}

export interface PlatformAssetRuntimeDebugInfo {
  runtime: 'web' | 'desktop' | 'mobile';
  transportMode: 'browser-fetch' | 'desktop-native-fetch' | 'mobile-fetch';
  sliceCacheMode: 'indexeddb' | 'native-backend';
  imageCacheMode: 'indexeddb' | 'desktop-native' | 'mobile-native';
  supportsNativeFetch: boolean;
}

export interface PlatformAssetRuntime {
  getEntryIndex(storageConfig: StorageConfig): Promise<EntryIndexDocument | null>;
  getHomePageGames(storageConfig: StorageConfig): Promise<HomePageGamesDocument | null>;
  getGameCatalog(storageConfig: StorageConfig): Promise<GameCatalogDocument | null>;
  getSelectedGamePage(gameId: string, storageConfig: StorageConfig): Promise<GamePage | null>;
  getGameEngine(gameId: string, storageConfig: StorageConfig): Promise<GameEngine | null>;
  prefetchCoreSlices(storageConfig: StorageConfig): Promise<void>;
  prefetchAssets(
    requests: PlatformAssetRequest[],
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ): Promise<void>;
  getAssetByGuid(
    guid: string,
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ): Promise<Response>;
  getAssetByHash(hash: string, storageConfig: StorageConfig): Promise<Response>;
  getAssetByChecksum(checksum: string, storageConfig: StorageConfig): Promise<Response>;
  batchFetchAssets(
    guids: string[],
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ): Promise<Map<string, ArrayBuffer>>;
  fetchAsset(
    request: Pick<ResourceRequest, 'guid' | 'hash' | 'checksum'>,
    storageConfig: StorageConfig,
    options?: PlatformAssetFetchOptions
  ): Promise<Response>;
  getDebugInfo(): PlatformAssetRuntimeDebugInfo;
}

export function getAssetUrl(
  request: Pick<ResourceRequest, 'guid' | 'hash' | 'checksum'>,
  storageConfig: StorageConfig
): string {
  const base = storageConfig.assetsPublicUrl?.replace(/\/$/, '');
  if (!base) {
    throw new Error(
      'Cannot fetch resource: assetsPublicUrl is empty. Set VITE_ASSETS_PUBLIC_URL or VITE_CLAIM_STORAGE_URL.'
    );
  }

  const key = request.guid ?? request.hash ?? request.checksum ?? '';
  if (!key) {
    throw new Error('Cannot fetch resource: request has no guid/hash/checksum');
  }

  return `${base}/${encodeURIComponent(key)}`;
}

export async function getCachedJsonSlice<T>(url: string): Promise<T | null> {
  const cached = await getCachedSlice<T>(url);
  return cached ?? null;
}

export interface JsonSliceFetchOptions {
  bypassCache?: boolean;
}

export async function fetchJsonSlice<T>(
  url: string,
  options: JsonSliceFetchOptions = {}
): Promise<T | null> {
  if (!options.bypassCache) {
    const cached = await getCachedJsonSlice<T>(url);
    if (cached !== null) {
      return cached;
    }
  }
  try {
    const response = await fetch(url, options.bypassCache ? { cache: 'no-store' } : undefined);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as T;
    void setCachedSlice(url, data);
    return data;
  } catch {
    return null;
  }
}

export async function setCachedJsonSlice(url: string, data: unknown): Promise<void> {
  void setCachedSlice(url, data);
}

export function getSliceUrl(storageConfig: StorageConfig, endpoint: string): string {
  const baseUrl = getWorkerBaseUrl(storageConfig);
  if (!baseUrl) {
    return '';
  }
  return buildApiUrl(endpoint, { baseUrl });
}

export function getEntryIndexAssetGuids(entryIndex: EntryIndexDocument): string[] {
  return entryIndex.resources
    .map((resource: AssetIndexResourceEntry) => resource.guid)
    .filter((guid): guid is string => typeof guid === 'string' && guid.length > 0);
}

export function parseEntryIndexPayload(payload: unknown): EntryIndexDocument | null {
  const parsed = EntryIndexSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function parseHomePageGamesPayload(payload: unknown): HomePageGamesDocument | null {
  const parsed = HomePageGamesDocumentSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function parseGameCatalogPayload(payload: unknown): GameCatalogDocument | null {
  const parsed = GameCatalogDocumentSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function parseGamePagePayload(payload: unknown): GamePage | null {
  const parsed = GamePageSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export function parseGameEnginePayload(payload: unknown): GameEngine | null {
  const parsed = GameEngineSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function prefetchCoreSlicesInternal(
  runtime: Pick<PlatformAssetRuntime, 'getEntryIndex' | 'getHomePageGames' | 'getGameCatalog'>,
  storageConfig: StorageConfig
): Promise<void> {
  await Promise.allSettled([
    runtime.getEntryIndex(storageConfig),
    runtime.getHomePageGames(storageConfig),
    runtime.getGameCatalog(storageConfig),
  ]);
}

export function toCachedAssetResponse(content: Uint8Array, contentType?: string): Response {
  const body = content as unknown as BodyInit;
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': contentType ?? HttpContentType.ApplicationJson,
    },
  });
}

export function toArrayBufferCopy(content: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(content.byteLength);
  copy.set(content);
  return copy.buffer;
}

export async function responseToArrayBuffer(response: Response): Promise<ArrayBuffer | null> {
  if (!response.ok) {
    await response.text().catch(() => undefined);
    return null;
  }
  return await response.arrayBuffer();
}

export function toResponse(
  content: Uint8Array | ArrayBuffer,
  status: number,
  contentType?: string,
  etag?: string | null
): Response {
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
  const headers = new Headers();
  headers.set('content-type', contentType ?? HttpContentType.ApplicationJson);
  if (etag) {
    headers.set('etag', etag);
  }
  return new Response(bytes as unknown as BodyInit, {
    status,
    headers,
  });
}

export { getEntryIndexUrl };
