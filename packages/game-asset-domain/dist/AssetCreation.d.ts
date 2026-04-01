import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
export declare const createAssetGuid: () => AssetGUIDType;
export interface AssetCreationContext {
    gameId: string;
    displayName: string;
    category: string;
    timestamp: string;
}
export interface CreatedAsset {
    assetId: string;
    fileName: string;
    guid: string;
    data: Record<string, unknown>;
}
