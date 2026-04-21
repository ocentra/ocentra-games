import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { GameHeader, type GameHeaderProps } from '@ocentra/core-ui/Header/GameHeader';
import { CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@ocentra/game-layout-domain/draftChannel';
import {
  cloneCardGameLayoutDocument,
  type CardGameLayoutAsset,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { setGameAsset, tableLayoutStore } from '@ocentra/game-layout-domain/tableLayoutStore';
import { HudButtonEditorModal } from './HudButtonEditorModal';
import { CardGamePreviewSurface } from './CardGamePreviewSurface';
import { DEFAULT_HUD_ARTWORK_CONTROLS } from './scene/HudArtwork.types';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import './CardGameTemplatePage.css';

function createPreviewAsset(doc: CardGameLayoutDocument): CardGameLayoutAsset {
  const now = new Date().toISOString();
  return {
    metadata: {
      gameId: 'card-game-preview',
      schemaVersion: 1,
      displayName: 'Card Game Preview',
      createdAt: now,
      updatedAt: now,
    },
    layout: cloneCardGameLayoutDocument(doc),
    gameplay: {},
    extensions: {},
  };
}

export interface CardGameTemplatePageProps {
  headerProps: GameHeaderProps;
  footerVersion?: string;
  onHomeClick?: () => void;
  embedded?: boolean;
  document?: CardGameLayoutDocument;
  playerCount?: number;
  showBackground?: boolean;
  scaleFactor?: number;
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
}) => {
  const [draftDoc, setDraftDoc] = useState<CardGameLayoutDocument | null>(null);
  const [showHudButtonEditor, setShowHudButtonEditor] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.document) {
        setDraftDoc(event.data.document as CardGameLayoutDocument);
      }
    };
    return () => channel.close();
  }, []);

  const doc = useMemo(() => draftDoc ?? docProp ?? null, [draftDoc, docProp]);

  const resolvedPlayerCount = playerCountProp ?? doc?.defaultPlayerCount ?? 4;

  useEffect(() => {
    if (!doc) return;
    const asset = createPreviewAsset(doc);
    setGameAsset(asset);
    tableLayoutStore.applyPreset(resolvedPlayerCount);
  }, [doc, resolvedPlayerCount]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const activeDoc = doc ?? fallbackDoc;

  return (
    <div className={embedded ? 'game-screen game-screen--embedded' : 'game-screen'}>
      <div className="game-screen__shell">
        <div className="game-screen__layer-item game-screen__layer-item--header game-screen__layer-item--chrome">
          <GameHeader {...headerProps} onHomeClick={handleHomeClick} />
        </div>

        <main className="game-screen__stage" aria-label="Card game template stage">
          <CardGamePreviewSurface
            document={activeDoc}
            playerCount={resolvedPlayerCount}
            className="game-screen__canvas-surface"
            showBackground={showBackground}
            scaleFactor={scaleFactor}
          />
        </main>

        <div className="game-screen__layer-item game-screen__layer-item--footer game-screen__layer-item--chrome">
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
        document={activeDoc}
        onChange={() => {}}
        initialWorkspaceSection="layerSplit"
      />
    </div>
  );
};

export default CardGameTemplatePage;
