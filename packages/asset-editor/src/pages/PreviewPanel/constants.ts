export const ASSET_TYPE = {
  Image: 'Image',
  TextAsset: 'TextAsset',
} as const;

export type AssetType = typeof ASSET_TYPE[keyof typeof ASSET_TYPE];

