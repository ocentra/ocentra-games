import React, { useEffect } from 'react';
import type { RotationControlAPI } from './DynamicBackground3D';
import { SuitIcon } from '../Common/SuitArt/SuitArt';
import type { Suit, Variant } from '../Common/SuitArt/SuitArtPrimitives';
import './DynamicBackground2DFallback.css';

const FALLBACK_CARDS: ReadonlyArray<{ suit: Suit; variant: Variant }> = [
  { suit: 'spade', variant: 'filled' },
  { suit: 'spade', variant: 'hollow' },
  { suit: 'heart', variant: 'filled' },
  { suit: 'heart', variant: 'hollow' },
  { suit: 'diamond', variant: 'filled' },
  { suit: 'diamond', variant: 'hollow' },
  { suit: 'club', variant: 'filled' },
  { suit: 'club', variant: 'hollow' },
] as const;

const FALLBACK_CARD_COUNT = 48;

const seededRatio = (index: number, salt: number): number => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const fallbackCardLayout = Array.from({ length: FALLBACK_CARD_COUNT }, (_, index) => ({
  ...FALLBACK_CARDS[index % FALLBACK_CARDS.length],
  left: seededRatio(index, 1) * 100,
  top: seededRatio(index, 2) * 100,
  size: 20 + seededRatio(index, 3) * 50,
  opacity: 0.25 + seededRatio(index, 4) * 0.45,
  delay: seededRatio(index, 5) * 4,
}));

interface DynamicBackground2DFallbackProps {
  controlRef?: React.MutableRefObject<RotationControlAPI | null>;
  onReady?: () => void;
}

export const DynamicBackground2DFallback: React.FC<DynamicBackground2DFallbackProps> = ({
  controlRef,
  onReady,
}) => {
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
        {fallbackCardLayout.map((c, i) => (
          <SuitIcon
            key={i}
            className="dynamic-background-fallback__card"
            suit={c.suit}
            variant={c.variant}
            size={Math.round(c.size)}
            showRings={false}
            shadowGlow
            title=""
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
