import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { PlatformUIProvider } from '@/ui/platform/PlatformUIContext';
import { PlatformAwareRoutes } from '@/ui/routes/PlatformAwareRoutes';
import { NewVersionBanner } from '@/ui/components/NewVersionBanner/NewVersionBanner';

const LazyPlatformDebugOverlay = lazy(async () => {
  const mod = await import('@/ui/platform/PlatformDebugOverlay');
  return { default: mod.PlatformDebugOverlay };
});

export default function AppWrapper() {
  useEffect(() => {
    void import('@/bootstrap/assetSingletonsExtended');
  }, []);

  return (
    <PlatformUIProvider>
      <BrowserRouter>
        <QueryProvider>
          <AuthProvider>
            <NewVersionBanner />
            <PlatformAwareRoutes />
            <Suspense fallback={null}>
              <LazyPlatformDebugOverlay />
            </Suspense>
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </PlatformUIProvider>
  );
}
