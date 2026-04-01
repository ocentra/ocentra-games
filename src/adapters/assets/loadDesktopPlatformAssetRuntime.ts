import type { PlatformAssetRuntime } from '@/adapters/assets/PlatformAssetRuntimeShared';

export async function loadDesktopPlatformAssetRuntime(): Promise<PlatformAssetRuntime> {
  const m = await import('@/adapters/assets/DesktopPlatformAssetRuntime');
  return m.getDesktopPlatformAssetRuntime();
}
