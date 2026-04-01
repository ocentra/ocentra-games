import { ScriptableObject } from '../ScriptableObject';
import { AssetResourceEntry } from '../resourceEntry/AssetResourceEntry';
import type { AssetEntry } from '@ocentra/network-domain/router-types';
export declare class AssetResourceEntryFactory {
    static fromAsset<T extends ScriptableObject>(asset: T): AssetResourceEntry<T>;
    static fromAssetWithAssetRegistry<T extends ScriptableObject>(asset: T): Promise<AssetResourceEntry<T>>;
    static fromAssetEntry(assetEntry: AssetEntry, loadedAsset?: ScriptableObject | null): AssetResourceEntry;
}
