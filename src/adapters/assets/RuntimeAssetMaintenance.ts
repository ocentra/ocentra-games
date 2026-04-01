import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { clearContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { clearEntryIndexCache } from '@/adapters/assets/EntryIndexService';
import { clearGameCatalogCache } from '@/adapters/assets/GameCatalogService';
import { getPlatformAssetRuntime } from '@/adapters/assets/PlatformAssetRuntime';
import {
  getRuntimeAssetTelemetrySnapshot,
  resetRuntimeAssetTelemetry,
} from '@/adapters/assets/RuntimeAssetTelemetry';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { getPlatformImageCacheMode } from '@/adapters/image/PlatformImageCacheAdapter';

const log = MainAppLogger.instance;
log.register(import.meta.url);

export async function clearRuntimeAssetCaches(): Promise<void> {
  clearGameCatalogCache();
  clearEntryIndexCache();
  await clearContentSliceCache();
}

export function clearRuntimeAssetTelemetryState(): void {
  resetRuntimeAssetTelemetry();
}

export async function prefetchRuntimeCoreSlices(): Promise<void> {
  try {
    await getPlatformAssetRuntime().prefetchCoreSlices(getStorageConfig());
  } catch (error) {
    log.logWarn('[RuntimeAssetMaintenance] Failed to prefetch core slices', getStackTrace(), {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function getRuntimeAssetDebugSnapshot() {
  const runtime = getPlatformAssetRuntime();
  return {
    assetRuntime: runtime.getDebugInfo(),
    imageCacheMode: getPlatformImageCacheMode(),
    assetTarget: getStorageConfig().assetTarget ?? null,
    telemetry: getRuntimeAssetTelemetrySnapshot(),
  };
}
