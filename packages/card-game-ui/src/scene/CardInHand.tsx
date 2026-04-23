import React, { useEffect, useMemo, useRef } from 'react';
import './CardInHand.css';

import { CARD_IN_HAND_DEFAULTS } from './CardInHand.constants';

export interface AnchorPoint {
  x: number;
  y: number;
  radius: number;
  width?: number;
  height?: number;
  topRadius?: number;
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
  radiusOffset?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardImage?: string;
  anchorPoint?: AnchorPoint;
  position?: 'absolute' | 'fixed';
  zIndex?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  fanTilt?: number;
  centerOffsetX?: number;
  centerOffsetY?: number;
  disableViewportScale?: boolean;
  overallScale?: number;
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
  radiusOffset = 0,
  cardWidth = CARD_IN_HAND_DEFAULTS.CARD_WIDTH,
  cardHeight = CARD_IN_HAND_DEFAULTS.CARD_HEIGHT,
  cardImage = CARD_IN_HAND_DEFAULTS.CARD_IMAGE,
  anchorPoint,
  position = 'absolute',
  zIndex = CARD_IN_HAND_DEFAULTS.Z_INDEX_BASE,
  viewportWidth,
  viewportHeight,
  fanTilt = 0,
  centerOffsetX = 0,
  centerOffsetY = 0,
  disableViewportScale = false,
  overallScale = CARD_IN_HAND_DEFAULTS.OVERALL_SCALE,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLImageElement | null>>([]);

  const dimensions = useMemo(() => {
    if (disableViewportScale) {
      return { width: cardWidth * overallScale, height: cardHeight * overallScale };
    }

    const resolvedViewportWidth = viewportWidth ?? (typeof window === 'undefined' ? null : window.innerWidth);
    const resolvedViewportHeight = viewportHeight ?? (typeof window === 'undefined' ? null : window.innerHeight);
    if (!resolvedViewportWidth || !resolvedViewportHeight) {
      return { width: cardWidth * overallScale, height: cardHeight * overallScale };
    }

    const baseWidth = CARD_IN_HAND_DEFAULTS.REFERENCE_WIDTH || resolvedViewportWidth;
    const widthScale = clamp(
      resolvedViewportWidth / baseWidth,
      CARD_IN_HAND_DEFAULTS.MIN_CARD_SCALE,
      CARD_IN_HAND_DEFAULTS.MAX_CARD_SCALE,
    );
    const referenceAspect = cardHeight / Math.max(1, cardWidth);
    const heightScale = clamp(
      resolvedViewportHeight / (baseWidth * referenceAspect),
      CARD_IN_HAND_DEFAULTS.MIN_CARD_SCALE,
      CARD_IN_HAND_DEFAULTS.MAX_CARD_SCALE,
    );

    const scale = Math.min(widthScale, heightScale) * overallScale;
    return {
      width: cardWidth * scale,
      height: cardHeight * scale,
    };
  }, [cardHeight, cardWidth, disableViewportScale, viewportHeight, viewportWidth, overallScale]);

  const { effectiveArcStart, cards } = useMemo(() => {
    if (!anchorPoint) {
      return { effectiveArcStart: 0, cards: [] as Array<{ left: number; top: number; rotation: number }> };
    }

    const { x: centerX, y: centerY, radius: domeRadius, width: domeWidth = 220, topRadius = 110 } = anchorPoint;
    const baseRadius = CARD_IN_HAND_DEFAULTS.USE_DOME_RADIUS ? domeRadius : 0;
    const fanRadius = (baseRadius + radius + radiusOffset) * overallScale;

    // Determine how "circular" the fan should be. 
    // If topRadius is 110 and width is 220, it's a perfect half-circle.
    // If topRadius is 0, it's a square.
    const halfWidth = domeWidth / 2;
    const circularity = Math.min(1, topRadius / Math.max(1, halfWidth));

    const clampedCount = clamp(cardCount, minCardCount, maxCardCount);
    const countRange = Math.max(maxCardCount - minCardCount, 1);
    const t_count = (clampedCount - minCardCount) / countRange;
    const span = clamp(minArc + (maxArc - minArc) * t_count, minArc, maxArc);
    const defaultStart = -span / 2;
    const defaultEnd = span / 2;

    const start = arcStart ?? defaultStart;
    const end = arcEnd ?? defaultEnd;
    const step = clampedCount > 1 ? (end - start) / (clampedCount - 1) : 0;

    // For linear fan, we spread across a width. 
    // We'll use the same angular span to determine the linear width for consistency.
    const linearWidth = fanRadius * 2 * Math.sin((span / 2) * Math.PI / 180);

    const list = Array.from({ length: clampedCount }, (_, index) => {
      const angleDeg = start + step * index;
      const angleRad = (angleDeg * Math.PI) / 180;
      
      // Circular coords
      const circLeft = centerX + centerOffsetX + fanRadius * Math.sin(angleRad);
      const circTop = centerY + centerOffsetY - fanRadius * Math.cos(angleRad);
      
      // Linear coords
      const t_linear = clampedCount > 1 ? index / (clampedCount - 1) : 0.5;
      const linLeft = centerX + centerOffsetX + (t_linear - 0.5) * linearWidth;
      const linTop = centerY + centerOffsetY - fanRadius;

      // Blend based on circularity
      const left = circLeft * circularity + linLeft * (1 - circularity);
      const top = circTop * circularity + linTop * (1 - circularity);
      const rotation = (angleDeg + fanTilt) * circularity; // Less rotation if linear

      return { left, top, rotation };
    });

    return { effectiveArcStart: start, cards: list };
  }, [anchorPoint, arcEnd, arcStart, cardCount, centerOffsetX, centerOffsetY, fanTilt, maxArc, maxCardCount, minArc, minCardCount, radius, radiusOffset, overallScale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.position = position;
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
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
      image.style.transformOrigin = '50% 100%';
      image.style.zIndex = `${zIndex + index}`;
      image.draggable = false;
    });
  }, [cards, dimensions.height, dimensions.width, position, zIndex]);

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
