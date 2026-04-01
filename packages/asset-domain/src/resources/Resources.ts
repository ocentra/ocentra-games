import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ScriptableObject } from '../ScriptableObject';
import type { AssetURL, AssetGUIDType, ImageHash, AssetIdentifier } from '../types/assetIdentifier';
import { isAssetGUID, isImageHash } from '../types/assetIdentifier';
import type { IResourceLoader } from './IResourceLoader';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_RESOURCES_EXISTS_VERBOSE = false;

type ResourceResponseType = 'text' | 'json' | 'arrayBuffer' | 'blob';

export interface ResourceLoadOptions {
  bustCache?: boolean;
}

class ResourceCache {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  clear(key?: string): void {
    if (key) {
      this.store.delete(key);
      return;
    }
    this.store.clear();
  }
}

export class Resources {
  private static cache = new ResourceCache();
  private static loader: IResourceLoader | null = null;

  static setLoader(loader: IResourceLoader): void {
    Resources.loader = loader;
  }

  private static getLoader(): IResourceLoader {
    if (!Resources.loader) {
      throw new Error('Resources.loader not set. Call Resources.setLoader(loader) at app bootstrap.');
    }
    return Resources.loader;
  }

  private static cacheKey(identifier: string, type: ResourceResponseType): string {
    return `${identifier}:${type}`;
  }

  static clearCache(identifier?: ImageHash | AssetGUIDType): void {
    if (identifier) {
      const key = String(identifier);
      this.cache.clear(this.cacheKey(key, 'text'));
      this.cache.clear(this.cacheKey(key, 'json'));
      this.cache.clear(this.cacheKey(key, 'arrayBuffer'));
      this.cache.clear(this.cacheKey(key, 'blob'));
      return;
    }
    this.cache.clear();
  }

  static getUrl(identifier: ImageHash): Promise<AssetURL>;
  static getUrl(identifier: AssetGUIDType): Promise<AssetURL>;
  static getUrl(identifier: ImageHash | AssetGUIDType): Promise<AssetURL> {
    const loader = this.getLoader();
    if (isAssetGUID(identifier)) {
      return Promise.resolve(loader.resolveAssetUrlByGuid(identifier)).then(url => url as AssetURL);
    }
    if (isImageHash(identifier)) {
      return Promise.resolve(loader.resolveImageUrlByHash(identifier)).then(url => url as AssetURL);
    }
    throw new Error(`Unsupported asset identifier type: ${identifier}`);
  }

  private static async fetchByGuid<T>(
    guid: string,
    type: ResourceResponseType,
    options?: ResourceLoadOptions
  ): Promise<T> {
    const loader = this.getLoader();
    const key = this.cacheKey(guid, type);
    if (!options?.bustCache) {
      const cached = this.cache.get<T>(key);
      if (cached) {
        return cached;
      }
    }
    try {
      const response = await loader.loadAssetByGuid(guid);
      if (!response.ok) {
        logError('Failed to load resource by GUID', {
          guid,
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(`Failed to load ${guid}`);
      }
      let value: unknown;
      switch (type) {
        case 'text':
          value = await response.text();
          break;
        case 'json':
          value = await response.json();
          break;
        case 'arrayBuffer':
          value = await response.arrayBuffer();
          break;
        case 'blob':
          value = await response.blob();
          break;
        default:
          value = await response.text();
      }
      this.cache.set(key, value);
      return value as T;
    } catch (error) {
      logError('Load by GUID failed', {
        guid,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  static async loadTextByGuid(guid: string, options?: ResourceLoadOptions): Promise<string> {
    return this.fetchByGuid<string>(guid, 'text', options);
  }

  static async loadJSONByGuid<T>(guid: string, options?: ResourceLoadOptions): Promise<T> {
    return this.fetchByGuid<T>(guid, 'json', options);
  }

  static async loadBinaryByGuid(guid: string, options?: ResourceLoadOptions): Promise<ArrayBuffer> {
    return this.fetchByGuid<ArrayBuffer>(guid, 'arrayBuffer', options);
  }

  static async loadBlobByGuid(guid: string, options?: ResourceLoadOptions): Promise<Blob> {
    return this.fetchByGuid<Blob>(guid, 'blob', options);
  }

  static async loadText(guid: string, options?: ResourceLoadOptions): Promise<string> {
    return this.loadTextByGuid(guid, options);
  }

  static async loadJSON<T>(guid: string, options?: ResourceLoadOptions): Promise<T> {
    return this.loadJSONByGuid<T>(guid, options);
  }

  static async loadBinary(guid: string, options?: ResourceLoadOptions): Promise<ArrayBuffer> {
    return this.loadBinaryByGuid(guid, options);
  }

  static async loadBlob(guid: string, options?: ResourceLoadOptions): Promise<Blob> {
    return this.loadBlobByGuid(guid, options);
  }

  static async exists(guid: string): Promise<boolean> {
    try {
      logInfo(`Input GUID: "${guid}"`, LOG_RESOURCES_EXISTS_VERBOSE);
      logInfo(`About to call loader.assetExists("${guid}")`, LOG_RESOURCES_EXISTS_VERBOSE);
      const loader = this.getLoader();
      const result = await loader.assetExists(guid);
      logInfo(`Result: ${result}`, LOG_RESOURCES_EXISTS_VERBOSE);
      return result;
    } catch (error) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { type: typeof error, value: String(error), raw: error };
      logError(`Error checking GUID "${guid}":`, errorDetails);
      return false;
    }
  }

  static async prefetch(identifiers: AssetIdentifier[]): Promise<void> {
    await Promise.all(identifiers.map(id => {
      const identifier = String(id);
      if (isAssetGUID(identifier)) {
        return this.loadTextByGuid(identifier as AssetGUIDType).catch(() => undefined);
      }
      return Promise.resolve(undefined);
    }));
    logInfo('Prefetched assets', { count: identifiers.length });
  }

  static async load<T extends ScriptableObject>(
    constructor: new () => T,
    guid: string
  ): Promise<T | null> {
    try {
      return ScriptableObject.loadByGuid(constructor, guid);
    } catch (error) {
      logError('Failed to load asset', {
        guid,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  static async loadTexture(identifier: ImageHash): Promise<AssetURL>;
  static async loadTexture(identifier: AssetGUIDType): Promise<AssetURL>;
  static async loadTexture(identifier: ImageHash | AssetGUIDType): Promise<AssetURL> {
    if (isAssetGUID(identifier)) {
      return this.getUrl(identifier as AssetGUIDType);
    }
    return this.getUrl(identifier as ImageHash);
  }
}
