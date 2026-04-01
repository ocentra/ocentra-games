import type { AssetData } from '@/types/assets';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';

export interface CacheStatus {
  isCached: boolean;
  hashVerified: boolean;
  cacheSize?: number;
  cachedAt?: number;
  r2Url?: string;
  r2Checked?: boolean;
  r2Synced?: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface InspectorPanelState {
  editedData: AssetData | null;
  hasChanges: boolean;
  resource: ResourceEntry | null;
  imageDimensions: ImageDimensions | null;
  cacheStatus: CacheStatus | null;
}

