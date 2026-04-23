import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { isolationStore, type IsolatedItem, useIsolationState } from '@/services/IsolationStore';
import { InspectorMap } from '@ocentra/card-game-ui/InspectorMap';
import { ISOLATION_REQUEST_CHANNEL, type IsolationRequestMessage } from '@ocentra/game-layout-domain/draftChannel';
import { IsolationComponentType } from '@ocentra/game-layout-domain/isolation-types';
import type { PlayerUIProps } from '@ocentra/card-game-ui/scene/PlayerUI';
import type { CenterTableSVGProps } from '@ocentra/card-game-ui/scene/CenterTableSvg';
import type { HudArtworkProps } from '@ocentra/card-game-ui/scene/HudArtwork';
import type { HudButtonProps } from '@ocentra/card-game-ui/scene/HudButton';
import './IsolationHubPage.css';

const PlayerUI = React.lazy(() => import('@ocentra/card-game-ui/scene/PlayerUI'));
const CenterTableSvg = React.lazy(() => import('@ocentra/card-game-ui/scene/CenterTableSvg'));
const HudArtwork = React.lazy(() => import('@ocentra/card-game-ui/scene/HudArtwork'));
const HudButton = React.lazy(() => import('@ocentra/card-game-ui/scene/HudButton'));

const ComponentPreview: React.FC<{ item: IsolatedItem }> = ({ item }) => {
  const { type, config } = item;

  return (
    <div className="isolation-hub__preview-container">
      <Suspense fallback={<div className="isolation-hub__loading">Loading Component...</div>}>
        {type === IsolationComponentType.PlayerUI && (
          <div className="isolation-hub__component-wrap isolation-hub__component-wrap--player-ui">
            <PlayerUI {...(config as PlayerUIProps)} />
          </div>
        )}
        {type === IsolationComponentType.TableZone && (
          <div className="isolation-hub__component-wrap isolation-hub__component-wrap--table">
            <CenterTableSvg {...(config as CenterTableSVGProps)} viewportWidth={1200} viewportHeight={800} minScale={0.1} />
          </div>
        )}
        {type === IsolationComponentType.HudArtwork && (
          <div className="isolation-hub__component-wrap isolation-hub__component-wrap--hud">
            <HudArtwork controls={config as HudArtworkProps['controls']} fitWidth={1200} fitHeight={600} />
          </div>
        )}
        {type === IsolationComponentType.HudButton && (
          <div className="isolation-hub__component-wrap isolation-hub__component-wrap--button">
            <div style={{ width: 600, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HudButton {...(config as HudButtonProps)} />
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
};

export const IsolationHubPage: React.FC = () => {
  const { items = [], activeId: storeActiveId } = useIsolationState() || {};
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const [background, setBackground] = useState<'felt' | 'dark' | 'light'>('felt');

  const activeId = useMemo(() => {
    if (internalActiveId && items.find(i => i.id === internalActiveId)) {
      return internalActiveId;
    }
    return storeActiveId || (items.length > 0 ? items[0].id : null);
  }, [items, internalActiveId, storeActiveId]);

  const [lastExternalActiveId, setLastExternalActiveId] = useState<string | null>(storeActiveId);

  if (storeActiveId !== lastExternalActiveId) {
    setLastExternalActiveId(storeActiveId);
    setInternalActiveId(storeActiveId);
  }

  useEffect(() => {
    const channel = new BroadcastChannel(ISOLATION_REQUEST_CHANNEL);
    const handler = (event: MessageEvent<IsolationRequestMessage>) => {
      const { type, label, config } = event.data;
      isolationStore.isolateComponent(type, label, config);
    };
    channel.onmessage = handler;
    return () => {
      channel.close();
    };
  }, []);

  const activeItem = useMemo(() => items.find(item => item.id === activeId), [items, activeId]);

  const handleUpdateConfig = (nextConfig: unknown) => {
    if (activeId) {
      isolationStore.updateConfig(activeId, nextConfig);
    }
  };

  const InspectorComponent = activeItem ? (InspectorMap[activeItem.type as keyof typeof InspectorMap] as React.ComponentType<{
    config: unknown;
    onChange: (config: unknown) => void;
  }>) : null;

  return (
    <div className={`isolation-hub isolation-hub--bg-${background}`}>
      <header className="isolation-hub__header">
        <div className="isolation-hub__header-left">
          <div className="isolation-hub__logo">
            <span className="isolation-hub__logo-icon">💠</span>
            <span className="isolation-hub__logo-text">Isolation Hub</span>
          </div>

          <div className="isolation-hub__tabs">
            {items.map(item => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`isolation-hub__tab ${activeId === item.id ? 'active' : ''}`}
                onClick={() => setInternalActiveId(item.id)}
                onKeyDown={(e) => e.key === 'Enter' && setInternalActiveId(item.id)}
              >
                <span className="isolation-hub__tab-type">{item.type.replace('PlayerUI', 'Seat').replace('TableZone', 'Table')}</span>
                <span className="isolation-hub__tab-label">{item.label}</span>
                <button
                  type="button"
                  className="isolation-hub__tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    isolationStore.removeItem(item.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="isolation-hub__toolbar">
          <div className="isolation-hub__bg-switch">
            <button type="button" className={background === 'felt' ? 'active' : ''} onClick={() => setBackground('felt')}>Felt</button>
            <button type="button" className={background === 'dark' ? 'active' : ''} onClick={() => setBackground('dark')}>Dark</button>
            <button type="button" className={background === 'light' ? 'active' : ''} onClick={() => setBackground('light')}>Light</button>
          </div>
        </div>
      </header>

      <main className="isolation-hub__content">
        <div className="isolation-hub__viewport">
          {activeItem ? (
            <ComponentPreview item={activeItem} />
          ) : (
            <div className="isolation-hub__empty">
              <h3>No Component Isolated</h3>
              <p>Right-click a component in the editor to tear it off into this hub.</p>
            </div>
          )}
        </div>

        <aside className="isolation-hub__inspector">
          <div className="isolation-hub__inspector-header">
            <h3>Inspector</h3>
            {activeItem && <span className="isolation-hub__inspector-badge">{activeItem.type}</span>}
          </div>
          <div className="isolation-hub__inspector-content">
            {activeItem && InspectorComponent ? (
              <InspectorComponent
                config={activeItem.config}
                onChange={handleUpdateConfig}
              />
            ) : (
              <div className="isolation-hub__inspector-empty">
                Select a component to inspect its properties.
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default IsolationHubPage;
