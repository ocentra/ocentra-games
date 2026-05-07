import { useId } from 'react';
import {
  CARD_DEFAULTS,
  CARD_DESIGN_HEIGHT,
  CARD_DESIGN_WIDTH,
  ICON_DEFAULTS,
  iconBounds,
  iconTransform,
  isRedSuit,
  radii,
  suitPaths,
  type SuitCardDefaults,
  type SuitCardProps,
  type SuitIconDefaults,
  type SuitIconProps,
} from './SuitArtPrimitives';

export type {
  RingFit,
  RingMode,
  Suit,
  SuitArtKind,
  SuitArtRequest,
  SuitCardDefaults,
  SuitCardProps,
  SuitIconDefaults,
  SuitIconProps,
  SystemMode,
  Variant,
} from './SuitArtPrimitives';

function useSvgId(prefix: string) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return `${prefix}-${id}`;
}

function IconDefs({ id, v }: { id: string; v: SuitIconDefaults }) {
  return (
    <>
      <radialGradient id={`${id}-bg`} cx="50%" cy="46%" r="64%">
        <stop offset="0%" stopColor="#111111" />
        <stop offset="68%" stopColor={v.bgColor} />
        <stop offset="100%" stopColor="#000000" />
      </radialGradient>
      <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff2a2a" />
        <stop offset="46%" stopColor={v.redFill} />
        <stop offset="100%" stopColor="#790000" />
      </linearGradient>
      <linearGradient id={`${id}-black`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#151515" />
        <stop offset="44%" stopColor={v.blackFill} />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.85" />
      </filter>
      <filter id={`${id}-red-glow`} x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#ff0000" floodOpacity="0.9" />
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.75" />
      </filter>
      <filter id={`${id}-gray-glow`} x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#777" floodOpacity="0.45" />
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.85" />
      </filter>
      <clipPath id={`${id}-suit-clip`}>
        <path d={suitPaths[v.suit]} />
      </clipPath>
    </>
  );
}

function RingLayer({ v }: { v: SuitIconDefaults }) {
  if (!v.showRings || v.ringMode === 'none') {
    return null;
  }
  return (
    <g data-layer="rings" fill="none" stroke={v.ringColor} strokeWidth={v.ringStroke} opacity={v.ringOpacity}>
      {radii(v).map((r, i) => <circle key={`${i}-${r}`} cx="128" cy="128" r={r} />)}
    </g>
  );
}

function SuitLayer({ id, v }: { id: string; v: SuitIconDefaults }) {
  if (!v.showIcon) {
    return null;
  }
  const red = isRedSuit(v.suit);
  const hollow = v.variant === 'hollow';
  const transform = iconTransform(v.suit, v.autoCenterIcon, v.iconOffsetX, v.iconOffsetY, v.iconScale);
  const glow = red ? `url(#${id}-red-glow)` : `url(#${id}-gray-glow)`;

  return (
    <g data-layer="main-icon" transform={transform} filter={v.shadowGlow ? `url(#${id}-shadow)` : undefined}>
      {hollow ? (
        <>
          <path d={suitPaths[v.suit]} fill="none" stroke={red ? '#ff1717' : v.outlineColor} strokeWidth={red ? v.outlineWidth * 4.4 : v.outlineWidth * 3.7} strokeLinejoin="round" strokeLinecap="round" opacity={v.hollowOuterOpacity} filter={v.shadowGlow ? glow : undefined} />
          <path d={suitPaths[v.suit]} fill="none" stroke="#050505" strokeWidth={Math.max(2, v.outlineWidth * 2.15)} strokeLinejoin="round" strokeLinecap="round" opacity={v.hollowCutoutOpacity} />
          <path d={suitPaths[v.suit]} fill="none" stroke={red ? '#ff3030' : '#777777'} strokeWidth={Math.max(1, v.outlineWidth * 0.75)} strokeLinejoin="round" strokeLinecap="round" opacity={v.hollowInnerOpacity} />
          {v.showHollowStripes && (
            <g clipPath={`url(#${id}-suit-clip)`} opacity={v.hollowStripeOpacity}>
              {Array.from({ length: 40 }, (_, i) => <rect key={i} x={18 + i * 6} y="28" width="2.4" height="210" fill={red ? '#9b0000' : '#222'} />)}
            </g>
          )}
        </>
      ) : (
        <>
          <path d={suitPaths[v.suit]} fill={red ? `url(#${id}-red)` : `url(#${id}-black)`} stroke={red ? '#5f5f5f' : v.outlineColor} strokeWidth={v.outlineWidth} strokeLinejoin="round" strokeLinecap="round" filter={v.shadowGlow ? glow : undefined} />
          <path d={suitPaths[v.suit]} fill="none" stroke={red ? '#ff4545' : '#1f1f1f'} strokeWidth="1.1" strokeLinejoin="round" opacity="0.85" transform="translate(-1 -1)" />
        </>
      )}
    </g>
  );
}

function BoundsLayer({ v }: { v: SuitIconDefaults }) {
  if (!v.showBounds) {
    return null;
  }
  const b = iconBounds[v.suit];
  return (
    <g data-layer="debug-bounds" pointerEvents="none">
      <rect x="0.5" y="0.5" width="255" height="255" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="6 5" opacity="0.8" />
      <line x1="128" y1="0" x2="128" y2="256" stroke="#00e5ff" strokeWidth="0.75" opacity="0.55" />
      <line x1="0" y1="128" x2="256" y2="128" stroke="#00e5ff" strokeWidth="0.75" opacity="0.55" />
      <rect x={b.x} y={b.y} width={b.width} height={b.height} transform={iconTransform(v.suit, v.autoCenterIcon, v.iconOffsetX, v.iconOffsetY, v.iconScale)} fill="none" stroke="#ffd166" strokeWidth="1" strokeDasharray="4 4" opacity="0.9" />
    </g>
  );
}

function ArtworkGroup({ id, v }: { id: string; v: SuitIconDefaults }) {
  return (
    <>
      {v.showBackground && <rect x="0" y="0" width="256" height="256" fill={`url(#${id}-bg)`} />}
      <RingLayer v={v} />
      <SuitLayer id={id} v={v} />
      <BoundsLayer v={v} />
    </>
  );
}

function withIconDefaults({ className: _className, style: _style, title: _title, ...props }: SuitIconProps): SuitIconDefaults {
  return { ...ICON_DEFAULTS, ...props };
}

function withCardDefaults({ className: _className, style: _style, title: _title, ...props }: SuitCardProps): SuitIconDefaults & SuitCardDefaults {
  return { ...ICON_DEFAULTS, ...CARD_DEFAULTS, ...props };
}

export function SuitIcon(props: SuitIconProps) {
  const v = withIconDefaults(props);
  const id = useSvgId(`ocentra-suit-${v.suit}-${v.variant}`);
  const title = props.title ?? `${v.suit} ${v.variant}`;
  return (
    <svg
      width={v.size}
      height={v.size}
      viewBox="0 0 256 256"
      className={props.className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', ...props.style }}
    >
      <defs><IconDefs id={id} v={v} /></defs>
      <ArtworkGroup id={id} v={v} />
    </svg>
  );
}

export function SuitCard(props: SuitCardProps) {
  const v = withCardDefaults(props);
  const id = useSvgId(`ocentra-card-${v.suit}-${v.variant}`);
  const red = isRedSuit(v.suit);
  const viewW = v.cardWidth;
  const viewH = v.cardHeight;
  const sx = viewW / CARD_DESIGN_WIDTH;
  const sy = viewH / CARD_DESIGN_HEIGHT;
  const uniformScale = Math.min(sx, sy);
  const mainX = v.mainIconX * sx;
  const mainY = v.mainIconY * sy;
  const baseTopX = v.useCornerInsetLayout ? v.cornerInsetX : v.topCornerX;
  const baseTopY = v.useCornerInsetLayout ? v.cornerInsetY : v.topCornerY;
  const baseBottomX = v.useCornerInsetLayout ? CARD_DESIGN_WIDTH - v.cornerInsetX : v.bottomCornerX;
  const baseBottomY = v.useCornerInsetLayout ? CARD_DESIGN_HEIGHT - v.cornerInsetY : v.bottomCornerY;
  const topX = baseTopX * sx;
  const topY = baseTopY * sy;
  const bottomX = baseBottomX * sx;
  const bottomY = baseBottomY * sy;
  const scaledMainIconSize = v.mainIconSize * uniformScale;
  const scaledCornerIconSize = v.cornerIconSize * uniformScale;
  const mainIcon: SuitIconDefaults = { ...v, size: 256, showBackground: false, showBounds: false };
  const cornerIcon: SuitIconDefaults = { ...mainIcon, ringCount: 22, ringOuterPadding: 10, ringScale: 0.78, ringOpacity: 0.18, ringStroke: 0.8, showHollowStripes: false, iconOffsetX: 0, iconOffsetY: 0, iconScale: 1, autoCenterIcon: true };
  const title = props.title ?? `${v.suit} card`;

  const corner = (x: number, y: number, flip = false) => (
    <g transform={`translate(${x} ${y}) ${flip ? 'rotate(180)' : ''} scale(${scaledCornerIconSize / 256}) translate(-128 -128)`}>
      <ArtworkGroup id={id} v={cornerIcon} />
    </g>
  );

  return (
    <svg
      width={viewW}
      height={viewH}
      viewBox={`0 0 ${viewW} ${viewH}`}
      className={props.className}
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', ...props.style }}
    >
      <defs>
        <IconDefs id={id} v={v} />
        <linearGradient id={`${id}-card`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#090909" />
          <stop offset="52%" stopColor={v.cardFill} />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <linearGradient id={`${id}-slash`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={red ? '#003636' : '#2b2b2b'} stopOpacity="0.9" />
          <stop offset="55%" stopColor="#111" stopOpacity="0.2" />
          <stop offset="100%" stopColor={red ? '#031f1f' : '#1c1c1c'} stopOpacity="0.8" />
        </linearGradient>
        <clipPath id={`${id}-card-clip`}>
          <rect x={v.cardPadding} y={v.cardPadding} width={viewW - v.cardPadding * 2} height={viewH - v.cardPadding * 2} rx={v.cardRadius} />
        </clipPath>
      </defs>

      {v.showCardFrame && (
        <>
          <rect x="2" y="2" width={viewW - 4} height={viewH - 4} rx={v.cardRadius + 2} fill="none" stroke={v.cardStroke} strokeWidth={v.cardStrokeWidth} />
          <rect x={v.cardPadding} y={v.cardPadding} width={viewW - v.cardPadding * 2} height={viewH - v.cardPadding * 2} rx={v.cardRadius} fill={v.cardFillTransparent ? 'none' : `url(#${id}-card)`} fillOpacity={v.cardFillTransparent ? 0 : v.cardFillOpacity} stroke={v.cardInnerStroke} strokeWidth={v.cardInnerStrokeWidth} />
        </>
      )}

      <g clipPath={`url(#${id}-card-clip)`}>
        {v.showCardPattern && (
          <g opacity={v.cardPatternOpacity}>
            <g transform={`scale(${sx} ${sy})`}>
              <path d="M20 30 L136 88 L35 210 Z" fill={`url(#${id}-slash)`} />
              <path d="M120 12 L152 12 L152 238 L98 238 Z" fill="#151515" opacity="0.65" />
              {Array.from({ length: 18 }, (_, i) => <line key={`h-${i}`} x1="18" y1={50 + i * 7} x2="142" y2={50 + i * 7} stroke={red ? '#004242' : '#5c5c5c'} strokeWidth="0.75" opacity={i % 3 === 0 ? 0.55 : 0.22} />)}
              {Array.from({ length: 16 }, (_, i) => <line key={`v-${i}`} x1={34 + i * 6} y1="22" x2={34 + i * 6} y2="230" stroke={red ? '#5f0000' : '#6a6a6a'} strokeWidth="0.7" opacity={i % 4 === 0 ? 0.45 : 0.16} />)}
            </g>
          </g>
        )}

        {corner(topX, topY)}
        {corner(bottomX, bottomY, true)}

        <g transform={`translate(${mainX} ${mainY}) scale(${scaledMainIconSize / 256}) translate(-128 -128)`}>
          <ArtworkGroup id={id} v={mainIcon} />
        </g>

        {v.showBounds && (
          <g pointerEvents="none">
            <rect x="0.5" y="0.5" width={viewW - 1} height={viewH - 1} fill="none" stroke="#00e5ff" strokeWidth="0.8" strokeDasharray="5 4" opacity="0.85" />
            <line x1={viewW / 2} y1="0" x2={viewW / 2} y2={viewH} stroke="#00e5ff" strokeWidth="0.6" opacity="0.55" />
            <line x1="0" y1={viewH / 2} x2={viewW} y2={viewH / 2} stroke="#00e5ff" strokeWidth="0.6" opacity="0.55" />
            <circle cx={mainX} cy={mainY} r="3" fill="#ffd166" />
            <circle cx={topX} cy={topY} r="2" fill="#ffd166" />
            <circle cx={bottomX} cy={bottomY} r="2" fill="#ffd166" />
          </g>
        )}
      </g>
    </svg>
  );
}
