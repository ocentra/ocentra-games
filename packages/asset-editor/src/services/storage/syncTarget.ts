import { CloudflareLocalConfig, createLocalHttpBaseUrl } from '@ocentra/endpoint-domain/constants/local';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

export const AssetEditorSyncTarget = {
  LocalDev: 'local-dev',
  RealCloud: 'real-cloud',
} as const;

export type AssetEditorSyncTargetValue =
  (typeof AssetEditorSyncTarget)[keyof typeof AssetEditorSyncTarget];

export type AssetEditorSyncTargetDetails = {
  key: AssetEditorSyncTargetValue;
  label: string;
  description: string;
  workerUrl: string;
  assetsPublicUrl: string;
  configured: boolean;
};

const STORAGE_KEY = 'ocentra.asset-editor.sync-target';
export const ASSET_EDITOR_SYNC_TARGET_EVENT = 'ocentra:asset-editor-sync-target-change';

function getEnv(key: string): string {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] ?? '';
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return String(import.meta.env[key] ?? '');
  }
  return '';
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function buildAssetsPublicUrl(workerUrl: string, explicitAssetsUrl: string): string {
  const normalizedExplicit = normalizeBaseUrl(explicitAssetsUrl);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }
  const normalizedWorker = normalizeBaseUrl(workerUrl);
  return normalizedWorker ? `${normalizedWorker}${ApiEndpoint.Assets.Base}` : '';
}

function getLocalWorkerFallbackUrl(): string {
  const rawPort = getEnv('VITE_LOCAL_WORKER_PORT') || getEnv('WORKER_PORT');
  const parsedPort = Number.parseInt(rawPort, 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
    ? parsedPort
    : CloudflareLocalConfig.Port;
  return createLocalHttpBaseUrl(CloudflareLocalConfig.Host, port);
}

function getDefaultTargetFromEnv(): AssetEditorSyncTargetValue {
  const configured = getEnv('VITE_EDITOR_SYNC_TARGET_DEFAULT').trim().toLowerCase();
  if (configured === AssetEditorSyncTarget.RealCloud) {
    return AssetEditorSyncTarget.RealCloud;
  }
  return AssetEditorSyncTarget.LocalDev;
}

export function getStoredAssetEditorSyncTarget(): AssetEditorSyncTargetValue | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === AssetEditorSyncTarget.LocalDev || raw === AssetEditorSyncTarget.RealCloud) {
    return raw;
  }
  return null;
}

export function getActiveAssetEditorSyncTarget(): AssetEditorSyncTargetValue {
  return getStoredAssetEditorSyncTarget() ?? getDefaultTargetFromEnv();
}

export function setActiveAssetEditorSyncTarget(target: AssetEditorSyncTargetValue): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, target);
  window.dispatchEvent(new CustomEvent(ASSET_EDITOR_SYNC_TARGET_EVENT, { detail: { target } }));
}

export function getAssetEditorSyncTargetDetails(
  target: AssetEditorSyncTargetValue = getActiveAssetEditorSyncTarget()
): AssetEditorSyncTargetDetails {
  const localWorkerUrl = normalizeBaseUrl(
    getEnv('VITE_EDITOR_SYNC_LOCAL_CLAIM_STORAGE_URL') ||
      getEnv('VITE_CLAIM_STORAGE_URL') ||
      getEnv('VITE_ASSETS_WORKER_URL') ||
      getEnv('VITE_R2_WORKER_URL') ||
      getLocalWorkerFallbackUrl()
  );
  const localAssetsPublicUrl = buildAssetsPublicUrl(
    localWorkerUrl,
    getEnv('VITE_EDITOR_SYNC_LOCAL_ASSETS_PUBLIC_URL') || getEnv('VITE_ASSETS_PUBLIC_URL')
  );

  const realWorkerUrl = normalizeBaseUrl(
    getEnv('VITE_EDITOR_SYNC_REAL_CLAIM_STORAGE_URL') ||
      getEnv('VITE_EDITOR_SYNC_REAL_WORKER_URL') ||
      getEnv('VITE_EDITOR_REAL_CLAIM_STORAGE_URL') ||
      getEnv('VITE_EDITOR_REAL_WORKER_URL')
  );
  const realAssetsPublicUrl = buildAssetsPublicUrl(
    realWorkerUrl,
    getEnv('VITE_EDITOR_SYNC_REAL_ASSETS_PUBLIC_URL') || getEnv('VITE_EDITOR_REAL_ASSETS_PUBLIC_URL')
  );

  if (target === AssetEditorSyncTarget.RealCloud) {
    return {
      key: target,
      label: 'Real Cloud',
      description: 'Production/deployed Cloudflare target',
      workerUrl: realWorkerUrl,
      assetsPublicUrl: realAssetsPublicUrl,
      configured: Boolean(realWorkerUrl),
    };
  }

  return {
    key: target,
    label: 'Local Dev',
    description: 'Local Cloudflare worker on the configured dev port',
    workerUrl: localWorkerUrl,
    assetsPublicUrl: localAssetsPublicUrl,
    configured: Boolean(localWorkerUrl),
  };
}

export function getAvailableAssetEditorSyncTargets(): AssetEditorSyncTargetDetails[] {
  return [
    getAssetEditorSyncTargetDetails(AssetEditorSyncTarget.LocalDev),
    getAssetEditorSyncTargetDetails(AssetEditorSyncTarget.RealCloud),
  ];
}
