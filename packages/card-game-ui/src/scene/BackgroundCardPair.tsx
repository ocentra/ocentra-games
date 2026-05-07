import React from 'react';
import { SuitCard, SuitIcon } from '@ocentra/core-ui/Common/SuitArt/SuitArt';
import type { Suit } from '@ocentra/core-ui/Common/SuitArt/SuitArtPrimitives';

interface BackgroundCardPairProps {
  id: string;
  label: string;
  suit: Suit;
  artKind: 'card' | 'icon';
  left: string;
  top: string;
  width: string;
  height: string;
  frosted?: boolean;
  gap: string;
  floatX: string;
  floatY: string;
  floatDuration: string;
  floatDelay: string;
  floatRotate: string;
  floatScale: number;
}

const BackgroundCardPair: React.FC<BackgroundCardPairProps> = ({
  id,
  label,
  suit,
  artKind,
  left,
  top,
  width,
  height,
  frosted = false,
  gap,
  floatX,
  floatY,
  floatDuration,
  floatDelay,
  floatRotate,
  floatScale,
}) => {
  const pairStyle: React.CSSProperties = {
    left,
    top,
    width,
    height,
    ['--pair-card-gap' as string]: gap,
    ['--pair-float-x' as string]: floatX,
    ['--pair-float-y' as string]: floatY,
    ['--pair-float-duration' as string]: floatDuration,
    ['--pair-float-delay' as string]: floatDelay,
    ['--pair-float-rotate' as string]: floatRotate,
    ['--pair-float-scale' as string]: floatScale,
  };

  return (
    <div
      className={`game-background__pair${frosted ? ' game-background__pair--frosted' : ''}`}
      data-pair={id}
      aria-hidden="true"
      title={label}
      style={pairStyle}
    >
      {frosted ? <div className="game-background__pair-glass" aria-hidden="true" /> : null}
      <div className="game-background__pair-content">
        <BackgroundSuitArt
          className="game-background__pair-card game-background__pair-card--filled"
          suit={suit}
          artKind={artKind}
          variant="filled"
        />
        <BackgroundSuitArt
          className="game-background__pair-card game-background__pair-card--hollow"
          suit={suit}
          artKind={artKind}
          variant="hollow"
        />
      </div>
    </div>
  );
};

const BackgroundSuitArt: React.FC<{
  className: string;
  suit: Suit;
  artKind: 'card' | 'icon';
  variant: 'filled' | 'hollow';
}> = ({ className, suit, artKind, variant }) => {
  if (artKind === 'card') {
    return (
      <SuitCard
        className={className}
        suit={suit}
        variant={variant}
        cardWidth={160}
        cardHeight={250}
        cardFillOpacity={0.16}
        cardStrokeWidth={2.2}
        cardInnerStrokeWidth={0.9}
        showRings
        ringMode="circle"
        ringFit="viewport"
        ringOpacity={0.14}
        ringStroke={0.6}
        title=""
      />
    );
  }

  return (
    <SuitIcon
      className={className}
      suit={suit}
      variant={variant}
      size={256}
      showRings
      ringMode="circle"
      ringFit="viewport"
      ringOpacity={0.2}
      ringStroke={0.7}
      title=""
    />
  );
};

export default BackgroundCardPair;
