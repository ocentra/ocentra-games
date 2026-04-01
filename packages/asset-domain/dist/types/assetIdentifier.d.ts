import type { ImageHash, GameId, AssetGUIDType } from '@ocentra/boundary-domain/types/asset-identifiers';
export type { ImageHash, GameId, AssetGUIDType } from '@ocentra/boundary-domain/types/asset-identifiers';
export type AssetHash = string & {
    readonly __brand: 'AssetHash';
};
export type AssetChecksum = string & {
    readonly __brand: 'AssetChecksum';
};
export type SoundHash = string & {
    readonly __brand: 'SoundHash';
};
export type VideoHash = string & {
    readonly __brand: 'VideoHash';
};
export type AssetURL = string & {
    readonly __brand: 'AssetURL';
};
export type AssetPath = string & {
    readonly __brand: 'AssetPath';
};
export type ModelPath = string & {
    readonly __brand: 'ModelPath';
};
export type QuantPath = string & {
    readonly __brand: 'QuantPath';
};
export type AssetIdentifier = AssetGUIDType | AssetHash | AssetChecksum;
export declare function isAssetGUID(value: string): value is AssetGUIDType;
export declare function isAssetHash(value: string): value is AssetHash;
export declare function isImageHash(value: string): value is ImageHash;
export declare function isSoundHash(value: string): value is SoundHash;
export declare function isVideoHash(value: string): value is VideoHash;
export declare function isAssetChecksum(value: string): value is AssetChecksum;
export declare function isAssetIdentifier(value: string): value is AssetIdentifier;
export declare function toAssetIdentifier(value: string): AssetIdentifier;
export declare function tryAssetIdentifier(value: string): AssetIdentifier | null;
export declare function isGameId(value: string): value is GameId;
export declare function asGameId(value: string): GameId;
export declare function tryGameId(value: string): GameId | null;
