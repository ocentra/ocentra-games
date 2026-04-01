import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';

const fallback = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const createGuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return fallback();
};

export const createAssetGuid = (): AssetGUIDType => {
  return createGuid() as AssetGUIDType;
};

