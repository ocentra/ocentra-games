import { ScriptableObject } from '../ScriptableObject';
export declare abstract class ScriptableSingleton extends ScriptableObject {
    private static instances;
    private static loadingPromises;
    protected static isInitializing: boolean;
    static readonly ASSET_GUID?: string;
    protected static registerSingleton<T extends ScriptableSingleton>(constructor: new () => T): void;
    protected static getOrCreateSingletonInstance<T extends ScriptableSingleton>(this: new () => T, createInstance: () => Promise<T>): Promise<T>;
    protected static clearSingletonCache<T extends ScriptableSingleton>(this: new () => T): void;
}
