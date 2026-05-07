import React, { useLayoutEffect, useRef } from 'react';
import './GameBackground.css';
import { cardGameBgImageUrl as CardBg } from '@ocentra/app-assets/cardgame';
import BackgroundCardPair from './BackgroundCardPair';

interface GameBackgroundProps {
  floatScale?: number;
  position?: 'fixed' | 'absolute';
}

const BACKGROUND_TILE_IMAGE = CardBg;
const BACKGROUND_TILE_SIZE = 'clamp(15rem, 17vw, 24rem)';

const BACKGROUND_OVERLAY_LAYERS = [
  'radial-gradient(circle at 50% 50%, hsla(125, 95%, 48%, 0.44) 0%, hsla(0, 0%, 0%, 0) 66%)',
  'radial-gradient(circle at 80% 20%, hsla(180, 90%, 38%, 0.30) 0%, hsla(0, 0%, 0%, 0) 52%)',
  'radial-gradient(circle at 20% 80%, hsla(192, 73%, 32%, 0.70) 0%, hsla(0, 0%, 0%, 0) 54%)',
  'radial-gradient(circle at 50% 50%, hsla(0, 0%, 0%, 0) 56%, hsla(0, 0%, 0%, 0.58) 100%)',
].join(', ');

const PAIRS = [
  {
    id: 'a-club-with-card',
    label: 'A club with card',
    suit: 'club',
    artKind: 'card',
    left: '17%',
    top: '21%',
    width: '13%',
    height: '20%',
    frosted: true,
    gap: '0.12rem',
    floatX: '4px',
    floatY: '-8px',
    floatDuration: '7.2s',
    floatDelay: '-1.2s',
    floatRotate: '0.45deg',
  },
  {
    id: 'b-club-without-card',
    label: 'B club without card',
    suit: 'club',
    artKind: 'icon',
    left: '50%',
    top: '18%',
    width: '11%',
    height: '17%',
    gap: '0.16rem',
    floatX: '-3px',
    floatY: '-6px',
    floatDuration: '8.1s',
    floatDelay: '-2.1s',
    floatRotate: '-0.35deg',
  },
  {
    id: 'c-diamond-with-card',
    label: 'C diamond with card',
    suit: 'diamond',
    artKind: 'card',
    left: '83%',
    top: '21%',
    width: '13%',
    height: '20%',
    frosted: true,
    gap: '0.12rem',
    floatX: '-4px',
    floatY: '7px',
    floatDuration: '7.6s',
    floatDelay: '-0.7s',
    floatRotate: '-0.4deg',
  },
  {
    id: 'd-diamond-without-card',
    label: 'D diamond without card',
    suit: 'diamond',
    artKind: 'icon',
    left: '6%',
    top: '53%',
    width: '12%',
    height: '17%',
    gap: '0.16rem',
    floatX: '3px',
    floatY: '-6px',
    floatDuration: '8.4s',
    floatDelay: '-1.5s',
    floatRotate: '0.35deg',
  },
  {
    id: 'e-spade-without-card',
    label: 'E spade without card',
    suit: 'spade',
    artKind: 'icon',
    left: '94%',
    top: '53%',
    width: '12%',
    height: '17%',
    gap: '0.16rem',
    floatX: '-3px',
    floatY: '6px',
    floatDuration: '8.2s',
    floatDelay: '-2.7s',
    floatRotate: '-0.35deg',
  },
  {
    id: 'f-heart-with-card',
    label: 'F heart with card',
    suit: 'heart',
    artKind: 'card',
    left: '17%',
    top: '80%',
    width: '13%',
    height: '20%',
    frosted: true,
    gap: '0.12rem',
    floatX: '-4px',
    floatY: '8px',
    floatDuration: '7.4s',
    floatDelay: '-1.8s',
    floatRotate: '0.45deg',
  },
  {
    id: 'g-heart-without-card',
    label: 'G heart without card',
    suit: 'heart',
    artKind: 'icon',
    left: '50%',
    top: '78%',
    width: '11%',
    height: '17%',
    gap: '0.16rem',
    floatX: '3px',
    floatY: '6px',
    floatDuration: '8.3s',
    floatDelay: '-0.4s',
    floatRotate: '-0.32deg',
  },
  {
    id: 'h-spade-with-card',
    label: 'H spade with card',
    suit: 'spade',
    artKind: 'card',
    left: '83%',
    top: '78%',
    width: '13%',
    height: '20%',
    frosted: true,
    gap: '0.12rem',
    floatX: '4px',
    floatY: '-7px',
    floatDuration: '7.5s',
    floatDelay: '-2.4s',
    floatRotate: '0.45deg',
  },
] as const;

const GameBackground: React.FC<GameBackgroundProps> = ({
  floatScale = 1,
  position = 'fixed',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    el.style.setProperty('--bg-image', `url(${BACKGROUND_TILE_IMAGE})`);
    el.style.setProperty('--bg-tile-size', BACKGROUND_TILE_SIZE);
    el.style.setProperty('--bg-opacity', '0.20');
    el.style.setProperty('--bg-blend', 'screen');
    el.style.setProperty('--overlay-blend', 'screen');
    el.style.setProperty('--overlay-opacity', '0.95');
    el.style.setProperty('--overlay-background', BACKGROUND_OVERLAY_LAYERS);

    return () => {
      el.style.removeProperty('--bg-image');
      el.style.removeProperty('--bg-tile-size');
      el.style.removeProperty('--bg-opacity');
      el.style.removeProperty('--bg-blend');
      el.style.removeProperty('--overlay-blend');
      el.style.removeProperty('--overlay-opacity');
      el.style.removeProperty('--overlay-background');
    };
  }, []);

  return (
    <div
      className={position === 'absolute' ? 'game-background game-background--absolute' : 'game-background'}
      ref={ref}
    >
      <div className="game-background__texture" />
      <div className="game-background__pairs">
        {PAIRS.map((pair) => (
          <BackgroundCardPair
            key={pair.id}
            {...pair}
            floatScale={floatScale}
          />
        ))}
      </div>
      <div className="game-background__overlay" />
    </div>
  );
};

export default GameBackground;
