import { getMobileOS, getPlatformRuntime, MobileOS, PlatformRuntime } from '@ocentra/app-core/platform';
import { Hostname } from '@ocentra/endpoint-domain/constants/hostname';

const LOCAL_DEV_WORKER_PORT = 8787;

function getLocalDevWorkerHost(): string {
  const runtime = getPlatformRuntime();

  if (runtime === PlatformRuntime.Mobile && getMobileOS() === MobileOS.Android) {
    return '10.0.2.2';
  }

  return Hostname.Ipv4Loopback;
}

export function getLocalDevWorkerBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/local/api`;
  }
  return `http://${getLocalDevWorkerHost()}:${LOCAL_DEV_WORKER_PORT}`;
}

export function getLocalDevAssetsPublicUrl(): string {
  return `${getLocalDevWorkerBaseUrl()}/api/v1/assets`;
}
