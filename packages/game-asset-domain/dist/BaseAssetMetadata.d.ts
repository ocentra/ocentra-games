export declare const AssetStatus: {
    readonly Published: "Published";
    readonly Draft: "Draft";
    readonly ComingSoon: "ComingSoon";
    readonly Archived: "Archived";
};
export type AssetStatus = typeof AssetStatus[keyof typeof AssetStatus];
export declare const AssetTypeCategory: {
    readonly GameMode: "GameMode";
    readonly Image: "Image";
    readonly Card: "Card";
    readonly Layout: "Layout";
    readonly Page: "Page";
    readonly UI: "UI";
    readonly AI: "AI";
    readonly Rules: "Rules";
    readonly Content: "Content";
    readonly Other: "Other";
};
export type AssetTypeCategory = typeof AssetTypeCategory[keyof typeof AssetTypeCategory];
export declare const AssetTag: {
    readonly PageAsset: "page-asset";
    readonly GamePageAsset: "game-page-asset";
    readonly HomePageAsset: "home-page-asset";
    readonly GameModeAsset: "game-mode-asset";
    readonly GameRulesAsset: "game-rules-asset";
    readonly GameDescriptionAsset: "game-description-asset";
    readonly GameLayoutAsset: "game-layout-asset";
    readonly ContentAsset: "content-asset";
    readonly ImageAsset: "image-asset";
    readonly CardAsset: "card-asset";
    readonly UIComponentAsset: "ui-component-asset";
    readonly ButtonAsset: "button-asset";
    readonly AIModelAsset: "ai-model-asset";
    readonly AIStrategyAsset: "ai-strategy-asset";
};
export type AssetTag = typeof AssetTag[keyof typeof AssetTag];
export interface BaseAssetMetadata {
    assetId: string;
    assetType: string;
    typeCategory?: AssetTypeCategory;
    tags?: string[];
    status?: AssetStatus;
    schemaVersion?: number;
    createdAt?: string;
    updatedAt?: string;
    guid?: string;
    localPath?: string;
    remotePath?: string;
    synced?: boolean;
    lastSynced?: string;
}
export declare abstract class BaseAssetMetadataClass {
    typeCategory: AssetTypeCategory | null;
    tags: string[];
    status: AssetStatus | null;
    createdAt: string;
    updatedAt: string;
    guid: string;
}
