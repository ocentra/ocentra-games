export type AssetType = string & {
    readonly __brand: 'AssetType';
};
export type AssetTypeValidator = (value: string) => boolean;
export declare function setAssetTypeValidator(validator: AssetTypeValidator | null): void;
export declare function asAssetType(value: string): AssetType;
export declare function tryAssetType(value: string): AssetType | null;
export declare function isValidAssetType(value: string): value is AssetType;
