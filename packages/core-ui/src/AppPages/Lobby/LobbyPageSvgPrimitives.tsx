import {
  clampText,
  maxCharsFor,
  roundedRectPath,
} from './LobbyPageSvgGeometry';
import type { LobbyCanvasRect } from './LobbyPageSvgTypes';

export function PopupBackdrop({
  canvas,
  opacity = 0.42,
  blur = false,
  blurRadius = 7,
  onClose,
}: {
  canvas: LobbyCanvasRect;
  opacity?: number;
  blur?: boolean;
  blurRadius?: number;
  onClose?: () => void;
}) {
  const x = canvas.x - 14;
  const y = canvas.y - 14;
  const w = canvas.w + 28;
  const h = canvas.h + 28;
  return (
    <g>
      {blur ? (
        <foreignObject x={x} y={y} width={w} height={h} pointerEvents="none">
          <div
            style={{
              width: '100%',
              height: '100%',
              backdropFilter: `blur(${blurRadius}px)`,
              WebkitBackdropFilter: `blur(${blurRadius}px)`,
              background: `rgba(0, 0, 0, ${opacity})`,
            }}
          />
        </foreignObject>
      ) : null}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="#000"
        opacity={blur ? 0 : opacity}
        pointerEvents="all"
        onClick={onClose}
      />
    </g>
  );
}

export function Txt({
  x,
  y,
  text,
  maxWidth = 120,
  size = 12,
  weight = 600,
  fill = '#edf7ff',
  opacity = 1,
  anchor = 'start',
  spacing = 0,
  baseline = 'alphabetic',
}: {
  x: number;
  y: number;
  text: unknown;
  maxWidth?: number;
  size?: number;
  weight?: number | string;
  fill?: string;
  opacity?: number;
  anchor?: 'start' | 'middle' | 'end';
  spacing?: number;
  baseline?: 'alphabetic' | 'middle';
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      opacity={opacity}
      textAnchor={anchor}
      letterSpacing={spacing}
      dominantBaseline={baseline}
    >
      {clampText(text, maxCharsFor(maxWidth, size))}
    </text>
  );
}

export function CenterTxt({
  x,
  y,
  w,
  h,
  text,
  size = 12,
  weight = 800,
  fill = '#edf7ff',
  opacity = 1,
  spacing = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  text: unknown;
  size?: number;
  weight?: number | string;
  fill?: string;
  opacity?: number;
  spacing?: number;
}) {
  return (
    <Txt
      x={x + w / 2}
      y={y + h / 2 + 0.5}
      text={text}
      maxWidth={Math.max(8, w - 8)}
      size={size}
      weight={weight}
      fill={fill}
      opacity={opacity}
      anchor="middle"
      baseline="middle"
      spacing={spacing}
    />
  );
}

export function Defs() {
  return (
    <defs>
      <radialGradient id="lobbyPageBg" cx="50%" cy="8%" r="85%">
        <stop offset="0%" stopColor="#172236" />
        <stop offset="34%" stopColor="#07111f" />
        <stop offset="100%" stopColor="#01040b" />
      </radialGradient>
      <linearGradient id="lobbyPanel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0a1727" stopOpacity="0.96" />
        <stop offset="100%" stopColor="#040914" stopOpacity="0.98" />
      </linearGradient>
      <linearGradient id="lobbyPanelWarm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#101724" />
        <stop offset="50%" stopColor="#09101c" />
        <stop offset="100%" stopColor="#050711" />
      </linearGradient>
      <linearGradient id="lobbySide" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0b1b2f" />
        <stop offset="100%" stopColor="#050914" />
      </linearGradient>
      <linearGradient id="lobbyPurple" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6d35ff" />
        <stop offset="100%" stopColor="#2b1b7a" />
      </linearGradient>
      <linearGradient id="lobbyPurpleSoft" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#241b68" />
        <stop offset="100%" stopColor="#091735" />
      </linearGradient>
      <linearGradient id="lobbyCyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#13d8f0" />
        <stop offset="100%" stopColor="#075365" />
      </linearGradient>
      <linearGradient id="lobbyRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#781c25" />
        <stop offset="100%" stopColor="#2a080d" />
      </linearGradient>
      <linearGradient id="lobbyGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffca4b" />
        <stop offset="100%" stopColor="#a65d13" />
      </linearGradient>
      <linearGradient id="lobbySpinnerArrowGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff7b8" />
        <stop offset="38%" stopColor="#ffca4b" />
        <stop offset="100%" stopColor="#a65d13" />
      </linearGradient>
      <radialGradient id="lobbySpinnerCenterGold" cx="42%" cy="28%" r="74%">
        <stop offset="0%" stopColor="#fff1a6" />
        <stop offset="36%" stopColor="#f2c247" />
        <stop offset="70%" stopColor="#c17a18" />
        <stop offset="100%" stopColor="#8d4a0c" />
      </radialGradient>
      <linearGradient id="lobbyMetal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="34%" stopColor="#aeb8c2" />
        <stop offset="52%" stopColor="#566371" />
        <stop offset="76%" stopColor="#e6edf5" />
        <stop offset="100%" stopColor="#6b7480" />
      </linearGradient>
      <radialGradient id="lobbyTopGlow" cx="50%" cy="25%" r="55%">
        <stop offset="0%" stopColor="#9061ff" stopOpacity="0.34" />
        <stop offset="48%" stopColor="#2a1a44" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lobbyLamp" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#ffba61" />
        <stop offset="35%" stopColor="#d36b23" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="lobbySceneFloor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#201421" />
        <stop offset="100%" stopColor="#07060c" />
      </linearGradient>
      <linearGradient id="lobbyImageShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#020611" stopOpacity="0.04" />
        <stop offset="45%" stopColor="#020611" stopOpacity="0.1" />
        <stop offset="78%" stopColor="#020611" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#020611" stopOpacity="0.88" />
      </linearGradient>
      <radialGradient id="lobbyCardHotspot" cx="50%" cy="42%" r="68%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="62%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
      </radialGradient>
      <radialGradient id="lobbyTableGreen" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#278c54" />
        <stop offset="70%" stopColor="#174d34" />
        <stop offset="100%" stopColor="#082217" />
      </radialGradient>
      <radialGradient id="lobbyTablePurple" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#853dff" />
        <stop offset="70%" stopColor="#3a1c7a" />
        <stop offset="100%" stopColor="#110923" />
      </radialGradient>
      <radialGradient id="lobbyTableBrown" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stopColor="#9a6030" />
        <stop offset="70%" stopColor="#4d2817" />
        <stop offset="100%" stopColor="#170a08" />
      </radialGradient>
      <linearGradient id="lobbyAvatar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#bc7b43" />
        <stop offset="100%" stopColor="#2b1224" />
      </linearGradient>
      <linearGradient id="lobbyBotAvatar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c4f4ff" />
        <stop offset="100%" stopColor="#24426d" />
      </linearGradient>
      <linearGradient id="lobbyFrameBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0a2b4d" />
        <stop offset="45%" stopColor="#06172b" />
        <stop offset="100%" stopColor="#020814" />
      </linearGradient>
      <filter id="lobbyFrameGlow" x="-10%" y="-20%" width="120%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#48b4ff" floodOpacity="0.42" />
      </filter>
      <filter id="lobbyPurpleGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#6f45ff" floodOpacity="0.72" />
      </filter>
      <filter id="lobbyCyanGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#14eaff" floodOpacity="0.58" />
      </filter>
      <filter id="lobbyRedGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="3.4" floodColor="#ff4655" floodOpacity="0.72" />
      </filter>
      <filter id="lobbyVegasGoldGlow" x="-160%" y="-160%" width="420%" height="420%">
        <feDropShadow dx="0" dy="0" stdDeviation="4.4" floodColor="#ffca4b" floodOpacity="0.95" />
        <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#ff9f2b" floodOpacity="0.72" />
      </filter>
      <filter id="lobbyVegasCyanGlow" x="-160%" y="-160%" width="420%" height="420%">
        <feDropShadow dx="0" dy="0" stdDeviation="4.4" floodColor="#58f4ff" floodOpacity="0.95" />
        <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#14eaff" floodOpacity="0.72" />
      </filter>
      <filter id="lobbyGoldGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ff9f2b" floodOpacity="0.46" />
      </filter>
      <filter id="lobbySoftShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000" floodOpacity="0.42" />
      </filter>
      <filter id="lobbyPopupBgBlur" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
    </defs>
  );
}

export function Panel({
  x,
  y,
  w,
  h,
  r = 10,
  stroke = '#18334d',
  fill = 'url(#lobbyPanel)',
  children,
  glow = false,
  shine = true,
  strokeWidth = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number | { tl?: number; tr?: number; br?: number; bl?: number };
  stroke?: string;
  fill?: string;
  children?: React.ReactNode;
  glow?: boolean;
  shine?: boolean;
  strokeWidth?: number;
}) {
  const path = roundedRectPath(x, y, w, h, r);
  const shinePath = roundedRectPath(x + 1, y + 1, w - 2, Math.min(32, h * 0.35), typeof r === 'object' ? { tl: r.tl, tr: r.tr, br: 0, bl: 0 } : r);
  return (
    <g filter={glow ? 'url(#lobbyPurpleGlow)' : undefined}>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {shine ? <path d={shinePath} fill="#ffffff" opacity="0.035" /> : null}
      {children}
    </g>
  );
}

export function Btn({
  x,
  y,
  w,
  h,
  label,
  active = false,
  tone = 'purple',
  size = 12,
  rx = 7,
  onClick,
  disabled = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  active?: boolean;
  tone?: 'purple' | 'cyan' | 'red' | 'gold';
  size?: number;
  rx?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isDisabled = disabled || !onClick;
  const fill = active ? (tone === 'cyan' ? 'url(#lobbyCyan)' : tone === 'red' ? 'url(#lobbyRed)' : tone === 'gold' ? 'url(#lobbyGold)' : 'url(#lobbyPurple)') : '#071426';
  const stroke = active ? (tone === 'cyan' ? '#20e6ff' : tone === 'red' ? '#ff4655' : tone === 'gold' ? '#ffca4b' : '#6d35ff') : '#263d58';
  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (isDisabled) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onClick?.();
  };
  return (
    <g
      className={`${isDisabled ? '' : 'lobby-ui-hit'} ${active ? 'is-active' : ''}`}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      opacity={isDisabled ? 0.55 : 1}
      filter={active ? (tone === 'cyan' ? 'url(#lobbyCyanGlow)' : tone === 'gold' ? 'url(#lobbyGoldGlow)' : 'url(#lobbyPurpleGlow)') : undefined}
      role="button"
      aria-label={label}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
    >
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={Math.max(2, h * 0.3)} rx={Math.max(1, rx - 1)} fill="#fff" opacity="0.08" />
      <CenterTxt x={x} y={y} w={w} h={h} text={label} size={Math.min(size, Math.max(8, h * 0.38))} weight="850" />
    </g>
  );
}

export function Icon({ x, y, type, color = '#ffae36' }: { x: number; y: number; type: string; color?: string }) {
  if (type === 'bolt') return <path d={`M${x + 13},${y} L${x},${y + 28} H${x + 13} L${x + 7},${y + 48} L${x + 30},${y + 18} H${x + 17} Z`} fill="#80e6ff" />;
  if (type === 'lock') return <g stroke="#79dbff" strokeWidth="2" fill="none"><rect x={x} y={y + 13} width="25" height="19" rx="4" fill="#08243a" /><path d={`M${x + 6},${y + 13} V${y + 8} Q${x + 12.5},${y} ${x + 19},${y + 8} V${y + 13}`} /></g>;
  if (type === 'bot') return <g stroke="#73dcff" strokeWidth="2" fill="none"><rect x={x} y={y + 7} width="28" height="24" rx="7" fill="#0b334b" /><circle cx={x + 9} cy={y + 19} r="2" fill="#73dcff" /><circle cx={x + 19} cy={y + 19} r="2" fill="#73dcff" /><line x1={x + 14} y1={y} x2={x + 14} y2={y + 7} /></g>;
  if (type === 'people') return <g fill={color}><circle cx={x + 9} cy={y + 9} r="5" /><circle cx={x + 19} cy={y + 9} r="5" opacity="0.78" /><path d={`M${x + 1},${y + 25} Q${x + 9},${y + 14} ${x + 17},${y + 25}Z`} /><path d={`M${x + 12},${y + 25} Q${x + 20},${y + 14} ${x + 28},${y + 25}Z`} opacity="0.78" /></g>;
  if (type === 'trophy') return <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={`M${x + 8},${y + 4} H${x + 22} V${y + 13} Q${x + 22},${y + 20} ${x + 15},${y + 20} Q${x + 8},${y + 20} ${x + 8},${y + 13}Z`} fill={color} opacity="0.22" /><path d={`M${x + 8},${y + 7} H${x + 3} Q${x + 3},${y + 16} ${x + 9},${y + 16} M${x + 22},${y + 7} H${x + 27} Q${x + 27},${y + 16} ${x + 21},${y + 16} M${x + 15},${y + 20} V${y + 26} M${x + 9},${y + 27} H${x + 21}`} /></g>;
  if (type === 'bars') return <g fill={color}><rect x={x + 4} y={y + 17} width="5" height="10" rx="1" /><rect x={x + 12} y={y + 10} width="5" height="17" rx="1" /><rect x={x + 20} y={y + 5} width="5" height="22" rx="1" /></g>;
  if (type === 'gift') return <g fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"><rect x={x + 5} y={y + 12} width="20" height="15" rx="2" fill={color} opacity="0.18" /><rect x={x + 3} y={y + 8} width="24" height="7" rx="2" /><path d={`M${x + 15},${y + 8} V${y + 27} M${x + 15},${y + 8} C${x + 8},${y + 2} ${x + 8},${y + 10} ${x + 15},${y + 8} C${x + 22},${y + 2} ${x + 22},${y + 10} ${x + 15},${y + 8}`} /></g>;
  if (type === 'cart') return <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={`M${x + 3},${y + 5} H${x + 7} L${x + 10},${y + 21} H${x + 24} L${x + 27},${y + 10} H${x + 8}`} /><circle cx={x + 12} cy={y + 26} r="2" fill={color} /><circle cx={x + 23} cy={y + 26} r="2" fill={color} /></g>;
  if (type === 'user') return <g fill="none" stroke={color} strokeWidth="2"><circle cx={x + 15} cy={y + 9} r="6" fill={color} opacity="0.2" /><path d={`M${x + 4},${y + 27} Q${x + 15},${y + 16} ${x + 26},${y + 27}`} fill={color} opacity="0.2" /></g>;
  if (type === 'gear') return <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3 L17.2 6.4 L21.1 5.9 L22.4 9.6 L19.6 12.2 C19.8 13.1 19.8 13.9 19.6 14.8 L22.4 17.4 L21.1 21.1 L17.2 20.6 L15 24 L11.8 20.6 L7.9 21.1 L6.6 17.4 L9.4 14.8 C9.2 13.9 9.2 13.1 9.4 12.2 L6.6 9.6 L7.9 5.9 L11.8 6.4 Z" fill={color} opacity="0.16" /><circle cx="15" cy="13.5" r="4.2" /></g>;
  if (type === 'createTable') return <g filter="url(#lobbyGoldGlow)"><ellipse cx={x + 15} cy={y + 18} rx="20" ry="9" fill="#10233a" stroke="#ffe16a" strokeWidth="1.3" /><ellipse cx={x + 15} cy={y + 18} rx="13" ry="5" fill="#143f31" stroke="#4effb1" strokeWidth="0.8" opacity="0.9" /><path d={`M${x + 15},${y + 1} V${y + 11} M${x + 10},${y + 6} H${x + 20}`} stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" /></g>;
  return <circle cx={x + 12} cy={y + 12} r="8" fill={color} />;
}

export function Avatar({ cx, cy, r = 18, bot = false, open = false, ring = '#f3a23e', imageUrl = null }: { cx: number; cy: number; r?: number; bot?: boolean; open?: boolean; ring?: string; imageUrl?: string | null }) {
  if (open) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="#07111d" stroke="#728096" strokeWidth="1.4" strokeDasharray="7 5" />
        <g stroke="#c7d3e0" strokeWidth="1.6" strokeLinecap="round"><line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} /><line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} /></g>
      </g>
    );
  }
  if (imageUrl) {
    const clipId = `lobbyAvatarImageClip-${Math.round(cx)}-${Math.round(cy)}-${Math.round(r)}`;
    return (
      <g>
        <clipPath id={clipId}><circle cx={cx} cy={cy} r={r - 1} /></clipPath>
        <circle cx={cx} cy={cy} r={r} fill="#071321" stroke={ring} strokeWidth="1.3" />
        <image href={imageUrl} x={cx - r} y={cy - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={ring} strokeWidth="1.3" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={bot ? 'url(#lobbyBotAvatar)' : 'url(#lobbyAvatar)'} stroke={ring} strokeWidth="1.3" />
      {bot ? (
        <g stroke="#e8fbff" strokeWidth="1.2" fill="none"><rect x={cx - 9} y={cy - 7} width="18" height="16" rx="5" /><circle cx={cx - 4} cy={cy} r="1.5" fill="#e8fbff" /><circle cx={cx + 4} cy={cy} r="1.5" fill="#e8fbff" /></g>
      ) : (
        <g stroke="#ffe2a9" strokeWidth="1.1" fill="none"><circle cx={cx} cy={cy - 5} r="6" /><path d={`M${cx - 10},${cy + 12} Q${cx},${cy + 2} ${cx + 10},${cy + 12}`} /></g>
      )}
    </g>
  );
}

export function SideHandle({ x, y, side = 'left', onClick }: { x: number; y: number; side?: 'left' | 'right'; onClick?: () => void }) {
  const isLeft = side === 'left';
  const bodyPath = isLeft
    ? roundedRectPath(x, y, 24, 176, { tl: 10, tr: 0, br: 0, bl: 10 })
    : roundedRectPath(x, y, 24, 176, { tl: 0, tr: 10, br: 10, bl: 0 });
  return (
    <g className="lobby-side-handle lobby-ui-hit" onClick={onClick} filter="url(#lobbyFrameGlow)">
      <path d={bodyPath} fill="url(#lobbyFrameBlue)" stroke="#54b7ff" strokeWidth="1" />
      <path d={isLeft ? `M${x + 9},${y + 88} L${x + 15},${y + 82} V${y + 94} Z` : `M${x + 15},${y + 88} L${x + 9},${y + 82} V${y + 94} Z`} fill="#a7e9ff" />
      <path d={bodyPath} fill="none" stroke="#7d49ff" strokeWidth="0.8" opacity="0.36" />
    </g>
  );
}

export function PopupFrame({ x, y, w, h, title, subtitle, onClose }: { x: number; y: number; w: number; h: number; title: string; subtitle: string; onClose: () => void }) {
  return (
    <g filter="url(#lobbyFrameGlow)">
      <path d={roundedRectPath(x, y, w, h, 12)} fill="url(#lobbyFrameBlue)" stroke="#58bfff" strokeWidth="1.2" />
      <path d={roundedRectPath(x + 5, y + 5, w - 10, h - 10, 9)} fill="#050d19" stroke="#173653" strokeWidth="1" opacity="0.96" />
      <Txt x={x + 28} y={y + 38} text={title} maxWidth={420} size={22} weight="950" />
      <Txt x={x + 28} y={y + 62} text={subtitle} maxWidth={620} size={12} opacity={0.74} />
      <Btn x={x + w - 98} y={y + 22} w={72} h={30} label="CLOSE" size={10} onClick={onClose} />
      <line x1={x + 22} y1={y + 82} x2={x + w - 22} y2={y + 82} stroke="#4fb9e8" opacity="0.44" />
    </g>
  );
}
