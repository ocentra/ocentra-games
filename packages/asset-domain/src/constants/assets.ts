import type { AssetCategory } from '@ocentra/boundary-domain/types/asset-category';
export { AssetTypeCategory, type AssetCategory } from '@ocentra/boundary-domain/types/asset-category';

export const MimeTypes = {
  Asset: 'application/x-asset+yaml',
  Png: 'image/png',
  Jpeg: 'image/jpeg',
  Json: 'application/json',
  Yaml: 'application/yaml',
  Markdown: 'text/markdown',
  PlainText: 'text/plain',
  OctetStream: 'application/octet-stream',
  Html: 'text/html',
} as const;

export type MimeType = typeof MimeTypes[keyof typeof MimeTypes];

export const AssetSchemaVersion = {
  V1: 1,
  V2: 2,
  V3: 3,
  V4: 4,
  V5: 5,
  V6: 6,
  V7: 7,
  V8: 8,
  V9: 9,
  V10: 10,
  V11: 11,
  V12: 12,
  V13: 13,
  V14: 14,
  V15: 15,
  V16: 16,
  V17: 17,
  V18: 18,
  V19: 19,
} as const;

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

export const CreateDialogMode = {
  FullGameSet: 'full-game-set',
  SingleAsset: 'single-asset',
  GameSpecificAsset: 'game-specific-asset',
} as const;

export type CreateDialogMode = typeof CreateDialogMode[keyof typeof CreateDialogMode];

export const CreateAssetError = {
  GameNameRequired: 'Please enter a game name',
  GameIdRequired: 'Please enter a game ID',
  GameIdInvalid: 'Game ID must be lowercase, start with a letter, and contain only letters, numbers, and underscores (e.g., "my_game")',
  AssetNameRequired: 'Please enter an asset name',
  AssetTypeRequired: 'Please select an asset type',
  GameIdFromPathRequired: 'This asset type requires a game ID. Please create it within a game folder or provide a game ID',
  GameModeLinkRequired: 'Asset type "{assetType}" must be linked to a game mode. Please create it within a game folder',
} as const;

