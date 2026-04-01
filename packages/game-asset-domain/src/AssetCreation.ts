import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';

const fallback = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const createAssetGuid = (): AssetGUIDType => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID() as AssetGUIDType;
  }
  return fallback() as AssetGUIDType;
};

export interface AssetCreationContext {
  gameId: string;
  displayName: string;
  category: string;
  timestamp: string;
}

export interface CreatedAsset {
  assetId: string;
  fileName: string;
  guid: string;
  data: Record<string, unknown>;
}

