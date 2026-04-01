import { useEffect, useSyncExternalStore } from 'react';
import { desktopAssetWarmupService } from '@/adapters/assets/DesktopAssetWarmup';
import { DesktopAssetCache } from '@/adapters/assets/DesktopAssetCache';
import './LoadingScreen.css';

export function DesktopAssetWarmupBanner() {
  const state = useSyncExternalStore(
    (listener) => desktopAssetWarmupService.subscribe(listener),
    () => desktopAssetWarmupService.getState()
  );

  useEffect(() => {
    void desktopAssetWarmupService.start();
  }, []);

  if (!DesktopAssetCache.isAvailable()) {
    return null;
  }

  if (state.status === 'idle' || state.status === 'completed') {
    return null;
  }

  const progress = state.total > 0 ? Math.min(100, Math.round((state.completed / state.total) * 100)) : 0;

  return (
    <div className={`desktop-asset-warmup-banner desktop-asset-warmup-banner--${state.status}`}>
      <div className="desktop-asset-warmup-banner__text">
        <strong>Desktop asset cache</strong>
        <span>{state.message}</span>
      </div>
      <div className="desktop-asset-warmup-banner__meta">
        <span>{state.total > 0 ? `${state.completed}/${state.total}` : 'Preparing'}</span>
        {state.failed > 0 && <span>{state.failed} failed</span>}
      </div>
      <div className="desktop-asset-warmup-banner__progress">
        <div
          className="desktop-asset-warmup-banner__progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
