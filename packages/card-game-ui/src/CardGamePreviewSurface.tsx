import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  type CardGameLayoutAsset,
  type TableLayoutState,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { setGameAsset, tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import CardInHand from './scene/CardInHand';
import CenterTableSvg from './scene/CenterTableSvg';
import GameBackground from './scene/GameBackground';
import GameHUD from './scene/GameHUD';
import PlayersOnTable from './scene/PlayersOnTable';
import './CardGamePreviewSurface.css';

export interface CardGamePreviewSurfaceProps {
  document: CardGameLayoutDocument;
  playerCount?: number;
  className?: string;
  showBackground?: boolean;
  scaleFactor?: number;
  showSeatWidgets?: boolean;
  showHandPreview?: boolean;
  editableSeats?: boolean;
  onSeatsChange?: (seats: SeatLayout[]) => void;
  arenaOverlay?: React.ReactNode;
  stageOverlay?: React.ReactNode;
}

const TABLE_ARENA_WIDTH = 1000;
const TABLE_ARENA_HEIGHT = 1000;

function createPreviewAsset(document: CardGameLayoutDocument): CardGameLayoutAsset {
  const now = new Date().toISOString();
  return {
    metadata: {
      gameId: 'card-game-preview',
      schemaVersion: 1,
      displayName: 'Card Game Preview',
      createdAt: now,
      updatedAt: now,
    },
    layout: cloneCardGameLayoutDocument(document),
    gameplay: { ...document.gameplay },
    extensions: { ...document.extensions },
  };
}

function resolveHandLayout(
  anchorRadius: number,
  cardFan: CardGameLayoutDocument['cardFan'],
) {
  const cardWidth = Math.round(Math.max(30, Math.min(anchorRadius * cardFan.cardWidthScale, 116)));
  return {
    cardWidth,
    cardHeight: Math.round(cardWidth * 1.42),
    orbitRadius: Math.max(anchorRadius * cardFan.radiusScale + cardFan.radiusOffset, 10),
  };
}

export const CardGamePreviewSurface: React.FC<CardGamePreviewSurfaceProps> = ({
  document,
  playerCount,
  className,
  showBackground = true,
  scaleFactor = 1,
  showSeatWidgets = true,
  showHandPreview = true,
  editableSeats = false,
  onSeatsChange,
  arenaOverlay,
  stageOverlay,
}) => {
  const resolvedPlayerCount = playerCount ?? document.defaultPlayerCount;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  const layoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState,
  );

  const previewAsset = useMemo(() => createPreviewAsset(document), [document]);
  const floatScale = document.cardVisuals.floatScale;

  useEffect(() => {
    setGameAsset(previewAsset);
    tableLayoutStore.applyPreset(resolvedPlayerCount);
  }, [previewAsset, resolvedPlayerCount]);

  const measureHudAnchor = useCallback(() => {
    const elem = hudCenterRef.current;
    const surface = surfaceRef.current;
    if (!elem || !surface) {
      setHudAnchor(null);
      return;
    }

    const rect = elem.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || surfaceRect.width <= 0 || surfaceRect.height <= 0) {
      setHudAnchor(null);
      return;
    }

    setHudAnchor({
      x: (rect.left - surfaceRect.left + rect.width / 2) / scaleFactor,
      y: (rect.top - surfaceRect.top + rect.height / 2) / scaleFactor,
      radius: (rect.width / 2) / scaleFactor,
    });
  }, [scaleFactor]);

  useEffect(() => {
    measureHudAnchor();
    window.addEventListener('resize', measureHudAnchor);
    return () => window.removeEventListener('resize', measureHudAnchor);
  }, [measureHudAnchor, document.hud, resolvedPlayerCount]);

  useEffect(() => {
    const id = requestAnimationFrame(measureHudAnchor);
    return () => cancelAnimationFrame(id);
  }, [measureHudAnchor, scaleFactor]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    const measure = () => {
      const rect = surface.getBoundingClientRect();
      setSurfaceSize({
        width: rect.width,
        height: rect.height,
      });
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  const handLayout = useMemo(() => {
    if (!hudAnchor) {
      return null;
    }

    return resolveHandLayout(hudAnchor.radius, document.cardFan);
  }, [document.cardFan, hudAnchor]);

  const layerVisibility = document.hud.layerVisibility ?? {};
  const showBackgroundLayer = showBackground && layerVisibility.background !== false;
  const showTableLayer = layerVisibility.table !== false;
  const showSeatsLayer = showSeatWidgets && layerVisibility.seats !== false;
  const showCardsLayer = showHandPreview && layerVisibility.cards !== false;
  const showHudLayer = layerVisibility.hud !== false;
  const shouldRenderHudHost = showHudLayer || showCardsLayer;
  const arenaPaddingX = Math.min(80, surfaceSize.width * 0.05);
  const arenaPaddingTop = Math.min(84, surfaceSize.height * 0.08);
  const arenaPaddingBottom = Math.min(220, surfaceSize.height * 0.24);
  const availableArenaWidth = Math.max(0, surfaceSize.width - arenaPaddingX * 2);
  const availableArenaHeight = Math.max(0, surfaceSize.height - arenaPaddingTop - arenaPaddingBottom);
  const arenaScale = surfaceSize.width > 0 && surfaceSize.height > 0
    ? Math.max(
        0.2,
        Math.min(availableArenaWidth / TABLE_ARENA_WIDTH, availableArenaHeight / TABLE_ARENA_HEIGHT),
      )
    : 1;
  const arenaStyle = useMemo(() => ({
    width: `${TABLE_ARENA_WIDTH}px`,
    height: `${TABLE_ARENA_HEIGHT}px`,
    left: `${arenaPaddingX + availableArenaWidth / 2}px`,
    top: `${arenaPaddingTop + availableArenaHeight / 2}px`,
    transform: `translate(-50%, -50%) scale(${arenaScale})`,
  }), [arenaPaddingTop, arenaPaddingX, arenaScale, availableArenaHeight, availableArenaWidth]);
  const currentTable = layoutState.table ?? {};
  const arenaTableWidth = currentTable.width ?? 960;
  const arenaTableHeight = currentTable.height ?? 560;

  return (
    <div ref={surfaceRef} className={`card-game-preview-surface${className ? ` ${className}` : ''}`}>
      <div className="card-game-preview-surface__stage">
        <div className="card-game-preview-surface__layer card-game-preview-surface__layer--background">
          {showBackgroundLayer ? <GameBackground floatScale={floatScale} position="absolute" /> : null}
        </div>

        <main className="card-game-preview-surface__scene" aria-label="Card game template preview">
          <div className="card-game-preview-surface__arena" style={arenaStyle}>
            <div className="card-game-preview-surface__arena-layer card-game-preview-surface__arena-layer--table">
              {showTableLayer ? (
                <CenterTableSvg
                  viewportWidth={arenaTableWidth}
                  viewportHeight={arenaTableHeight}
                  minScale={1}
                  maxScale={1}
                  responsivePaddingX={0}
                  responsivePaddingY={0}
                />
              ) : null}
            </div>

            <div className="card-game-preview-surface__arena-layer card-game-preview-surface__arena-layer--seats">
              {showSeatsLayer ? (
                <PlayersOnTable
                  editableSeats={editableSeats}
                  showLocalSeat={editableSeats}
                  onSeatsChange={onSeatsChange}
                />
              ) : null}
            </div>

            {arenaOverlay ? (
              <div className="card-game-preview-surface__arena-layer card-game-preview-surface__arena-layer--overlay">
                <div className="card-game-preview-surface__overlay-content">
                  {arenaOverlay}
                </div>
              </div>
            ) : null}
          </div>

          <div className="card-game-preview-surface__layer card-game-preview-surface__layer--hud">
            {shouldRenderHudHost ? (
              <GameHUD
                ref={hudCenterRef}
                controls={document.hud}
                showButtonGuides={false}
                scaleFactor={scaleFactor}
                showArtwork={showHudLayer}
              >
                {showCardsLayer && hudAnchor && handLayout ? (
                  <CardInHand
                    position="absolute"
                    anchorPoint={hudAnchor}
                    radius={handLayout.orbitRadius}
                    cardWidth={handLayout.cardWidth}
                    cardHeight={handLayout.cardHeight}
                    minArc={document.cardFan.minCardCount}
                    maxArc={document.cardFan.maxCardCount}
                    cardCount={document.cardFan.cardCount}
                    minCardCount={document.cardFan.minCardCount}
                    maxCardCount={document.cardFan.maxCardCount}
                    fanTilt={document.cardFan.fanTilt}
                    centerOffsetX={document.cardFan.centerOffsetX}
                    centerOffsetY={document.cardFan.centerOffsetY}
                    disableViewportScale={document.cardFan.disableViewportScale}
                    zIndex={120}
                  />
                ) : null}
              </GameHUD>
            ) : null}
          </div>

          {stageOverlay ? (
            <div className="card-game-preview-surface__layer card-game-preview-surface__layer--overlay">
              <div className="card-game-preview-surface__overlay-content">
                {stageOverlay}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};
