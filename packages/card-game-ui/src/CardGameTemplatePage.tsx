import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { GameHeader, type GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import { CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';
import type { CardGameLayoutDraftMessage } from '@ocentra/game-layout-domain/draftChannel';
import { HudButtonEditorModal } from './HudButtonEditorModal';
import { CardGamePreviewSurface } from './CardGamePreviewSurface';
import { DEFAULT_HUD_ARTWORK_CONTROLS } from './scene/HudArtwork.types';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';
import { cloneCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { HudArtworkControls } from './scene/HudArtwork.types';
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
}

export const CardGameTemplatePage: React.FC<CardGameTemplatePageProps> = ({
  headerProps,
  footerVersion,
  onHomeClick,
  embedded = false,
  document: docProp,
  playerCount: playerCountProp,
  showBackground = true,
  scaleFactor = 1,
  editableSeats = false,
  onSeatsChange,
  assetPath,
  hudControlsOverride,
  onHudButtonClick,
  arenaOverlay,
  stageOverlay,
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
    },
    cardVisuals: { floatScale: 1 },
    views: {},
    gameplay: {},
    extensions: {},
  }), []);

  const activeDoc = doc ?? fallbackDoc;
  const layerVisibility = activeDoc.hud.layerVisibility ?? {};
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

  return (
    <div className={embedded ? 'game-screen game-screen--embedded' : 'game-screen'}>
      <div className="game-screen__shell">
        <div className={`game-screen__layer-item game-screen__layer-item--header game-screen__layer-item--chrome${showHeader ? '' : ' game-screen__layer-item--hidden'}`}>
          <GameHeader {...headerProps} onHomeClick={handleHomeClick} />
        </div>

        <main className="game-screen__stage" aria-label="Card game template stage">
          <CardGamePreviewSurface
            document={activeDoc}
            playerCount={resolvedPlayerCount}
            className="game-screen__canvas-surface"
            showBackground={showBackground}
            scaleFactor={scaleFactor}
            editableSeats={editableSeats}
            onSeatsChange={handleSeatsChange}
            hudControlsOverride={hudControlsOverride}
            onHudButtonClick={onHudButtonClick}
            arenaOverlay={arenaOverlay}
            stageOverlay={stageOverlay}
          />
        </main>

        <div className={`game-screen__layer-item game-screen__layer-item--footer game-screen__layer-item--chrome${showFooter ? '' : ' game-screen__layer-item--hidden'}`}>
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
