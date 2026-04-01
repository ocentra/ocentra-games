import type { CloudService, CloudServiceConfig, AssetMetadata, ImageMetadata, FileMetadata, ScanOptions } from './CloudService';
import type { ScanResponse } from '@ocentra/network-domain/router-types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ApiAction } from '@ocentra/endpoint-domain/constants/api-actions';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { ProdAssetsEndpoint } from '@ocentra/endpoint-domain/constants/prod-assets';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

export class CloudServiceImpl implements CloudService {
  private config: CloudServiceConfig;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(config: CloudServiceConfig) {
    this.config = config;
    logInfo('CloudServiceImpl initialized', { data: { workerUrl: config.workerUrl, bucketName: config.bucketName } });
  }

  async getAsset(guid: string, options?: { type?: 'asset' | 'meta' }): Promise<ArrayBuffer> {
    const params = new URLSearchParams();
    params.set(QueryParam.Guid, guid);
    if (options?.type === ResourceType.Meta) params.set(QueryParam.Type, ResourceType.Meta);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    return response.arrayBuffer();
  }

  async getAssetByType(assetType: string): Promise<ArrayBuffer> {
    const params = new URLSearchParams();
    params.set(QueryParam.AssetType, assetType);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to get asset by type ${assetType}: ${response.status} ${response.statusText}`);
    return response.arrayBuffer();
  }

  async getImage(hash: string, options?: { type?: 'image' | 'meta' }): Promise<ArrayBuffer> {
    const params = new URLSearchParams();
    params.set(QueryParam.Hash, hash);
    if (options?.type === ResourceType.Meta) params.set(QueryParam.Type, ResourceType.Meta);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to get image: ${response.status} ${response.statusText}`);
    return response.arrayBuffer();
  }

  async getFile(checksum: string): Promise<ArrayBuffer> {
    const params = new URLSearchParams();
    params.set(QueryParam.Checksum, checksum);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to get file: ${response.status} ${response.statusText}`);
    return response.arrayBuffer();
  }

  async getAssetInfo(guid: string): Promise<AssetMetadata> {
    const params = new URLSearchParams();
    params.set(QueryParam.Guid, guid);
    params.set(QueryParam.Info, 'true');
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to get asset info: ${response.status} ${response.statusText}`);
    return response.json();
  }

  async getImageInfo(hash: string): Promise<ImageMetadata> {
    const params = new URLSearchParams();
    params.set(QueryParam.Hash, hash);
    params.set(QueryParam.Info, 'true');
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await this.fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to get image info: ${response.status} ${response.statusText}`);
    return response.json();
  }

  async uploadAsset(guid: string, content: ArrayBuffer | Blob | string, metadata: AssetMetadata): Promise<string> {
    const { uploadUrl, path } = await this.getSignedUploadUrl({ guid });
    await this.directPut(uploadUrl, content, metadata.mimeType || 'application/octet-stream');
    return path;
  }

  async uploadImage(hash: string, imageData: ArrayBuffer | Blob, metadata: ImageMetadata): Promise<string> {
    const { uploadUrl, path } = await this.getSignedUploadUrl({ hash });
    await this.directPut(uploadUrl, imageData, metadata.mimeType || 'image/png');
    return path;
  }

  async uploadFile(checksum: string, fileData: ArrayBuffer | Blob, metadata: FileMetadata): Promise<string> {
    const { uploadUrl, path } = await this.getSignedUploadUrl({ checksum });
    await this.directPut(uploadUrl, fileData, metadata.mimeType || 'application/octet-stream');
    return path;
  }

  private async getSignedUploadUrl(params: { guid?: string; hash?: string; checksum?: string }): Promise<{ uploadUrl: string; path: string }> {
    const query = new URLSearchParams();
    query.set(QueryParam.Action, ApiAction.GetUploadUrl);
    if (params.guid) query.set(QueryParam.Guid, params.guid);
    if (params.hash) query.set(QueryParam.Hash, params.hash);
    if (params.checksum) query.set(QueryParam.Checksum, params.checksum);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${query.toString()}`;
    const response = await this.fetchWithRetry(url);
    if (!response.ok) throw new Error(`Failed to get signed upload URL: ${response.statusText}`);
    return response.json();
  }

  private async directPut(uploadUrl: string, content: ArrayBuffer | Blob | string, contentType: string): Promise<void> {
    const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
    const response = await fetch(uploadUrl, {
      method: HttpMethod.Put,
      body: blob,
      headers: { [HttpHeader.ContentType]: contentType }
    });
    if (!response.ok) throw new Error(`Direct upload failed: ${response.status} ${response.statusText}`);
  }

  async batchGetAssets(guids: string[]): Promise<Map<string, ArrayBuffer>> {
    const results = new Map<string, ArrayBuffer>();
    if (guids.length === 0) return results;
    try {
      const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}`;
      const response = await fetch(url, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({ action: ApiAction.ResolveBatch, guids })
      });
      if (!response.ok) throw new Error('Failed to resolve batch URLs');
      const { urls } = await response.json() as { urls: Record<string, string> };
      await Promise.all(
        Object.entries(urls).map(async ([guid, downloadUrl]) => {
          try {
            const res = await fetch(downloadUrl);
            if (res.ok) results.set(guid, await res.arrayBuffer());
          } catch (error) {
            logWarn(`Batch fetch failed for ${guid}:`, { data: error });
          }
        })
      );
    } catch (error) {
      logWarn('Batch fetch optimization failed, falling back to sequential:', { data: error });
      for (const guid of guids) {
        try {
          results.set(guid, await this.getAsset(guid));
        } catch (e) {
          logWarn(`Fallback fetch failed for ${guid}:`, { data: e });
        }
      }
    }
    return results;
  }

  async scanAssets(options?: ScanOptions): Promise<ScanResponse> {
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}`;
    const response = await fetch(url, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ action: ApiAction.Scan, options })
    });
    if (!response.ok) throw new Error(`Failed to scan assets: ${response.status} ${response.statusText}`);
    return response.json();
  }

  async deleteAsset(guid: string): Promise<void> {
    const params = new URLSearchParams();
    params.set(QueryParam.Guid, guid);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await fetch(url, { method: HttpMethod.Delete });
    if (!response.ok) throw new Error(`Failed to delete asset: ${response.status} ${response.statusText}`);
  }

  async deleteImage(hash: string): Promise<void> {
    const params = new URLSearchParams();
    params.set(QueryParam.Hash, hash);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await fetch(url, { method: HttpMethod.Delete });
    if (!response.ok) throw new Error(`Failed to delete image: ${response.status} ${response.statusText}`);
  }

  async deleteFile(checksum: string): Promise<void> {
    const params = new URLSearchParams();
    params.set(QueryParam.Checksum, checksum);
    const url = `${this.config.workerUrl}${ProdAssetsEndpoint.Resources}?${params.toString()}`;
    const response = await fetch(url, { method: HttpMethod.Delete });
    if (!response.ok) throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
  }

  async ping(): Promise<boolean> {
    try {
      const url = `${this.config.workerUrl}/health`;
      const response = await fetch(url, { method: HttpMethod.Get });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok || response.status === 404) return response;
        const isRateLimit = response.status === 429;
        if (isRateLimit) throw new Error(`Rate limit exceeded: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRateLimit = lastError.message.includes('Rate limit') || lastError.message.includes('429');
        if (attempt < this.MAX_RETRIES - 1) {
          const backoffDelay = isRateLimit
            ? this.RETRY_DELAY_MS * Math.pow(2, attempt + 1) * 2
            : this.RETRY_DELAY_MS * (attempt + 1);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    throw new Error(`Failed after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }
}
