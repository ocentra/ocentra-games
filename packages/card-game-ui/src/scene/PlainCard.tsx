import React from 'react';
import PlainCardFrame, { type PlainCardFrameProps } from './PlainCardFrame';

export interface PlainCardProps extends PlainCardFrameProps {
  content?: React.ReactNode;
}

export const PlainCard: React.FC<PlainCardProps> = ({ content, ...frameProps }) => {
  const { width = 260, height = 390, glowMargin = 22 } = frameProps;

  return (
    <div style={{ position: 'relative', width: width + glowMargin * 2, height: height + glowMargin * 2 }}>
      <PlainCardFrame {...frameProps} />
      {content && (
        <div style={{
          position: 'absolute',
          top: glowMargin + (frameProps.goldBorderWidth ?? 7),
          left: glowMargin + (frameProps.goldBorderWidth ?? 7),
          right: glowMargin + (frameProps.goldBorderWidth ?? 7),
          bottom: glowMargin + (frameProps.goldBorderWidth ?? 7) + (frameProps.showBottomTitle ? (frameProps.bottomTitleHeight ?? 42) : 0),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          {content}
        </div>
      )}
    </div>
  );
};

export default PlainCard;
