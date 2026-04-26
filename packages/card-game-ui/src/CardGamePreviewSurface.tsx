import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type {
  CardGameLayoutDocument,
  CardGameSurfaceMode,
  CardGameViewerPerspective,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { HudArtworkControls } from './scene/HudArtwork.types';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  type CardGameLayoutAsset,
  type TableLayoutState,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { setGameAsset, tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import { IsolationComponentType } from '@ocentra/game-layout-domain/isolation-types';
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
  surfaceMode?: CardGameSurfaceMode;
  viewerPerspective?: CardGameViewerPerspective;
  showBackground?: boolean;
  showSeatWidgets?: boolean;
  showLocalSeat?: boolean;
  showHandPreview?: boolean;
  editableSeats?: boolean;
  onSeatsChange?: (seats: SeatLayout[]) => void;
  seatPresentationById?: Partial<Record<number, CardGameSeatPresentation>>;
  hudControlsOverride?: HudArtworkControls;
  onHudButtonClick?: (index: number, label: string) => void;
  arenaOverlay?: React.ReactNode;
  stageOverlay?: React.ReactNode;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
  showArenaGuide?: boolean;
}

export interface CardGameSeatPresentation {
  labelText?: string;
  infoBoxText?: string;
  cardTokens?: string[];
  state?: 'default' | 'active' | 'placeholder';
  hidden?: boolean;
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
  const cardWidth = Math.round(Math.max(30, anchorRadius * cardFan.cardWidthScale));
  return {
    cardWidth,
    cardHeight: Math.round(cardWidth * 1.42),
    orbitRadius: Math.max(anchorRadius * cardFan.radiusScale + cardFan.radiusOffset, 10),
  };
}

function isAuthoringSurfaceMode(surfaceMode: CardGameSurfaceMode): boolean {
  return (
    surfaceMode === 'editorEmbedded' ||
    surfaceMode === 'editorCanvas' ||
    surfaceMode === 'editorIsolation'
  );
}

export const CardGamePreviewSurface: React.FC<CardGamePreviewSurfaceProps> = ({
  document,
  playerCount,
  className,
  surfaceMode = 'templateSaved',
  viewerPerspective,
  showBackground = true,
  showSeatWidgets = true,
  showLocalSeat = false,
  showHandPreview = true,
  editableSeats = false,
  onSeatsChange,
  seatPresentationById,
  hudControlsOverride,
  onHudButtonClick,
  arenaOverlay,
  stageOverlay,
  onIsolate,
  showArenaGuide = false,
}) => {
  const resolvedPlayerCount = playerCount ?? document.defaultPlayerCount;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  const layoutState = useSyncExternalStore<TableLayoutState>(
    tableLayoutStore.subscribe,
    tableLayoutStore.getState,
    tableLayoutStore.getState,
  );

  const previewAsset = useMemo(() => createPreviewAsset(document), [document]);
  const floatScale = document.cardVisuals.floatScale;
  const resolvedHudControls = useMemo(() => {
    const baseHud = hudControlsOverride ?? document.hud;
    if (isAuthoringSurfaceMode(surfaceMode)) {
      return baseHud;
    }
    return {
      ...baseHud,
      showDebugGuides: false,
      layerVisibility: {
        ...baseHud.layerVisibility,
        tools: false,
      },
    };
  }, [document.hud, hudControlsOverride, surfaceMode]);

  React.useEffect(() => {
    setGameAsset(previewAsset);
    tableLayoutStore.applyPreset(resolvedPlayerCount);
  }, [previewAsset, resolvedPlayerCount]);

  React.useEffect(() => {
    const measure = () => {
      if (surfaceRef.current) {
        const rect = surfaceRef.current.getBoundingClientRect();
        setSurfaceSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (surfaceRef.current) observer.observe(surfaceRef.current);
    return () => observer.disconnect();
  }, []);

  const layerVisibility = resolvedHudControls.layerVisibility ?? {};
  const showBackgroundLayer = showBackground && layerVisibility.background !== false;
  const showTableLayer = layerVisibility.table !== false;
  const showSeatsLayer = showSeatWidgets && layerVisibility.seats !== false;
  const showCardsLayer = showHandPreview && layerVisibility.cards !== false;
  const showHudLayer = layerVisibility.hud !== false;
  const shouldRenderHudHost = showHudLayer || showCardsLayer;

  const physicalW = surfaceSize.width || 1920;
  const physicalH = surfaceSize.height || 1080;
  const projectionScale = Math.min(physicalW / 1920, physicalH / 1080) || 1;

  const arenaStyle = useMemo(() => ({
    width: `${TABLE_ARENA_WIDTH}px`,
    height: `${TABLE_ARENA_HEIGHT}px`,
    left: '50%',
    top: '50%',
    transform: `translate(-50%, -50%) scale(${projectionScale})`,
  }), [projectionScale]);

  const hudAnchor = useMemo(() => ({
    x: resolvedHudControls.dome.cx,
    y: resolvedHudControls.dome.cy,
    radius: resolvedHudControls.dome.topRadius || (resolvedHudControls.dome.width / 2),
    width: resolvedHudControls.dome.width,
    height: resolvedHudControls.dome.height,
    topRadius: resolvedHudControls.dome.topRadius,
  }), [resolvedHudControls.dome]);

  const handLayout = useMemo(() => {
    return resolveHandLayout(hudAnchor.radius, document.cardFan);
  }, [document.cardFan, hudAnchor.radius]);

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
                  onIsolate={onIsolate}
                />
              ) : null}
            </div>

            <div className="card-game-preview-surface__arena-layer card-game-preview-surface__arena-layer--seats">
              {showSeatsLayer ? (
                <PlayersOnTable
                  editableSeats={editableSeats}
                  showLocalSeat={showLocalSeat || editableSeats || viewerPerspective?.mode === 'rotateToLocal' || surfaceMode === 'play'}
                  onSeatsChange={onSeatsChange}
                  seatPresentationById={seatPresentationById}
                  onIsolate={onIsolate}
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
            {showArenaGuide ? (
              <div className="card-game-preview-surface__arena-guide" aria-hidden="true" />
            ) : null}
          </div>

          <div className="card-game-preview-surface__layer card-game-preview-surface__layer--hud">
            {shouldRenderHudHost ? (
              <GameHUD
                controls={resolvedHudControls}
                showButtonGuides={false}
                showArtwork={showHudLayer}
                onButtonClick={onHudButtonClick}
                onIsolate={onIsolate}
              >
                {showCardsLayer && handLayout ? (
                  <CardInHand
                    position="absolute"
                    anchorPoint={hudAnchor}
                    radius={handLayout.orbitRadius}
                    cardWidth={handLayout.cardWidth}
                    cardHeight={handLayout.cardHeight}
                    minArc={document.cardFan.arcMin}
                    maxArc={document.cardFan.arcMax}
                    cardCount={document.cardFan.cardCount}
                    minCardCount={document.cardFan.minCardCount}
                    maxCardCount={document.cardFan.maxCardCount}
                    fanTilt={document.cardFan.fanTilt}
                    centerOffsetX={document.cardFan.centerOffsetX}
                    centerOffsetY={document.cardFan.centerOffsetY}
                    disableViewportScale={true}
                    overallScale={document.cardFan.overallScale}
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
