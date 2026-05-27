import { getMobileOS, getPlatformRuntime, MobileOS, PlatformRuntime } from '@ocentra/app-core/platform';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CloudflareLocalConfig, createLocalHttpBaseUrl } from '@ocentra/endpoint-domain/constants/local';
import { ApiPathPrefix } from '@ocentra/endpoint-domain/constants/versions';

function getEnv(key: string): string {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] ?? '';
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return String(import.meta.env[key] ?? '');
  }
  return '';
}

function getLocalDevWorkerPort(): number {
  const raw = getEnv('VITE_LOCAL_WORKER_PORT') || getEnv('WORKER_PORT');
  if (!raw.trim()) {
    return CloudflareLocalConfig.Port;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65535 ? parsed : CloudflareLocalConfig.Port;
}

function getLocalDevWorkerHost(): string {
  const runtime = getPlatformRuntime();

  if (runtime === PlatformRuntime.Mobile && getMobileOS() === MobileOS.Android) {
    return '10.0.2.2';
  }

  return CloudflareLocalConfig.Host;
}

export function getLocalDevWorkerBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/local/api`;
  }
  return createLocalHttpBaseUrl(getLocalDevWorkerHost(), getLocalDevWorkerPort());
}

export function getLocalDevAssetsPublicUrl(): string {
  const workerBase = getLocalDevWorkerBaseUrl();
  const assetsPath = workerBase.endsWith('/local/api')
    ? ApiEndpoint.Assets.Base.replace(ApiPathPrefix, '')
    : ApiEndpoint.Assets.Base;
  return `${workerBase}${assetsPath}`;
}
