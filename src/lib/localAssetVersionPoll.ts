import { getStorageConfig } from '@/services/storage/StorageConfig';
import {
  getActiveMainAppAssetTarget,
  MainAppAssetTarget,
} from '@/services/storage/assetTarget';
import { clearContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { clearEntryIndexCache } from '@/adapters/assets/EntryIndexService';
import { ApiPathPrefix } from '@ocentra/endpoint-domain/constants/versions';
import { clearAssetDownloadUrlResolveCache } from '@ocentra/endpoint-domain/utils/resolve-asset-download-url';

const POLL_INTERVAL_MS = 15_000;
export const ASSETS_INVALIDATED_EVENT = 'ocentra:assets-invalidated';

export function startLocalAssetVersionPoll(): void {
  if (import.meta.env.PROD) return;
  if (getActiveMainAppAssetTarget() !== MainAppAssetTarget.LocalDev) return;
  const workerUrl = getStorageConfig().r2Assets?.workerUrl?.replace(/\/$/, '');
  if (!workerUrl) return;

  const versionUrl = `${workerUrl}${ApiPathPrefix}/assets/version`;
  let lastVersion: string | null = null;

  const poll = async (): Promise<void> => {
    try {
      const res = await fetch(versionUrl);
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      const version = typeof data.version === 'string' ? data.version : null;
      if (version === null) return;
      if (lastVersion !== null && lastVersion !== version) {
        clearEntryIndexCache();
        clearAssetDownloadUrlResolveCache();
        await clearContentSliceCache();
        window.dispatchEvent(new CustomEvent(ASSETS_INVALIDATED_EVENT, { detail: { version } }));
      }
      lastVersion = version;
    } catch {
      // ignore
    }
  };

  void poll();
  setInterval(poll, POLL_INTERVAL_MS);
}
