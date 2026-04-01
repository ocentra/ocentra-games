export declare function normalizeAssetType(assetType: string): string;
export declare const AssetPathSegment: {
    readonly GameMode: "GameMode";
    readonly Games: "Games";
    readonly Cards: "Cards";
    readonly Pages: "Pages";
    readonly UI: "UI";
    readonly AI: "AI";
    readonly Layouts: "Layouts";
    readonly Content: "Content";
    readonly Images: "Images";
    readonly Models: "Models";
    readonly Settings: "Settings";
};
export type AssetPathSegmentType = typeof AssetPathSegment[keyof typeof AssetPathSegment];
export declare function isGameModeAssetType(assetType: string): boolean;
export declare function deriveCategoryFromAssetType(assetType: string): string | null;
