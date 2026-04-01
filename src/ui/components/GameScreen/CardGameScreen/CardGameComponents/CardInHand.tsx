import React, { useEffect, useMemo, useRef } from "react";
import "./CardInHand.css";

import { CARD_IN_HAND_DEFAULTS } from "./CardInHand.constants";
import { useOptionalPlatformUI } from '@/ui/platform/usePlatformUI';

// No more hardcoded imports! Path resolved at runtime (Unity-like asset system)
// This prevents eager loading of assets when just showing welcome screen
// Path will be resolved through AssetLoader middleware in dev, or R2 in production
const DEFAULT_CARD_BACK_PATH = '/Resources/GameMode/CardGames/Images/Extras/BackCard.png';

interface AnchorPoint {
  x: number;
  y: number;
  radius: number;
}

interface CardInHandProps {
  cardCount?: number;
  arcStart?: number;
  arcEnd?: number;
  minCardCount?: number;
  maxCardCount?: number;
  minArc?: number;
  maxArc?: number;
  radius?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardImage?: string;
  anchorPoint?: AnchorPoint;
  position?: "absolute" | "fixed";
  zIndex?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const CardInHand: React.FC<CardInHandProps> = ({
  cardCount = CARD_IN_HAND_DEFAULTS.CARD_COUNT,
  arcStart,
  arcEnd,
  minCardCount = CARD_IN_HAND_DEFAULTS.MIN_CARD_COUNT,
  maxCardCount = CARD_IN_HAND_DEFAULTS.MAX_CARD_COUNT,
  minArc = CARD_IN_HAND_DEFAULTS.MIN_ARC,
  maxArc = CARD_IN_HAND_DEFAULTS.MAX_ARC,
  radius = CARD_IN_HAND_DEFAULTS.RADIUS,
  cardWidth = CARD_IN_HAND_DEFAULTS.CARD_WIDTH,
  cardHeight = CARD_IN_HAND_DEFAULTS.CARD_HEIGHT,
  cardImage = CARD_IN_HAND_DEFAULTS.CARD_IMAGE || DEFAULT_CARD_BACK_PATH,
  anchorPoint,
  position = "fixed",
  zIndex = CARD_IN_HAND_DEFAULTS.Z_INDEX_BASE,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLImageElement | null>>([]);
  const platformUI = useOptionalPlatformUI();

  const dimensions = useMemo(() => {
    const viewportWidth = platformUI?.viewportWidth ?? (typeof window === 'undefined' ? null : window.innerWidth);
    if (!viewportWidth) {
      return { width: cardWidth, height: cardHeight };
    }
    const baseWidth = CARD_IN_HAND_DEFAULTS.REFERENCE_WIDTH || viewportWidth;
    const scale = clamp(
      viewportWidth / baseWidth,
      CARD_IN_HAND_DEFAULTS.MIN_CARD_SCALE,
      CARD_IN_HAND_DEFAULTS.MAX_CARD_SCALE
    );
    return {
      width: cardWidth * scale,
      height: cardHeight * scale,
    };
  }, [cardHeight, cardWidth, platformUI?.viewportWidth]);

  const { effectiveArcStart, cards } = useMemo(() => {
    if (!anchorPoint) {
      return { effectiveArcStart: 0, cards: [] as Array<{ left: number; top: number; rotation: number }> };
    }

    const { x: centerX, y: centerY, radius: domeRadius } = anchorPoint;
    const baseRadius = CARD_IN_HAND_DEFAULTS.USE_DOME_RADIUS ? domeRadius : 0;
    const fanRadius = baseRadius + radius;

    const clampedCount = clamp(cardCount, minCardCount, maxCardCount);
    const countRange = Math.max(maxCardCount - minCardCount, 1);
    const t = (clampedCount - minCardCount) / countRange;
    const span = clamp(minArc + (maxArc - minArc) * t, minArc, maxArc);
    const defaultStart = -span / 2;
    const defaultEnd = span / 2;

    const start = arcStart ?? defaultStart;
    const end = arcEnd ?? defaultEnd;

    const step = clampedCount > 1 ? (end - start) / (clampedCount - 1) : 0;

    const list = Array.from({ length: clampedCount }, (_, index) => {
      const angleDeg = start + step * index;
      const angleRad = (angleDeg * Math.PI) / 180;
      const left = centerX + fanRadius * Math.sin(angleRad);
      const top = centerY - fanRadius * Math.cos(angleRad);
      return { left, top, rotation: angleDeg };
    });

    return { effectiveArcStart: start, cards: list };
  }, [anchorPoint, arcStart, arcEnd, cardCount, minCardCount, maxCardCount, minArc, maxArc, radius]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.position = position;
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.pointerEvents = "none";
    container.style.zIndex = `${zIndex}`;
  }, [position, zIndex]);

  useEffect(() => {
    cardRefs.current.length = cards.length;
    cards.forEach((card, index) => {
      const image = cardRefs.current[index];
      if (!image) return;
      image.style.position = position;
      image.style.left = `${card.left}px`;
      image.style.top = `${card.top}px`;
      image.style.width = `${dimensions.width}px`;
      image.style.height = `${dimensions.height}px`;
      image.style.transform = `translate(-50%, -100%) rotate(${card.rotation}deg)`;
      image.style.transformOrigin = "50% 100%";
      image.style.zIndex = `${zIndex + index}`;
      image.draggable = false;
    });
  }, [cards, position, dimensions.width, dimensions.height, zIndex]);

  if (!anchorPoint || cards.length === 0) return null;

  return (
    <div ref={containerRef} className="card-in-hand-container">
      {cards.map((_, index: number) => (
        <img
          key={`${effectiveArcStart}-${index}`}
          ref={(el) => {
            cardRefs.current[index] = el;
          }}
          src={cardImage}
          alt=""
          className="card-in-hand__card"
        />
      ))}
    </div>
  );
};

export default CardInHand;
