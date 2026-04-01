export function normalizeAssetType(assetType: string): string {
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
} as const;

export type AssetPathSegmentType = typeof AssetPathSegment[keyof typeof AssetPathSegment];

export function isGameModeAssetType(assetType: string): boolean {
  return assetType.endsWith(AssetPathSegment.GameMode) && assetType !== AssetPathSegment.GameMode;
}

export function deriveCategoryFromAssetType(assetType: string): string | null {
  if (!isGameModeAssetType(assetType)) {
    return null;
  }
  const prefix = assetType.replace(AssetPathSegment.GameMode, '');
  if (!prefix) {
    return null;
  }
  return `${prefix}${AssetPathSegment.Games}`;
}
