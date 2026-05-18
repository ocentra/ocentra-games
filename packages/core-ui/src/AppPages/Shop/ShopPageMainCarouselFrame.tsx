import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import { getBannerPlaybackImageCount, getBannerPlaybackImages } from './ShopPageMainCarouselBannerPlayback';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  resolveFeaturedShowcaseControlsForVariant,
  type FeaturedGameShowcaseProps,
  type FeaturedShowcaseControlGroups,
  type FeaturedShowcaseControls,
  type FeaturedShowcaseMediaFit,
  type FeaturedShowcaseMediaSlot,
  type ShopMainCarouselCardItem,
} from './ShopPageMainCarouselFrame.types';

type ShowcaseTabId = 'featured' | 'recommended';
type BadgeTone = 'blue' | 'green' | 'purple' | 'pink' | 'gold' | 'bannerBlue' | 'bannerPurple' | 'bannerGreen' | 'bannerPink' | 'bannerGold';

type GameBadge = {
  label: string;
  tone: BadgeTone;
};

const badgeTones: BadgeTone[] = [
  'blue',
  'green',
  'purple',
  'pink',
  'gold',
  'bannerBlue',
  'bannerPurple',
  'bannerGreen',
  'bannerPink',
  'bannerGold',
];

const shellStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  overflowX: 'clip',
  color: '#fff',
};

function mergeFeaturedShowcaseControls(value?: FeaturedShowcaseControls): FeaturedShowcaseControls {
  if (!value) return DEFAULT_FEATURED_SHOWCASE_CONTROLS;
  return {
    overall: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.overall, ...value.overall },
    arrows: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.arrows, ...value.arrows },
    header: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.header, ...value.header },
    body: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.body, ...value.body },
    sideA: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA, ...value.sideA },
    sideB: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideB, ...value.sideB },
    footer: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.footer, ...value.footer },
    colors: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.colors, ...value.colors },
    variants: value.variants,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeMediaFit(value: FeaturedShowcaseMediaFit | string): FeaturedShowcaseMediaFit {
  return value === 'contain' || value === 'stretch' ? value : 'cover';
}

function getMediaPreserveAspectRatio(
  fit: FeaturedShowcaseMediaFit,
  anchorX: number,
  anchorY: number,
): string {
  if (fit === 'stretch') return 'none';
  const x = anchorX <= 25 ? 'xMin' : anchorX >= 75 ? 'xMax' : 'xMid';
  const y = anchorY <= 25 ? 'YMin' : anchorY >= 75 ? 'YMax' : 'YMid';
  return `${x}${y} ${fit === 'contain' ? 'meet' : 'slice'}`;
}

function getBadgeWidth(label: string, minWidth = 74, fontScale = 7.7): number {
  return Math.ceil(Math.max(minWidth, label.length * fontScale + 22));
}

function getTabLabelWidth(label: string, restFontSize: number, firstBoost: number): number {
  const text = label.toUpperCase();
  if (text.length === 0) return 0;
  const firstLetterWidth = (restFontSize + firstBoost) * 0.68;
  const restWidth = Math.max(0, text.length - 1) * restFontSize * 0.58;
  const letterSpacing = Math.max(0, text.length - 2) * 5;
  return firstLetterWidth + restWidth + letterSpacing;
}

function getTabBlockWidth(label: string, restFontSize: number, firstBoost: number, countBoxWidth: number): number {
  const labelPadding = 24;
  return countBoxWidth + getTabLabelWidth(label, restFontSize, firstBoost) + labelPadding;
}

function getFittingTabTextSize(
  tabs: { label: string }[],
  availableWidth: number,
  minSize: number,
  maxSize: number,
  firstBoost: number,
  countBoxWidth: number,
): number {
  let size = maxSize;
  while (size > minSize) {
    const totalWidth = tabs.reduce(
      (sum, item) => sum + getTabBlockWidth(item.label, size, firstBoost, countBoxWidth),
      0,
    );
    if (totalWidth <= availableWidth) return size;
    size -= 1;
  }
  return minSize;
}

function getGameIdentifier(game: FeaturedGameItem): string {
  return `${game.gameId}:${String(game.guid ?? game.gameId)}`;
}

function getGameImages(game: FeaturedGameItem): ImageHash[] {
  const images = game.carouselImages && game.carouselImages.length > 0
    ? game.carouselImages
    : game.bannerImage
      ? [game.bannerImage]
      : [];
  return images.filter((hash): hash is ImageHash => typeof hash === 'string' && hash.length > 0);
}

function getGameTitle(game: FeaturedGameItem): string {
  return game.bannerTitleText || game.name || game.gameId || 'Game';
}

function createPlaceholderGame(label: string, tabId: ShowcaseTabId): FeaturedGameItem {
  const normalizedLabel = label.trim() || 'Featured';
  const id = `placeholder-${tabId}`;
  return {
    gameId: id,
    guid: id,
    name: normalizedLabel,
    enabled: true,
    tags: [],
    tagline: 'Catalog preview',
    shortDescription: 'Catalog entries will render here as soon as they are available.',
    description: 'Catalog entries will render here as soon as they are available.',
    featuredTopBadges: [],
    featuredBottomBadges: [],
  };
}

function normalizeBadgeTone(value: unknown, fallback: BadgeTone): BadgeTone {
  return typeof value === 'string' && badgeTones.includes(value as BadgeTone)
    ? value as BadgeTone
    : fallback;
}

function getAuthoredBadges(
  badges: FeaturedGameItem['featuredTopBadges'] | FeaturedGameItem['featuredBottomBadges'],
  fallbackTones: BadgeTone[],
): GameBadge[] {
  return (badges ?? [])
    .filter((badge) => badge.label)
    .map((badge, index) => ({
      label: badge.label.toUpperCase(),
      tone: normalizeBadgeTone(badge.tone, fallbackTones[index % fallbackTones.length]),
    }));
}

function getTopBadges(game: FeaturedGameItem): GameBadge[] {
  const authored = getAuthoredBadges(game.featuredTopBadges, ['bannerBlue', 'bannerPurple', 'bannerGreen', 'bannerPink', 'bannerGold']);
  if (authored.length > 0) return authored.slice(0, 6);
  return (game.tags ?? [])
    .filter(Boolean)
    .slice(0, 6)
    .map((label, index) => ({
      label: label.toUpperCase(),
      tone: (['bannerBlue', 'bannerPurple', 'bannerGreen', 'bannerPink', 'bannerGold', 'bannerBlue'] as const)[index],
    }));
}

function getBottomBadges(game: FeaturedGameItem): GameBadge[] {
  const authored = getAuthoredBadges(game.featuredBottomBadges, ['blue', 'green', 'purple', 'pink', 'gold']);
  if (authored.length > 0) return authored.slice(0, 5);
  if (game.comingSoon) return [{ label: 'COMING SOON', tone: 'gold' }];
  if (game.releaseStatus === 'Available') return [{ label: 'AVAILABLE NOW', tone: 'blue' }];
  return game.releaseStatus ? [{ label: String(game.releaseStatus).toUpperCase(), tone: 'blue' }] : [];
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number, corners: 'all' | 'top' | 'bottom' = 'all'): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  if (corners === 'top') {
    return `M${x + r} ${y} H${x + width - r} Q${x + width} ${y} ${x + width} ${y + r} V${y + height} H${x} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  }

  if (corners === 'bottom') {
    return `M${x} ${y} H${x + width} V${y + height - r} Q${x + width} ${y + height} ${x + width - r} ${y + height} H${x + r} Q${x} ${y + height} ${x} ${y + height - r} Z`;
  }

  return `M${x + r} ${y} H${x + width - r} Q${x + width} ${y} ${x + width} ${y + r} V${y + height - r} Q${x + width} ${y + height} ${x + width - r} ${y + height} H${x + r} Q${x} ${y + height} ${x} ${y + height - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
}

function SvgArrowButton({
  x,
  y,
  width,
  height,
  direction,
  onClick,
  radius,
  hoverColor,
  ids,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  onClick: () => void;
  radius: number;
  hoverColor: string;
  ids: (name: string) => string;
}) {
  const [isHover, setIsHover] = useState(false);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const arrowHalfW = Math.min(width, height) * 0.145;
  const arrowHalfH = Math.min(width, height) * 0.197;
  const arrow = direction === 'left'
    ? `${cx + arrowHalfW},${cy - arrowHalfH} ${cx - arrowHalfW},${cy} ${cx + arrowHalfW},${cy + arrowHalfH}`
    : `${cx - arrowHalfW},${cy - arrowHalfH} ${cx + arrowHalfW},${cy} ${cx - arrowHalfW},${cy + arrowHalfH}`;
  const r = Math.min(radius, width / 2, height / 2);
  const outerPath = direction === 'left'
    ? `M${x + r} ${y} H${x + width} V${y + height} H${x + r} Q${x} ${y + height} ${x} ${y + height - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
    : `M${x} ${y} H${x + width - r} Q${x + width} ${y} ${x + width} ${y + r} V${y + height - r} Q${x + width} ${y + height} ${x + width - r} ${y + height} H${x} Z`;
  const shinePath = direction === 'left'
    ? `M${x + r} ${y + 2} H${x + width - 2} V${y + height * 0.5} H${x + 2} V${y + r} Q${x + 2} ${y + 2} ${x + r} ${y + 2} Z`
    : `M${x + 2} ${y + 2} H${x + width - r} Q${x + width - 2} ${y + 2} ${x + width - 2} ${y + r} V${y + height * 0.5} H${x + 2} Z`;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      style={{ cursor: 'pointer' }}
      filter={isHover ? `url(#${ids('cyanGlow')})` : undefined}
    >
      <path d={outerPath} fill={isHover ? '#0d5930' : `url(#${ids('navIdle')})`} stroke={isHover ? hoverColor : '#69caff'} strokeWidth={isHover ? 2.3 : 1.5} />
      <path d={shinePath} fill="#ffffff" opacity={isHover ? 0.16 : 0.08} />
      <polygon points={arrow} fill={isHover ? '#9dffc2' : '#8bd7ff'} filter={`url(#${ids('cyanGlow')})`} />
    </g>
  );
}

function SvgBadge({
  x,
  y,
  badge,
  height,
  minWidth,
  fontSize,
  fontScale,
  ids,
}: {
  x: number;
  y: number;
  badge: GameBadge;
  height: number;
  minWidth: number;
  fontSize: number;
  fontScale: number;
  ids: (name: string) => string;
}) {
  const width = getBadgeWidth(badge.label, minWidth, fontScale);
  const isBanner = badge.tone.startsWith('banner');
  const darkText = badge.tone === 'gold' || badge.tone === 'bannerGold';
  const bannerStroke = badge.tone === 'bannerGold'
    ? '#f5c84b'
    : badge.tone === 'bannerGreen'
      ? '#47f29a'
      : badge.tone === 'bannerPink'
        ? '#ff70c8'
        : badge.tone === 'bannerPurple'
          ? '#b88cff'
          : '#65cfff';
  const toneFill: Record<BadgeTone, string> = {
    blue: `url(#${ids('badgeBlue')})`,
    green: `url(#${ids('badgeGreen')})`,
    purple: `url(#${ids('badgePurple')})`,
    pink: `url(#${ids('badgePink')})`,
    gold: `url(#${ids('badgeGold')})`,
    bannerBlue: `url(#${ids('bannerBadgeBlue')})`,
    bannerPurple: `url(#${ids('bannerBadgePurple')})`,
    bannerGreen: `url(#${ids('bannerBadgeGreen')})`,
    bannerPink: `url(#${ids('bannerBadgePink')})`,
    bannerGold: `url(#${ids('bannerBadgeGold')})`,
  };

  if (isBanner) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={4} fill="#112d45" fillOpacity="0.72" stroke={bannerStroke} strokeOpacity="0.78" strokeWidth="1.1" />
        <rect x={x + 1} y={y + 1} width={width - 2} height={height * 0.38} rx={3} fill="#ffffff" opacity="0.08" />
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight="500" fill={darkText ? '#ffe187' : '#9bd9ff'} fontFamily="Arial Narrow, Arial, sans-serif">
          {badge.label}
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={5} fill={toneFill[badge.tone]} stroke="#020816" strokeOpacity="0.35" strokeWidth="0.8" />
      <rect x={x + 1} y={y + 1} width={width - 2} height={height * 0.32} rx={4} fill="#fff" opacity="0.14" />
      <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight="500" fill={darkText ? '#050505' : '#ffffff'} fontFamily="Arial Narrow, Arial, sans-serif">
        {badge.label}
      </text>
    </g>
  );
}

function BadgeRow({
  x,
  y,
  badges,
  gap = 8,
  height = 24,
  minWidth = 74,
  fontSize = 10.5,
  fontScale = 6.2,
  align = 'left',
  ids,
}: {
  x: number;
  y: number;
  badges: GameBadge[];
  gap?: number;
  height?: number;
  minWidth?: number;
  fontSize?: number;
  fontScale?: number;
  align?: 'left' | 'right';
  ids: (name: string) => string;
}) {
  const widths = badges.map((badge) => getBadgeWidth(badge.label, minWidth, fontScale));
  const totalW = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, badges.length - 1) * gap;
  const startX = align === 'right' ? x - totalW : x;

  return (
    <g>
      {badges.map((badge, index) => {
        const priorWidth = widths
          .slice(0, index)
          .reduce((sum, width) => sum + width + gap, 0);
        const badgeX = startX + priorWidth;
        return <SvgBadge key={`${badge.label}-${index}`} x={badgeX} y={y} badge={badge} height={height} minWidth={minWidth} fontSize={fontSize} fontScale={fontScale} ids={ids} />;
      })}
    </g>
  );
}

function FallbackLogoText({
  x,
  y,
  width,
  height,
  text,
  ids,
  maxFontSize,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  ids: (name: string) => string;
  maxFontSize: number;
}) {
  const fontSize = Math.min(maxFontSize, height * 0.74, width / Math.max(1, text.length * 0.62));
  const centerX = x + width / 2;
  const centerY = y + height / 2 + fontSize * 0.03;
  const logoFont = 'Montserrat Black, Avenir Next Heavy, Futura Condensed ExtraBold, Arial Black, Impact, sans-serif';

  return (
    <g>
      <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="central" fontFamily={logoFont} fontSize={fontSize} fontWeight="800" letterSpacing="0" fill="none" stroke="#020202" strokeWidth="5.4" strokeLinejoin="round" paintOrder="stroke" opacity="0.98">
        {text}
      </text>
      <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="central" fontFamily={logoFont} fontSize={fontSize} fontWeight="800" letterSpacing="0" fill={`url(#${ids('logoStoneFill')})`} stroke="#d7d2c4" strokeWidth="0.42" strokeOpacity="0.42" paintOrder="stroke fill" filter={`url(#${ids('logoStoneShadow')})`}>
        {text}
      </text>
    </g>
  );
}

function LearnMoreButton({
  x,
  y,
  width,
  height,
  strokeColor,
  onClick,
  ids,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  onClick?: () => void;
  ids: (name: string) => string;
}) {
  const radius = 9;
  const innerW = height * 0.5;
  const innerX = x + width - innerW;
  const labelAreaW = width - innerW;
  const text = 'Learn More';
  const textFontSize = Math.min(14, Math.max(10, labelAreaW / (text.length * 0.58)));
  const innerPath = `M${innerX} ${y} H${x + width - radius} Q${x + width} ${y} ${x + width} ${y + radius} V${y + height - radius} Q${x + width} ${y + height} ${x + width - radius} ${y + height} H${innerX} Z`;
  const arrowCx = innerX + innerW / 2;
  const arrowCy = y + height / 2;
  const arrow = `${arrowCx - 4},${arrowCy - 8} ${arrowCx + 6},${arrowCy} ${arrowCx - 4},${arrowCy + 8}`;

  return (
    <g style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <rect x={x} y={y} width={width} height={height} rx={radius} fill={`url(#${ids('learnMore')})`} stroke={strokeColor} strokeWidth="1.6" />
      <text x={x + labelAreaW / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontSize={textFontSize} fontWeight="800" fill="#ffffff" fontFamily="Arial">
        {text}
      </text>
      <g filter={`url(#${ids('cyanGlow')})`}>
        <path d={innerPath} fill={`url(#${ids('learnMoreInnerBox')})`} stroke={strokeColor} strokeWidth="1.35" strokeOpacity="0.95" />
        <path d={innerPath} fill={`url(#${ids('learnMoreInnerShine')})`} opacity="0.95" pointerEvents="none" />
        <polygon points={arrow} fill="#8bd7ff" filter={`url(#${ids('cyanGlow')})`} />
      </g>
    </g>
  );
}

function ShowcaseDefs({ ids }: { ids: (name: string) => string }) {
  return (
    <defs>
      <linearGradient id={ids('skeletonGlass')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0b3b52" stopOpacity="0.34" />
        <stop offset="0.52" stopColor="#02080d" stopOpacity="0.58" />
        <stop offset="1" stopColor="#0c1835" stopOpacity="0.42" />
      </linearGradient>
      <radialGradient id={ids('mediaVignette')} cx="50%" cy="45%" r="78%">
        <stop offset="0" stopColor="#000000" stopOpacity="0" />
        <stop offset="0.42" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.78" />
      </radialGradient>
      <linearGradient id={ids('navIdle')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#133b59" />
        <stop offset="1" stopColor="#020711" />
      </linearGradient>
      <linearGradient id={ids('tabSelectedFill')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#332904" stopOpacity="0.74" />
        <stop offset="0.52" stopColor="#0e314b" stopOpacity="0.48" />
        <stop offset="1" stopColor="#071827" stopOpacity="0.68" />
      </linearGradient>
      <linearGradient id={ids('tabHoverFill')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0d4f2b" stopOpacity="0.82" />
        <stop offset="0.55" stopColor="#0a3527" stopOpacity="0.58" />
        <stop offset="1" stopColor="#062018" stopOpacity="0.76" />
      </linearGradient>
      <linearGradient id={ids('selectedTabGradientLine')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#63dfff" />
        <stop offset="0.46" stopColor="#58bdfb" />
        <stop offset="1" stopColor="#d026d9" />
      </linearGradient>
      <linearGradient id={ids('tabCountGoldFill')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff7c7" />
        <stop offset="0.18" stopColor="#ffd85c" />
        <stop offset="0.48" stopColor="#d89010" />
        <stop offset="0.78" stopColor="#8b5700" />
        <stop offset="1" stopColor="#3a2100" />
      </linearGradient>
      <linearGradient id={ids('tabCountGoldShine')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.34" stopColor="#fff0a6" stopOpacity="0.22" />
        <stop offset="1" stopColor="#000000" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={ids('footerSelectedPill')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffe187" />
        <stop offset="1" stopColor="#b98214" />
      </linearGradient>
      <linearGradient id={ids('logoStoneFill')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f5f5ef" />
        <stop offset="0.16" stopColor="#b7b8b0" />
        <stop offset="0.34" stopColor="#4c514f" />
        <stop offset="0.52" stopColor="#c9c9c0" />
        <stop offset="0.72" stopColor="#6b6f68" />
        <stop offset="1" stopColor="#222725" />
      </linearGradient>
      <filter id={ids('logoStoneShadow')} x="-50%" y="-80%" width="200%" height="260%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.82" />
      </filter>
      <linearGradient id={ids('learnMore')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#70c4ff" />
        <stop offset="0.46" stopColor="#8069ee" />
        <stop offset="1" stopColor="#bd25d8" />
      </linearGradient>
      <linearGradient id={ids('learnMoreInnerBox')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a2635" />
        <stop offset="0.22" stopColor="#080d16" />
        <stop offset="0.66" stopColor="#020308" />
        <stop offset="1" stopColor="#000000" />
      </linearGradient>
      <linearGradient id={ids('learnMoreInnerShine')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="0.28" stopColor="#8fd8ff" stopOpacity="0.05" />
        <stop offset="1" stopColor="#000000" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={ids('badgeBlue')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#66c6ff" /><stop offset="1" stopColor="#287bc4" /></linearGradient>
      <linearGradient id={ids('badgeGreen')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#65d96f" /><stop offset="1" stopColor="#207d39" /></linearGradient>
      <linearGradient id={ids('badgePurple')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a855f7" /><stop offset="1" stopColor="#5b21b6" /></linearGradient>
      <linearGradient id={ids('badgePink')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f148a9" /><stop offset="1" stopColor="#a30d65" /></linearGradient>
      <linearGradient id={ids('badgeGold')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd23f" /><stop offset="1" stopColor="#e79400" /></linearGradient>
      <linearGradient id={ids('bannerBadgeBlue')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14384f" /><stop offset="1" stopColor="#0b1e30" /></linearGradient>
      <linearGradient id={ids('bannerBadgeGreen')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#143f32" /><stop offset="1" stopColor="#091f19" /></linearGradient>
      <linearGradient id={ids('bannerBadgePurple')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#302a58" /><stop offset="1" stopColor="#15142e" /></linearGradient>
      <linearGradient id={ids('bannerBadgePink')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a2144" /><stop offset="1" stopColor="#231124" /></linearGradient>
      <linearGradient id={ids('bannerBadgeGold')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4b3b12" /><stop offset="1" stopColor="#211806" /></linearGradient>
      <filter id={ids('cyanGlow')} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.28 0 0 0 0 0.78 0 0 0 0 1 0 0 0 0.85 0" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={ids('tabGreenGlow')} x="-40%" y="-80%" width="180%" height="260%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.2 0 0 0 0 1 0 0 0 0 0.55 0 0 0 0.75 0" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={ids('goldGlow')} x="-60%" y="-80%" width="220%" height="260%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.95 0 1 0 0 0.62 0 0 1 0 0.12 0 0 0 0.85 0" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={ids('skeletonShadow')} x="-20%" y="-30%" width="140%" height="160%">
        <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000" floodOpacity="0.72" />
      </filter>
    </defs>
  );
}

function hasFrameVisibility(from?: number, to?: number): boolean {
  return typeof from === 'number' || typeof to === 'number';
}

function isFrameVisible(index: number, from?: number, to?: number): boolean {
  if (!hasFrameVisibility(from, to)) return true;
  const start = from ?? 0;
  const end = to ?? Number.MAX_SAFE_INTEGER;
  return start <= end
    ? index >= start && index <= end
    : index >= start || index <= end;
}

function DefaultMediaSlot({
  slot,
  images,
  resolveImageUrl,
  ids,
  transitionDurationMs,
}: {
  slot: FeaturedShowcaseMediaSlot;
  images: ImageHash[];
  resolveImageUrl?: (hash: ImageHash) => string | null;
  ids: (name: string) => string;
  transitionDurationMs: number;
}) {
  const playbackImages = getBannerPlaybackImages(images, slot.game.carouselPlaybackMode);
  const activeHash = playbackImages[slot.activeImageIndex];
  const activeUrl = activeHash && resolveImageUrl ? resolveImageUrl(activeHash) : null;
  const imageEntries = playbackImages.map((hash, index) => ({ hash, index }));
  const transition = slot.game.carouselTransitionType === 'cut'
    ? 'none'
    : `opacity ${transitionDurationMs}ms ease-in-out`;
  const overlayOpacity = slot.game.bannerOverlayTintOpacity ?? 0;
  const vignetteOpacity = slot.game.bannerVignetteOpacity ?? 0;
  const fadeOpacity = slot.game.bannerFadeToBlackOpacity ?? 0;
  const mediaFit = normalizeMediaFit(slot.mediaFit);
  const mediaAnchorX = clamp(slot.mediaAnchorX, 0, 100);
  const mediaAnchorY = clamp(slot.mediaAnchorY, 0, 100);
  const mediaAnchorXR = mediaAnchorX / 100;
  const mediaAnchorYR = mediaAnchorY / 100;
  const mediaScale = Math.max(0.1, slot.mediaScale);
  const imageW = slot.width * mediaScale;
  const imageH = slot.height * mediaScale;
  const imageX = slot.x + slot.width * mediaAnchorXR - imageW * mediaAnchorXR + slot.mediaOffsetX;
  const imageY = slot.y + slot.height * mediaAnchorYR - imageH * mediaAnchorYR + slot.mediaOffsetY;
  const mediaPreserveAspectRatio = getMediaPreserveAspectRatio(mediaFit, mediaAnchorX, mediaAnchorY);
  const logoHash = (slot.game.bannerLogoImage || slot.game.textImageUrl) as ImageHash | undefined;
  const logoUrl = logoHash && resolveImageUrl ? resolveImageUrl(logoHash) : null;
  const logoUsesFrameVisibility = hasFrameVisibility(
    slot.game.bannerLogoVisibleFromIndex,
    slot.game.bannerLogoVisibleToIndex,
  );
  const logoVisible = isFrameVisible(
    slot.activeImageIndex,
    slot.game.bannerLogoVisibleFromIndex,
    slot.game.bannerLogoVisibleToIndex,
  );
  const logoOpacity = logoUsesFrameVisibility
    ? logoVisible
      ? slot.game.bannerLogoOpacityTo ?? 1
      : slot.game.bannerLogoOpacityFrom ?? 1
    : 1;
  const logoScale = logoUsesFrameVisibility
    ? logoVisible
      ? slot.game.bannerLogoScaleTo ?? 1
      : slot.game.bannerLogoScaleFrom ?? 1
    : slot.game.bannerLogoScaleTo ?? 1;
  const logoW = slot.width * 0.58;
  const logoH = slot.height * 0.45;
  const logoX = slot.x + (slot.width - logoW) / 2;
  const logoY = slot.y + (slot.height - logoH) / 2;
  const titleUsesFrameVisibility = hasFrameVisibility(
    slot.game.bannerTitleVisibleFromIndex,
    slot.game.bannerTitleVisibleToIndex,
  );
  const titleVisible = isFrameVisible(
    slot.activeImageIndex,
    slot.game.bannerTitleVisibleFromIndex,
    slot.game.bannerTitleVisibleToIndex,
  );
  const titleOpacity = titleUsesFrameVisibility
    ? titleVisible
      ? slot.game.bannerTitleOpacityTo ?? 1
      : slot.game.bannerTitleOpacityFrom ?? 1
    : 1;
  const titleScale = titleUsesFrameVisibility
    ? titleVisible
      ? slot.game.bannerTitleScaleTo ?? 1
      : slot.game.bannerTitleScaleFrom ?? 1
    : slot.game.bannerTitleScaleTo ?? 1;
  const titleText = slot.game.bannerTitleText;
  const titleFontSize = titleText
    ? clamp(slot.width / Math.max(5, titleText.length * 0.5), 24, slot.height * 0.34)
    : 0;

  if (!activeUrl) {
    return (
      <g>
        <rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} fill="#07111c" />
        <circle cx={slot.x + slot.width * 0.38} cy={slot.y + slot.height * 0.42} r={slot.height * 0.42} fill="#9bd9ff" opacity="0.08" />
        <circle cx={slot.x + slot.width * 0.64} cy={slot.y + slot.height * 0.36} r={slot.height * 0.28} fill="#ffffff" opacity="0.055" />
        <FallbackLogoText x={slot.x + slot.width * 0.16} y={slot.y + slot.height * 0.28} width={slot.width * 0.68} height={slot.height * 0.38} text={getGameTitle(slot.game)} ids={ids} maxFontSize={slot.height * 0.24} />
      </g>
    );
  }

  return (
    <g>
      <rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} fill="#07111c" />
      {slot.prevImageIndex !== null && slot.prevImageIndex !== slot.activeImageIndex ? (() => {
        const priorHash = playbackImages[slot.prevImageIndex];
        const priorUrl = priorHash && resolveImageUrl ? resolveImageUrl(priorHash) : null;
        return priorUrl ? (
          <image
            href={priorUrl}
            x={imageX}
            y={imageY}
            width={imageW}
            height={imageH}
            preserveAspectRatio={mediaPreserveAspectRatio}
            opacity={1}
          />
        ) : null;
      })() : null}
      {imageEntries.map(({ hash, index }) => {
        const url = resolveImageUrl ? resolveImageUrl(hash) : null;
        if (!url) return null;
        const opacity = index === slot.activeImageIndex
          ? 1
          : 0;
        const imageTransition = index === slot.activeImageIndex ? transition : 'none';
        return (
          <image
            key={`${hash}-${index}`}
            href={url}
            x={imageX}
            y={imageY}
            width={imageW}
            height={imageH}
            preserveAspectRatio={mediaPreserveAspectRatio}
            style={{ opacity, transition: imageTransition, willChange: 'opacity' }}
          />
        );
      })}
      {overlayOpacity > 0 ? (
        <rect
          x={slot.x}
          y={slot.y}
          width={slot.width}
          height={slot.height}
          fill={slot.game.bannerOverlayTintColor ?? '#000000'}
          opacity={overlayOpacity}
        />
      ) : null}
      {vignetteOpacity > 0 ? (
        <rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} fill={`url(#${ids('mediaVignette')})`} opacity={vignetteOpacity} />
      ) : null}
      {fadeOpacity > 0 ? (
        <rect x={slot.x} y={slot.y} width={slot.width} height={slot.height} fill="#000000" opacity={fadeOpacity} />
      ) : null}
      {logoUrl ? (
        <image
          href={logoUrl}
          x={logoX}
          y={logoY}
          width={logoW}
          height={logoH}
          preserveAspectRatio="xMidYMid meet"
          opacity={logoOpacity}
          transform={`translate(${logoX + logoW / 2} ${logoY + logoH / 2}) scale(${logoScale}) translate(${-logoX - logoW / 2} ${-logoY - logoH / 2})`}
          style={{ transition: `opacity ${slot.game.bannerLogoDurationMs ?? 1200}ms ease-in-out, transform ${slot.game.bannerLogoDurationMs ?? 1200}ms ease-in-out` }}
        />
      ) : titleText ? (
        <text
          x={slot.x + slot.width / 2}
          y={slot.y + slot.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Impact, Arial Black, sans-serif"
          fontSize={titleFontSize}
          fill={slot.game.bannerTitleColor ?? '#ffffff'}
          opacity={titleOpacity}
          transform={`translate(${slot.x + slot.width / 2} ${slot.y + slot.height / 2}) scale(${titleScale}) translate(${-slot.x - slot.width / 2} ${-slot.y - slot.height / 2})`}
          style={{ transition: `opacity ${slot.game.bannerTitleDurationMs ?? 1200}ms ease-in-out, transform ${slot.game.bannerTitleDurationMs ?? 1200}ms ease-in-out` }}
        >
          {titleText}
        </text>
      ) : null}
    </g>
  );
}

function shopCardToneColor(tone: ShopMainCarouselCardItem['tone']): string {
  if (tone === 'green') return '#22e79d';
  if (tone === 'violet') return '#bd76ff';
  if (tone === 'orange') return '#ff8a35';
  if (tone === 'gold') return '#ffd36a';
  if (tone === 'silver') return '#d7e6f5';
  return '#54e2ff';
}

function colorWithAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${alpha}` : hex;
}

function fitText(text: string, width: number, fontSize: number): string {
  const maxChars = Math.max(3, Math.floor(width / Math.max(1, fontSize * 0.56)));
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 3))}...` : text;
}

function getShopCardVisibleCount(
  width: number,
  total: number,
  gap: number,
  minCardW: number,
): number {
  if (total <= 0) return 1;
  const available = Math.max(1, width);
  const fit = Math.max(1, Math.floor((available + gap) / (Math.max(1, minCardW) + gap)));
  return Math.max(1, Math.min(total, fit));
}

const shopProductCardColors = {
  panelFill: 'rgba(7,24,43,.50)',
  tileStroke: '#1e6089',
  headerFillAlt: '#0d3154',
  footerFill: 'rgba(4,15,28,.82)',
  bodyText: '#f4fbff',
  buttonFill: '#07162a',
  buttonHoverFill: 'rgba(14,72,112,.82)',
  buttonStroke: '#22557b',
  buttonArrow: '#78c8ff',
};

function ShopMainCarouselCard({
  x,
  y,
  width,
  height,
  card,
  controls,
  ids,
  onAction,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  card: ShopMainCarouselCardItem;
  controls: FeaturedShowcaseControlGroups;
  ids: (name: string) => string;
  onAction?: (card: ShopMainCarouselCardItem) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accent = shopCardToneColor(card.tone);
  const edgeAccent = accent;
  const cardGlow = `drop-shadow(0 0 ${hovered ? 7 : 4}px ${colorWithAlpha(edgeAccent, hovered ? 'aa' : '66')})`;
  const interactive = Boolean(onAction && !card.loading);
  const scale = Math.max(0.72, Math.min(1, height / 118));
  const creditPack = card.icon === 'coins' || /(^|\s)AC($|\s)/i.test(card.title) || card.title === 'Custom AC';
  const imageOnlyCard = creditPack || card.layout === 'image';
  const radius = Math.max(4, Math.min(9 * scale, height / 7));
  const cardPath = roundedRectPath(x, y, width, height, radius, 'top');
  const headerInset = 1;
  const headerX = x + headerInset;
  const headerY = y + headerInset;
  const headerW = width - headerInset * 2;
  const headerH = Math.max(21, (imageOnlyCard ? 28 : 24) * scale);
  const headerPath = roundedRectPath(headerX, headerY, headerW, headerH, radius, 'top');
  const headerClipId = ids(`shop-card-header-${card.key.replace(/[^a-z0-9_-]/gi, '')}`);
  const footerY = y + height;
  const imageY = y + headerH;
  const titleX = headerX + Math.max(8, 10 * scale);
  const titleY = y + headerInset + headerH * 0.64;
  const titleFont = Math.max(10, Math.min(13.2 * scale, controls.sideA.cardTitleMaxFont));
  const headerBadgeGap = Math.max(4, 6 * scale);
  const priceBadgeW = card.price ? Math.min(Math.max(54, card.price.length * 6.6 * scale + 16), width * 0.42) : 0;
  const priceBadgeX = headerX + headerW - priceBadgeW;
  const priceBadgeTextX = priceBadgeX + priceBadgeW / 2;
  const priceBadgeFont = Math.max(7.4, 9.2 * scale);
  const badgeInHeader = card.badgePlacement === 'header';
  const headerBodyBadgeFont = Math.max(6.8, 8.1 * scale);
  const headerBodyBadgeW = badgeInHeader && card.badge
    ? Math.min(Math.max(44, card.badge.length * headerBodyBadgeFont * 0.62 + 14), width * 0.32)
    : 0;
  const headerBodyBadgeX = headerBodyBadgeW > 0
    ? (card.price ? priceBadgeX : headerX + headerW) - headerBadgeGap - headerBodyBadgeW
    : 0;
  const titleRightEdge = headerBodyBadgeW > 0
    ? headerBodyBadgeX - headerBadgeGap
    : card.price
      ? priceBadgeX - headerBadgeGap
      : headerX + headerW - headerBadgeGap;
  const titleW = Math.max(22, titleRightEdge - titleX);
  const hoverRailInset = Math.max(5, width * 0.035);
  const hoverRailPairGap = Math.max(3, width * 0.016);
  const contentRailInset = Math.max(8, hoverRailInset + hoverRailPairGap + 4 * scale);
  const bodyBadgeFont = Math.max(6.8, 8.3 * scale);
  const bodyBadgeW = card.badge && !badgeInHeader ? Math.min(Math.max(48, card.badge.length * bodyBadgeFont * 0.66 + 16), width * 0.48) : 0;
  const bodyBadgeH = Math.max(14, 17 * scale);
  const bodyBadgeX = x + width - contentRailInset - bodyBadgeW;
  const bodyBadgeY = y + height - Math.max(5, 6 * scale) - bodyBadgeH;
  const imageInset = imageOnlyCard ? Math.max(7, contentRailInset * 0.55) : 1 * scale;
  const imageX = x + imageInset;
  const imageW = Math.max(24, width - imageInset * 2);
  const imageCardTopPad = Math.max(3, 4 * scale);
  const imageCardBottomPad = Math.max(4, 5 * scale);
  const imageH = imageOnlyCard
    ? Math.max(24, footerY - imageY - imageCardTopPad - imageCardBottomPad)
    : Math.max(24, footerY - imageY);
  const splitPadX = Math.max(7, 9 * scale, contentRailInset);
  const splitPadY = Math.max(4, 5 * scale);
  const splitBodyY = imageY + splitPadY;
  const splitBodyH = Math.max(10, y + height - splitBodyY - splitPadY);
  const splitImageW = Math.max(50, Math.min(width * 0.2, splitBodyH * 0.8));
  const splitImageX = x + splitPadX;
  const splitDividerX = splitImageX + splitImageW + splitPadX;
  const splitTextX = splitDividerX + splitPadX;
  const splitTextW = Math.max(24, x + width - splitTextX - splitPadX);
  const splitHeadingSize = Math.max(10.2, 12.2 * scale);
  const splitLineHBase = Math.max(11.8, 12.8 * scale);
  const splitHeadingY = splitBodyY + splitHeadingSize + 1 * scale;
  const splitBulletStartY = splitHeadingY + Math.max(12, 13 * scale);
  const splitTextBottomY = splitBodyY + splitBodyH - Math.max(5, 6 * scale);
  const splitBulletAvailableH = Math.max(8, splitTextBottomY - splitBulletStartY);
  const rawSplitLines = (card.bodyLines && card.bodyLines.length > 0 ? card.bodyLines : [card.subtitle]).filter(Boolean);
  const splitLines = rawSplitLines.slice(0, 6);
  const splitLineH = splitLines.length > 1
    ? Math.min(13.8, Math.max(8.8, splitBulletAvailableH / Math.max(1, splitLines.length - 0.25)))
    : splitLineHBase;
  const splitTextSize = Math.max(7.2, Math.min(9.4 * scale, splitLineH * 0.78));
  const active = hovered && interactive;
  const bodyY = imageY;
  const bodyH = Math.max(0, height - headerH);
  const hoverRailGapY = Math.max(7, bodyH * 0.12);
  const hoverRailY1 = bodyY + hoverRailGapY;
  const hoverRailY2 = y + height - hoverRailGapY;
  const imageOpacity = card.loading ? 0.58 : 1;
  const imageGlow = `drop-shadow(0 0 ${active ? 6 : 3}px ${colorWithAlpha(accent, active ? 'aa' : '66')}) drop-shadow(0 1px 4px rgba(0,0,0,.74))`;
  const imageCardYAlign = card.imageAnchor === 'top' ? 'YMin' : card.imageAnchor === 'bottom' ? 'YMax' : 'YMid';
  const imageCardPreserveAspectRatio = card.imageFit === 'fill'
    ? 'none'
    : card.imageFit === 'cover'
      ? `xMid${imageCardYAlign} slice`
      : 'xMidYMid meet';

  return (
    <g
      className={interactive ? 'shop-page-svg-clickable' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={interactive ? () => onAction?.(card) : undefined}
    >
      <defs>
        <clipPath id={headerClipId}>
          <path d={headerPath} />
        </clipPath>
      </defs>
      <path
        d={cardPath}
        fill={active ? colorWithAlpha(accent, '14') : shopProductCardColors.panelFill}
        stroke={active ? edgeAccent : shopProductCardColors.tileStroke}
        strokeWidth={active ? 1.6 : 1.15}
      />
      <path d={headerPath} fill={shopProductCardColors.headerFillAlt} stroke={accent} strokeOpacity="0.72" />
      <text
        x={titleX}
        y={titleY}
        fill={accent}
        fontFamily="Inter, Arial, sans-serif"
        fontSize={titleFont}
        fontWeight={950}
      >
        {fitText(card.title, titleW, titleFont)}
      </text>
      {card.price ? (
        <g clipPath={`url(#${headerClipId})`}>
          <rect
            x={priceBadgeX}
            y={headerY}
            width={priceBadgeW}
            height={headerH}
            rx="0"
            fill={accent}
            opacity="0.18"
            stroke={accent}
          />
          <text
            x={priceBadgeTextX}
            y={headerY + headerH / 2 + priceBadgeFont * 0.36}
            textAnchor="middle"
            fill={accent}
            fontFamily="Inter, Arial, sans-serif"
            fontSize={priceBadgeFont}
            fontWeight={950}
          >
            {fitText(card.price, priceBadgeW - 8, priceBadgeFont)}
          </text>
        </g>
      ) : null}
      {headerBodyBadgeW > 0 && card.badge ? (
        <g clipPath={`url(#${headerClipId})`}>
          <rect
            x={headerBodyBadgeX}
            y={headerY + Math.max(4, 5 * scale)}
            width={headerBodyBadgeW}
            height={Math.max(12, headerH - Math.max(8, 10 * scale))}
            rx="0"
            fill="rgba(3,18,33,.78)"
            stroke={accent}
            strokeWidth="0.8"
            strokeOpacity="0.82"
          />
          <text
            x={headerBodyBadgeX + headerBodyBadgeW / 2}
            y={headerY + headerH / 2 + headerBodyBadgeFont * 0.36}
            textAnchor="middle"
            fill={shopProductCardColors.bodyText}
            fontFamily="Inter, Arial, sans-serif"
            fontSize={headerBodyBadgeFont}
            fontWeight={850}
          >
            {fitText(card.badge, headerBodyBadgeW - 8, headerBodyBadgeFont)}
          </text>
        </g>
      ) : null}
      {imageOnlyCard ? (
        card.imageUrl ? (
          <image
            href={card.imageUrl}
            x={imageX}
            y={imageY + imageCardTopPad}
            width={imageW}
            height={imageH}
            preserveAspectRatio={imageCardPreserveAspectRatio}
            style={{ filter: imageGlow }}
            opacity={imageOpacity}
          />
        ) : (
          <g opacity="0.72">
            <rect x={imageX} y={imageY + imageCardTopPad} width={imageW} height={imageH} rx="0" fill="rgba(7,17,31,.50)" stroke="#2d5d7b" strokeDasharray="5 5" />
            <text x={imageX + imageW / 2} y={imageY + imageCardTopPad + imageH / 2 + 4} textAnchor="middle" fill={accent} fontFamily="Inter, Arial, sans-serif" fontSize={Math.min(22, imageH * 0.28)} fontWeight={900}>
              {card.icon.toUpperCase().slice(0, 2)}
            </text>
          </g>
        )
      ) : (
        <g>
          {card.imageUrl ? (
            <>
              <rect
                x={splitImageX}
                y={splitBodyY}
                width={splitImageW}
                height={splitBodyH}
                rx={Math.max(5, radius * 0.6)}
                fill="rgba(2,10,19,.78)"
                stroke={accent}
                strokeOpacity="0.46"
              />
              <rect
                x={splitImageX + 3}
                y={splitBodyY + 3}
                width={splitImageW - 6}
                height={splitBodyH - 6}
                rx={Math.max(4, radius * 0.44)}
                fill="rgba(255,255,255,.018)"
                stroke={edgeAccent}
                strokeOpacity="0.1"
              />
              <image
                href={card.imageUrl}
                x={splitImageX + 4}
                y={splitBodyY + 4}
                width={splitImageW - 8}
                height={splitBodyH - 8}
                preserveAspectRatio="xMidYMid meet"
                style={{ filter: imageGlow }}
                opacity={imageOpacity}
              />
            </>
          ) : (
            <g opacity="0.72">
              <rect x={splitImageX} y={splitBodyY} width={splitImageW} height={splitBodyH} rx="0" fill="rgba(7,17,31,.50)" stroke="#2d5d7b" strokeDasharray="5 5" />
              <text x={splitImageX + splitImageW / 2} y={splitBodyY + splitBodyH / 2 + 4} textAnchor="middle" fill={accent} fontFamily="Inter, Arial, sans-serif" fontSize={Math.min(18, splitBodyH * 0.22)} fontWeight={900}>
                {card.icon.toUpperCase().slice(0, 2)}
              </text>
            </g>
          )}
          <line x1={splitDividerX} y1={splitBodyY + 4} x2={splitDividerX} y2={splitBodyY + splitBodyH - 4} stroke={accent} strokeWidth="1" strokeOpacity="0.58" />
          <line x1={splitDividerX + 2.5} y1={splitBodyY + 10} x2={splitDividerX + 2.5} y2={splitBodyY + splitBodyH - 10} stroke={edgeAccent} strokeWidth="0.75" strokeOpacity="0.34" />
          <text x={splitTextX} y={splitHeadingY} fill={accent} fontFamily="Inter, Arial, sans-serif" fontSize={splitHeadingSize} fontWeight={950}>
            {fitText(card.subtitle, splitTextW, splitHeadingSize)}
          </text>
          {splitLines.map((line, index) => {
            const bulletY = splitBulletStartY + index * splitLineH;
            return (
              <g key={`${card.key}-line-${index}`}>
                <circle cx={splitTextX + 3} cy={bulletY - splitTextSize * 0.34} r={Math.max(1.4, 1.8 * scale)} fill={edgeAccent} />
                <text x={splitTextX + 9} y={bulletY} fill={shopProductCardColors.bodyText} fontFamily="Inter, Arial, sans-serif" fontSize={splitTextSize} fontWeight={560}>
                  {fitText(line, splitTextW - 10, splitTextSize)}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {card.badge && !badgeInHeader ? (
        <g style={{ filter: cardGlow }}>
          <rect
            x={bodyBadgeX}
            y={bodyBadgeY}
            width={bodyBadgeW}
            height={bodyBadgeH}
            rx={Math.max(4, bodyBadgeH * 0.32)}
            fill="rgba(3,18,33,.86)"
            stroke={accent}
            strokeWidth="1.1"
            strokeOpacity="0.9"
          />
          <rect
            x={bodyBadgeX + 2}
            y={bodyBadgeY + 2}
            width={bodyBadgeW - 4}
            height={bodyBadgeH - 4}
            rx={Math.max(3, bodyBadgeH * 0.22)}
            fill={colorWithAlpha(accent, '24')}
            stroke={accent}
            strokeWidth="0.7"
            strokeOpacity="0.5"
          />
          <text
            x={bodyBadgeX + bodyBadgeW / 2}
            y={bodyBadgeY + bodyBadgeH / 2 + bodyBadgeFont * 0.36}
            textAnchor="middle"
            fill={shopProductCardColors.bodyText}
            fontFamily="Inter, Arial, sans-serif"
            fontSize={bodyBadgeFont}
            fontWeight={900}
          >
            {fitText(card.badge, bodyBadgeW - 12, bodyBadgeFont)}
          </text>
        </g>
      ) : null}
      {active ? (
        <>
          <path d={roundedRectPath(x - 2, y - 2, width + 4, height + 4, radius, 'top')} fill="none" stroke={edgeAccent} strokeWidth="2.2" opacity="0.3" style={{ filter: cardGlow }} />
          <path d={roundedRectPath(x + 3, y + 3, width - 6, height - 6, radius, 'top')} fill="none" stroke={edgeAccent} strokeWidth="1.7" opacity="0.74" />
          <line x1={x + hoverRailInset} y1={hoverRailY1} x2={x + hoverRailInset} y2={hoverRailY2} stroke={edgeAccent} strokeWidth="1.25" opacity="0.82" />
          <line x1={x + hoverRailInset + hoverRailPairGap} y1={hoverRailY1 + 4} x2={x + hoverRailInset + hoverRailPairGap} y2={hoverRailY2 - 4} stroke={edgeAccent} strokeWidth="0.9" opacity="0.42" />
          <line x1={x + width - hoverRailInset} y1={hoverRailY1} x2={x + width - hoverRailInset} y2={hoverRailY2} stroke={edgeAccent} strokeWidth="1.25" opacity="0.82" />
          <line x1={x + width - hoverRailInset - hoverRailPairGap} y1={hoverRailY1 + 4} x2={x + width - hoverRailInset - hoverRailPairGap} y2={hoverRailY2 - 4} stroke={edgeAccent} strokeWidth="0.9" opacity="0.42" />
        </>
      ) : null}
    </g>
  );
}

function ShopMainCarouselCardRow({
  x,
  y,
  width,
  height,
  cards,
  controls,
  ids,
  onCardAction,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  cards: ShopMainCarouselCardItem[];
  controls: FeaturedShowcaseControlGroups;
  ids: (name: string) => string;
  onCardAction?: (card: ShopMainCarouselCardItem) => void;
}) {
  if (cards.length === 0) return null;
  const gap = Math.max(0, controls.sideA.cardGap);
  const xPad = Math.max(4, Math.min(controls.sideA.cardPad, width * 0.02));
  const yPad = 0;
  const availableW = Math.max(1, width - xPad * 2);
  const fixedCardW = Math.max(74, controls.sideA.cardMinW);
  const cardW = Math.min(fixedCardW, Math.max(1, availableW - gap * Math.max(0, cards.length - 1)));
  const rowW = cards.length * cardW + gap * Math.max(0, cards.length - 1);
  const rowX = x + Math.max(xPad, (width - rowW) / 2);
  const cardY = y + yPad;
  const cardH = Math.max(1, height - yPad * 2);

  return (
    <g>
      {cards.map((card, index) => (
        <ShopMainCarouselCard
          key={card.key}
          x={rowX + index * (cardW + gap)}
          y={cardY}
          width={cardW}
          height={cardH}
          card={card}
          controls={controls}
          ids={ids}
          onAction={onCardAction}
        />
      ))}
    </g>
  );
}

export const ShopPageMainCarouselFrame: React.FC<FeaturedGameShowcaseProps> = ({
  featured,
  isLoading,
  controls = DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  onLearnMore,
  resolveImageUrl,
  renderMedia,
  allowDebugBounds = false,
  previewLayoutMode = 'auto',
  className,
  style,
  featuredLabel = 'Featured',
  cards = [],
  onCardAction,
  showBadges = true,
  showLearnMore = true,
  rightActionLabel,
  onRightAction,
  showNavigation = true,
  navigationPageCount,
  navigationPageIndex,
  onNavigationPageChange,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rawId = useId().replace(/:/g, '');
  const ids = useCallback((name: string) => `featured-showcase-${rawId}-${name}`, [rawId]);
  const [measuredWidth, setMeasuredWidth] = useState(1600);
  const [activeTabId, setActiveTabId] = useState<ShowcaseTabId>('featured');
  const [hoverTabId, setHoverTabId] = useState<ShowcaseTabId | null>(null);
  const [rightActionHovered, setRightActionHovered] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [prevImageIndex, setPrevImageIndex] = useState<number | null>(null);
  const mergedControls = useMemo(() => mergeFeaturedShowcaseControls(controls), [controls]);
  const variantControls = useMemo(
    () => resolveFeaturedShowcaseControlsForVariant(
      mergedControls,
      previewLayoutMode === 'narrow' ? 'narrow' : 'wide',
    ),
    [mergedControls, previewLayoutMode],
  );
  const c = useDeferredValue(variantControls);

  const tabs = useMemo(() => [
    { id: 'featured' as const, label: featuredLabel, games: featured.filter((game) => game.enabled !== false) },
  ], [featured, featuredLabel]);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const placeholderGame = useMemo(
    () => {
      const next = createPlaceholderGame(activeTab.label, activeTab.id);
      if (isLoading) {
        return {
          ...next,
          shortDescription: 'Catalog entries are loading.',
          description: 'Catalog entries are loading.',
        };
      }
      return next;
    },
    [activeTab.id, activeTab.label, isLoading],
  );
  const activeGames = showNavigation && activeTab.games.length > 0 ? activeTab.games : [placeholderGame];
  const currentSlideIndex = activeGames.length > 0 ? Math.min(activeSlideIndex, activeGames.length - 1) : 0;
  const currentGame = activeGames[currentSlideIndex] ?? placeholderGame;
  const currentImages = currentGame ? getGameImages(currentGame) : [];
  const playbackImageCount = currentGame
    ? getBannerPlaybackImageCount(currentImages.length, currentGame.carouselPlaybackMode)
    : 0;
  const safeActiveImageIndex = playbackImageCount > 0
    ? Math.min(activeImageIndex, playbackImageCount - 1)
    : 0;
  const safePrevImageIndex = prevImageIndex !== null && prevImageIndex < playbackImageCount ? prevImageIndex : null;

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const updateWidth = () => setMeasuredWidth(node.getBoundingClientRect().width || 1600);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!currentGame) return;
    if (playbackImageCount <= 1 && activeGames.length <= 1) return;
    const maxIndex = Math.max(0, playbackImageCount - 1);
    const lastImageDuration = currentGame.carouselLastImageDurationMs ?? 5000;
    const fastRotationDuration = currentGame.carouselFastRotationDurationMs ?? 1500;
    const defaultRotationDuration = currentGame.carouselDefaultRotationDurationMs ?? 3500;
    const fastRotationThreshold = currentGame.carouselFastRotationThreshold ?? 4;
    const frameDuration = safeActiveImageIndex === maxIndex
      ? lastImageDuration
      : safeActiveImageIndex >= fastRotationThreshold
        ? fastRotationDuration
        : defaultRotationDuration;
    const duration = frameDuration + (safeActiveImageIndex === maxIndex
      ? Math.max(0, currentGame.carouselSlideTransitionDelayMs ?? 0)
      : 0);
    const timeout = window.setTimeout(() => {
      const current = playbackImageCount > 0 ? Math.min(safeActiveImageIndex, maxIndex) : 0;
      if (current >= maxIndex && activeGames.length > 1) {
        setActiveSlideIndex((slideIndex) => {
          const safeSlideIndex = Math.min(slideIndex, activeGames.length - 1);
          return safeSlideIndex >= activeGames.length - 1 ? 0 : safeSlideIndex + 1;
        });
        setActiveImageIndex(0);
        setPrevImageIndex(null);
        return;
      }

      setPrevImageIndex(current);
      setActiveImageIndex(current >= maxIndex ? 0 : current + 1);
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [activeGames.length, currentGame, playbackImageCount, safeActiveImageIndex]);

  const goToSlide = useCallback((index: number, pageCount = activeGames.length) => {
    if (pageCount <= 0) return;
    setActiveSlideIndex(clamp(index, 0, pageCount - 1));
    setActiveImageIndex(0);
    setPrevImageIndex(null);
  }, [activeGames.length]);

  const handleTabChange = useCallback((tabId: ShowcaseTabId) => {
    setActiveTabId(tabId);
    setActiveSlideIndex(0);
    setActiveImageIndex(0);
    setPrevImageIndex(null);
  }, []);

  const vw = c.overall.viewWidth;
  const arrowW = c.arrows.width;
  const arrowH = c.arrows.height;
  const edgeInset = c.overall.edgeInset;
  const arrowGap = c.arrows.gap;
  const parentBleedX = Math.max(0, c.overall.parentBleedX ?? 0);
  const parentBleed = `${parentBleedX / 16}rem`;
  const showBounds = allowDebugBounds && Boolean(c.overall.debugBounds);
  const debugOuterStyle: React.CSSProperties = showBounds
    ? {
        outline: '2px dashed rgba(168, 85, 247, 0.96)',
        outlineOffset: '-2px',
      }
    : {};
  const wrapperStyle: React.CSSProperties = parentBleedX > 0
    ? {
        ...shellStyle,
        ...debugOuterStyle,
        marginLeft: `-${parentBleed}`,
        marginRight: `-${parentBleed}`,
        width: `calc(100% + ${parentBleed} + ${parentBleed})`,
        ...style,
      }
    : {
        ...shellStyle,
        ...debugOuterStyle,
        ...style,
      };
  const stageX = edgeInset + arrowW + arrowGap;
  const stageY = c.overall.stageY;
  const stageW = vw - (edgeInset + arrowW + arrowGap) * 2;
  const bodyInsetX = c.body.insetX;
  const measuredScale = Math.min(1, Math.max(1, measuredWidth) / vw);
  const canvasInsetX = c.overall.canvasInsetX * measuredScale;
  const measuredContentWidth = measuredWidth - canvasInsetX * 2;
  const renderScale = Math.min(1, Math.max(1, measuredContentWidth) / vw);
  const wideBodyW = stageW - bodyInsetX * 2;
  const autoIsNarrow = wideBodyW * renderScale < c.body.minAWidth;
  const breakpointIsNarrow = c.overall.narrowBreakpoint > 0 && measuredContentWidth <= c.overall.narrowBreakpoint;
  const isNarrow = previewLayoutMode === 'narrow' ? true : previewLayoutMode === 'wide' ? false : breakpointIsNarrow || autoIsNarrow;
  const vh = isNarrow ? c.overall.narrowHeight : c.overall.wideHeight;
  const stageH = isNarrow ? c.overall.stageNarrowH : c.overall.stageWideH;
  const marginTop = isNarrow ? c.overall.narrowMarginTop : c.overall.marginTop;
  const marginBottom = isNarrow ? c.overall.narrowMarginBottom : c.overall.marginBottom;
  const contentX = stageX + c.header.insetX;
  const contentW = stageW - c.header.insetX * 2;
  const tabTextSize = getFittingTabTextSize(tabs, contentW - 44, c.header.tabMinFont, c.header.tabMaxFont, c.header.tabFirstBoost, c.header.tabCountW);
  const tabFirstSize = tabTextSize + c.header.tabFirstBoost;
  const tabsH = Math.max(c.header.minTabsH, tabFirstSize + 18);
  const lineY = stageY + tabsH;
  const bodyX = stageX + bodyInsetX;
  const bodyW = stageW - bodyInsetX * 2;
  const leftW = bodyW;
  const cardVisibleCount = cards.length > 0
    ? getShopCardVisibleCount(leftW, cards.length, c.sideA.cardGap, c.sideA.cardMinW)
    : 0;
  const cardPageCount = cardVisibleCount > 0 ? Math.max(1, Math.ceil(cards.length / cardVisibleCount)) : 1;
  const activePageCount = cards.length > 0 ? cardPageCount : activeGames.length;
  const hasNavigation = showNavigation;
  const indicatorH = hasNavigation ? c.footer.height : 0;
  const footerY = stageY + stageH - indicatorH;
  const bodyY = lineY + c.body.topGap;
  const bodyH = footerY - c.body.bottomGap - bodyY;
  const hasCardPage = cards.length > 0;
  const topH = hasCardPage ? footerY - bodyY : bodyH;
  const bodyRadius = c.body.radius;
  const mediaClipPathId = ids('mediaClip');
  const aPath = roundedRectPath(bodyX, bodyY, bodyW, topH, bodyRadius);
  const currentCardPageIndex = cards.length > 0 ? clamp(activeSlideIndex, 0, cardPageCount - 1) : 0;
  const visibleCards = cards.length > 0
    ? cards.slice(currentCardPageIndex * cardVisibleCount, currentCardPageIndex * cardVisibleCount + cardVisibleCount)
    : [];
  const currentPageIndex = cards.length > 0 ? currentCardPageIndex : currentSlideIndex;
  const hasExternalNavigation = typeof navigationPageCount === 'number' && typeof navigationPageIndex === 'number' && Boolean(onNavigationPageChange);
  const resolvedPageCount = hasExternalNavigation ? Math.max(1, Math.round(navigationPageCount ?? 1)) : activePageCount;
  const resolvedPageIndex = hasExternalNavigation ? clamp(Math.round(navigationPageIndex ?? 0), 0, resolvedPageCount - 1) : currentPageIndex;
  const goToNavigationPage = (pageIndex: number) => {
    if (resolvedPageCount <= 0) return;
    const safePageIndex = clamp(pageIndex, 0, resolvedPageCount - 1);
    if (hasExternalNavigation) {
      onNavigationPageChange?.(safePageIndex);
      return;
    }
    goToSlide(safePageIndex, resolvedPageCount);
  };
  const goPrev = () => {
    if (resolvedPageCount <= 1) return;
    goToNavigationPage(resolvedPageIndex === 0 ? resolvedPageCount - 1 : resolvedPageIndex - 1);
  };
  const goNext = () => {
    if (resolvedPageCount <= 1) return;
    goToNavigationPage(resolvedPageIndex >= resolvedPageCount - 1 ? 0 : resolvedPageIndex + 1);
  };
  const visibleIndicatorCount = Math.min(resolvedPageCount, c.footer.maxVisible);
  const visibleIndicatorIndexes = Array.from({ length: visibleIndicatorCount }, (_, index) => index);
  const inactiveIndicatorW = c.footer.inactiveW;
  const activeIndicatorW = inactiveIndicatorW * c.footer.activeMultiplier;
  const indicatorPillH = c.footer.pillH;
  const indicatorMinGap = c.footer.minGap;
  const indicatorTrackX = bodyX + c.footer.trackInset;
  const indicatorTrackW = bodyW - c.footer.trackInset * 2;
  const indicatorWidthSum = visibleIndicatorIndexes.reduce((sum, indicatorIndex) => sum + (indicatorIndex === resolvedPageIndex ? activeIndicatorW : inactiveIndicatorW), 0);
  const indicatorGap = visibleIndicatorIndexes.length > 1 ? Math.max(2, Math.min(indicatorMinGap, (indicatorTrackW - indicatorWidthSum) / (visibleIndicatorIndexes.length - 1))) : indicatorMinGap;
  const actualIndicatorW = indicatorWidthSum + Math.max(0, visibleIndicatorIndexes.length - 1) * indicatorGap;
  const indicatorsStartX = indicatorTrackX + (indicatorTrackW - actualIndicatorW) / 2;
  const indicatorsY = footerY + Math.max(0, (indicatorH - indicatorPillH) / 2);
  const footerLineInset = Math.max(0, Math.min(c.footer.lineInset, bodyW / 2));
  const topBadgeY = bodyY + c.sideA.topBadgeY;
  const bottomBadgeY = bodyY + topH - c.sideA.bottomBadgeBottom;
  const learnMoreX = bodyX + leftW - c.sideA.learnMoreW - c.sideA.learnMoreRight;
  const learnMoreY = bodyY + topH - c.sideA.learnMoreH - c.sideA.learnMoreBottom;
  const rightActionTextSize = Math.max(9.4, Math.min(11.8, tabTextSize * 0.64));
  const rightActionW = rightActionLabel ? Math.max(88, Math.min(178, rightActionLabel.length * rightActionTextSize * 0.58 + 28)) : 0;
  const rightActionH = Math.max(20, Math.min(26, tabsH - 12));
  const rightActionX = bodyX + bodyW - rightActionW - 6;
  const rightActionY = Math.max(stageY + c.header.tabTop + 5, lineY - rightActionH - 7);
  const rightActionEnabled = Boolean(onRightAction);
  const rightActionStroke = rightActionEnabled && rightActionHovered ? c.colors.tabHover : shopProductCardColors.buttonStroke;
  const rightActionFill = rightActionEnabled && rightActionHovered ? shopProductCardColors.buttonHoverFill : shopProductCardColors.buttonFill;
  const handleRightActionKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (!onRightAction) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRightAction();
    }
  };

  const mediaSlot: FeaturedShowcaseMediaSlot = {
    game: currentGame,
    clipPathId: mediaClipPathId,
    x: bodyX,
    y: bodyY,
    width: leftW,
    height: topH,
    activeImageIndex: safeActiveImageIndex,
    prevImageIndex: safePrevImageIndex,
    isNarrow,
    mediaFit: c.sideA.mediaFit,
    mediaAnchorX: c.sideA.mediaAnchorX,
    mediaAnchorY: c.sideA.mediaAnchorY,
    mediaOffsetX: c.sideA.mediaOffsetX,
    mediaOffsetY: c.sideA.mediaOffsetY,
    mediaScale: c.sideA.mediaScale,
  };
  const transitionDurationMs = currentGame.carouselTransitionDurationMs ?? 1500;

  return (
    <div ref={wrapperRef} className={className} style={wrapperStyle}>
      <div style={{ paddingLeft: canvasInsetX, paddingRight: canvasInsetX, marginTop, marginBottom, outline: showBounds ? '2px dashed rgba(34, 211, 238, 0.55)' : undefined, outlineOffset: showBounds ? '-2px' : undefined }}>
        <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" preserveAspectRatio="xMidYMin meet" shapeRendering="geometricPrecision" textRendering="geometricPrecision" style={{ display: 'block', height: 'auto', width: '100%' }}>
          <ShowcaseDefs ids={ids} />

          {hasNavigation ? (
            <>
              <SvgArrowButton x={edgeInset} y={stageY + stageH / 2 - arrowH / 2} width={arrowW} height={arrowH} radius={c.arrows.radius} hoverColor={c.colors.arrowHover} direction="left" onClick={goPrev} ids={ids} />
              <SvgArrowButton x={vw - edgeInset - arrowW} y={stageY + stageH / 2 - arrowH / 2} width={arrowW} height={arrowH} radius={c.arrows.radius} hoverColor={c.colors.arrowHover} direction="right" onClick={goNext} ids={ids} />
            </>
          ) : null}

          <rect x={stageX} y={stageY} width={stageW} height={stageH} rx={c.overall.stageRadius} fill="#000000" opacity="0.28" filter={`url(#${ids('skeletonShadow')})`} pointerEvents="none" />
          <g>
            <defs>
              <clipPath id={mediaClipPathId}>
                <path d={aPath} />
              </clipPath>
            </defs>
            <rect x={stageX} y={stageY} width={stageW} height={stageH} rx={c.overall.stageRadius} fill={`url(#${ids('skeletonGlass')})`} stroke={c.colors.stageStroke} strokeWidth="2" strokeOpacity="0.9" />

            <g>
              {tabs.map((tab, tabIndex) => {
                const priorWidth = tabs.slice(0, tabIndex).reduce(
                  (sum, prior) => sum + getTabBlockWidth(prior.label, tabTextSize, c.header.tabFirstBoost, c.header.tabCountW),
                  0,
                );
                const mainX = contentX + priorWidth;
                const mainY = stageY + c.header.tabTop;
                const mainW = getTabBlockWidth(tab.label, tabTextSize, c.header.tabFirstBoost, c.header.tabCountW);
                const mainH = lineY - mainY;
                const countW = c.header.tabCountW;
                const labelX = mainX + countW;
                const labelW = mainW - countW;
                const isActive = tab.id === activeTabId;
                const isHover = hoverTabId === tab.id;
                const label = tab.label.toUpperCase();
                const firstLetter = label.slice(0, 1);
                const restLetters = label.slice(1);
                const mainPath = roundedRectPath(mainX, mainY, mainW, mainH, 12, 'top');
                const countPath = roundedRectPath(mainX, mainY, countW, mainH, 12, 'top');
                const labelRadius = Math.max(0, Math.min(12, labelW / 2, mainH / 2));
                const labelPath = `M${labelX} ${mainY} H${labelX + labelW - labelRadius} Q${labelX + labelW} ${mainY} ${labelX + labelW} ${mainY + labelRadius} V${mainY + mainH} H${labelX} Z`;
                const countFontSize = Math.min(mainH * 0.5, countW * 0.42);
                const textY = mainY + mainH - 11;
                const labelCenterX = labelX + labelW / 2;

                return (
                  <g key={tab.id} onClick={() => handleTabChange(tab.id)} onMouseEnter={() => setHoverTabId(tab.id)} onMouseLeave={() => setHoverTabId(null)} style={{ cursor: 'pointer' }} filter={isHover ? `url(#${ids('tabGreenGlow')})` : undefined}>
                    <path d={mainPath} fill={isActive ? `url(#${ids('tabSelectedFill')})` : isHover ? `url(#${ids('tabHoverFill')})` : '#071827'} fillOpacity={isActive ? 0.9 : isHover ? 0.78 : 0.14} stroke={isActive ? '#f5c84b' : isHover ? c.colors.tabHover : '#5fc9ff'} strokeOpacity={isActive ? 0.82 : isHover ? 0.86 : 0.28} strokeWidth="1.5" />
                    <path d={countPath} fill={isHover ? `url(#${ids('tabHoverFill')})` : `url(#${ids('tabCountGoldFill')})`} stroke={isHover ? c.colors.tabHover : '#f7c84a'} strokeOpacity={isHover ? 0.86 : 0.92} strokeWidth="1.35" filter={!isHover ? `url(#${ids('goldGlow')})` : undefined} />
                    <path d={countPath} fill={`url(#${ids('tabCountGoldShine')})`} opacity={isHover ? 0.1 : 0.32} pointerEvents="none" />
                    <path d={labelPath} fill={isActive ? '#1b2f22' : isHover ? '#0d4029' : '#071827'} fillOpacity={isActive ? 0.58 : isHover ? 0.66 : 0.18} stroke={isActive ? '#f5c84b' : isHover ? c.colors.tabHover : '#5fc9ff'} strokeOpacity={isActive ? 0.62 : isHover ? 0.78 : 0.22} strokeWidth="1.1" />
                    <text x={mainX + countW / 2} y={mainY + mainH / 2 + countFontSize * 0.35} textAnchor="middle" fontFamily="Arial Narrow, Arial, sans-serif" fontSize={countFontSize * 0.95} fontWeight="500" fill={isHover ? '#9dffc2' : '#8fd8ff'} filter={isHover ? `url(#${ids('tabGreenGlow')})` : undefined}>
                      {cards.length > 0 ? cards.length : tab.games.length}
                    </text>
                    <text x={labelCenterX} y={textY} textAnchor="middle" fontFamily="Impact, Arial Black" fill={isActive ? '#8fd8ff' : isHover ? '#9dffc2' : '#d9edff'} opacity={isActive || isHover ? 1 : 0.58} filter={isActive ? `url(#${ids('cyanGlow')})` : undefined}>
                      <tspan fontSize={tabFirstSize} letterSpacing="2">{firstLetter}</tspan>
                      <tspan fontSize={tabTextSize} letterSpacing="5" dx="4">{restLetters}</tspan>
                    </text>
                    {isActive ? <rect x={labelX} y={mainY + mainH - 5} width={labelW} height={c.header.activeLineH} fill={`url(#${ids('selectedTabGradientLine')})`} /> : null}
                  </g>
                );
              })}
            </g>

            {rightActionLabel ? (
              <g
                role="button"
                tabIndex={rightActionEnabled ? 0 : -1}
                aria-disabled={!rightActionEnabled}
                onClick={onRightAction}
                onKeyDown={handleRightActionKeyDown}
                onMouseEnter={() => setRightActionHovered(true)}
                onMouseLeave={() => setRightActionHovered(false)}
                style={{ cursor: rightActionEnabled ? 'pointer' : 'default' }}
                pointerEvents={rightActionEnabled ? 'auto' : 'none'}
              >
                {rightActionHovered && rightActionEnabled ? (
                  <rect x={rightActionX - 3} y={rightActionY - 3} width={rightActionW + 6} height={rightActionH + 6} rx="0" fill="none" stroke={rightActionStroke} strokeWidth="2.2" opacity="0.28" filter={`url(#${ids('cyanGlow')})`} />
                ) : null}
                <rect x={rightActionX} y={rightActionY} width={rightActionW} height={rightActionH} rx="0" fill={rightActionFill} stroke={rightActionStroke} strokeWidth="1.45" opacity={rightActionEnabled ? 1 : 0.62} />
                <text
                  x={rightActionX + rightActionW / 2}
                  y={rightActionY + rightActionH / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="Arial, sans-serif"
                  fontSize={rightActionTextSize}
                  fontWeight="800"
                  fill={rightActionEnabled ? '#dff8ff' : '#9bd9ff'}
                  opacity={rightActionEnabled ? 0.96 : 0.64}
                >
                  {rightActionLabel}
                </text>
              </g>
            ) : null}

            <line x1={bodyX} y1={lineY} x2={bodyX + bodyW} y2={lineY} stroke={c.colors.bodyStroke} strokeWidth="2" strokeOpacity="0.52" />

            <g clipPath={`url(#${mediaClipPathId})`}>
              {visibleCards.length > 0 ? (
                <ShopMainCarouselCardRow
                  x={bodyX}
                  y={bodyY}
                  width={leftW}
                  height={topH}
                  cards={visibleCards}
                  controls={c}
                  ids={ids}
                  onCardAction={onCardAction}
                />
              ) : renderMedia ? (
                renderMedia(mediaSlot)
              ) : (
                <DefaultMediaSlot slot={mediaSlot} images={currentImages} resolveImageUrl={resolveImageUrl} ids={ids} transitionDurationMs={transitionDurationMs} />
              )}
              {showBadges ? (
                <>
                  <BadgeRow x={bodyX + leftW - c.sideA.topBadgeInset} y={topBadgeY} badges={getTopBadges(currentGame)} align="right" height={c.sideA.topBadgeH} minWidth={86} fontSize={12} fontScale={6.8} ids={ids} />
                  <BadgeRow x={bodyX + c.sideA.bottomBadgeInset} y={bottomBadgeY} badges={getBottomBadges(currentGame)} align="left" height={c.sideA.bottomBadgeH} minWidth={96} fontSize={11.5} fontScale={7.6} ids={ids} />
                </>
              ) : null}
              {showLearnMore ? (
                <LearnMoreButton x={learnMoreX} y={learnMoreY} width={c.sideA.learnMoreW} height={c.sideA.learnMoreH} strokeColor={c.colors.learnMoreStroke} onClick={onLearnMore ? () => onLearnMore(getGameIdentifier(currentGame)) : undefined} ids={ids} />
              ) : null}
            </g>

            {visibleCards.length > 0 ? null : (
              <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyRadius} fill="none" stroke={c.colors.bodyStroke} strokeWidth={c.body.outlineWidth} />
            )}

            {hasNavigation && c.footer.showLine ? (
              <line
                x1={bodyX + footerLineInset}
                y1={footerY}
                x2={bodyX + bodyW - footerLineInset}
                y2={footerY}
                stroke={c.colors.bodyStroke}
                strokeWidth={c.footer.lineWidth}
                strokeOpacity={c.footer.lineOpacity}
              />
            ) : null}
            {hasNavigation ? (
              <g>
                {visibleIndicatorIndexes.map((indicatorIndex, visibleIndex) => {
                  const isActive = indicatorIndex === resolvedPageIndex;
                  const width = isActive ? activeIndicatorW : inactiveIndicatorW;
                  const x = indicatorsStartX + visibleIndicatorIndexes.slice(0, visibleIndex).reduce((sum, priorIndex) => sum + (priorIndex === resolvedPageIndex ? activeIndicatorW : inactiveIndicatorW), 0) + visibleIndex * indicatorGap;
                  return (
                    <g key={indicatorIndex} onClick={() => goToNavigationPage(indicatorIndex)} style={{ cursor: 'pointer' }} filter={isActive ? `url(#${ids('cyanGlow')})` : undefined}>
                      <rect x={x - indicatorGap * 0.5} y={indicatorsY - 7} width={width + indicatorGap} height={indicatorPillH + 14} rx={(indicatorPillH + 14) / 2} fill="transparent" opacity="0" pointerEvents="all" />
                      <rect x={x} y={indicatorsY} width={width} height={indicatorPillH} rx={indicatorPillH / 2} fill={isActive ? `url(#${ids('footerSelectedPill')})` : 'transparent'} stroke={isActive ? '#ffe187' : '#64d8ff'} strokeWidth={isActive ? 1.7 : 1.25} strokeOpacity={isActive ? 0.95 : 0.58} />
                    </g>
                  );
                })}
              </g>
            ) : null}
          </g>
          {showBounds ? (
            <g pointerEvents="none">
              <rect x={stageX} y={stageY} width={stageW} height={stageH} rx={c.overall.stageRadius} fill="none" stroke="#b855ff" strokeWidth="2.5" strokeDasharray="12 7" />
              <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={bodyRadius} fill="none" stroke="#47f29a" strokeWidth="2.5" strokeDasharray="12 7" />
              <rect x={bodyX} y={bodyY} width={leftW} height={topH} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="10 6" />
              <line x1={0} y1={footerY} x2={vw} y2={footerY} stroke="#38bdf8" strokeWidth="2" strokeDasharray="10 8" />
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
};
