import type { AssetCategory, CreateDialogMode } from '@ocentra/asset-domain/constants/assets';

export interface CreateDialogOptions {
  mode?: CreateDialogMode;
  category?: AssetCategory;
  assetType?: string;
  defaultPath?: string;
  gameIdFromContext?: string;
}

export interface NavigationHistoryItem {
  path: string;
  name: string;
}

