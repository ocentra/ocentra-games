import { Suspense, lazy } from 'react';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';

const DesktopAssetWarmupBanner = lazy(() =>
  import('@/ui/components/Loading/DesktopAssetWarmupBanner').then((m) => ({
    default: m.DesktopAssetWarmupBanner,
  }))
);

export function PlatformDesktopAssetWarmupBanner() {
  const { isDesktop } = usePlatformUI();

  if (!isDesktop) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <DesktopAssetWarmupBanner />
    </Suspense>
  );
}
