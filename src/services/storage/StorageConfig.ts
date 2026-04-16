/// <reference types="vite/client" />
/// <reference lib="DOM" />
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import {
  MainAppAssetTarget,
  getActiveMainAppAssetTarget,
  getMainAppAssetTargetDetails,
  type MainAppAssetTargetValue,
} from '@/services/storage/assetTarget';
import { getLocalDevAssetsPublicUrl, getLocalDevWorkerBaseUrl } from '@/services/storage/localDevRuntime';

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
  assetTarget?: {
    key: MainAppAssetTargetValue;
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

export function getSliceEndpointUrl(config: StorageConfig, relativePath: string): string {
  const workerUrl = config.r2Assets?.workerUrl?.replace(/\/$/, '') || '';
  if (!workerUrl) {
    return '';
  }

  if (relativePath === AssetContentSlicePath.EntryIndex) {
    return `${workerUrl}/api/v1/slices/entry-index`;
  }
  if (relativePath === AssetContentSlicePath.Home) {
    return `${workerUrl}/api/v1/slices/home`;
  }
  if (relativePath === AssetContentSlicePath.Games) {
    return `${workerUrl}/api/v1/slices/games`;
  }

  const gamePageMatch = relativePath.match(/^games\/([^/]+)\/page\.json$/);
  if (gamePageMatch) {
    return `${workerUrl}/api/v1/slices/games/${encodeURIComponent(gamePageMatch[1])}/page`;
  }

  const gameEngineMatch = relativePath.match(/^games\/([^/]+)\/engine\.json$/);
  if (gameEngineMatch) {
    return `${workerUrl}/api/v1/slices/games/${encodeURIComponent(gameEngineMatch[1])}/engine`;
  }

  return '';
}

export function getEntryIndexUrl(config: StorageConfig): string {
  return getSliceEndpointUrl(config, AssetContentSlicePath.EntryIndex);
}

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  return isLocalHostname(window.location.hostname);
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

  const r2WorkerUrl = (getEnv('VITE_R2_WORKER_URL') || '').trim();
  const assetTargetKey = getActiveMainAppAssetTarget();
  const assetTarget = getMainAppAssetTargetDetails(assetTargetKey);
  let claimStorageUrl = assetTarget.workerUrl || (getEnv('VITE_CLAIM_STORAGE_URL') || getEnv('VITE_ASSETS_WORKER_URL') || r2WorkerUrl).trim();
  let assetsPublicUrl =
    assetTarget.assetsPublicUrl ||
    (getEnv('VITE_ASSETS_PUBLIC_URL') || '').trim() ||
    (claimStorageUrl ? `${claimStorageUrl.replace(/\/$/, '')}/api/v1/assets` : '');

  if (!assetsPublicUrl && assetTarget.key === MainAppAssetTarget.LocalDev && isLocalHost()) {
    claimStorageUrl = getLocalDevWorkerBaseUrl();
    assetsPublicUrl = getLocalDevAssetsPublicUrl();
  }

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
    assetTarget: {
      key: assetTarget.key,
      label: assetTarget.label,
      description: assetTarget.description,
      configured: assetTarget.configured || Boolean(claimStorageUrl),
    },
  };
}
