import React from 'react';
import type { AssetData } from '@/types/assets';
import type { AssetCategory as AssetRegistryCategory } from '@ocentra/asset-domain/constants/assets';
import { AssetSyncStatus as AssetSyncStatusValue } from '@ocentra/asset-domain/constants/sync';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import type { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';

export interface AssetSyncInfo {
  synced: boolean;
  status: AssetSyncStatusValue;
  localModified?: string;
  cloudModified?: string | null;
  remoteUrl?: string;
}

export interface AssetSyncStatus {
  lastSyncFromR2?: string | null;
  lastSyncToR2?: string | null;
  totalAssets?: number;
  synced?: number;
  changed?: number;
  notInCloud?: number;
  assets?: Record<string, {
    localModified: string;
    cloudModified: string | null;
    synced: boolean;
    checksum: string;
    status: AssetSyncStatusValue;
  }>;
}

export interface CacheStatus {
  isCached: boolean;
  hashVerified: boolean;
  cacheSize?: number;
  cachedAt?: number;
  cloudUrl?: string;
  cloudChecked?: boolean;
  cloudSynced?: boolean;
}

export interface BaseInspectorProps {
  assetType: string;
  assetId: string;
  assetPath: string;
  syncInfo?: AssetSyncInfo;
  resource?: ResourceEntry | null;
  displayMetadata?: {
    typeCategory?: string;
    tags?: string[];
    status?: string;
    schemaVersion?: number;
    imageWidth?: number;
    imageHeight?: number;
    cacheStatus?: CacheStatus;
    imageETag?: string;
    imageCachedAt?: string;
  };
  onSyncRequested?: () => void | Promise<void>;
  onSyncStatusRefresh?: () => void | Promise<void>;
}

export type CreateGameModeOptions = {
  category?: AssetRegistryCategory;
  assetType?: string;
  defaultPath?: string;
};

export interface InspectorPanelProps {
  assetPath: string | null;
  assetData: AssetData | null;
  isLoading?: boolean;
  error?: string | null;
  onAssetUpdate: (updatedData: AssetData) => void;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  onCreateAsset?: (folderPath?: string, options?: CreateGameModeOptions) => void;
  onDeleteGameMode?: (guid: string) => void;
  syncStatus?: AssetSyncStatus | null;
}

export interface PreviewPanelProps {
  assetPath: string | null;
  assetData: AssetData | null;
  assetRawContent?: string | null;
  assetInstance?: ScriptableObject | null;
  isLoading?: boolean;
  error?: string | null;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  navigationHistory?: Array<{ path: string; name: string }>;
  onBack?: () => void;
  onContentChange?: (content: string) => void;
  onAssetUpdate?: (updatedData: AssetData) => void;
}

export type InspectorComponent<T = unknown> = React.FC<{
  data: T;
  index?: number;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  onFieldChange?: (field: string, value: unknown) => void;
  prefix?: string;
  immutable?: boolean;
  onCreateAsset?: (folderPath?: string, options?: unknown) => void;
  onDeleteGameMode?: (guid: string) => void;
}>;
