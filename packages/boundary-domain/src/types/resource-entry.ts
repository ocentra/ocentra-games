import type { GameId } from '@/types/asset-identifiers';
import type { AssetCategory } from '@/types/asset-category';

export interface ITimestampShape {
  seconds: number;
  nanoseconds: number;
}

export interface IResourceEntry {
  path: string;
  displayName: string;
  gameId?: GameId | null;
  category?: AssetCategory | null;
  mimeType?: string | null;
  fileSize?: number | null;
  createdAt?: ITimestampShape | null;
  updatedAt?: ITimestampShape | null;
  lastScanAt?: ITimestampShape | null;
  checksum?: string | null;
}

export interface IAssetResourceEntry extends IResourceEntry {
  guid: string;
  assetType: string;
  inheritanceChain?: string[] | null;
  variant?: string | null;
}
