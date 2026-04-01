import { ScriptableObject } from '@/ScriptableObject';
import { ScriptableObjectRegistry } from '@/serialization/ScriptableObjectRegistry';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_SINGLETON_CACHE = false;
const logInfo = (message: string, data?: unknown) => {
  if (LOG_SINGLETON_CACHE) {
    log.logInfo(message, getStackTrace(), data);
  }
};

export abstract class ScriptableSingleton extends ScriptableObject {

  private static instances = new Map<new () => ScriptableSingleton, ScriptableSingleton>();
  private static loadingPromises = new Map<new () => ScriptableSingleton, Promise<ScriptableSingleton>>();
  protected static isInitializing: boolean = false;
  static readonly ASSET_GUID?: string;

  protected static registerSingleton<T extends ScriptableSingleton>(
    constructor: new () => T
  ): void {
    ScriptableObjectRegistry.register(
      constructor,
      () => (constructor as unknown as { getOrCreateInstance(): Promise<T> }).getOrCreateInstance()
    );
  }

  protected static async getOrCreateSingletonInstance<T extends ScriptableSingleton>(
    this: new () => T,
    createInstance: () => Promise<T>
  ): Promise<T> {
    const cachedInstance = ScriptableSingleton.instances.get(this) as T | undefined;
    if (cachedInstance) {
      logInfo(`[CACHE HIT] Returning cached singleton for ${this.name}`, {
        hasImages: !!(cachedInstance as unknown as { images?: unknown[] }).images,
        imagesLength: Array.isArray((cachedInstance as unknown as { images?: unknown[] }).images)
          ? ((cachedInstance as unknown as { images: unknown[] }).images.length)
          : 'N/A',
      });
      return cachedInstance;
    }

    const loadingPromise = ScriptableSingleton.loadingPromises.get(this) as Promise<T> | undefined;
    if (loadingPromise) {
      logInfo(`[LOADING] Waiting for in-progress load of ${this.name}`);
      return loadingPromise;
    }

    logInfo(`[CACHE MISS] Creating new singleton instance for ${this.name}`);
    const promise = createInstance();
    ScriptableSingleton.loadingPromises.set(this, promise);

    const instance = await promise;

    logInfo(`[CACHE SET] Caching singleton instance for ${this.name}`, {
      hasImages: !!(instance as unknown as { images?: unknown[] }).images,
      imagesLength: Array.isArray((instance as unknown as { images?: unknown[] }).images)
        ? ((instance as unknown as { images: unknown[] }).images.length)
        : 'N/A',
    });

    ScriptableSingleton.instances.set(this, instance);
    ScriptableSingleton.loadingPromises.delete(this);

    return instance;
  }

  protected static clearSingletonCache<T extends ScriptableSingleton>(
    this: new () => T
  ): void {
    ScriptableSingleton.instances.delete(this);
    ScriptableSingleton.loadingPromises.delete(this);
  }

}
