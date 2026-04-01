import { ScriptableObject } from '../ScriptableObject.js';
import { ScriptableObjectRegistry } from '../serialization/ScriptableObjectRegistry.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
const log = MainAppLogger.instance;
log.register(import.meta.url);
const LOG_SINGLETON_CACHE = false;
const logInfo = (message, data) => {
    if (LOG_SINGLETON_CACHE) {
        log.logInfo(message, getStackTrace(), data);
    }
};
export class ScriptableSingleton extends ScriptableObject {
    static instances = new Map();
    static loadingPromises = new Map();
    static isInitializing = false;
    static ASSET_GUID;
    static registerSingleton(constructor) {
        ScriptableObjectRegistry.register(constructor, () => constructor.getOrCreateInstance());
    }
    static async getOrCreateSingletonInstance(createInstance) {
        const cachedInstance = ScriptableSingleton.instances.get(this);
        if (cachedInstance) {
            logInfo(`[CACHE HIT] Returning cached singleton for ${this.name}`, {
                hasImages: !!cachedInstance.images,
                imagesLength: Array.isArray(cachedInstance.images)
                    ? (cachedInstance.images.length)
                    : 'N/A',
            });
            return cachedInstance;
        }
        const loadingPromise = ScriptableSingleton.loadingPromises.get(this);
        if (loadingPromise) {
            logInfo(`[LOADING] Waiting for in-progress load of ${this.name}`);
            return loadingPromise;
        }
        logInfo(`[CACHE MISS] Creating new singleton instance for ${this.name}`);
        const promise = createInstance();
        ScriptableSingleton.loadingPromises.set(this, promise);
        const instance = await promise;
        logInfo(`[CACHE SET] Caching singleton instance for ${this.name}`, {
            hasImages: !!instance.images,
            imagesLength: Array.isArray(instance.images)
                ? (instance.images.length)
                : 'N/A',
        });
        ScriptableSingleton.instances.set(this, instance);
        ScriptableSingleton.loadingPromises.delete(this);
        return instance;
    }
    static clearSingletonCache() {
        ScriptableSingleton.instances.delete(this);
        ScriptableSingleton.loadingPromises.delete(this);
    }
}
