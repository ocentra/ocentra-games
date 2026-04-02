import { ApiEndpoint } from '../constants/cloudflare';
import { HttpMethod } from '../constants/http';
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
const assetDownloadUrlResolveCache = new Map<string, string>();

export function clearAssetDownloadUrlResolveCache(): void {
  assetDownloadUrlResolveCache.clear();
}

function cacheKeyForAssetRequest(request: AssetDownloadIdentifier): string {
  if (request.guid) return `g:${request.guid}`;
  if (request.hash) return `h:${request.hash}`;
  if (request.checksum) return `c:${request.checksum}`;
  return '';
}

export function getWorkerBaseUrl(storageConfig: AssetDownloadStorageConfig): string {
  return storageConfig.r2Assets?.workerUrl?.replace(/\/$/, '') ?? '';
}

export async function resolveAssetDownloadUrl(
  request: AssetDownloadIdentifier,
  storageConfig: AssetDownloadStorageConfig
): Promise<string> {
  const cacheKey = cacheKeyForAssetRequest(request);
  if (cacheKey && assetDownloadUrlResolveCache.has(cacheKey)) {
    return assetDownloadUrlResolveCache.get(cacheKey)!;
  }

  const publicBase = storageConfig.assetsPublicUrl?.trim().replace(/\/$/, '') ?? '';
  const idKey = request.guid ?? request.hash ?? request.checksum;
  if (publicBase && idKey) {
    const directUrl = `${publicBase}/${encodeURIComponent(idKey)}`;
    if (cacheKey && assetDownloadUrlResolveCache.size < ASSET_DOWNLOAD_URL_RESOLVE_CACHE_MAX) {
      assetDownloadUrlResolveCache.set(cacheKey, directUrl);
    }
    return directUrl;
  }

  const workerBase = getWorkerBaseUrl(storageConfig);
  if (!workerBase) {
    throw new Error(
      'Cannot resolve asset download URL: worker URL is empty. For release builds set VITE_MAIN_REAL_CLAIM_STORAGE_URL (or VITE_CLAIM_STORAGE_URL) to your deployed worker.'
    );
  }

  const resolveEndpoint = buildApiUrl(ApiEndpoint.Assets.DownloadUrl, { baseUrl: workerBase });
  const resolveUrl = new URL(resolveEndpoint);
  if (request.guid) resolveUrl.searchParams.set('guid', request.guid);
  if (request.hash) resolveUrl.searchParams.set('hash', request.hash);
  if (request.checksum) resolveUrl.searchParams.set('checksum', request.checksum);

  const res = await fetch(resolveUrl.toString(), { method: HttpMethod.Get });
  if (!res.ok) {
    await res.text().catch(() => undefined);
    throw new Error(`Asset resolve failed: ${res.status}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url || typeof data.url !== 'string') {
    throw new Error('Asset resolve returned invalid payload');
  }
  if (cacheKey && assetDownloadUrlResolveCache.size < ASSET_DOWNLOAD_URL_RESOLVE_CACHE_MAX) {
    assetDownloadUrlResolveCache.set(cacheKey, data.url);
  }
  return data.url;
}
