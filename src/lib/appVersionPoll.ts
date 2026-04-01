import { getStorageConfig } from '@/services/storage/StorageConfig';
import { ApiPathPrefix } from '@ocentra/endpoint-domain/constants/versions';
import { APP_VERSION } from '@/constants/version';
import { PlatformRuntime, getPlatformRuntime } from '@ocentra/app-core/platform';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
export const APP_UPDATE_AVAILABLE_EVENT = 'ocentra:app-update-available';

function parseSemverParts(v: string): [number, number, number] {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function isNewer(server: string, client: string): boolean {
  const [sMaj, sMin, sPatch] = parseSemverParts(server);
  const [cMaj, cMin, cPatch] = parseSemverParts(client);
  if (sMaj !== cMaj) return sMaj > cMaj;
  if (sMin !== cMin) return sMin > cMin;
  return sPatch > cPatch;
}

export function getAppVersionUrl(): string {
  const config = getStorageConfig();
  const assets = config.assetsPublicUrl ?? '';
  const base = assets.replace(/\/api\/v1\/assets\/?$/, '');
  if (!base) return '';
  return `${base}${ApiPathPrefix}/version`;
}

async function resolveClientVersion(): Promise<string> {
  if (getPlatformRuntime() === PlatformRuntime.Mobile) {
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      if (info?.version) return info.version;
    } catch {
      // ignore
    }
  }
  return APP_VERSION;
}

export function startAppVersionPoll(): void {
  const versionUrl = getAppVersionUrl();
  if (!versionUrl) return;

  const poll = async (): Promise<void> => {
    try {
      const clientVersion = await resolveClientVersion();
      const res = await fetch(versionUrl, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      const serverVersion = typeof data.version === 'string' ? data.version : '';
      if (!serverVersion) return;
      if (isNewer(serverVersion, clientVersion)) {
        window.dispatchEvent(
          new CustomEvent(APP_UPDATE_AVAILABLE_EVENT, { detail: { serverVersion } })
        );
      }
    } catch {
      // ignore
    }
  };

  void poll();
  setInterval(poll, POLL_INTERVAL_MS);
}
