import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import {
  cloneCardGameLayoutDocument,
  type CardGameLayoutAsset,
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
}

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
    gameplay: {},
    extensions: {},
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
}) => {
  const resolvedPlayerCount = playerCount ?? document.defaultPlayerCount;
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const hudCenterRef = useRef<HTMLDivElement | null>(null);
  const [hudAnchor, setHudAnchor] = useState<{ x: number; y: number; radius: number } | null>(null);

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

  const handLayout = useMemo(() => {
    if (!hudAnchor) {
      return null;
    }

    return resolveHandLayout(hudAnchor.radius, document.cardFan);
  }, [document.cardFan, hudAnchor]);

  return (
    <div ref={surfaceRef} className={`card-game-preview-surface${className ? ` ${className}` : ''}`}>
      <div className="card-game-preview-surface__stage">
        <div className="card-game-preview-surface__layer card-game-preview-surface__layer--background">
          {showBackground && <GameBackground floatScale={floatScale} position="absolute" />}
        </div>

        <main className="card-game-preview-surface__scene" aria-label="Card game template preview">
          <div className="card-game-preview-surface__layer card-game-preview-surface__layer--table">
            <CenterTableSvg />
          </div>

          <div className="card-game-preview-surface__layer card-game-preview-surface__layer--seats">
            <PlayersOnTable />
          </div>

          <div className="card-game-preview-surface__layer card-game-preview-surface__layer--hud">
            <GameHUD ref={hudCenterRef} controls={document.hud} showButtonGuides={false}>
              {hudAnchor && handLayout ? (
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
          </div>
        </main>
      </div>
    </div>
  );
};
