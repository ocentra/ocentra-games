import type { AssetCategory } from '@ocentra/boundary-domain/types/asset-category';
export { AssetTypeCategory, type AssetCategory } from '@ocentra/boundary-domain/types/asset-category';
export declare const MimeTypes: {
    readonly Asset: "application/x-asset+yaml";
    readonly Png: "image/png";
    readonly Jpeg: "image/jpeg";
    readonly Json: "application/json";
    readonly Yaml: "application/yaml";
    readonly Markdown: "text/markdown";
    readonly PlainText: "text/plain";
    readonly OctetStream: "application/octet-stream";
    readonly Html: "text/html";
};
export type MimeType = typeof MimeTypes[keyof typeof MimeTypes];
export declare const AssetSchemaVersion: {
    readonly V1: 1;
    readonly V2: 2;
    readonly V3: 3;
    readonly V4: 4;
    readonly V5: 5;
    readonly V6: 6;
    readonly V7: 7;
    readonly V8: 8;
    readonly V9: 9;
    readonly V10: 10;
    readonly V11: 11;
    readonly V12: 12;
    readonly V13: 13;
    readonly V14: 14;
    readonly V15: 15;
    readonly V16: 16;
    readonly V17: 17;
    readonly V18: 18;
    readonly V19: 19;
};
export type AssetSchemaVersion = typeof AssetSchemaVersion[keyof typeof AssetSchemaVersion];
export type ImportPath = string;
export interface AssetTypeMetadata {
    importPath: ImportPath;
    assetType: string;
    displayName?: string;
    icon?: string;
    category?: AssetCategory;
    commonType?: string;
}
export declare const CreateDialogMode: {
    readonly FullGameSet: "full-game-set";
    readonly SingleAsset: "single-asset";
    readonly GameSpecificAsset: "game-specific-asset";
};
export type CreateDialogMode = typeof CreateDialogMode[keyof typeof CreateDialogMode];
export declare const CreateAssetError: {
    readonly GameNameRequired: "Please enter a game name";
    readonly GameIdRequired: "Please enter a game ID";
    readonly GameIdInvalid: "Game ID must be lowercase, start with a letter, and contain only letters, numbers, and underscores (e.g., \"my_game\")";
    readonly AssetNameRequired: "Please enter an asset name";
    readonly AssetTypeRequired: "Please select an asset type";
    readonly GameIdFromPathRequired: "This asset type requires a game ID. Please create it within a game folder or provide a game ID";
    readonly GameModeLinkRequired: "Asset type \"{assetType}\" must be linked to a game mode. Please create it within a game folder";
};
