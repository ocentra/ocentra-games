/// <reference types="vite/client" />
/// <reference lib="DOM" />
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import {
  getActiveAssetEditorSyncTarget,
  getAssetEditorSyncTargetDetails,
  type AssetEditorSyncTargetValue,
} from '@/services/storage/syncTarget';

export interface StorageConfig {
  r2?: {
    workerUrl: string;
    bucketName: string;
  };
  assetsPublicUrl: string;
  r2Assets?: {
    enabled: boolean;
    workerUrl: string;
    bucketName: string;
  };
  fallbackToFirebase?: boolean;
  syncTarget?: {
    key: AssetEditorSyncTargetValue;
    label: string;
    description: string;
    configured: boolean;
  };
}

export function getAssetSliceUrl(config: StorageConfig, relativePath: string): string {
  if (!config.assetsPublicUrl) return '';
  const base = config.assetsPublicUrl.replace(/\/$/, '');
  return `${base}/${relativePath.replace(/^\/+/, '')}`;
}

export function getEntryIndexUrl(config: StorageConfig): string {
  return getAssetSliceUrl(config, AssetContentSlicePath.EntryIndex);
}

export function getStorageConfig(): StorageConfig {
  const getEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
    return undefined;
  };

  const r2WorkerUrl = getEnv('VITE_R2_WORKER_URL') || '';
  const syncTargetKey = getActiveAssetEditorSyncTarget();
  const syncTarget = getAssetEditorSyncTargetDetails(syncTargetKey);
  const claimStorageUrl = syncTarget.workerUrl || getEnv('VITE_CLAIM_STORAGE_URL') || getEnv('VITE_ASSETS_WORKER_URL') || r2WorkerUrl;
  const assetsPublicUrl =
    syncTarget.assetsPublicUrl ||
    getEnv('VITE_ASSETS_PUBLIC_URL') ||
    (claimStorageUrl ? `${claimStorageUrl.replace(/\/$/, '')}/api/v1/assets` : '');

  return {
    r2: {
      workerUrl: r2WorkerUrl,
      bucketName: getEnv('VITE_R2_BUCKET_NAME') || 'claim-matches',
    },
    assetsPublicUrl,
    r2Assets: claimStorageUrl
      ? { enabled: true, workerUrl: claimStorageUrl, bucketName: getEnv('VITE_R2_ASSETS_BUCKET') || 'ocentra-assets' }
      : undefined,
    fallbackToFirebase: getEnv('VITE_STORAGE_FALLBACK_FIREBASE') === 'true',
    syncTarget: {
      key: syncTarget.key,
      label: syncTarget.label,
      description: syncTarget.description,
      configured: syncTarget.configured,
    },
  };
}
