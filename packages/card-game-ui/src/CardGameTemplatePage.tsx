import React, { useCallback, useMemo } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { ISOLATION_REQUEST_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';
import type { IsolationRequestMessage } from '@ocentra/game-layout-domain/draftChannel';
import { CardGamePreviewSurface, type CardGameSeatPresentation } from './CardGamePreviewSurface';
import { DEFAULT_HUD_ARTWORK_CONTROLS } from './scene/HudArtwork.types';
import GameBackground from './scene/GameBackground';
import type {
  CardGameEditorOverlayVisibility,
  CardGameCardStripPresentation,
  CardGameLayerVisibility,
  CardGameLayoutDocument,
  CardGameSurfaceMode,
  CardGameViewerPerspective,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { createCardGameEditorIsolationVisibility } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  DEFAULT_CARD_STRIP_CONTROLS,
  DEFAULT_DECK_TRAY_CONTROLS,
  DEFAULT_SCOREBOARD_CONTROLS,
  normalizeCardGameLayoutDocument,
  PLAIN_CARD_FRAME_DEFAULTS,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { HudArtworkControls } from './scene/HudArtwork.types';
import type { CardGameZonePresentation } from './scene/TableZonesLayer';
import type { CardGameScoreboardPresentation } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { LayoutClasses } from '@ocentra/core-ui/constants/layout';
import './CardGameTemplatePage.css';

interface LegacyHeaderProps {
  user?: {
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export interface CardGameTemplatePageProps {
  headerProps?: LegacyHeaderProps;
  footerVersion?: string;
  headerTitle?: string;
  headerTagline?: string;
  onHomeClick?: () => void;
  embedded?: boolean;
  document?: CardGameLayoutDocument;
  playerCount?: number;
  showBackground?: boolean;
  scaleFactor?: number;
  editableSeats?: boolean;
  onSeatsChange?: (seats: SeatLayout[]) => void;
  assetPath?: string;
  surfaceMode?: CardGameSurfaceMode;
  viewerPerspective?: CardGameViewerPerspective;
  showLocalSeat?: boolean;
  seatPresentationById?: Partial<Record<number, CardGameSeatPresentation>>;
  zonePresentationById?: Partial<Record<string, CardGameZonePresentation>>;
  scoreboardPresentation?: CardGameScoreboardPresentation;
  cardStripPresentation?: CardGameCardStripPresentation;
  hudControlsOverride?: HudArtworkControls;
  onHudButtonClick?: (index: number, label: string) => void;
  arenaOverlay?: React.ReactNode;
  stageOverlay?: React.ReactNode;
  showArenaGuide?: boolean;
  showAuthoringGuides?: boolean;
  showHeaderDebugControls?: boolean;
  onIsolateRequest?: (type: IsolationRequestMessage['type'], label: string, config: unknown) => void;
  editorIsolationVisibility?: CardGameLayerVisibility;
  editorOverlayVisibility?: CardGameEditorOverlayVisibility;
}

export const CardGameTemplatePage: React.FC<CardGameTemplatePageProps> = ({
  headerProps,
  footerVersion,
  headerTitle,
  headerTagline,
  onHomeClick,
  embedded = false,
  document: docProp,
  playerCount: playerCountProp,
  showBackground = true,
  editableSeats = false,
  onSeatsChange,
  assetPath,
  surfaceMode = 'templateSaved',
  viewerPerspective = { mode: 'canonical' },
  showLocalSeat = false,
  seatPresentationById,
  zonePresentationById,
  scoreboardPresentation,
  cardStripPresentation,
  hudControlsOverride,
  onHudButtonClick,
  arenaOverlay,
  stageOverlay,
  showArenaGuide = false,
  showAuthoringGuides = false,
  showHeaderDebugControls = true,
  onIsolateRequest,
  editorIsolationVisibility,
  editorOverlayVisibility,
}) => {
  const doc = useMemo(
    () => (docProp ? normalizeCardGameLayoutDocument(docProp) : null),
    [docProp],
  );
  const resolvedPlayerCount = playerCountProp ?? doc?.defaultPlayerCount ?? 4;

  const handleHomeClick = useCallback(() => {
    onHomeClick?.();
  }, [onHomeClick]);

  const fallbackDoc: CardGameLayoutDocument = useMemo(() => ({
    defaultPlayerCount: 4,
    presets: {},
    playerUiDefaults: {},
    hud: DEFAULT_HUD_ARTWORK_CONTROLS,
    scoreboard: DEFAULT_SCOREBOARD_CONTROLS,
    cardStrip: DEFAULT_CARD_STRIP_CONTROLS,
    deckTray: DEFAULT_DECK_TRAY_CONTROLS,
    cardFan: {
      cardCount: 13,
      minCardCount: 3,
      maxCardCount: 13,
      radiusScale: 0.41,
      radiusOffset: 0,
      cardWidthScale: 0.38,
      cardHeightScale: 0.54,
      arcMin: 34,
      arcMax: 149,
      fanTilt: 0,
      centerOffsetX: 0,
      centerOffsetY: 0,
      disableViewportScale: true,
      overallScale: 1.0,
    },
    cardVisuals: { floatScale: 1 },
    cardFrame: PLAIN_CARD_FRAME_DEFAULTS,
    renderToggles: {
      background: true,
      header: true,
      footer: true,
      table: true,
      seats: true,
      playerUi: true,
      zones: true,
      hud: true,
      cardFan: true,
      scoreboard: true,
      cardStrip: true,
      deckTray: true,
    },
    tablePresentation: {
      overallScale: 1,
    },
    tableAttachments: {
      deckTray: {
        position: { x: 0.85, y: 0.5 },
        size: { width: 0.18, height: 0.24 },
        scale: 1,
        rotation: 0,
      },
    },
    views: {},
    stageLayout: undefined,
    zones: [],
    gameplay: {},
    extensions: {},
  }), []);

  const activeDoc = doc ?? fallbackDoc;
  const runtimeToggles = activeDoc.renderToggles;
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
  const showHeader = runtimeToggles.header;
  const showFooter = runtimeToggles.footer;
  const showBackgroundLayer = showBackground && runtimeToggles.background;

  const handleSeatsChange = useCallback((nextSeats: SeatLayout[]) => {
    const nextDoc = cloneCardGameLayoutDocument(activeDoc);
    const presetKey = String(resolvedPlayerCount);
    if (!nextDoc.presets[presetKey]) {
      nextDoc.presets[presetKey] = {
        table: { ...activeDoc.presets[presetKey]?.table },
        seats: [],
      };
    }
    nextDoc.presets[presetKey].seats = nextSeats;
    onSeatsChange?.(nextSeats);
  }, [activeDoc, onSeatsChange, resolvedPlayerCount]);
  
  const handleIsolate = useCallback((type: IsolationRequestMessage['type'], label: string, config: unknown) => {
    onIsolateRequest?.(type, label, config);
    const channel = new BroadcastChannel(ISOLATION_REQUEST_CHANNEL);
    const message: IsolationRequestMessage = {
      type,
      label,
      config,
      assetPath: assetPath || 'unknown',
    };
    channel.postMessage(message);
    channel.close();
  }, [assetPath, onIsolateRequest]);

  const isPortrait = activeDoc.hud.height > activeDoc.hud.width;

  return (
    <div
      className={`${embedded ? `${LayoutClasses.GAME_SCREEN} ${LayoutClasses.EMBEDDED}` : LayoutClasses.GAME_SCREEN}${showFooter ? ` ${LayoutClasses.WITH_FOOTER}` : ''}${isPortrait ? ' game-screen--portrait' : ''}`}
    >
      <UnifiedPageShell
        className={LayoutClasses.SHELL}
        embedded={embedded}
        viewportLocked
        background={
          showBackgroundLayer ? (
            <div style={isolationVisibility.background === false ? hiddenLayerStyle : undefined}>
              <GameBackground
                floatScale={activeDoc.cardVisuals.floatScale}
                position="absolute"
              />
            </div>
          ) : null
        }
        header={
          showHeader ? (
            <div
              className={`${LayoutClasses.LAYER_ITEM} ${LayoutClasses.LAYER_ITEM}--header ${LayoutClasses.CHROME}${embedded ? ` ${LayoutClasses.LAYER_ITEM_EMBEDDED}` : ''}`}
              style={isolationVisibility.header === false ? hiddenLayerStyle : undefined}
            >
              {showAuthoringGuides && editorOverlayVisibility?.header ? <div className="game-screen__editor-bounds" aria-hidden="true" /> : null}
              <UnifiedHeader
                showPrimaryNavigation={false}
                showDebugControls={showHeaderDebugControls}
                dynamicData={{
                  gameName: headerTitle ?? 'Preview',
                  tagline: headerTagline ?? 'Template Engine Preview',
                }}
                config={{
                  ...(headerTagline !== undefined
                    ? {
                        center: {
                          modeB: {
                            tagline: headerTagline,
                          },
                        },
                      }
                    : {}),
                  left: {
                    onClick: handleHomeClick,
                  },
                  right: headerProps?.user
                    ? {
                        isProfile: true,
                        user: {
                          name: headerProps.user.displayName || 'Player',
                          email: headerProps.user.email,
                          avatarUrl: headerProps.user.photoURL,
                        isLoggedIn: true,
                      },
                      onLogout: headerProps.onLogout,
                    }
                    : headerProps?.onLogin
                      ? {
                          onClick: headerProps.onLogin,
                        }
                      : undefined,
                }}
              />
            </div>
          ) : null
        }
        footer={
          showFooter ? (
            <div
              className={`${LayoutClasses.LAYER_ITEM} ${LayoutClasses.LAYER_ITEM}--footer ${LayoutClasses.CHROME}${embedded ? ` ${LayoutClasses.LAYER_ITEM_EMBEDDED}` : ''}`}
              style={isolationVisibility.footer === false ? hiddenLayerStyle : undefined}
            >
              {showAuthoringGuides && editorOverlayVisibility?.footer ? <div className="game-screen__editor-bounds" aria-hidden="true" /> : null}
              <GameFooter appVersion={footerVersion} />
            </div>
          ) : null
        }
        workClassName={LayoutClasses.STAGE}
      >
        <CardGamePreviewSurface
          document={activeDoc}
          playerCount={resolvedPlayerCount}
          className="game-screen__canvas-surface"
          surfaceMode={surfaceMode}
          viewerPerspective={viewerPerspective}
          showBackground={false}
          editableSeats={editableSeats}
          showLocalSeat={showLocalSeat}
          onSeatsChange={handleSeatsChange}
          seatPresentationById={seatPresentationById}
          zonePresentationById={zonePresentationById}
          scoreboardPresentation={scoreboardPresentation}
          cardStripPresentation={cardStripPresentation}
          hudControlsOverride={hudControlsOverride}
          onHudButtonClick={onHudButtonClick}
          arenaOverlay={arenaOverlay}
          stageOverlay={stageOverlay}
          onIsolate={handleIsolate}
          showArenaGuide={showArenaGuide}
          showAuthoringGuides={showAuthoringGuides}
          editorIsolationVisibility={isolationVisibility}
          editorOverlayVisibility={editorOverlayVisibility}
        />
      </UnifiedPageShell>

    </div>
  );
};

export default CardGameTemplatePage;
