import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { ISOLATION_REQUEST_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';
import type { IsolationRequestMessage } from '@ocentra/game-layout-domain/draftChannel';
import { CardGamePreviewSurface, type CardGameSeatPresentation } from './CardGamePreviewSurface';
import { DEFAULT_HUD_ARTWORK_CONTROLS } from './scene/HudArtwork.types';
import GameBackground from './scene/GameBackground';
import type {
  CardGameLayoutDocument,
  CardGameSurfaceMode,
  CardGameViewerPerspective,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import { cloneCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { HudArtworkControls } from './scene/HudArtwork.types';
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
  headerProps?: LegacyHeaderProps; // Kept for backward compatibility but UnifiedHeader is preferred
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
  hudControlsOverride?: HudArtworkControls;
  onHudButtonClick?: (index: number, label: string) => void;
  arenaOverlay?: React.ReactNode;
  stageOverlay?: React.ReactNode;
  showArenaGuide?: boolean;
  showHeaderDebugControls?: boolean;
  onIsolateRequest?: (type: IsolationRequestMessage['type'], label: string, config: unknown) => void;
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
  hudControlsOverride,
  onHudButtonClick,
  arenaOverlay,
  stageOverlay,
  showArenaGuide = false,
  showHeaderDebugControls = true,
  onIsolateRequest,
}) => {
  const doc = useMemo(() => docProp ?? null, [docProp]);
  const resolvedPlayerCount = playerCountProp ?? doc?.defaultPlayerCount ?? 4;

  const handleHomeClick = useCallback(() => {
    onHomeClick?.();
  }, [onHomeClick]);

  const fallbackDoc: CardGameLayoutDocument = useMemo(() => ({
    defaultPlayerCount: 4,
    presets: {},
    playerUiDefaults: {},
    hud: DEFAULT_HUD_ARTWORK_CONTROLS,
    cardFan: {
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
      overallScale: 1.0,
    },
    cardVisuals: { floatScale: 1 },
    views: {},
    gameplay: {},
    extensions: {},
  }), []);

  const activeDoc = doc ?? fallbackDoc;
  const resolvedHud = hudControlsOverride ?? activeDoc.hud;
  const layerVisibility = resolvedHud.layerVisibility ?? {};
  const showHeader = layerVisibility.header !== false;
  const showFooter = layerVisibility.footer !== false;
  const showBackgroundLayer = showBackground && layerVisibility.background !== false;

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

  const shellRef = useRef<HTMLDivElement>(null);
  const [gameScale, setGameScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      if (!shellRef.current) return;
      const width = shellRef.current.clientWidth;
      if (width <= 0) return;
      
      const hudWidth = activeDoc.hud.width;
      const scale = Math.min(1, (width * 0.98) / hudWidth);
      setGameScale(scale);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    if (shellRef.current) {
      observer.observe(shellRef.current);
    }

    return () => observer.disconnect();
  }, [activeDoc.hud.width]);

  const isPortrait = activeDoc.hud.height > activeDoc.hud.width;

  return (
    <div 
      ref={shellRef}
      className={`${embedded ? `${LayoutClasses.GAME_SCREEN} ${LayoutClasses.EMBEDDED}` : LayoutClasses.GAME_SCREEN}${showFooter ? ` ${LayoutClasses.WITH_FOOTER}` : ''}${isPortrait ? ' game-screen--portrait' : ''}`}
      style={{ 
        '--game-scale': gameScale,
        '--sim-w': `${activeDoc.hud.width * gameScale}px`,
        '--sim-h': `${activeDoc.hud.height * gameScale}px`
      } as React.CSSProperties}
    >
      <UnifiedPageShell
        className={LayoutClasses.SHELL}
        embedded={embedded}
        background={
          showBackgroundLayer ? (
            <GameBackground
              floatScale={activeDoc.cardVisuals.floatScale}
              position="absolute"
            />
          ) : null
        }
        header={
          showHeader ? (
            <div
              className={`${LayoutClasses.LAYER_ITEM} ${LayoutClasses.LAYER_ITEM}--header ${LayoutClasses.CHROME}${embedded ? ` ${LayoutClasses.LAYER_ITEM_EMBEDDED}` : ''}`}
            >
              <UnifiedHeader
                showPrimaryNavigation={false}
                showDebugControls={showHeaderDebugControls}
                dynamicData={{
                  gameName: headerTitle ?? 'Preview',
                  tagline: headerTagline ?? 'Template Engine Preview',
                }}
                config={{
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
            >
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
          hudControlsOverride={hudControlsOverride}
          onHudButtonClick={onHudButtonClick}
          arenaOverlay={arenaOverlay}
          stageOverlay={stageOverlay}
          onIsolate={handleIsolate}
          showArenaGuide={showArenaGuide}
        />
      </UnifiedPageShell>

    </div>
  );
};

export default CardGameTemplatePage;
