import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { GameHeader, type GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import { CARD_GAME_LAYOUT_DRAFT_CHANNEL, ISOLATION_REQUEST_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';
import type { CardGameLayoutDraftMessage, IsolationRequestMessage } from '@ocentra/game-layout-domain/draftChannel';
import { HudButtonEditorModal } from './HudButtonEditorModal';
import { CardGamePreviewSurface } from './CardGamePreviewSurface';
import { DEFAULT_HUD_ARTWORK_CONTROLS } from './scene/HudArtwork.types';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import { cloneCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { HudArtworkControls } from './scene/HudArtwork.types';
import { LayoutClasses } from '@ocentra/core-ui';
import './CardGameTemplatePage.css';

export interface CardGameTemplatePageProps {
  headerProps: GameHeaderProps;
  footerVersion?: string;
  onHomeClick?: () => void;
  embedded?: boolean;
  document?: CardGameLayoutDocument;
  playerCount?: number;
  showBackground?: boolean;
  scaleFactor?: number;
  editableSeats?: boolean;
  onSeatsChange?: (seats: SeatLayout[]) => void;
  assetPath?: string;
  hudControlsOverride?: HudArtworkControls;
  onHudButtonClick?: (index: number, label: string) => void;
  arenaOverlay?: React.ReactNode;
  stageOverlay?: React.ReactNode;
  showArenaGuide?: boolean;
}

export const CardGameTemplatePage: React.FC<CardGameTemplatePageProps> = ({
  headerProps,
  footerVersion,
  onHomeClick,
  embedded = false,
  document: docProp,
  playerCount: playerCountProp,
  showBackground = true,
  editableSeats = false,
  onSeatsChange,
  assetPath,
  hudControlsOverride,
  onHudButtonClick,
  arenaOverlay,
  stageOverlay,
  showArenaGuide = false,
}) => {
  const [draftDoc, setDraftDoc] = useState<CardGameLayoutDocument | null>(null);
  const [draftPlayerCount, setDraftPlayerCount] = useState<number | null>(null);
  const [showHudButtonEditor, setShowHudButtonEditor] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.onmessage = (event) => {
      const nextDraft = event.data as CardGameLayoutDraftMessage | undefined;
      if (nextDraft?.document) {
        setDraftDoc(nextDraft.document);
      }
      if (typeof nextDraft?.playerCount === 'number') {
        setDraftPlayerCount(nextDraft.playerCount);
      }
    };
    return () => channel.close();
  }, []);

  const doc = useMemo(() => draftDoc ?? docProp ?? null, [draftDoc, docProp]);

  const resolvedPlayerCount = playerCountProp ?? draftPlayerCount ?? doc?.defaultPlayerCount ?? 4;

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
  const showTools = layerVisibility.tools !== false;

  const broadcastUpdate = useCallback((nextDoc: CardGameLayoutDocument, nextPlayerCount: number) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDoc,
      playerCount: nextPlayerCount,
    });
    channel.close();
  }, [assetPath]);

  const handleDocChange = useCallback((nextDoc: CardGameLayoutDocument) => {
    setDraftDoc(nextDoc);
    broadcastUpdate(nextDoc, resolvedPlayerCount);
  }, [broadcastUpdate, resolvedPlayerCount]);

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
    handleDocChange(nextDoc);
    onSeatsChange?.(nextSeats);
  }, [activeDoc, handleDocChange, resolvedPlayerCount, onSeatsChange]);
  
  const handleIsolate = useCallback((type: IsolationRequestMessage['type'], label: string, config: unknown) => {
    const channel = new BroadcastChannel(ISOLATION_REQUEST_CHANNEL);
    const message: IsolationRequestMessage = {
      type,
      label,
      config,
      assetPath: assetPath || 'unknown',
    };
    channel.postMessage(message);
    channel.close();
  }, [assetPath]);

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
      <div className={LayoutClasses.SHELL}>
        <div className={`${LayoutClasses.LAYER_ITEM} ${LayoutClasses.LAYER_ITEM}--header ${LayoutClasses.CHROME}${embedded ? ` ${LayoutClasses.LAYER_ITEM_EMBEDDED}` : ''}${showHeader ? '' : ` ${LayoutClasses.HIDDEN}`}`}>
          <GameHeader {...headerProps} onHomeClick={handleHomeClick} />
        </div>

        <main className={LayoutClasses.STAGE} aria-label="Card game template stage">
          <CardGamePreviewSurface
            document={activeDoc}
            playerCount={resolvedPlayerCount}
            className="game-screen__canvas-surface"
            showBackground={showBackground}
            editableSeats={editableSeats}
            onSeatsChange={handleSeatsChange}
            hudControlsOverride={hudControlsOverride}
            onHudButtonClick={onHudButtonClick}
            arenaOverlay={arenaOverlay}
            stageOverlay={stageOverlay}
            onIsolate={handleIsolate}
            showArenaGuide={showArenaGuide}
          />
        </main>

        <div className={`${LayoutClasses.LAYER_ITEM} ${LayoutClasses.LAYER_ITEM}--footer ${LayoutClasses.CHROME}${embedded ? ` ${LayoutClasses.LAYER_ITEM_EMBEDDED}` : ''}${showFooter ? '' : ` ${LayoutClasses.HIDDEN}`}`}>
          <GameFooter appVersion={footerVersion} />
        </div>
      </div>

      {!embedded && showTools && (
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
        document={activeDoc}
        onChange={handleDocChange}
        initialWorkspaceSection="layerSplit"
      />
    </div>
  );
};

export default CardGameTemplatePage;
