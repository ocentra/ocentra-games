import 'reflect-metadata';
import type { AssetGUIDType } from '../types/assetIdentifier';
import type { AssetType } from '../types/assetType';
import { ResourceEntry } from '../resourceEntry/ResourceEntry';
export type AssetLoader<T> = (constructor: new () => T, guid: string) => Promise<T | null>;
export declare function setGlobalAssetLoader(loader: AssetLoader<unknown> | null): void;
export declare class AssetResourceEntry<T = unknown> extends ResourceEntry {
    guid: AssetGUIDType;
    readonly assetType: AssetType;
    constructor(assetType?: AssetType, guid?: AssetGUIDType);
    inheritanceChain?: string[] | null;
    variant?: string | null;
    loadedAsset: T | null;
    private loading;
    parsedData?: {
        system: Record<string, unknown>;
        data: Record<string, unknown>;
    } | null;
    get assetGuid(): string | null;
    setAssetGuid(guid: string | null): void;
    get asset(): T | null;
    get isLoading(): boolean;
    load<TLoad = T>(constructor: new () => TLoad, loader?: AssetLoader<TLoad>): Promise<TLoad | null>;
    setAsset(asset: T | null): void;
    static fromGuid<T = unknown>(guid: string, assetType: AssetType, displayName?: string): AssetResourceEntry<T>;
}
