import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import { resolveShopPageImageUrl } from './ShopPageImageResolver';

function MissingAssetPlaceholder({
  x,
  y,
  w,
  h,
  cfg,
  label = 'ASSET NEEDED',
  compact = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  label?: string;
  compact?: boolean;
}) {
  const token = cfg.componentTokens.missingArtwork;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.missingFill} stroke={cfg.colors.missingStroke} strokeWidth={token.strokeWidth} strokeDasharray={`${token.dashLength} ${token.dashGap}`} />
      <line x1={x + token.crossInset} y1={y + token.crossInset} x2={x + w - token.crossInset} y2={y + h - token.crossInset} stroke={cfg.colors.missingStroke} strokeOpacity={token.crossOpacity} />
      <line x1={x + w - token.crossInset} y1={y + token.crossInset} x2={x + token.crossInset} y2={y + h - token.crossInset} stroke={cfg.colors.missingStroke} strokeOpacity={token.crossOpacity} />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize={compact ? token.compactTextSize : token.textSize} fontWeight={token.textWeight} fill={cfg.colors.missingText}>{label}</text>
    </g>
  );
}

export function TransparentAssetImage({
  x,
  y,
  w,
  h,
  imageUrl,
  cfg,
  glow = false,
  cyanGlow = false,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  cfg: ShopPageSvgControls;
  glow?: boolean;
  cyanGlow?: boolean;
  opacity?: number;
}) {
  if (!imageUrl) {
    return <MissingAssetPlaceholder x={x} y={y} w={w} h={h} cfg={cfg} compact={h < 72 || w < 100} />;
  }
  const resolvedImageUrl = resolveShopPageImageUrl(imageUrl);
  return (
    <g>
      <image
        href={resolvedImageUrl}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
        opacity={glow ? Math.min(1, opacity + 0.05) : opacity}
        filter={glow ? cyanGlow ? 'url(#shopCyanImageGlow)' : 'url(#shopSoftGlow)' : undefined}
      />
    </g>
  );
}
