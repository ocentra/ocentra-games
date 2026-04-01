import { useEffect, useMemo, useState } from 'react';
import { isLocalHostname } from '@ocentra/endpoint-domain/constants/hostname';
import { clearRuntimeAssetCaches } from '@/adapters/assets/RuntimeAssetMaintenance';
import {
  MAIN_APP_ASSET_TARGET_EVENT,
  getActiveMainAppAssetTarget,
  getAvailableMainAppAssetTargets,
  setActiveMainAppAssetTarget,
  type MainAppAssetTargetValue,
} from '@/services/storage/assetTarget';
import './AssetDeliveryTab.css';

function isDevSurface(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return import.meta.env.DEV || isLocalHostname(window.location.hostname);
}

export function AssetDeliveryTab() {
  const [activeTarget, setActiveTarget] = useState<MainAppAssetTargetValue>(getActiveMainAppAssetTarget());
  const availableTargets = useMemo(() => getAvailableMainAppAssetTargets(), []);
  const selected = availableTargets.find((target) => target.key === activeTarget) ?? availableTargets[0];

  useEffect(() => {
    const handleTargetChanged = () => {
      setActiveTarget(getActiveMainAppAssetTarget());
    };

    window.addEventListener(MAIN_APP_ASSET_TARGET_EVENT, handleTargetChanged as EventListener);
    window.addEventListener('storage', handleTargetChanged);
    return () => {
      window.removeEventListener(MAIN_APP_ASSET_TARGET_EVENT, handleTargetChanged as EventListener);
      window.removeEventListener('storage', handleTargetChanged);
    };
  }, []);

  const handleSelect = async (target: MainAppAssetTargetValue) => {
    setActiveMainAppAssetTarget(target);
    await clearRuntimeAssetCaches();
    window.location.reload();
  };

  if (!isDevSurface()) {
    return (
      <div className="asset-delivery-tab">
        <div className="asset-delivery-card">
          <h2>Asset Delivery</h2>
          <p>This panel is only available in local/dev builds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-delivery-tab">
      <div className="asset-delivery-card">
        <div className="asset-delivery-header">
          <h2>Asset Delivery Target</h2>
          <span className={`asset-delivery-badge asset-delivery-badge--${selected.key}`}>
            {selected.key === 'real-cloud' ? 'REAL' : 'DEV'}
          </span>
        </div>
        <p className="asset-delivery-description">
          Choose whether the main app resolves slices and assets from the local dev worker or the real deployed cloud.
        </p>
        <div className="asset-delivery-targets">
          {availableTargets.map((target) => (
            <button
              key={target.key}
              type="button"
              className={`asset-delivery-target${target.key === activeTarget ? ' is-active' : ''}`}
              onClick={() => handleSelect(target.key)}
              disabled={!target.configured}
            >
              <div className="asset-delivery-target__row">
                <strong>{target.label}</strong>
                {!target.configured && <span className="asset-delivery-target__missing">Not Configured</span>}
              </div>
              <div className="asset-delivery-target__description">{target.description}</div>
              <div className="asset-delivery-target__url">{target.workerUrl || '(no worker URL configured)'}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="asset-delivery-card">
        <h3>Current Runtime</h3>
        <dl className="asset-delivery-meta">
          <div>
            <dt>Worker URL</dt>
            <dd>{selected.workerUrl || '(none)'}</dd>
          </div>
          <div>
            <dt>Assets Base</dt>
            <dd>{selected.assetsPublicUrl || '(none)'}</dd>
          </div>
          <div>
            <dt>Entry Index</dt>
            <dd>{selected.assetsPublicUrl ? `${selected.assetsPublicUrl}/index/entry.json` : '(none)'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
