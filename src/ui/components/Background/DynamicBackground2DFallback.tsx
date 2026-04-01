import React, { useEffect, useMemo } from 'react';
import type { RotationControlAPI } from '@/ui/components/Background/DynamicBackground3D';
import SpadeFilled from '@/Images/BgCards/WithoutCircles/256/SpadeFilled.png';
import SpadeHollow from '@/Images/BgCards/WithoutCircles/256/SpadeHollow.png';
import HeartFilled from '@/Images/BgCards/WithoutCircles/256/HeartFilled.png';
import HeartHollow from '@/Images/BgCards/WithoutCircles/256/HeartHollow.png';
import DiamondFilled from '@/Images/BgCards/WithoutCircles/256/DiamondFilled.png';
import DiamondHollow from '@/Images/BgCards/WithoutCircles/256/DiamondHollow.png';
import ClubFilled from '@/Images/BgCards/WithoutCircles/256/ClubFilled.png';
import ClubHollow from '@/Images/BgCards/WithoutCircles/256/ClubHollow.png';
import './DynamicBackground2DFallback.css';

const FALLBACK_CARDS = [
  { src: SpadeFilled },
  { src: SpadeHollow },
  { src: HeartFilled },
  { src: HeartHollow },
  { src: DiamondFilled },
  { src: DiamondHollow },
  { src: ClubFilled },
  { src: ClubHollow },
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
