import React, { useId } from 'react';
import { type PlainCardFrameSettings, PLAIN_CARD_FRAME_DEFAULTS } from './PlainCardFrame.types';

export interface PlainCardFrameProps extends Partial<PlainCardFrameSettings> {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PlainCardFrame: React.FC<PlainCardFrameProps> = (props) => {
  const settings = { ...PLAIN_CARD_FRAME_DEFAULTS, ...props };
  const generatedId = useId().replace(/:/g, "");
  const uid = props.id || `card_${generatedId}`;

  const W = settings.width;
  const H = settings.height;
  const R = settings.cornerRadius;
  const BW = settings.goldBorderWidth;
  const GBW = settings.greenBorderWidth;
  const M = settings.glowMargin;
  const svgW = W + M * 2;
  const svgH = H + M * 2;
  const innerX = BW;
  const innerY = BW;
  const innerW = W - BW * 2;
  const innerH = H - BW * 2;
  const titleH = settings.showBottomTitle ? settings.bottomTitleHeight : 0;
  const titleLeft = innerX + settings.bottomTitleInsetX;
  const titleY = H - BW - titleH - settings.bottomTitleBottomInset + settings.bottomTitleYOffset;
  const titleW = innerW - settings.bottomTitleInsetX * 2;
  const titleRadius = Math.max(0, Math.min(settings.bottomTitleCornerRadius, titleH / 2, titleW / 2));
  const titleTextClipX = titleLeft + settings.bottomTitleTextPadding;
  const titleTextClipY = titleY + settings.bottomTitleStrokeWidth;
  const titleTextClipW = Math.max(0, titleW - settings.bottomTitleTextPadding * 2);
  const titleTextClipH = Math.max(0, titleH - settings.bottomTitleStrokeWidth * 2);
  const titleTextY = titleY + titleH / 2 + settings.bottomTitleSize * 0.35 + settings.bottomTitleTextYOffset;

  return (
    <div 
      className={props.className} 
      style={{ 
        ...props.style, 
        width: svgW, 
        height: svgH, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        overflow: 'visible'
      }}
    >
      <svg
        width={svgW}
        height={svgH}
        viewBox={`${-M} ${-M} ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Plain card frame SVG"
        style={{ overflow: "visible", background: "transparent", display: "block" }}
      >
        <defs>
          <linearGradient id={`${uid}_gold`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={settings.goldLight} />
            <stop offset="0.55" stopColor={settings.goldMid} />
            <stop offset="1" stopColor={settings.goldDark} />
          </linearGradient>

          <linearGradient id={`${uid}_fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={settings.fillTop} />
            <stop offset="1" stopColor={settings.fillBottom} />
          </linearGradient>

          <linearGradient id={`${uid}_bottomTitleFill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={settings.bottomTitleFillLight} />
            <stop offset="1" stopColor={settings.bottomTitleFillDark} />
          </linearGradient>

          <radialGradient id={`${uid}_softLight`} cx="50%" cy="35%" r="75%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="0.65" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
          </radialGradient>

          <filter id={`${uid}_glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={settings.glowBlur} result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 1  0 1 0 0 0.84  0 0 1 0 0.08  0 0 0 0.95 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`${uid}_innerShadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="0" dy="4" />
            <feGaussianBlur stdDeviation="8" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="#000000" floodOpacity="0.35" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>

          <clipPath id={`${uid}_clip`}>
            <rect x={innerX} y={innerY} width={innerW} height={innerH} rx={Math.max(0, R - 4)} />
          </clipPath>

          <clipPath id={`${uid}_titleTextClip`}>
            <rect x={titleTextClipX} y={titleTextClipY} width={titleTextClipW} height={titleTextClipH} />
          </clipPath>
        </defs>

        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          rx={R + 4}
          fill="none"
          stroke={settings.outerGreen}
          strokeWidth={GBW}
        />

        <rect
          x={BW / 2}
          y={BW / 2}
          width={W - BW}
          height={H - BW}
          rx={R}
          fill="none"
          stroke={`url(#${uid}_gold)`}
          strokeWidth={BW}
          filter={`url(#${uid}_glow)`}
        />

        <g clipPath={`url(#${uid}_clip)`}>
          <rect x={innerX} y={innerY} width={innerW} height={innerH} fill={`url(#${uid}_fill)`} />
          <rect x={innerX} y={innerY} width={innerW} height={innerH} fill={`url(#${uid}_softLight)`} />
        </g>

        {settings.showBottomTitle && (
          <g clipPath={`url(#${uid}_clip)`}>
            <path
              d={`M ${titleLeft} ${titleY + titleH}
                 L ${titleLeft} ${titleY + titleRadius}
                 Q ${titleLeft} ${titleY} ${titleLeft + titleRadius} ${titleY}
                 L ${titleLeft + titleW - titleRadius} ${titleY}
                 Q ${titleLeft + titleW} ${titleY} ${titleLeft + titleW} ${titleY + titleRadius}
                 L ${titleLeft + titleW} ${titleY + titleH}
                 L ${titleLeft} ${titleY + titleH}
                 Z`}
              fill={`url(#${uid}_bottomTitleFill)`}
            />
            <path
              d={`M ${titleLeft} ${titleY + titleH}
                 L ${titleLeft} ${titleY + titleRadius}
                 Q ${titleLeft} ${titleY} ${titleLeft + titleRadius} ${titleY}
                 L ${titleLeft + titleW - titleRadius} ${titleY}
                 Q ${titleLeft + titleW} ${titleY} ${titleLeft + titleW} ${titleY + titleRadius}
                 L ${titleLeft + titleW} ${titleY + titleH}`}
              fill="none"
              stroke={settings.goldDark}
              strokeWidth={settings.bottomTitleStrokeWidth}
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            <g clipPath={`url(#${uid}_titleTextClip)`}>
              <text
                x={titleLeft + titleW / 2}
                y={titleTextY}
                textAnchor="middle"
                dominantBaseline="alphabetic"
                fontFamily="Verdana, Geneva, sans-serif"
                fontWeight="800"
                fontSize={settings.bottomTitleSize}
                fill={settings.bottomTitleText}
                stroke={settings.goldDark}
                strokeWidth="0.7"
                paintOrder="stroke fill"
                letterSpacing="1"
                lengthAdjust="spacingAndGlyphs"
                textLength={titleTextClipW}
              >
                {settings.bottomTitle}
              </text>
            </g>
          </g>
        )}

        {settings.showInnerShadow && (
          <rect
            x={innerX}
            y={innerY}
            width={innerW}
            height={innerH}
            rx={Math.max(0, R - 4)}
            fill="transparent"
            filter={`url(#${uid}_innerShadow)`}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
};

export default PlainCardFrame;
