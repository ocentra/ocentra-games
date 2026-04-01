export function normalizeAssetType(assetType) {
    return assetType.replace(/\d+$/, '');
}
export const AssetPathSegment = {
    GameMode: 'GameMode',
    Games: 'Games',
    Cards: 'Cards',
    Pages: 'Pages',
    UI: 'UI',
    AI: 'AI',
    Layouts: 'Layouts',
    Content: 'Content',
    Images: 'Images',
    Models: 'Models',
    Settings: 'Settings',
};
export function isGameModeAssetType(assetType) {
    return assetType.endsWith(AssetPathSegment.GameMode) && assetType !== AssetPathSegment.GameMode;
}
export function deriveCategoryFromAssetType(assetType) {
    if (!isGameModeAssetType(assetType)) {
        return null;
    }
    const prefix = assetType.replace(AssetPathSegment.GameMode, '');
    if (!prefix) {
        return null;
    }
    return `${prefix}${AssetPathSegment.Games}`;
}
