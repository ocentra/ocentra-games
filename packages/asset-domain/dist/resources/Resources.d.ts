import { ScriptableObject } from '../ScriptableObject';
import type { AssetURL, AssetGUIDType, ImageHash, AssetIdentifier } from '../types/assetIdentifier';
import type { IResourceLoader } from './IResourceLoader';
export interface ResourceLoadOptions {
    bustCache?: boolean;
}
export declare class Resources {
    private static cache;
    private static loader;
    static setLoader(loader: IResourceLoader): void;
    private static getLoader;
    private static cacheKey;
    static clearCache(identifier?: ImageHash | AssetGUIDType): void;
    static getUrl(identifier: ImageHash): Promise<AssetURL>;
    static getUrl(identifier: AssetGUIDType): Promise<AssetURL>;
    private static fetchByGuid;
    static loadTextByGuid(guid: string, options?: ResourceLoadOptions): Promise<string>;
    static loadJSONByGuid<T>(guid: string, options?: ResourceLoadOptions): Promise<T>;
    static loadBinaryByGuid(guid: string, options?: ResourceLoadOptions): Promise<ArrayBuffer>;
    static loadBlobByGuid(guid: string, options?: ResourceLoadOptions): Promise<Blob>;
    static loadText(guid: string, options?: ResourceLoadOptions): Promise<string>;
    static loadJSON<T>(guid: string, options?: ResourceLoadOptions): Promise<T>;
    static loadBinary(guid: string, options?: ResourceLoadOptions): Promise<ArrayBuffer>;
    static loadBlob(guid: string, options?: ResourceLoadOptions): Promise<Blob>;
    static exists(guid: string): Promise<boolean>;
    static prefetch(identifiers: AssetIdentifier[]): Promise<void>;
    static load<T extends ScriptableObject>(constructor: new () => T, guid: string): Promise<T | null>;
    static loadTexture(identifier: ImageHash): Promise<AssetURL>;
    static loadTexture(identifier: AssetGUIDType): Promise<AssetURL>;
}
