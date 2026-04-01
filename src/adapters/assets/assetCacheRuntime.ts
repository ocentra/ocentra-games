import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';
import type { RuntimeAssetCache } from '@/adapters/assets/RuntimeAssetCache';
import { WebAssetCache } from '@/adapters/assets/WebAssetCache';

let runtimeAssetCache: RuntimeAssetCache | null = null;

export function getRuntimeAssetCache(): RuntimeAssetCache {
  if (!runtimeAssetCache) {
    runtimeAssetCache = DesktopAssetCache.isAvailable() ? new DesktopAssetCache() : new WebAssetCache();
  }
  return runtimeAssetCache;
}

export function resetRuntimeAssetCache(): void {
  runtimeAssetCache = null;
}
