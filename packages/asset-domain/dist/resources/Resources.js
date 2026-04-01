import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ScriptableObject } from '../ScriptableObject.js';
import { isAssetGUID, isImageHash } from '../types/assetIdentifier.js';
const log = MainAppLogger.instance;
const logInfo = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
const logError = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logError(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logError(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
log.register(import.meta.url);
const LOG_RESOURCES_EXISTS_VERBOSE = false;
class ResourceCache {
    store = new Map();
    get(key) {
        return this.store.get(key);
    }
    set(key, value) {
        this.store.set(key, value);
    }
    clear(key) {
        if (key) {
            this.store.delete(key);
            return;
        }
        this.store.clear();
    }
}
export class Resources {
    static cache = new ResourceCache();
    static loader = null;
    static setLoader(loader) {
        Resources.loader = loader;
    }
    static getLoader() {
        if (!Resources.loader) {
            throw new Error('Resources.loader not set. Call Resources.setLoader(loader) at app bootstrap.');
        }
        return Resources.loader;
    }
    static cacheKey(identifier, type) {
        return `${identifier}:${type}`;
    }
    static clearCache(identifier) {
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
    static getUrl(identifier) {
        const loader = this.getLoader();
        if (isAssetGUID(identifier)) {
            return Promise.resolve(loader.resolveAssetUrlByGuid(identifier)).then(url => url);
        }
        if (isImageHash(identifier)) {
            return Promise.resolve(loader.resolveImageUrlByHash(identifier)).then(url => url);
        }
        throw new Error(`Unsupported asset identifier type: ${identifier}`);
    }
    static async fetchByGuid(guid, type, options) {
        const loader = this.getLoader();
        const key = this.cacheKey(guid, type);
        if (!options?.bustCache) {
            const cached = this.cache.get(key);
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
            let value;
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
            return value;
        }
        catch (error) {
            logError('Load by GUID failed', {
                guid,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    static async loadTextByGuid(guid, options) {
        return this.fetchByGuid(guid, 'text', options);
    }
    static async loadJSONByGuid(guid, options) {
        return this.fetchByGuid(guid, 'json', options);
    }
    static async loadBinaryByGuid(guid, options) {
        return this.fetchByGuid(guid, 'arrayBuffer', options);
    }
    static async loadBlobByGuid(guid, options) {
        return this.fetchByGuid(guid, 'blob', options);
    }
    static async loadText(guid, options) {
        return this.loadTextByGuid(guid, options);
    }
    static async loadJSON(guid, options) {
        return this.loadJSONByGuid(guid, options);
    }
    static async loadBinary(guid, options) {
        return this.loadBinaryByGuid(guid, options);
    }
    static async loadBlob(guid, options) {
        return this.loadBlobByGuid(guid, options);
    }
    static async exists(guid) {
        try {
            logInfo(`Input GUID: "${guid}"`, LOG_RESOURCES_EXISTS_VERBOSE);
            logInfo(`About to call loader.assetExists("${guid}")`, LOG_RESOURCES_EXISTS_VERBOSE);
            const loader = this.getLoader();
            const result = await loader.assetExists(guid);
            logInfo(`Result: ${result}`, LOG_RESOURCES_EXISTS_VERBOSE);
            return result;
        }
        catch (error) {
            const errorDetails = error instanceof Error
                ? { message: error.message, stack: error.stack, name: error.name }
                : { type: typeof error, value: String(error), raw: error };
            logError(`Error checking GUID "${guid}":`, errorDetails);
            return false;
        }
    }
    static async prefetch(identifiers) {
        await Promise.all(identifiers.map(id => {
            const identifier = String(id);
            if (isAssetGUID(identifier)) {
                return this.loadTextByGuid(identifier).catch(() => undefined);
            }
            return Promise.resolve(undefined);
        }));
        logInfo('Prefetched assets', { count: identifiers.length });
    }
    static async load(constructor, guid) {
        try {
            return ScriptableObject.loadByGuid(constructor, guid);
        }
        catch (error) {
            logError('Failed to load asset', {
                guid,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
    static async loadTexture(identifier) {
        if (isAssetGUID(identifier)) {
            return this.getUrl(identifier);
        }
        return this.getUrl(identifier);
    }
}
