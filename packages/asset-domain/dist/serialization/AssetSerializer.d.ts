import { type SerializableConstructor } from '../serialization/decorators';
import { type AssetCategory } from '../constants/assets';
export interface SerializeAssetInstance {
    guid: {
        toString(): string;
    };
    displayName?: string;
    category?: AssetCategory;
    treePath: string;
    variant?: string;
    constructor: SerializableConstructor & {
        assetType?: string;
        schemaVersion?: number;
        displayName?: string;
        icon?: string;
        category?: AssetCategory;
        name: string;
    };
}
export declare function serializeAsset(instance: SerializeAssetInstance): string;
export interface DeserializeAssetOptions {
    strictAssetType?: boolean;
}
export declare function deserializeAsset<T>(constructor: new () => T, input: string | Record<string, unknown>, _options?: DeserializeAssetOptions): T;
