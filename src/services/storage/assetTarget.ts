import { getLocalDevAssetsPublicUrl, getLocalDevWorkerBaseUrl } from '@/services/storage/localDevRuntime';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

export const MainAppAssetTarget = {
  LocalDev: 'local-dev',
  RealCloud: 'real-cloud',
} as const;

export type MainAppAssetTargetValue =
  (typeof MainAppAssetTarget)[keyof typeof MainAppAssetTarget];

export type MainAppAssetTargetDetails = {
  key: MainAppAssetTargetValue;
  label: string;
  description: string;
  workerUrl: string;
  assetsPublicUrl: string;
  configured: boolean;
};

const STORAGE_KEY = 'ocentra.main-app.asset-target';
export const MAIN_APP_ASSET_TARGET_EVENT = 'ocentra:main-app-asset-target-change';

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

function getDefaultTargetFromEnv(): MainAppAssetTargetValue {
  const configured = getEnv('VITE_MAIN_ASSET_TARGET_DEFAULT').trim().toLowerCase();
  if (configured === MainAppAssetTarget.RealCloud) {
    return MainAppAssetTarget.RealCloud;
  }
  return MainAppAssetTarget.LocalDev;
}

function getForcedTargetFromEnv(): MainAppAssetTargetValue | null {
  const configured = getEnv('VITE_MAIN_ASSET_TARGET_FORCE').trim().toLowerCase();
  if (configured === MainAppAssetTarget.LocalDev) {
    return MainAppAssetTarget.LocalDev;
  }
  if (configured === MainAppAssetTarget.RealCloud) {
    return MainAppAssetTarget.RealCloud;
  }
  return null;
}

export function getStoredMainAppAssetTarget(): MainAppAssetTargetValue | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === MainAppAssetTarget.LocalDev || raw === MainAppAssetTarget.RealCloud) {
    return raw;
  }
  return null;
}

export function getActiveMainAppAssetTarget(): MainAppAssetTargetValue {
  return getForcedTargetFromEnv() ?? getStoredMainAppAssetTarget() ?? getDefaultTargetFromEnv();
}

export function setActiveMainAppAssetTarget(target: MainAppAssetTargetValue): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, target);
  window.dispatchEvent(new CustomEvent(MAIN_APP_ASSET_TARGET_EVENT, { detail: { target } }));
}

export function getMainAppAssetTargetDetails(
  target: MainAppAssetTargetValue = getActiveMainAppAssetTarget()
): MainAppAssetTargetDetails {
  const localWorkerUrl = normalizeBaseUrl(
    getEnv('VITE_MAIN_LOCAL_CLAIM_STORAGE_URL') ||
      getEnv('VITE_MAIN_LOCAL_WORKER_URL') ||
      getEnv('VITE_CLAIM_STORAGE_URL') ||
      getEnv('VITE_ASSETS_WORKER_URL') ||
      getEnv('VITE_R2_WORKER_URL') ||
      getLocalDevWorkerBaseUrl()
  );
  const localAssetsPublicUrl = buildAssetsPublicUrl(
    localWorkerUrl,
    getEnv('VITE_MAIN_LOCAL_ASSETS_PUBLIC_URL') || getEnv('VITE_ASSETS_PUBLIC_URL') || getLocalDevAssetsPublicUrl()
  );

  const realWorkerUrl = normalizeBaseUrl(
    getEnv('VITE_MAIN_REAL_CLAIM_STORAGE_URL') ||
      getEnv('VITE_MAIN_REAL_WORKER_URL') ||
      getEnv('VITE_MAIN_ASSETS_WORKER_URL')
  );
  const realAssetsPublicUrl = buildAssetsPublicUrl(
    realWorkerUrl,
    getEnv('VITE_MAIN_REAL_ASSETS_PUBLIC_URL')
  );

  if (target === MainAppAssetTarget.RealCloud) {
    return {
      key: target,
      label: 'Real Cloud',
      description: 'Production/deployed Cloudflare asset delivery',
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

export function getAvailableMainAppAssetTargets(): MainAppAssetTargetDetails[] {
  return [
    getMainAppAssetTargetDetails(MainAppAssetTarget.LocalDev),
    getMainAppAssetTargetDetails(MainAppAssetTarget.RealCloud),
  ];
}
