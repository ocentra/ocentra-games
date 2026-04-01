import { getStorageConfig } from '@/services/storage/StorageConfig';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { MimeTypes } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';

const log = AssetEditorLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean, batchKey?: string) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled, batchKey);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled, batchKey);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean, batchKey?: string) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled, batchKey);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled, batchKey);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean, batchKey?: string) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled, batchKey);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled, batchKey);
  }
};

log.register(import.meta.url);

const LOG_ASSET_EXISTS_VERBOSE = false;
const BATCH_KEY_RESOLVE_URL = 'AssetLoader.resolveAssetUrl';

log.registerBatchContext(BATCH_KEY_RESOLVE_URL, {
  enabled: false,
  batchSize: 20,
  flushInterval: 1000,
});

export class AssetLoader {
  private static instance: AssetLoader | null = null;

  private constructor() { }

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  private isCloudEnabled(): boolean {
    const config = getStorageConfig();
    return !!(config.assetsPublicUrl || config.r2Assets?.workerUrl);
  }

  isRemoteModeActive(): boolean {
    return this.isCloudEnabled();
  }

  async resolveAssetUrlByGuid(guid: string): Promise<string> {
    const response = await this.loadAssetByGuid(guid);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async resolveImageUrlByHash(hash: string): Promise<string> {
    const response = await this.loadImageByHash(hash);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async loadAssetByGuid(guid: string): Promise<Response> {
    const deferred = new OperationDeferred<Response>();
    await EventBus.instance.publishAsync(new GetResourceEvent({ guid }, deferred));
    const result = await deferred.promise;
    if (!result.isSuccess) {
      throw new Error(result.errorMessage || 'Failed to load asset');
    }
    return result.value!;
  }

  async loadImageByHash(hash: string): Promise<Response> {
    const deferred = new OperationDeferred<Response>();
    await EventBus.instance.publishAsync(new GetResourceEvent({ hash }, deferred));
    const result = await deferred.promise;
    if (!result.isSuccess) {
      throw new Error(result.errorMessage || 'Failed to load image');
    }
    return result.value!;
  }

  async assetExists(guid: string): Promise<boolean> {
    logInfo(`assetExists: Input GUID: "${guid}"`, LOG_ASSET_EXISTS_VERBOSE);
    
    if (!guid || typeof guid !== 'string' || guid.trim() === '') {
      logWarn(`assetExists: Invalid input GUID: "${guid}"`);
      return false;
    }

    try {
      logInfo(`assetExists: About to check via Router: "${guid}"`, LOG_ASSET_EXISTS_VERBOSE);
      const deferred = new OperationDeferred<Response>();
      await EventBus.instance.publishAsync(new GetResourceEvent({ guid: guid.trim() }, deferred));
      const result = await deferred.promise;
      if (!result.isSuccess || !result.value) {
        logWarn(`assetExists: Asset not found for "${guid}"`);
        return false;
      }
      const response = result.value;
      logInfo(`assetExists: Router response status: ${response.status} ${response.statusText}`, LOG_ASSET_EXISTS_VERBOSE);

      if (!response.ok || response.status < 200 || response.status >= 300) {
        logWarn(`assetExists: Response not OK: ${response.status} ${response.statusText} for GUID: "${guid}"`);
        return false;
      }

      const contentType = response.headers.get('content-type');
      logInfo(`assetExists: Content-Type: "${contentType}"`, LOG_ASSET_EXISTS_VERBOSE);
      
      if (contentType && contentType.includes(MimeTypes.Html)) {
        logWarn(`assetExists: Content-Type is HTML (SPA fallback) for GUID: "${guid}"`);
        return false;
      }

      logInfo(`assetExists: Asset exists: true for GUID: "${guid}"`, LOG_ASSET_EXISTS_VERBOSE);
      return true;
    } catch (error) {
      logError(`assetExists: Error checking asset existence for "${guid}":`, { data: error });
      return false;
    }
  }
}

