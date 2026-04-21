import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { GameHeader, type GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import GameBackground from './scene/GameBackground';
import GameHUD from './scene/GameHUD';
import CardInHand from './scene/CardInHand';
import CenterTableSvg from './scene/CenterTableSvg';
import PlayersOnTable from './scene/PlayersOnTable';
import { HudButtonEditorModal } from './HudButtonEditorModal';
import './CardGameTemplatePage.css';
import { tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import type { TableLayoutState } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { DEFAULT_HUD_ARTWORK_CONTROLS } from './scene/HudArtwork.types';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';

type LayerKey = 'background' | 'header' | 'table' | 'seats' | 'cards' | 'hud' | 'tools' | 'footer';

const DEFAULT_LAYER_VISIBILITY: Record<LayerKey, boolean> = {
  background: true,
  header: true,
  table: true,
  seats: true,
  cards: true,
  hud: true,
  tools: true,
  footer: true,
};

const DEFAULT_CARD_CONTROLS = {
  cardCount: 13,
  minCardCount: 3,
  maxCardCount: 13,
  radiusScale: 0.41,
  radiusOffset: 0,
  cardWidthScale: 0.38,
  arcMin: 34,
  arcMax: 149,
  fanTilt: 0,
  centerOffsetX: 0,
  centerOffsetY: 0,
  disableViewportScale: true,
};

export interface CardGameTemplatePageProps {
  headerProps: GameHeaderProps;
  footerVersion?: string;
  onHomeClick?: () => void;
  embedded?: boolean;
  document?: CardGameLayoutDocument;
}

export const CardGameTemplatePage: React.FC<CardGameTemplatePageProps> = ({
  headerProps,
  footerVersion,
  onHomeClick,
  embedded = false,
  document: docOverride,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [draftDoc, setDraftDoc] = useState<CardGameLayoutDocument | null>(null);
  
  const tableLayoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState,
  );

  useEffect(() => {
    const channel = new BroadcastChannel('ocentra-card-game-layout-draft');
    channel.onmessage = (event) => {
      if (event.data && event.data.document) {
        setDraftDoc(event.data.document);
      }
    };
    return () => channel.close();
  }, []);

  const doc = useMemo(() => draftDoc || docOverride || tableLayoutState.asset?.layout, [draftDoc, docOverride, tableLayoutState.asset?.layout]);
  
  const layerVisibility = useMemo(() => {
    return (doc?.hud as any)?.layerVisibility || DEFAULT_LAYER_VISIBILITY;
  }, [doc]);

  const cardControls = useMemo(() => {
    return doc?.cardFan || DEFAULT_CARD_CONTROLS;
  }, [doc]);

  const cardVisualControls = useMemo(() => {
    return doc?.cardVisuals || { floatScale: 1 };
  }, [doc]);

  const hudControls = useMemo(() => {
    return (doc?.hud as any) || DEFAULT_HUD_ARTWORK_CONTROLS;
  }, [doc]);

  const [showHudButtonEditor, setShowHudButtonEditor] = useState(false);

  const handleHomeClick = useCallback(() => {
    onHomeClick?.();
  }, [onHomeClick]);

  const measureHudAnchor = useCallback(() => {
    if (!layerVisibility.hud) {
      setHudAnchor(null);
      return;
    }

    const elem = hudCenterRef.current;
    const container = containerRef.current;
    if (!elem || !container) {
      setHudAnchor(null);
      return;
    }

    const rect = elem.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (rect.width <= 0) {
       setHudAnchor(null);
       return;
    }

    // Get position relative to the root .game-screen container
    // This allows the coordinates to stay valid even when the whole container is scaled
    // because absolute children inside the same scaled container use local units.
    setHudAnchor({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
      radius: rect.width / 2,
    });
  }, [layerVisibility.hud]);

  const handLayout = useMemo(() => {
    if (!hudAnchor) {
      return null;
    }

    const cardWidth = Math.round(Math.max(30, Math.min(hudAnchor.radius * cardControls.cardWidthScale, 116)));
    const cardHeight = Math.round(cardWidth * 1.42);
    const orbitRadius = Math.max(hudAnchor.radius * cardControls.radiusScale + cardControls.radiusOffset, 10);

    return {
      cardWidth,
      cardHeight,
      orbitRadius,
      minArc: cardControls.arcMin,
      maxArc: cardControls.arcMax,
      cardCount: cardControls.cardCount,
      minCardCount: cardControls.minCardCount,
      maxCardCount: cardControls.maxCardCount,
      fanTilt: cardControls.fanTilt,
      centerOffsetX: cardControls.centerOffsetX,
      centerOffsetY: cardControls.centerOffsetY,
      disableViewportScale: cardControls.disableViewportScale,
    };
  }, [
    cardControls.arcMax,
    cardControls.arcMin,
    cardControls.cardCount,
    cardControls.cardWidthScale,
    cardControls.centerOffsetX,
    cardControls.centerOffsetY,
    cardControls.disableViewportScale,
    cardControls.fanTilt,
    cardControls.maxCardCount,
    cardControls.minCardCount,
    cardControls.radiusOffset,
    cardControls.radiusScale,
    hudAnchor,
  ]);

  useEffect(() => {
    measureHudAnchor();
  }, [hudControls, layerVisibility.hud, measureHudAnchor]);

  useEffect(() => {
    const timer = setInterval(measureHudAnchor, 500); // Periodic check for layout shifts
    window.addEventListener('resize', measureHudAnchor);
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', measureHudAnchor);
    };
  }, [measureHudAnchor]);

  const layerClassName = (key: LayerKey) =>
    `game-screen__layer-item game-screen__layer-item--${key}${layerVisibility[key] ? '' : ' game-screen__layer-item--hidden'}`;

  return (
    <div ref={containerRef} className={embedded ? 'game-screen game-screen--embedded' : 'game-screen'}>
        <div
          className={layerClassName('background')}
          aria-hidden={!layerVisibility.background}
        >
          <GameBackground
            floatScale={cardVisualControls.floatScale}
            position={embedded ? 'absolute' : 'fixed'}
          />
        </div>

        <div className="game-screen__shell">
          <div
            className={`${layerClassName('header')} game-screen__layer-item--chrome`}
            aria-hidden={!layerVisibility.header}
          >
            <GameHeader {...headerProps} onHomeClick={handleHomeClick} />
          </div>

          <main className="game-screen__stage" aria-label="Card game template stage">
            <div
              className={`${layerClassName('table')} game-screen__stage-layer game-screen__stage-layer--table`}
              aria-hidden={!layerVisibility.table}
            >
              <CenterTableSvg />
            </div>

            <div
              className={`${layerClassName('seats')} game-screen__stage-layer game-screen__stage-layer--seats`}
              aria-hidden={!layerVisibility.seats}
            >
              <PlayersOnTable />
            </div>

            <div
              className={`${layerClassName('hud')} game-screen__stage-layer game-screen__stage-layer--hud`}
              aria-hidden={!layerVisibility.hud}
            >
              <GameHUD ref={hudCenterRef} controls={hudControls}>
                {layerVisibility.cards ? (
                  <CardInHand
                    position={embedded ? 'absolute' : 'fixed'}
                    anchorPoint={hudAnchor ?? undefined}
                    radius={handLayout?.orbitRadius}
                    cardWidth={handLayout?.cardWidth}
                    cardHeight={handLayout?.cardHeight}
                    minArc={handLayout?.minArc}
                    maxArc={handLayout?.maxArc}
                    cardCount={handLayout?.cardCount}
                    minCardCount={handLayout?.minCardCount}
                    maxCardCount={handLayout?.maxCardCount}
                    fanTilt={handLayout?.fanTilt}
                    centerOffsetX={handLayout?.centerOffsetX}
                    centerOffsetY={handLayout?.centerOffsetY}
                    disableViewportScale={handLayout?.disableViewportScale ?? true}
                    zIndex={120}
                  />
                ) : null}
              </GameHUD>
            </div>

            <div className={`${layerClassName('tools')} game-screen__stage-layer game-screen__stage-layer--tools`} aria-hidden={!layerVisibility.tools} />
          </main>

          <div
            className={`${layerClassName('footer')} game-screen__layer-item--chrome`}
            aria-hidden={!layerVisibility.footer}
          >
            <GameFooter appVersion={footerVersion} />
          </div>
        </div>
        
        {!embedded && (
          <button
            type="button"
            className="game-screen__editor-launch"
            onClick={() => setShowHudButtonEditor(true)}
          >
            Layers
          </button>
        )}

        <HudButtonEditorModal
          open={showHudButtonEditor}
          onClose={() => setShowHudButtonEditor(false)}
          document={doc || tableLayoutState.asset?.layout || {
            defaultPlayerCount: 4,
            presets: {},
            playerUiDefaults: {},
            hud: DEFAULT_HUD_ARTWORK_CONTROLS,
            cardFan: DEFAULT_CARD_CONTROLS,
            cardVisuals: { floatScale: 1 },
            views: {},
            gameplay: {},
            extensions: {},
          } as any}
          onChange={() => {}}
          initialWorkspaceSection="layerSplit"
        />
    </div>
  );
};

export default CardGameTemplatePage;
