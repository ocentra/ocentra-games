import type { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';

export interface AssetTypeInfo {
  assetType: string;
  displayName: string;
  icon: string;
  constructor: new () => ScriptableObject;
  createTemplate: () => Record<string, unknown>;
  category: import('@ocentra/asset-domain/constants/assets').AssetCategory;
  extension?: string;
}
