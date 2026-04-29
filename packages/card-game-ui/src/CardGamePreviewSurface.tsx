import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type {
  CardGameEditorOverlayVisibility,
  CardGameCardStripPresentation,
  CardGameLayerVisibility,
  CardGameLayoutDocument,
  CardGameScoreboardPresentation,
  CardGameSurfaceMode,
  CardGameViewerPerspective,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { createCardGameEditorIsolationVisibility } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { CardGameShellMetrics } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { HudArtworkControls } from './scene/HudArtwork.types';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  type CardGameLayoutAsset,
  type TableLayoutState,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import {
  resolveCardGameStageLayout,
  type ResolvedCardGameStageBlock,
  type StageRect,
} from '@ocentra/game-layout-domain/cardGameStageLayoutResolver';
import { setGameAsset, tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import { IsolationComponentType } from '@ocentra/game-layout-domain/isolation-types';
import CardInHand from './scene/CardInHand';
import CenterTableSvg from './scene/CenterTableSvg';
import GameBackground from './scene/GameBackground';
import GameCardStrip from './scene/GameCardStrip';
import GameHUD from './scene/GameHUD';
import GameScoreboard from './scene/GameScoreboard';
import PlayersOnTable from './scene/PlayersOnTable';
import TableZonesLayer, { type CardGameZonePresentation } from './scene/TableZonesLayer';
import './CardGamePreviewSurface.css';

export type { CardGameZonePresentation } from './scene/TableZonesLayer';

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
  zonePresentationById?: Partial<Record<string, CardGameZonePresentation>>;
  scoreboardPresentation?: CardGameScoreboardPresentation;
  cardStripPresentation?: CardGameCardStripPresentation;
  hudControlsOverride?: HudArtworkControls;
  onHudButtonClick?: (index: number, label: string) => void;
  arenaOverlay?: React.ReactNode;
  stageOverlay?: React.ReactNode;
  onIsolate?: (type: IsolationComponentType, label: string, config: unknown) => void;
  showArenaGuide?: boolean;
  showAuthoringGuides?: boolean;
  shellMetrics?: Partial<CardGameShellMetrics> | null;
  editorIsolationVisibility?: CardGameLayerVisibility;
  editorOverlayVisibility?: CardGameEditorOverlayVisibility;
}

export interface CardGameSeatPresentation {
  labelText?: string;
  infoBoxText?: string;
  cardTokens?: string[];
  state?: 'default' | 'active' | 'placeholder';
  hidden?: boolean;
  turnTimerLabel?: string;
  turnTimerProgress?: number;
}

function createPreviewAsset(document: CardGameLayoutDocument): CardGameLayoutAsset {
  const now = new Date().toISOString();
  return {
    metadata: {
      gameId: 'card-game-preview',
      schemaVersion: 2,
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
  const cardHeight = Math.round(Math.max(42, anchorRadius * cardFan.cardHeightScale));
  return {
    cardWidth,
    cardHeight,
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

function resolveScaledStageRect(block: ResolvedCardGameStageBlock, innerScale = block.innerScale): StageRect {
  const renderWidth = block.contentWidth * block.scale * innerScale;
  const renderHeight = block.contentHeight * block.scale * innerScale;
  const deltaX = block.rect.width - renderWidth;
  const deltaY = block.rect.height - renderHeight;

  return {
    x: block.rect.x + (
      block.anchorX === 'center'
        ? deltaX / 2
        : block.anchorX === 'end'
          ? deltaX
          : 0
    ),
    y: block.rect.y + (
      block.anchorY === 'center'
        ? deltaY / 2
        : block.anchorY === 'end'
          ? deltaY
          : 0
    ),
    width: renderWidth,
    height: renderHeight,
  };
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
  zonePresentationById,
  scoreboardPresentation,
  cardStripPresentation,
  hudControlsOverride,
  onHudButtonClick,
  arenaOverlay,
  stageOverlay,
  onIsolate,
  showArenaGuide = false,
  showAuthoringGuides = false,
  shellMetrics,
  editorIsolationVisibility,
  editorOverlayVisibility,
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
  const authoringMode = isAuthoringSurfaceMode(surfaceMode);
  const resolvedHudControls = useMemo(
    () => hudControlsOverride ?? document.hud,
    [document.hud, hudControlsOverride],
  );
  const resolvedHudOverallScale = Number.isFinite(resolvedHudControls.overallScale)
    ? Math.max(Number(resolvedHudControls.overallScale), 0.01)
    : 1;
  const resolvedHudSurfaceControls = useMemo(
    () => ({
      ...resolvedHudControls,
      overallScale: 1,
    }),
    [resolvedHudControls],
  );

  React.useEffect(() => {
    setGameAsset(previewAsset);
    tableLayoutStore.applyPreset(resolvedPlayerCount);
  }, [previewAsset, resolvedPlayerCount]);

  React.useEffect(() => {
    const measure = () => {
      if (surfaceRef.current) {
        setSurfaceSize({
          width: surfaceRef.current.clientWidth,
          height: surfaceRef.current.clientHeight,
        });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (surfaceRef.current) observer.observe(surfaceRef.current);
    return () => observer.disconnect();
  }, []);

  const isolationVisibility = useMemo(
    () => ({
      ...createCardGameEditorIsolationVisibility(),
      ...(editorIsolationVisibility ?? {}),
    }),
    [editorIsolationVisibility],
  );
  const hiddenLayerStyle = useMemo(
    () => ({ opacity: 0, pointerEvents: 'none' as const }),
    [],
  );
  const runtimeToggles = document.renderToggles;
  const showBackgroundLayer = showBackground && runtimeToggles.background;
  const showTableLayer = runtimeToggles.table;
  const showSeatSystemLayer = showSeatWidgets && (runtimeToggles.seats || runtimeToggles.playerUi);
  const showSeatsLayer = showSeatWidgets && runtimeToggles.seats;
  const showPlayerUiLayer = runtimeToggles.playerUi;
  const showCardsLayer = showHandPreview && runtimeToggles.cardFan;
  const showZonesLayer = runtimeToggles.zones;
  const showHudLayer = runtimeToggles.hud;
  const showScoreboardLayer = runtimeToggles.scoreboard;
  const showCardStripLayer = runtimeToggles.cardStrip;
  const showDeckTrayLayer = runtimeToggles.deckTray;
  const shouldRenderHudHost = showHudLayer || showCardsLayer;
  const showTableBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.table;
  const showSeatBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.seats;
  const showPlayerUiBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.playerUi;
  const showZoneBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.zones;
  const showDeckTrayBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.deckTray;
  const showDeckTrayDeckBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.deckTrayDeck;
  const showHudBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.hud;
  const showHudDomeBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.hudDome;
  const showHudWingBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.hudWings;
  const showHudBankBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.hudBanks;
  const showHudButtonBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.hudButtons;
  const showCardFanBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.cardFan;
  const showScoreboardBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.scoreboard;
  const showScoreboardHeaderBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.scoreboardHeader;
  const showScoreboardRowBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.scoreboardRows;
  const showCardStripBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.cardStrip;
  const showCardStripSlotBounds = authoringMode && showAuthoringGuides && editorOverlayVisibility?.cardStripSlots;

  const resolvedStage = useMemo(
    () =>
      resolveCardGameStageLayout({
        document,
        playerCount: resolvedPlayerCount,
        viewport: {
          width: surfaceSize.width || (document.stageLayout?.authoredViewport.width ?? 1920),
          height: surfaceSize.height || (document.stageLayout?.authoredViewport.height ?? 1080),
        },
        shellMetrics,
      }),
    [document, resolvedPlayerCount, shellMetrics, surfaceSize.height, surfaceSize.width],
  );

  const hudAnchor = useMemo(() => ({
    x: resolvedHudSurfaceControls.dome.cx,
    y: resolvedHudSurfaceControls.dome.cy,
    radius: resolvedHudSurfaceControls.dome.topRadius || (resolvedHudSurfaceControls.dome.width / 2),
    width: resolvedHudSurfaceControls.dome.width,
    height: resolvedHudSurfaceControls.dome.height,
    topRadius: resolvedHudSurfaceControls.dome.topRadius,
  }), [resolvedHudSurfaceControls.dome]);

  const handLayout = useMemo(() => {
    return resolveHandLayout(hudAnchor.radius, document.cardFan);
  }, [document.cardFan, hudAnchor.radius]);
  const cardFanBoundsStyle = useMemo(() => {
    if (!handLayout) {
      return undefined;
    }
    const radius = handLayout.orbitRadius;
    return {
      position: 'absolute',
      left: `${hudAnchor.x - radius - handLayout.cardWidth / 2}px`,
      top: `${hudAnchor.y - radius - handLayout.cardHeight / 2}px`,
      width: `${radius * 2 + handLayout.cardWidth}px`,
      height: `${radius * 2 + handLayout.cardHeight}px`,
    } as React.CSSProperties;
  }, [handLayout, hudAnchor.x, hudAnchor.y]);

  const currentTable = layoutState.table ?? {};
  const arenaTableWidth = currentTable.width ?? 960;
  const arenaTableHeight = currentTable.height ?? 560;
  const arenaHostStyle = useMemo(
    () => ({
      left: `${resolvedStage.arena.rect.x}px`,
      top: `${resolvedStage.arena.rect.y}px`,
      width: `${resolvedStage.arena.rect.width}px`,
      height: `${resolvedStage.arena.rect.height}px`,
    }),
    [resolvedStage.arena.rect.height, resolvedStage.arena.rect.width, resolvedStage.arena.rect.x, resolvedStage.arena.rect.y],
  );
  const arenaCanvasStyle = useMemo(
    () => {
      const effectiveScale = resolvedStage.arena.scale * resolvedStage.tableScale;
      const offsetX = (resolvedStage.arena.rect.width - resolvedStage.arena.contentWidth * effectiveScale) / 2;
      const offsetY = (resolvedStage.arena.rect.height - resolvedStage.arena.contentHeight * effectiveScale) / 2;
      return {
        width: `${resolvedStage.arena.contentWidth}px`,
        height: `${resolvedStage.arena.contentHeight}px`,
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${effectiveScale})`,
      };
    },
    [
      resolvedStage.arena.contentHeight,
      resolvedStage.arena.contentWidth,
      resolvedStage.arena.rect.height,
      resolvedStage.arena.rect.width,
      resolvedStage.arena.scale,
      resolvedStage.tableScale,
    ],
  );
  const hudHostStyle = useMemo(
    () => {
      const renderRect = resolveScaledStageRect(resolvedStage.hud, resolvedHudOverallScale);
      return {
        left: `${renderRect.x}px`,
        top: `${renderRect.y}px`,
        width: `${renderRect.width}px`,
        height: `${renderRect.height}px`,
      };
    },
    [resolvedHudOverallScale, resolvedStage.hud],
  );
  const hudCanvasStyle = useMemo(
    () => ({
      width: `${resolvedStage.hud.contentWidth}px`,
      height: `${resolvedStage.hud.contentHeight}px`,
      transform: `scale(${resolvedStage.hud.scale * resolvedHudOverallScale})`,
    }),
    [resolvedHudOverallScale, resolvedStage.hud.contentHeight, resolvedStage.hud.contentWidth, resolvedStage.hud.scale],
  );
  const scoreboardHostStyle = useMemo(
    () => resolvedStage.scoreboard
      ? (() => {
          const renderRect = resolveScaledStageRect(resolvedStage.scoreboard);
          return {
            left: `${renderRect.x}px`,
            top: `${renderRect.y}px`,
            width: `${renderRect.width}px`,
            height: `${renderRect.height}px`,
          };
        })()
      : undefined,
    [resolvedStage.scoreboard],
  );
  const scoreboardCanvasStyle = useMemo(
    () => resolvedStage.scoreboard
      ? ({
          width: `${resolvedStage.scoreboard.contentWidth * resolvedStage.scoreboard.innerScale}px`,
          height: `${resolvedStage.scoreboard.contentHeight * resolvedStage.scoreboard.innerScale}px`,
          transform: `scale(${resolvedStage.scoreboard.scale})`,
        })
      : undefined,
    [resolvedStage.scoreboard],
  );
  const cardStripHostStyle = useMemo(
    () => resolvedStage.cardStrip
      ? (() => {
          const renderRect = resolveScaledStageRect(resolvedStage.cardStrip);
          return {
            left: `${renderRect.x}px`,
            top: `${renderRect.y}px`,
            width: `${renderRect.width}px`,
            height: `${renderRect.height}px`,
          };
        })()
      : undefined,
    [resolvedStage.cardStrip],
  );
  const cardStripCanvasStyle = useMemo(
    () => resolvedStage.cardStrip
      ? ({
          width: `${resolvedStage.cardStrip.contentWidth * resolvedStage.cardStrip.innerScale}px`,
          height: `${resolvedStage.cardStrip.contentHeight * resolvedStage.cardStrip.innerScale}px`,
          transform: `scale(${resolvedStage.cardStrip.scale})`,
        })
      : undefined,
    [resolvedStage.cardStrip],
  );

  return (
    <div ref={surfaceRef} className={`card-game-preview-surface${className ? ` ${className}` : ''}`}>
      <div className="card-game-preview-surface__stage">
        <div
          className="card-game-preview-surface__layer card-game-preview-surface__layer--background"
          style={isolationVisibility.background === false ? hiddenLayerStyle : undefined}
        >
          {showBackgroundLayer ? <GameBackground floatScale={floatScale} position="absolute" /> : null}
        </div>

        <main className="card-game-preview-surface__scene" aria-label="Card game template preview">
          <div
            className="card-game-preview-surface__arena-host"
            style={{
              ...arenaHostStyle,
              ...(isolationVisibility.table === false ? hiddenLayerStyle : {}),
            }}
          >
            {showTableBounds ? (
              <div className="card-game-preview-surface__scaled-canvas card-game-preview-surface__editor-bounds-host" style={arenaCanvasStyle}>
                <div className="card-game-preview-surface__editor-bounds" aria-hidden="true" />
              </div>
            ) : null}
            <div className="card-game-preview-surface__scaled-canvas" style={arenaCanvasStyle}>
              <div className="card-game-preview-surface__arena">
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
                  {showSeatSystemLayer ? (
                    <PlayersOnTable
                      editableSeats={editableSeats}
                      showSeats={showSeatsLayer && isolationVisibility.seats !== false}
                      showSeatBounds={showSeatBounds}
                      showPlayerUiBounds={showPlayerUiBounds}
                      showLocalSeat={showLocalSeat || editableSeats || viewerPerspective?.mode === 'rotateToLocal' || surfaceMode === 'play'}
                      showPlayerUi={showPlayerUiLayer && isolationVisibility.playerUi !== false}
                      onSeatsChange={onSeatsChange}
                      seatPresentationById={seatPresentationById}
                      onIsolate={onIsolate}
                    />
                  ) : null}
                </div>

                {showZonesLayer || showDeckTrayLayer ? (
                  <div className="card-game-preview-surface__arena-layer card-game-preview-surface__arena-layer--zones">
                    <TableZonesLayer
                      zones={resolvedStage.zones}
                      presentationById={zonePresentationById}
                      authoringMode={authoringMode}
                      deckTrayControls={document.deckTray}
                      deckTrayAttachment={resolvedStage.deckTray}
                      frameSettings={document.cardFrame}
                      showZones={showZonesLayer && isolationVisibility.zones !== false}
                      showDeckTray={showDeckTrayLayer && isolationVisibility.deckTray !== false}
                      showDeckTrayDeck={isolationVisibility.deckTrayDeck !== false}
                      showZoneBounds={showZoneBounds}
                      showDeckTrayBounds={showDeckTrayBounds}
                      showDeckTrayDeckBounds={showDeckTrayDeckBounds}
                    />
                  </div>
                ) : null}

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
            </div>
          </div>

          <div
            className="card-game-preview-surface__hud-host"
            style={{
              ...hudHostStyle,
              ...(isolationVisibility.hud === false ? hiddenLayerStyle : {}),
            }}
          >
            {showHudBounds ? (
              <div className="card-game-preview-surface__scaled-canvas card-game-preview-surface__editor-bounds-host" style={hudCanvasStyle}>
                <div className="card-game-preview-surface__editor-bounds" aria-hidden="true" />
              </div>
            ) : null}
            <div className="card-game-preview-surface__scaled-canvas" style={hudCanvasStyle}>
              {shouldRenderHudHost ? (
                <GameHUD
                  controls={resolvedHudSurfaceControls}
                  showButtonGuides={showHudButtonBounds}
                  showDebugFrame={showHudBounds}
                  showDomeBounds={showHudDomeBounds}
                  showWingBounds={showHudWingBounds}
                  showBankBounds={showHudBankBounds}
                  showArtwork={showHudLayer}
                  onButtonClick={onHudButtonClick}
                  onIsolate={onIsolate}
                >
                  {showCardFanBounds && cardFanBoundsStyle ? (
                    <div className="card-game-preview-surface__editor-bounds" aria-hidden="true" style={cardFanBoundsStyle} />
                  ) : null}
                  {showCardsLayer && handLayout && isolationVisibility.cardFan !== false ? (
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
          </div>

          {showScoreboardLayer && resolvedStage.scoreboard && scoreboardHostStyle && scoreboardCanvasStyle ? (
            <div
              className="card-game-preview-surface__scoreboard-host"
              style={{
                ...scoreboardHostStyle,
                ...(isolationVisibility.scoreboard === false ? hiddenLayerStyle : {}),
              }}
            >
              {showScoreboardBounds ? (
                <div className="card-game-preview-surface__scaled-canvas card-game-preview-surface__editor-bounds-host" style={scoreboardCanvasStyle}>
                  <div className="card-game-preview-surface__editor-bounds" aria-hidden="true" />
                </div>
              ) : null}
              <div className="card-game-preview-surface__scaled-canvas" style={scoreboardCanvasStyle}>
                <GameScoreboard
                  controls={document.scoreboard}
                  presentation={scoreboardPresentation}
                  showHeaderBounds={showScoreboardHeaderBounds}
                  showRowBounds={showScoreboardRowBounds}
                />
              </div>
            </div>
          ) : null}

          {showCardStripLayer && resolvedStage.cardStrip && cardStripHostStyle && cardStripCanvasStyle ? (
            <div
              className="card-game-preview-surface__card-strip-host"
              style={{
                ...cardStripHostStyle,
                ...(isolationVisibility.cardStrip === false ? hiddenLayerStyle : {}),
              }}
            >
              {showCardStripBounds ? (
                <div className="card-game-preview-surface__scaled-canvas card-game-preview-surface__editor-bounds-host" style={cardStripCanvasStyle}>
                  <div className="card-game-preview-surface__editor-bounds" aria-hidden="true" />
                </div>
              ) : null}
              <div className="card-game-preview-surface__scaled-canvas" style={cardStripCanvasStyle}>
                <GameCardStrip
                  controls={document.cardStrip}
                  frameSettings={document.cardFrame}
                  presentation={cardStripPresentation}
                  showSlotBounds={showCardStripSlotBounds}
                />
              </div>
            </div>
          ) : null}

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
