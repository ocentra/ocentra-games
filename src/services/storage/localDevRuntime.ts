import { getMobileOS, getPlatformRuntime, MobileOS, PlatformRuntime } from '@ocentra/app-core/platform';
import { CloudflareLocalConfig, createLocalHttpBaseUrl } from '@ocentra/endpoint-domain/constants/local';

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
  return createLocalHttpBaseUrl(getLocalDevWorkerHost(), CloudflareLocalConfig.Port);
}

export function getLocalDevAssetsPublicUrl(): string {
  return `${getLocalDevWorkerBaseUrl()}/api/v1/assets`;
}
