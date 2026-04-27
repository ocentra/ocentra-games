import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import {
  clearRuntimeAssetCaches,
  clearRuntimeAssetTelemetryState,
  getRuntimeAssetDebugSnapshot,
  prefetchRuntimeCoreSlices,
} from '@/adapters/assets/RuntimeAssetMaintenance';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { ROUTE_FEATURES, RouteFeature } from '@/config/platformFeatures';
import { buildSettingsPath } from '@/ui/navigation/appRoutes';
import { PLATFORM_INSPECTOR_ROUTE, openPlatformInspectorWindow } from '@/ui/platform/openPlatformInspectorWindow';
import { usePlatformUI } from '@/ui/platform/usePlatformUI';
import './PlatformDebugOverlay.css';

type DebugTabKey = 'layout' | 'assets' | 'runtime';

const DEBUG_TABS: { key: DebugTabKey; label: string }[] = [
  { key: 'layout', label: 'Layout' },
  { key: 'assets', label: 'Assets' },
  { key: 'runtime', label: 'Runtime' },
];

const FOOTER_DEV_DOCK_SELECTOR = '.oc-unified-footer__dev-dock';

function resolveFooterDevDockHost(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const footerBar = document.querySelector<HTMLElement>('.oc-unified-footer__bar');
  if (!footerBar) {
    return null;
  }

  let dock = footerBar.querySelector<HTMLElement>(FOOTER_DEV_DOCK_SELECTOR);
  if (!dock) {
    dock = document.createElement('div');
    dock.className = FOOTER_DEV_DOCK_SELECTOR.slice(1);
    footerBar.appendChild(dock);
  }

  return dock;
}

function DebugField({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="platform-debug-overlay__field">
      <span className="platform-debug-overlay__label">{label}</span>
      <span className="platform-debug-overlay__value">{value}</span>
    </div>
  );
}

export function PlatformDebugOverlay(): ReactElement | null {
  const location = useLocation();
  const {
    debugInspectorEnabled,
    isDesktop,
    isMobile,
    isPortrait,
    isWeb,
    prefersCompactLayout,
    prefersSimplifiedUX,
    runtime,
    setDebugInspectorEnabled,
    shell,
    supportsHover,
    viewportHeight,
    viewportWidth,
  } = usePlatformUI();
  const [activeTab, setActiveTab] = useState<DebugTabKey>('layout');
  const [cacheActionState, setCacheActionState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [debugSnapshotVersion, setDebugSnapshotVersion] = useState(0);
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null);
  const storageConfig = useMemo(() => getStorageConfig(), []);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() => getRuntimeAssetDebugSnapshot());
  const sourcePath = useMemo(
    () => new URLSearchParams(location.search).get('sourcePath'),
    [location.search]
  );
  const isStandaloneInspectorRoute = location.pathname === PLATFORM_INSPECTOR_ROUTE;
  const showLauncher = import.meta.env.DEV && !isMobile && !isStandaloneInspectorRoute;

  useEffect(() => {
    setRuntimeSnapshot(getRuntimeAssetDebugSnapshot());
  }, [debugSnapshotVersion]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const syncHost = () => {
      setFooterHost(resolveFooterDevDockHost());
    };

    syncHost();

    const observer = new MutationObserver(syncHost);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !debugInspectorEnabled || isMobile || isStandaloneInspectorRoute) {
      return;
    }

    void openPlatformInspectorWindow();
    setDebugInspectorEnabled(false);
  }, [debugInspectorEnabled, isMobile, isStandaloneInspectorRoute, setDebugInspectorEnabled]);

  const clearRuntimeCaches = async (): Promise<void> => {
    setCacheActionState('working');
    try {
      await clearRuntimeAssetCaches();
      setDebugSnapshotVersion((value) => value + 1);
      setCacheActionState('done');
    } catch {
      setCacheActionState('failed');
    }
  };

  const prefetchSlices = async (): Promise<void> => {
    setCacheActionState('working');
    try {
      await prefetchRuntimeCoreSlices();
      setDebugSnapshotVersion((value) => value + 1);
      setCacheActionState('done');
    } catch {
      setCacheActionState('failed');
    }
  };

  const resetTelemetry = (): void => {
    clearRuntimeAssetTelemetryState();
    setDebugSnapshotVersion((value) => value + 1);
  };

  const closeInspector = async (): Promise<void> => {
    if (isStandaloneInspectorRoute && typeof window !== 'undefined') {
      const activeRuntime = getPlatformRuntime();
      if (
        activeRuntime === PlatformRuntime.Desktop &&
        ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
      ) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
        return;
      }

      window.close();
      return;
    }

    setDebugInspectorEnabled(false);
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  if (!debugInspectorEnabled && !showLauncher) {
    return null;
  }

  if (!debugInspectorEnabled) {
    const launcherClassName = footerHost
      ? 'platform-debug-overlay__launcher platform-debug-overlay__launcher--docked'
      : 'platform-debug-overlay__launcher';
    const launcher = (
      <button
        aria-label="Open developer tools"
        className={launcherClassName}
        onClick={() => {
          void openPlatformInspectorWindow();
        }}
        type="button"
      >
        Dev
      </button>
    );

    if (footerHost) {
      return createPortal(launcher, footerHost);
    }

    return launcher;
  }

  return (
    <aside
      aria-label="Platform debug inspector"
      className={
        isStandaloneInspectorRoute
          ? 'platform-debug-overlay platform-debug-overlay--standalone'
          : 'platform-debug-overlay'
      }
    >
      <div className="platform-debug-overlay__header">
        <div>
          <div className="platform-debug-overlay__title">Platform Inspector</div>
          <div className="platform-debug-overlay__subtitle">Developer Tools · Ctrl/Cmd + Shift + U</div>
        </div>
        <button
          className="platform-debug-overlay__close"
          onClick={() => {
            void closeInspector();
          }}
          type="button"
        >
          Close
        </button>
      </div>

      <div aria-label="Debug tabs" className="platform-debug-overlay__tabs" role="tablist">
        {DEBUG_TABS.map((tab) => (
          <button
            key={tab.key}
            className={
              activeTab === tab.key
                ? 'platform-debug-overlay__tab platform-debug-overlay__tab--active'
                : 'platform-debug-overlay__tab'
            }
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="platform-debug-overlay__content">
        {activeTab === 'layout' && (
          <section className="platform-debug-overlay__section">
            <DebugField label="Route" value={sourcePath || location.pathname || '/'} />
            <DebugField label="Runtime" value={runtime} />
            <DebugField label="Shell" value={shell} />
            <DebugField label="Viewport" value={`${viewportWidth}px × ${viewportHeight}px`} />
            <DebugField label="Orientation" value={isPortrait ? 'portrait' : 'landscape'} />
            <DebugField label="Compact" value={prefersCompactLayout ? 'yes' : 'no'} />
            <DebugField label="Simplified UX" value={prefersSimplifiedUX ? 'yes' : 'no'} />
            <DebugField label="Supports hover" value={supportsHover ? 'yes' : 'no'} />
            <DebugField
              label="Platform flags"
              value={[isWeb ? 'web' : null, isDesktop ? 'desktop' : null, isMobile ? 'mobile' : null]
                .filter(Boolean)
                .join(' | ')}
            />
          </section>
        )}

        {activeTab === 'assets' && (
          <section className="platform-debug-overlay__section">
            <DebugField
              label="Asset target"
              value={
                runtimeSnapshot.assetTarget
                  ? `${runtimeSnapshot.assetTarget.label} (${runtimeSnapshot.assetTarget.key})`
                  : 'unset'
              }
            />
            <DebugField label="Transport" value={runtimeSnapshot.assetRuntime.transportMode} />
            <DebugField label="Slice cache" value={runtimeSnapshot.assetRuntime.sliceCacheMode} />
            <DebugField label="Image cache" value={runtimeSnapshot.imageCacheMode} />
            <DebugField
              label="Native fetch"
              value={runtimeSnapshot.assetRuntime.supportsNativeFetch ? 'yes' : 'no'}
            />
            <DebugField label="Worker URL" value={storageConfig.r2Assets?.workerUrl ?? 'unset'} />
            <DebugField label="Assets URL" value={storageConfig.assetsPublicUrl ?? 'unset'} />
            <DebugField
              label="Entry index"
              value={
                storageConfig.r2Assets?.workerUrl
                  ? `${storageConfig.r2Assets.workerUrl}/api/v1/slices/entry-index`
                  : 'unset'
              }
            />
            <DebugField label="R2 enabled" value={storageConfig.r2Assets?.enabled ? 'yes' : 'no'} />
            <div className="platform-debug-overlay__actions">
              <button
                className="platform-debug-overlay__action"
                disabled={cacheActionState === 'working'}
                onClick={() => {
                  void clearRuntimeCaches();
                }}
                type="button"
              >
                {cacheActionState === 'working' ? 'Clearing caches...' : 'Clear runtime caches'}
              </button>
              <button
                className="platform-debug-overlay__action"
                disabled={cacheActionState === 'working'}
                onClick={() => {
                  void prefetchSlices();
                }}
                type="button"
              >
                Prefetch core slices
              </button>
              <button
                className="platform-debug-overlay__action"
                onClick={() => window.location.reload()}
                type="button"
              >
                Reload app
              </button>
            </div>
            {cacheActionState !== 'idle' && (
              <DebugField
                label="Cache action"
                value={
                  cacheActionState === 'done'
                    ? 'runtime caches cleared'
                    : cacheActionState === 'failed'
                      ? 'cache clear failed'
                      : 'clearing runtime caches'
                }
              />
            )}
          </section>
        )}

        {activeTab === 'runtime' && (
          <section className="platform-debug-overlay__section">
            <DebugField label="Dev panel" value={import.meta.env.DEV ? 'available' : 'disabled'} />
            <DebugField label="Mode" value={import.meta.env.MODE} />
            <div className="platform-debug-overlay__actions">
              <button className="platform-debug-overlay__action" onClick={resetTelemetry} type="button">
                Reset runtime timings
              </button>
            </div>
            {runtimeSnapshot.telemetry.length === 0 && (
              <DebugField label="Runtime timings" value="no runtime calls recorded yet" />
            )}
            {runtimeSnapshot.telemetry.map((telemetry) => (
              <div key={telemetry.runtime} className="platform-debug-overlay__telemetry-group">
                <div className="platform-debug-overlay__telemetry-title">{telemetry.runtime}</div>
                {Object.entries(telemetry.operations).length === 0 ? (
                  <DebugField label="Calls" value="none" />
                ) : (
                  Object.entries(telemetry.operations).map(([operation, stats]) => (
                    <DebugField
                      key={`${telemetry.runtime}-${operation}`}
                      label={operation}
                      value={`${stats?.count ?? 0} calls | avg ${stats?.averageMs ?? 0}ms | last ${stats?.lastMs ?? 0}ms | fail ${stats?.failures ?? 0}`}
                    />
                  ))
                )}
              </div>
            ))}
            <div className="platform-debug-overlay__links">
              <Link className="platform-debug-overlay__link" to={ROUTE_FEATURES[RouteFeature.Logs].path}>
                Logs
              </Link>
              <Link className="platform-debug-overlay__link" to={ROUTE_FEATURES[RouteFeature.DevPanel].path}>
                Dev Panel
              </Link>
              <Link className="platform-debug-overlay__link" to={buildSettingsPath()}>
                Settings
              </Link>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
