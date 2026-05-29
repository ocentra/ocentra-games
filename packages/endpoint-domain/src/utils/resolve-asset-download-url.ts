import { ApiEndpoint } from '../constants/cloudflare';
import { HttpMethod } from '../constants/http';
import { QueryParam } from '../constants/query';
import { buildApiUrl } from './url-builder';

export interface AssetDownloadStorageConfig {
  r2Assets?: { workerUrl: string; enabled?: boolean; bucketName?: string };
  assetsPublicUrl?: string;
}

export type AssetDownloadIdentifier = {
  guid?: string;
  hash?: string;
  checksum?: string;
};

const ASSET_DOWNLOAD_URL_RESOLVE_CACHE_MAX = 2000;
const SIGNED_URL_CACHE_SAFETY_WINDOW_MS = 60 * 1000;
const DEFAULT_SIGNED_URL_CACHE_TTL_MS = 14 * 60 * 1000;
const AwsSignedUrlQueryParam = {
  Date: 'X-Amz-Date',
  Expires: 'X-Amz-Expires',
} as const;

interface AssetDownloadUrlResolveCacheEntry {
  url: string;
  expiresAtMs: number | null;
}

const assetDownloadUrlResolveCache = new Map<string, AssetDownloadUrlResolveCacheEntry>();

export function clearAssetDownloadUrlResolveCache(): void {
  assetDownloadUrlResolveCache.clear();
}

export function clearAssetDownloadUrlResolveCacheForRequest(request: AssetDownloadIdentifier): void {
  const cacheKey = cacheKeyForAssetRequest(request);
  if (cacheKey) {
    assetDownloadUrlResolveCache.delete(cacheKey);
  }
}

function cacheKeyForAssetRequest(request: AssetDownloadIdentifier): string {
  if (request.guid) return `g:${request.guid}`;
  if (request.hash) return `h:${request.hash}`;
  if (request.checksum) return `c:${request.checksum}`;
  return '';
}

function isCacheEntryFresh(entry: AssetDownloadUrlResolveCacheEntry): boolean {
  return entry.expiresAtMs === null || entry.expiresAtMs > Date.now();
}

function setCachedAssetDownloadUrl(cacheKey: string, url: string, expiresAtMs: number | null): void {
  if (!cacheKey || assetDownloadUrlResolveCache.size >= ASSET_DOWNLOAD_URL_RESOLVE_CACHE_MAX) return;
  assetDownloadUrlResolveCache.set(cacheKey, { url, expiresAtMs });
}

function parseAwsDateMs(value: string | null): number | null {
  if (!value || !/^\d{8}T\d{6}Z$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(9, 11));
  const minute = Number(value.slice(11, 13));
  const second = Number(value.slice(13, 15));
  const parsed = Date.UTC(year, month, day, hour, minute, second);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSignedUrlExpirationMs(url: string): number | null {
  try {
    const parsed = new URL(url);
    const signedAtMs = parseAwsDateMs(parsed.searchParams.get(AwsSignedUrlQueryParam.Date));
    const expiresSeconds = Number(parsed.searchParams.get(AwsSignedUrlQueryParam.Expires));
    if (signedAtMs === null || !Number.isFinite(expiresSeconds) || expiresSeconds <= 0) {
      return null;
    }
    return signedAtMs + expiresSeconds * 1000 - SIGNED_URL_CACHE_SAFETY_WINDOW_MS;
  } catch {
    return null;
  }
}

function resolveSignedCacheExpirationMs(data: { delivery?: string; expiresAt?: string; expiresIn?: number }, url: string): number | null {
  if (data.delivery !== 'signed' && !url.includes(AwsSignedUrlQueryParam.Expires)) {
    return null;
  }

  if (typeof data.expiresAt === 'string') {
    const parsed = Date.parse(data.expiresAt);
    if (Number.isFinite(parsed)) {
      return parsed - SIGNED_URL_CACHE_SAFETY_WINDOW_MS;
    }
  }

  if (typeof data.expiresIn === 'number' && Number.isFinite(data.expiresIn) && data.expiresIn > 0) {
    return Date.now() + data.expiresIn * 1000 - SIGNED_URL_CACHE_SAFETY_WINDOW_MS;
  }

  return parseSignedUrlExpirationMs(url) ?? Date.now() + DEFAULT_SIGNED_URL_CACHE_TTL_MS;
}

export function getWorkerBaseUrl(storageConfig: AssetDownloadStorageConfig): string {
  return storageConfig.r2Assets?.workerUrl?.replace(/\/$/, '') ?? '';
}

export async function resolveAssetDownloadUrl(
  request: AssetDownloadIdentifier,
  storageConfig: AssetDownloadStorageConfig
): Promise<string> {
  const cacheKey = cacheKeyForAssetRequest(request);
  if (cacheKey) {
    const cached = assetDownloadUrlResolveCache.get(cacheKey);
    if (cached && isCacheEntryFresh(cached)) {
      return cached.url;
    }
    if (cached) {
      assetDownloadUrlResolveCache.delete(cacheKey);
    }
  }

  const publicBase = storageConfig.assetsPublicUrl?.trim().replace(/\/$/, '') ?? '';
  const workerBase = getWorkerBaseUrl(storageConfig);
  const idKey = request.guid ?? request.hash ?? request.checksum;
  
  if (publicBase && idKey) {
    const isWorkerProxyFallback = workerBase && publicBase === `${workerBase}/api/v1/assets`;
    if (!isWorkerProxyFallback) {
      const directUrl = `${publicBase}/${encodeURIComponent(idKey)}`;
      setCachedAssetDownloadUrl(cacheKey, directUrl, null);
      return directUrl;
    }
  }

  if (!workerBase) {
    throw new Error(
      'Cannot resolve asset download URL: worker URL is empty. For release builds set VITE_MAIN_REAL_CLAIM_STORAGE_URL (or VITE_CLAIM_STORAGE_URL) to your deployed worker.'
    );
  }

  const resolveEndpoint = buildApiUrl(ApiEndpoint.Assets.DownloadUrl, { baseUrl: workerBase });
  const resolveUrl = new URL(resolveEndpoint);
  if (request.guid) resolveUrl.searchParams.set(QueryParam.Guid, request.guid);
  if (request.hash) resolveUrl.searchParams.set(QueryParam.Hash, request.hash);
  if (request.checksum) resolveUrl.searchParams.set(QueryParam.Checksum, request.checksum);

  const res = await fetch(resolveUrl.toString(), { method: HttpMethod.Get });
  if (!res.ok) {
    await res.text().catch(() => undefined);
    throw new Error(`Asset resolve failed: ${res.status}`);
  }
  const data = (await res.json()) as { url?: string; delivery?: string; expiresAt?: string; expiresIn?: number };
  if (!data.url || typeof data.url !== 'string') {
    throw new Error('Asset resolve returned invalid payload');
  }
  setCachedAssetDownloadUrl(cacheKey, data.url, resolveSignedCacheExpirationMs(data, data.url));
  return data.url;
}
