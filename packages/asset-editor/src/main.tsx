import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { App } from '@/App';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { NetworkRouter } from '@/adapters/network/NetworkRouter';
import { ImageLoadingService } from '@/adapters/image/ImageLoadingService';
import { initAssetEditorLogging } from '@/lib/assetEditorLoggingInit';
import { initTauriAssetEventHandler } from '@/adapters/assets/TauriAssetEventHandler';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import { Resources } from '@ocentra/asset-domain/resources/Resources';
import { TypeRegistry } from '@ocentra/game-asset-domain/TypeRegistry';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';
import { assetConstructorLoaders } from '@/lib/core/registry/assetConstructorLoaders.generated';
import '@ocentra/game-asset-domain/gameRegistry/GameRegistry';
import { runEditorProfileCaptureIfEnabled } from '@/lib/editorProfileReport';

type BootPush = (label: string) => void;
type BootGlobal = typeof globalThis & {
  __OCENTRA_BOOT_TRACE?: Array<Record<string, unknown>>;
  __OCENTRA_BOOT_PUSH?: BootPush;
};
const bootGlobal = globalThis as BootGlobal;
const pushBoot = (label: string) => bootGlobal.__OCENTRA_BOOT_PUSH?.(label);

pushBoot('main.tsx module execution started');
const profileTimeToMainMs = typeof window !== 'undefined' ? Math.round(performance.now()) : 0;

initAssetEditorLogging();
pushBoot('post initLogging');
TypeRegistry.configure({ assetTypeMap, assetConstructorLoaders });
initTauriAssetEventHandler();
pushBoot('pre render');

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

(globalThis as unknown as Record<string, unknown>).__hideAppLoading = () => {
  const loader = document.getElementById('app-loading');
  if (loader) {
    loader.classList.add('hide');
    const applyHidden = () => {
      if (!loader.classList.contains('hidden')) loader.classList.add('hidden');
    };
    loader.addEventListener('transitionend', (e) => {
      if (e.target === loader) applyHidden();
    }, { once: true });
    setTimeout(applyHidden, 400);
  }
};

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);

requestAnimationFrame(() => {
  pushBoot('first rAF after render');
  ((globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined)?.();
  initTauriAssetEventHandler();
  NetworkRouter.getInstance().subscribeToEvents();
  Resources.setLoader(AssetLoader.getInstance());
  void ImageLoadingService.getInstance();
});

runEditorProfileCaptureIfEnabled(profileTimeToMainMs);
