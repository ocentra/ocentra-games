import { getStorageConfig } from '@/services/storage/StorageConfig';

export interface ResolveShopApiBaseUrlInput {
  appOrigin: string;
  workerUrl?: string | null;
}

function normalizeBaseUrl(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\/$/, '');
}

export function resolveShopApiBaseUrl({ appOrigin, workerUrl }: ResolveShopApiBaseUrlInput): string {
  const workerBaseUrl = normalizeBaseUrl(workerUrl);
  if (workerBaseUrl) return workerBaseUrl;
  return normalizeBaseUrl(appOrigin);
}

export function getShopAppOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function getShopApiBaseUrl(): string {
  return resolveShopApiBaseUrl({
    appOrigin: getShopAppOrigin(),
    workerUrl: getStorageConfig().r2Assets?.workerUrl,
  });
}
