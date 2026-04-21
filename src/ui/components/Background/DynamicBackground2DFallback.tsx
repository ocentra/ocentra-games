import React, { useEffect, useMemo } from 'react';
import type { RotationControlAPI } from '@/ui/components/Background/DynamicBackground3D';
import {
  cardGameWOCSpadeFilledImageUrl,
  cardGameWOCSpadeHollowImageUrl,
  cardGameWOCHeartFilledImageUrl,
  cardGameWOCHeartHollowImageUrl,
  cardGameWOCDiamondFilledImageUrl,
  cardGameWOCDiamondHollowImageUrl,
  cardGameWOCClubFilledImageUrl,
  cardGameWOCClubHollowImageUrl,
} from '@ocentra/app-assets/cardgame';
import './DynamicBackground2DFallback.css';

const FALLBACK_CARDS = [
  { src: cardGameWOCSpadeFilledImageUrl },
  { src: cardGameWOCSpadeHollowImageUrl },
  { src: cardGameWOCHeartFilledImageUrl },
  { src: cardGameWOCHeartHollowImageUrl },
  { src: cardGameWOCDiamondFilledImageUrl },
  { src: cardGameWOCDiamondHollowImageUrl },
  { src: cardGameWOCClubFilledImageUrl },
  { src: cardGameWOCClubHollowImageUrl },
] as const;

const FALLBACK_CARD_COUNT = 48;

interface DynamicBackground2DFallbackProps {
  controlRef?: React.MutableRefObject<RotationControlAPI | null>;
  onReady?: () => void;
}

export const DynamicBackground2DFallback: React.FC<DynamicBackground2DFallbackProps> = ({
  controlRef,
  onReady,
}) => {
  const cards = useMemo(() => {
    const result: { src: string; left: number; top: number; size: number; opacity: number; delay: number }[] = [];
    for (let i = 0; i < FALLBACK_CARD_COUNT; i++) {
      result.push({
        src: FALLBACK_CARDS[i % FALLBACK_CARDS.length].src,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 20 + Math.random() * 50,
        opacity: 0.25 + Math.random() * 0.45,
        delay: Math.random() * 4,
      });
    }
    return result;
  }, []);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    if (controlRef) {
      controlRef.current = {
        rotate: () => {},
        reset: () => {},
      };
    }
    return () => {
      if (controlRef) controlRef.current = null;
    };
  }, [controlRef]);

  return (
    <div className="dynamic-background-fallback" aria-hidden="true">
      <div className="dynamic-background-fallback__cards">
        {cards.map((c, i) => (
          <img
            key={i}
            className="dynamic-background-fallback__card"
            src={c.src}
            alt=""
            loading="eager"
            style={{
              left: `${c.left}%`,
              top: `${c.top}%`,
              width: c.size,
              height: c.size,
              opacity: c.opacity,
              animationDelay: `-${c.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
