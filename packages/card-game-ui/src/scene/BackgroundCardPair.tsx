import React from 'react';

interface BackgroundCardPairProps {
  id: string;
  label: string;
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
  filledImage: string;
  hollowImage: string;
}

const BackgroundCardPair: React.FC<BackgroundCardPairProps> = ({
  id,
  label,
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
  filledImage,
  hollowImage,
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
        <img
          className="game-background__pair-card game-background__pair-card--filled"
          src={filledImage}
          alt=""
        />
        <img
          className="game-background__pair-card game-background__pair-card--hollow"
          src={hollowImage}
          alt=""
        />
      </div>
    </div>
  );
};

export default BackgroundCardPair;
