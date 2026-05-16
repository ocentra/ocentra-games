import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import type { ShopIcon, ShopTone } from './ShopPageSvgData';
import { toneColor, topRoundedRectPath } from './ShopPageSvgGeometry';

export function Txt({
  x,
  y,
  children,
  size = 12,
  weight = 700,
  fill,
  anchor = 'start',
  opacity = 1,
  cfg,
}: {
  x: string | number;
  y: string | number;
  children: ReactNode;
  size?: string | number;
  weight?: string | number;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  cfg: ShopPageSvgControls;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill ?? cfg.colors.bodyText}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      opacity={opacity}
      letterSpacing="0"
      dominantBaseline="middle"
      fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
    >
      {children}
    </text>
  );
}

export function WrappedText({
  x,
  y,
  width,
  lines,
  size = 9.4,
  lineHeight = 14,
  fill,
  weight = 550,
  maxLines = 8,
  anchor = 'start',
  cfg,
}: {
  x: number;
  y: number;
  width: number;
  lines: string[] | string;
  size?: number;
  lineHeight?: number;
  fill?: string;
  weight?: number;
  maxLines?: number;
  anchor?: 'start' | 'middle' | 'end';
  cfg: ShopPageSvgControls;
}) {
  const maxChars = Math.max(8, Math.floor(width / (size * 0.55)));
  const wrapped: string[] = [];
  (Array.isArray(lines) ? lines : [lines]).forEach((rawLine) => {
    const text = String(rawLine ?? '');
    let current = '';
    text.split(' ').filter(Boolean).forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) wrapped.push(current);
  });
  return (
    <g>
      {wrapped.slice(0, maxLines).map((line, index) => (
        <Txt
          key={`${line}-${index}`}
          x={x}
          y={y + index * lineHeight}
          fill={fill ?? cfg.colors.mutedText}
          size={size}
          weight={weight}
          anchor={anchor}
          cfg={cfg}
        >
          {line}
        </Txt>
      ))}
    </g>
  );
}

export function Panel({
  x,
  y,
  w,
  h,
  r,
  children,
  fill,
  stroke,
  strokeWidth,
  strokeOpacity,
  glow = true,
  glowStrokeWidth,
  glowOpacity,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  children?: ReactNode;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  glow?: boolean;
  glowStrokeWidth?: number;
  glowOpacity?: number;
  cfg: ShopPageSvgControls;
}) {
  const radius = r ?? cfg.primitives.panelRadius;
  const edgeStroke = stroke ?? cfg.colors.edgeStroke;
  return (
    <g>
      {glow ? (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={radius}
          fill="none"
          stroke={edgeStroke}
          strokeWidth={glowStrokeWidth ?? cfg.primitives.panelGlowStrokeWidth}
          opacity={glowOpacity ?? cfg.primitives.panelGlowOpacity}
          filter="url(#shopSoftGlow)"
        />
      ) : null}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={radius}
        fill={fill ?? cfg.colors.panelFill}
        stroke={edgeStroke}
        strokeWidth={strokeWidth ?? cfg.primitives.panelStrokeWidth}
        strokeOpacity={strokeOpacity ?? 1}
      />
      {children}
    </g>
  );
}

export function HeaderBar({
  x,
  y,
  w,
  h,
  children,
  fill,
  stroke,
  cfg,
  r,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children?: ReactNode;
  fill?: string;
  stroke?: string;
  cfg: ShopPageSvgControls;
  r?: number;
}) {
  const radius = r ?? cfg.primitives.headerBarRadius;
  return (
    <g>
      <path d={topRoundedRectPath(x, y, w, h, radius)} fill={fill ?? cfg.colors.headerFill} />
      <line
        x1={x + cfg.primitives.headerLineInset}
        y1={y + h}
        x2={x + w - cfg.primitives.headerLineInset}
        y2={y + h}
        stroke={stroke ?? cfg.colors.edgeStroke}
        strokeWidth={cfg.primitives.panelStrokeWidth}
        strokeOpacity="0.72"
      />
      {children}
    </g>
  );
}

export function SvgButton({
  x,
  y,
  w,
  h,
  label,
  active = false,
  small = false,
  arrow = true,
  onClick,
  disabled = false,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  active?: boolean;
  small?: boolean;
  arrow?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  cfg: ShopPageSvgControls;
}) {
  const [hovered, setHovered] = useState(false);
  const arrowW = arrow ? Math.min(26, Math.max(18, h + 4)) : 0;
  const labelW = w - arrowW;
  const stroke = active || hovered ? cfg.colors.activeBlue : cfg.colors.buttonIdleStroke;
  const fill = active ? 'url(#shopActiveBlue)' : hovered ? cfg.colors.buttonHoverFill : cfg.colors.buttonIdleFill;
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };
  return (
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={disabled ? undefined : (event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`shop-page-svg-clickable ${disabled ? 'is-disabled' : ''}`}
    >
      {hovered && !disabled ? (
        <rect
          x={x - cfg.primitives.buttonHoverPad}
          y={y - cfg.primitives.buttonHoverPad}
          width={w + cfg.primitives.buttonHoverPad * 2}
          height={h + cfg.primitives.buttonHoverPad * 2}
          rx="0"
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          opacity="0.28"
          filter="url(#shopSoftGlow)"
        />
      ) : null}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="0"
        fill={disabled ? cfg.colors.buttonDisabledFill : fill}
        stroke={stroke}
        strokeWidth={cfg.primitives.buttonStrokeWidth}
        opacity={disabled ? 0.48 : 1}
      />
      <Txt
        x={x + labelW / 2}
        y={y + h / 2 + 1}
        anchor="middle"
        size={small ? cfg.primitives.buttonSmallTextSize : cfg.primitives.buttonNormalTextSize}
        weight={850}
        cfg={cfg}
      >
        {label}
      </Txt>
      {arrow ? (
        <>
          <line x1={x + labelW} y1={y + 1} x2={x + labelW} y2={y + h - 1} stroke={stroke} />
          <path d={`M ${x + w - arrowW + 9} ${y + h * 0.28} L ${x + w - 7} ${y + h * 0.5} L ${x + w - arrowW + 9} ${y + h * 0.72} Z`} fill={hovered ? cfg.colors.buttonArrowHoverFill : cfg.colors.buttonArrowFill} />
        </>
      ) : null}
    </g>
  );
}

export function ProductImage({
  x,
  y,
  w,
  h,
  imageUrl,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  cfg: ShopPageSvgControls;
}) {
  if (!imageUrl) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={cfg.colors.productImageMissingFill} stroke={cfg.colors.productImageMissingStroke} strokeDasharray="5 5" />
        <line x1={x + 8} y1={y + 8} x2={x + w - 8} y2={y + h - 8} stroke={cfg.colors.productImageMissingStroke} strokeOpacity=".72" />
        <line x1={x + w - 8} y1={y + 8} x2={x + 8} y2={y + h - 8} stroke={cfg.colors.productImageMissingStroke} strokeOpacity=".72" />
        <Txt x={x + w / 2} y={y + h / 2} anchor="middle" size={Math.min(10, Math.max(7, w / 18))} weight="900" fill={cfg.colors.missingText} cfg={cfg}>ASSET NEEDED</Txt>
      </g>
    );
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={cfg.colors.productImageFill} />
      <image href={imageUrl} x={x} y={y} width={w} height={h} preserveAspectRatio={cfg.svgDefaults.preserveAspectRatio} opacity={cfg.primitives.imageOpacity} />
      <rect x={x} y={y} width={w} height={h} fill="url(#shopImageShade)" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={cfg.colors.edgeStroke} strokeOpacity="0.14" strokeWidth="1" />
    </g>
  );
}

type IconShapeDefinition =
  | { kind: 'path'; d: string }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number; transform?: string };

const ICON_LIBRARY: Record<ShopIcon, IconShapeDefinition[]> = {
  coins: [
    { kind: 'ellipse', cx: 12, cy: 8, rx: 10, ry: 4 },
    { kind: 'path', d: 'M2 8v15c0 2.5 4.5 4 10 4s10-1.5 10-4V8' },
    { kind: 'path', d: 'M2 16c0 2.5 4.5 4 10 4s10-1.5 10-4' },
    { kind: 'ellipse', cx: 23, cy: 17, rx: 9, ry: 4 },
    { kind: 'path', d: 'M14 17v10c0 2.4 4 4 9 4s9-1.6 9-4V17' },
  ],
  crown: [{ kind: 'path', d: 'M3 25h28l-3-17-8 8-6-12-6 12-8-8zM6 30h22' }],
  chest: [
    { kind: 'path', d: 'M4 14h26v17H4z' },
    { kind: 'path', d: 'M7 14c0-6 5-10 10-10s10 4 10 10' },
    { kind: 'path', d: 'M4 20h26M15 20h4v6h-4z' },
  ],
  cards: [
    { kind: 'rect', x: 5, y: 7, width: 15, height: 22, rx: 2, transform: 'rotate(-9 12 18)' },
    { kind: 'rect', x: 16, y: 5, width: 15, height: 22, rx: 2, transform: 'rotate(10 23 16)' },
    { kind: 'path', d: 'M13 15l3 3 3-3' },
  ],
  trophy: [
    { kind: 'path', d: 'M10 5h16v8c0 8-4 13-8 13s-8-5-8-13z' },
    { kind: 'path', d: 'M10 9H4c0 6 2 10 7 11M26 9h6c0 6-2 10-7 11M18 26v5M12 31h12' },
  ],
  crate: [
    { kind: 'path', d: 'M5 11l12-7 12 7v18H5z' },
    { kind: 'path', d: 'M5 11l12 7 12-7M17 18v13' },
  ],
  shield: [{ kind: 'path', d: 'M17 3l12 5v9c0 8-5 13-12 16C10 30 5 25 5 17V8z' }],
  link: [
    { kind: 'path', d: 'M13 19l8-8a6 6 0 018 8l-3 3' },
    { kind: 'path', d: 'M21 15l-8 8a6 6 0 01-8-8l3-3' },
  ],
  lock: [
    { kind: 'rect', x: 7, y: 15, width: 20, height: 15, rx: 3 },
    { kind: 'path', d: 'M11 15V10a6 6 0 0112 0v5' },
  ],
  cart: [
    { kind: 'path', d: 'M4 8h5l4 18h15l4-12H12' },
    { kind: 'circle', cx: 16, cy: 30, r: 2 },
    { kind: 'circle', cx: 27, cy: 30, r: 2 },
  ],
};

function IconShape({ shape }: { shape: IconShapeDefinition }) {
  if (shape.kind === 'path') return <path d={shape.d} />;
  if (shape.kind === 'ellipse') return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
  if (shape.kind === 'circle') return <circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
  return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} transform={shape.transform} />;
}

export function MiniIcon({
  type,
  x,
  y,
  size,
  tone,
  cfg,
}: {
  type: ShopIcon;
  x: number;
  y: number;
  size?: number;
  tone?: ShopTone;
  cfg: ShopPageSvgControls;
}) {
  const resolvedSize = size ?? cfg.iconTokens.defaultSize;
  const resolvedTone = tone ?? cfg.iconTokens.defaultTone as ShopTone;
  const color = toneColor(resolvedTone, cfg);
  const scale = resolvedSize / cfg.iconTokens.baseSize;
  const shapes = ICON_LIBRARY[type] ?? ICON_LIBRARY.shield;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth={cfg.iconTokens.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {shapes.map((shape, index) => <IconShape key={`${type}-${index}`} shape={shape} />)}
    </g>
  );
}

export function InfoRow({
  x,
  y,
  w,
  label,
  value,
  stroke,
  dotFill,
  actionLabel,
  onAction,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  value?: string | number;
  stroke?: string;
  dotFill?: string;
  actionLabel?: string;
  onAction?: () => void;
  cfg: ShopPageSvgControls;
}) {
  const h = 26;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="0" fill={cfg.colors.rowFill} stroke={stroke ?? cfg.colors.rowStroke} />
      {dotFill ? <circle cx={x + 14} cy={y + h / 2} r="4" fill={dotFill} /> : null}
      <Txt x={x + (dotFill ? 28 : 14)} y={y + h / 2} fill={cfg.colors.tileSubtitleText} size="10.6" weight="650" cfg={cfg}>{label}</Txt>
      {value !== undefined ? <Txt x={x + w - 12} y={y + h / 2} anchor="end" size="10.6" weight="950" cfg={cfg}>{value}</Txt> : null}
      {actionLabel ? <SvgButton x={x + w - 64} y={y + 4} w={52} h={18} label={actionLabel} small onClick={onAction} cfg={cfg} /> : null}
    </g>
  );
}
