import type { BaseAssetMetadata } from '@ocentra/game-asset-domain/BaseAssetMetadata';

export interface AssetSystemData {
  guid?: string;
  assetType?: string;
  schemaVersion?: number;
  displayName?: string;
  category?: string;
  icon?: string;
  [key: string]: unknown;
}

export interface AssetData {
  system?: AssetSystemData;
  data?: Record<string, unknown>;
  metadata?: BaseAssetMetadata & {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

