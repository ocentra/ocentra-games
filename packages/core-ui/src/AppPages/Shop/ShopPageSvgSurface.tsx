import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  isShopProductPurchasable,
  productPriceLabel,
  productsForShopTab,
  SHOP_EARN_FREE_AC_IMAGE_URL,
  SHOP_HEADER_STATS,
  SHOP_INFO_DETAILS,
  SHOP_MARKETPLACE_CART_IMAGE_URL,
  SHOP_PREVIEWS,
  SHOP_QUESTS,
  SHOP_RIGHT_ROWS,
  SHOP_RIGHT_TABS,
  SHOP_SECTIONS,
  SHOP_SIDE_ITEMS,
  SHOP_STATIC_CREDIT_PACKS,
  SHOP_STATIC_PASSES,
  SHOP_TABS,
  SHOP_UI_COPY,
  SHOP_VAULT_SHOWCASE_GROUPS,
  type ShopIcon,
  type ShopQuest,
  type ShopStaticItem,
  type ShopTone,
  type ShopVaultShowcaseGroup,
} from './ShopPageSvgData';
import {
  HeaderBar,
  InfoRow,
  MiniIcon,
  Panel,
  ProductImage,
  SvgButton,
  Txt,
  WrappedText,
} from './ShopPageSvgPrimitives';
import {
  bottomRoundedRectPath,
  toneColor,
  topRoundedRectPath,
} from './ShopPageSvgGeometry';
import { roundedRectPath as lobbyRoundedRectPath } from '../Lobby/LobbyPageSvgGeometry';
import {
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from './ShopPageSvgSurfaceControls';
import { Defs as LobbySvgDefs } from '../Lobby/LobbyPageSvgPrimitives';
import {
  DailySpinBadgeSvg,
  DailySpinSpinnerSvg,
  type DailySpinRewardStatus,
} from '../../Common/Rewards/DailySpinSvg';
import { avatarImageUrls } from '@ocentra/app-assets/avatars';
import type { ShopProduct, ShopTab, ShopVaultDeckPreviewItem } from './ShopPageSvgTypes';
import { MainBottom } from './ShopPageMainBottom';
import { MainTop } from './ShopPageMainTop';
import type { ShopMainCarouselCardItem } from './ShopPageMainCarouselFrame.types';
import './ShopPageSvgSurface.css';

export type ShopPageSvgSurfaceProps = {
  activeTab: ShopTab;
  products: ShopProduct[];
  loadingProducts: boolean;
  loadingId: string | null;
  error: string | null;
  acBalance: number;
  onTabChange: (tab: ShopTab) => void;
  onClearError: () => void;
  onBuy: (product: ShopProduct) => void;
  controls?: Partial<ShopPageSvgControls> | null;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  renderVaultDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
};

type Metrics = {
  leftX: number;
  leftY: number;
  mainX: number;
  mainW: number;
  rightX: number;
  headerSideW: number;
  headerCenterX: number;
  headerStatsX: number;
};

type TileItem = ShopStaticItem & {
  product?: ShopProduct;
};

type BottomPreviewTarget = ShopTab | 'Earn Free AC';

const SHOP_MAIN_USE_HOME_FEATURED_BASELINE = true;

function staticCreditPackForProduct(product: ShopProduct, index: number): ShopStaticItem {
  const amount = product.acAmount ?? Number(product.displayName.match(/\d+/)?.[0]);
  return SHOP_STATIC_CREDIT_PACKS.find(pack => pack.title.startsWith(`${amount} `)) ?? SHOP_STATIC_CREDIT_PACKS[index % SHOP_STATIC_CREDIT_PACKS.length];
}

function staticPassForProduct(product: ShopProduct, index: number): ShopStaticItem {
  const name = product.displayName.toLowerCase();
  if (name.includes('founder')) return SHOP_STATIC_PASSES[2];
  if (name.includes('champion')) return SHOP_STATIC_PASSES[1];
  if (name.includes('arena')) return SHOP_STATIC_PASSES[0];
  return SHOP_STATIC_PASSES[index % SHOP_STATIC_PASSES.length];
}

function productToTile(product: ShopProduct, index: number): TileItem {
  if (product.productType === 'AC_CREDITS') {
    return {
      ...staticCreditPackForProduct(product, index),
      product,
    };
  }
  if (product.productType === 'SUBSCRIPTION') {
    return {
      ...staticPassForProduct(product, index),
      product,
    };
  }

  const tones: ShopTone[] = ['cyan', 'green', 'violet', 'orange', 'gold', 'silver'];
  const icons: ShopIcon[] = ['coins', 'cards', 'chest', 'trophy', 'crate', 'shield'];
  return {
    title: product.displayName,
    subtitle: product.description || product.benefits?.slice(0, 2).join(' / ') || product.productType.replace('_', ' '),
    tone: tones[index % tones.length],
    icon: icons[index % icons.length],
    badge: product.badge,
    price: productPriceLabel(product),
    imageUrl: '',
    benefits: product.benefits,
    product,
  };
}

function tileFallbacks(tab: ShopTab): TileItem[] {
  if (tab === 'Treasury') return SHOP_STATIC_CREDIT_PACKS;
  if (tab === 'Elite') return SHOP_STATIC_PASSES;
  return SHOP_SECTIONS[tab].featured ?? SHOP_SECTIONS[tab].categories ?? [];
}

function tilesForTab(products: ShopProduct[], tab: ShopTab): TileItem[] {
  const real = productsForShopTab(products, tab).map(productToTile);
  if (tab === 'Treasury' && real.length > 0) {
    return [
      ...real.slice(0, SHOP_STATIC_CREDIT_PACKS.length - 1),
      ...SHOP_STATIC_CREDIT_PACKS.slice(real.length),
    ];
  }
  return real.length > 0 ? real : tileFallbacks(tab);
}

function nextShopTab(tab: ShopTab): ShopTab {
  const index = SHOP_TABS.indexOf(tab);
  return SHOP_TABS[(index + 1) % SHOP_TABS.length];
}

function vaultGroupKeyFromTitle(title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return SHOP_VAULT_SHOWCASE_GROUPS.find(group => group.key === normalized || group.title.toLowerCase() === title.toLowerCase())?.key ?? SHOP_VAULT_SHOWCASE_GROUPS[0]?.key ?? '';
}

function vaultGroupTitleFromKey(key: string | null): string | null {
  return SHOP_VAULT_SHOWCASE_GROUPS.find(group => group.key === key)?.title ?? null;
}

function previewCardWidth(cfg: ShopPageSvgControls): number {
  const availableH = cfg.layout.bottomPreviewH - cfg.bottomPreview.headerH - cfg.bottomPreview.bottomPad;
  return Math.max(88, Math.min(122, availableH * 1.14));
}

function previewPanelWidth(row: typeof SHOP_PREVIEWS[number], cfg: ShopPageSvgControls): number {
  const itemCount = Math.max(1, row.items.length);
  return Math.max(
    260,
    cfg.bottomPreview.sidePad * 2 + itemCount * previewCardWidth(cfg) + Math.max(0, itemCount - 1) * cfg.bottomPreview.cardGap,
  );
}

function isCreditPackTile(item: TileItem): boolean {
  return item.product?.productType === 'AC_CREDITS' || SHOP_STATIC_CREDIT_PACKS.some(pack => pack.title === item.title);
}

function tileActionLabel(item: TileItem): string {
  if (item.title === 'Custom AC') return 'Custom Top Up';
  if (isCreditPackTile(item)) return 'Buy Now';
  if (item.price?.toLowerCase() === 'free') return 'Claim Free';
  if (item.price?.toLowerCase().includes('coming soon')) return 'Coming Soon';
  if (item.price?.toLowerCase().includes('printable')) return 'Buy Digital';
  if (item.tone === 'gold' && item.title.toLowerCase().includes('founder')) return SHOP_UI_COPY.passCard.lifetimeButton;
  if (item.product?.productType === 'SUBSCRIPTION' || SHOP_STATIC_PASSES.some(pass => pass.title === item.title)) return SHOP_UI_COPY.passCard.selectButton;
  return item.price ? 'Buy Now' : 'View';
}

function tileCardKey(item: TileItem, index: number): string {
  return item.product?.productId ?? `${item.title}-${index}`;
}

function staticTopCardKey(prefix: string, item: TileItem, index: number): string {
  return `${prefix}:${item.title}:${index}`;
}

function tileToMainCarouselCard(item: TileItem, index: number, loadingId: string | null): ShopMainCarouselCardItem {
  return {
    key: tileCardKey(item, index),
    title: item.title,
    subtitle: item.subtitle,
    bodyLines: item.benefits ?? [item.subtitle],
    tone: item.tone,
    icon: item.icon,
    badge: item.badge,
    imageUrl: item.imageUrl,
    price: item.price,
    actionLabel: tileActionLabel(item),
    loading: item.product ? loadingId === item.product.productId : false,
    disabled: item.product ? !isShopProductPurchasable(item.product) : false,
  };
}

function staticItemToImageMainCarouselCard(item: TileItem, index: number, prefix: string): ShopMainCarouselCardItem {
  const coverImage = prefix === 'play-access' && ['Private Tables', 'Public Tables', 'Room Chat'].includes(item.title);
  const fillImage = prefix === 'play-access' && ['Private Tables', 'Public Tables'].includes(item.title);
  const imageAnchor = item.title === 'Room Chat'
    ? 'bottom'
    : item.title.includes('Tables')
      ? 'top'
      : 'center';
  return {
    key: staticTopCardKey(prefix, item, index),
    title: item.title,
    subtitle: item.subtitle,
    bodyLines: item.benefits ?? [item.subtitle],
    layout: 'image',
    imageFit: fillImage ? 'fill' : coverImage ? 'cover' : 'contain',
    imageAnchor,
    badgePlacement: 'header',
    tone: item.tone,
    icon: item.icon,
    badge: item.badge,
    imageUrl: item.imageUrl,
    price: item.price,
    actionLabel: tileActionLabel(item),
  };
}

function vaultGroupToMainCarouselCard(group: ShopVaultShowcaseGroup): ShopMainCarouselCardItem {
  return {
    key: `vault:${group.key}`,
    title: group.title,
    subtitle: group.subtitle,
    bodyLines: [`${group.items.length} vault entries`, 'Select to preview group'],
    layout: 'image',
    badgePlacement: 'header',
    tone: group.tone,
    icon: group.icon,
    badge: group.badge,
    imageUrl: group.heroImageUrl,
    actionLabel: 'Open Vault Group',
  };
}

function tileDisabled(item: TileItem, onClick?: () => void): boolean {
  if (item.product) return !isShopProductPurchasable(item.product);
  if (!onClick) return true;
  return Boolean(item.price?.toLowerCase().includes('coming soon'));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function alphaColor(color: string, opacity: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const alpha = Math.round(clampNumber(opacity, 0, 1) * 255).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

function visibleCardCount(
  w: number,
  total: number,
  gap: number,
  sidePad: number,
  minCardW: number,
  maxVisible: number,
): number {
  if (total <= 0) return 1;
  const available = Math.max(0, w - sidePad * 2);
  const fit = Math.max(1, Math.floor((available + gap) / (minCardW + gap)));
  return Math.max(1, Math.min(total, maxVisible, fit));
}

function carouselPage<T>(items: T[], visibleCount: number, pageIndex: number): { pageItems: T[]; pageCount: number; safePageIndex: number } {
  if (items.length === 0) {
    return { pageItems: [], pageCount: 1, safePageIndex: 0 };
  }
  const safeVisibleCount = Math.max(1, Math.min(items.length, visibleCount));
  const pageCount = Math.max(1, Math.ceil(items.length / safeVisibleCount));
  const safePageIndex = ((pageIndex % pageCount) + pageCount) % pageCount;
  return {
    pageItems: items.slice(safePageIndex * safeVisibleCount, safePageIndex * safeVisibleCount + safeVisibleCount),
    pageCount,
    safePageIndex,
  };
}

function centeredCardRow(
  x: number,
  w: number,
  count: number,
  gap: number,
  sidePad: number,
  maxCardW: number,
): { cardW: number; rowX: number } {
  const safeCount = Math.max(1, count);
  const availableCardW = (w - sidePad * 2 - gap * Math.max(0, safeCount - 1)) / safeCount;
  const cardW = Math.max(80, Math.min(maxCardW, availableCardW));
  const rowW = safeCount * cardW + Math.max(0, safeCount - 1) * gap;
  return {
    cardW,
    rowX: x + Math.max(sidePad, (w - rowW) / 2),
  };
}

function carouselHandleInsideReserve(cfg: ShopPageSvgControls): number {
  const token = cfg.componentTokens.sectionFrame;
  return Math.max(0, token.handleW - token.handleOutset);
}

function sectionFrameContentInset(cfg: ShopPageSvgControls, showCarouselChrome: boolean): number {
  return cfg.componentTokens.sectionFrame.contentXInset + (showCarouselChrome ? carouselHandleInsideReserve(cfg) : 0);
}

function sectionFrameContentRect(
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: ShopPageSvgControls,
  showCarouselChrome: boolean,
): { x: number; y: number; w: number; h: number } {
  const token = cfg.componentTokens.sectionFrame;
  const inset = sectionFrameContentInset(cfg, showCarouselChrome);
  return {
    x: x + inset,
    y: y + cfg.mainBody.headerH + token.contentTopPad,
    w: Math.max(0, w - inset * 2),
    h: Math.max(0, h - cfg.mainBody.headerH - (showCarouselChrome ? token.footerReserve + token.contentBottomPad : token.contentBottomPad + 12)),
  };
}

function sectionFrameRowBounds(
  x: number,
  w: number,
  cfg: ShopPageSvgControls,
  fillFrame: boolean,
): { x: number; w: number } {
  const rowPad = fillFrame ? cfg.mainBody.bottomRowInnerPad : cfg.mainBody.topRowInnerPad;
  const inset = sectionFrameContentInset(cfg, true) + rowPad;
  return {
    x: x + inset,
    w: Math.max(0, w - inset * 2),
  };
}

function mainSlotFrameBounds(
  x: number,
  w: number,
  cfg: ShopPageSvgControls,
  slot: 'top' | 'bottom',
): { x: number; w: number } {
  const inset = slot === 'top' ? cfg.mainBody.topFrameXInset : cfg.mainBody.bottomFrameXInset;
  return {
    x: x + inset,
    w: Math.max(0, w - inset * 2),
  };
}

function mainBottomOverlayContentRect(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const stageX = 21;
  const lineY = 44;
  const bodyInsetX = 16;
  const bodyY = lineY + 7;
  const footerY = h - 20;
  return {
    x: x + stageX + bodyInsetX,
    y: y + bodyY,
    w: Math.max(0, w - stageX * 2 - bodyInsetX * 2),
    h: Math.max(0, footerY - 5 - bodyY),
  };
}

function cardSlotAdjustment(cfg: ShopPageSvgControls, fillFrame: boolean): { yShift: number; hShift: number } {
  return fillFrame
    ? { yShift: cfg.mainBody.bottomCardYShift, hShift: cfg.mainBody.bottomCardHShift }
    : { yShift: cfg.mainBody.topCardYShift, hShift: cfg.mainBody.topCardHShift };
}

function CardHoverChrome({
  x,
  y,
  w,
  h,
  color,
  active,
  selected = false,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  active: boolean;
  selected?: boolean;
  cfg: ShopPageSvgControls;
}) {
  if (!active) return null;
  const token = cfg.componentTokens.cardChrome;
  return (
    <>
      <rect x={x - token.hoverPad} y={y - token.hoverPad} width={w + token.hoverPad * 2} height={h + token.hoverPad * 2} rx={token.radius} fill="none" stroke={color} strokeWidth={selected ? token.selectedOuterStrokeWidth : token.hoverOuterStrokeWidth} opacity={selected ? token.selectedOuterOpacity : token.hoverOuterOpacity} filter="url(#shopSoftGlow)" />
      <rect x={x + token.innerInset} y={y + token.innerInset} width={w - token.innerInset * 2} height={h - token.innerInset * 2} rx={token.radius} fill="none" stroke={color} strokeWidth={selected ? token.selectedInnerStrokeWidth : token.hoverInnerStrokeWidth} opacity={selected ? token.selectedInnerOpacity : token.hoverInnerOpacity} />
    </>
  );
}

function CarouselSideHandle({
  x,
  y,
  side,
  label,
  active = true,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  side: 'left' | 'right';
  label: string;
  active?: boolean;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const isLeft = side === 'left';
  const bodyPath = isLeft
    ? lobbyRoundedRectPath(x, y, token.handleW, token.handleH, { tl: token.handleRadius, tr: 0, br: 0, bl: token.handleRadius })
    : lobbyRoundedRectPath(x, y, token.handleW, token.handleH, { tl: 0, tr: token.handleRadius, br: token.handleRadius, bl: 0 });
  const arrowY = y + token.handleH / 2;
  const arrowTipX = isLeft ? x + token.handleW * 0.38 : x + token.handleW * 0.62;
  const arrowBackX = isLeft ? x + token.handleW * 0.62 : x + token.handleW * 0.38;
  const arrowPath = isLeft
    ? `M ${arrowTipX} ${arrowY} L ${arrowBackX} ${arrowY - token.handleArrowHalfH} V ${arrowY + token.handleArrowHalfH} Z`
    : `M ${arrowTipX} ${arrowY} L ${arrowBackX} ${arrowY - token.handleArrowHalfH} V ${arrowY + token.handleArrowHalfH} Z`;
  return (
    <g
      className={`lobby-ui-hit${active ? '' : ' is-disabled'}`}
      aria-disabled={!active}
      filter="url(#shopGlassGlow)"
      opacity={active ? 1 : 0.56}
    >
      <path d={bodyPath} fill={cfg.colors.frameHandleFill} stroke={cfg.colors.frameStroke} strokeWidth={token.handleOuterStrokeWidth} pointerEvents="none" />
      <path d={bodyPath} fill={cfg.colors.frameHandleGlassFill} stroke={cfg.colors.frameHandleGlassStroke} strokeWidth={token.handleGlassStrokeWidth} pointerEvents="none" />
      <path d={arrowPath} fill={cfg.colors.frameHandleArrow} pointerEvents="none" />
      <path d={bodyPath} fill="none" stroke={cfg.colors.frameHandleAccent} strokeWidth={token.handleAccentStrokeWidth} opacity={token.handleAccentOpacity} pointerEvents="none" />
      <rect
        x={x - token.handleHitPadX}
        y={y - token.handleHitPadY}
        width={token.handleW + token.handleHitPadX * 2}
        height={token.handleH + token.handleHitPadY * 2}
        fill={cfg.colors.frameHandleHitFill}
        className="shop-page-svg-clickable"
        aria-label={label}
        role="button"
        tabIndex={0}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!active) return;
          onClick();
        }}
        onKeyDown={(event) => {
          if (!active) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
      />
    </g>
  );
}

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

function TransparentAssetImage({
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
  return (
    <g>
      <image
        href={imageUrl}
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

function RewardQuestArtwork({
  x,
  y,
  w,
  h,
  quest,
  cfg,
  featured,
  active,
  onSpin,
  reward,
  showBackground = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  quest: ShopQuest;
  cfg: ShopPageSvgControls;
  featured: boolean;
  active: boolean;
  onSpin?: () => void;
  reward?: DailySpinRewardStatus | null;
  showBackground?: boolean;
}) {
  const cx = w / 2;
  const cy = h / 2;
  const token = cfg.componentTokens.earnRewards;
  const artW = featured ? w * token.artFeaturedWidthRatio : w * token.artDefaultWidthRatio;
  const artH = featured ? h * token.artFeaturedHeightRatio : h * token.artDefaultHeightRatio;
  const showSpinner = quest.key === 'daily_spin';
  return (
    <svg x={x} y={y} width={w} height={h} overflow="hidden">
      {showBackground ? <rect x="0" y="0" width={w} height={h} fill="url(#shopRewardHaloGradient)" opacity={active ? token.artActiveOpacity : token.artIdleOpacity} filter={active ? 'url(#shopSoftGlow)' : undefined} /> : null}
      {showSpinner ? (
        <DailySpinBadgeSvg x={w * token.spinnerXRatio} y={h * token.spinnerYRatio} w={w * token.spinnerWRatio} h={h * token.spinnerHRatio} reward={reward} onOpen={onSpin ?? (() => undefined)} />
      ) : (
        <TransparentAssetImage x={cx - artW / 2} y={cy - artH / 2} w={artW} h={artH} imageUrl={quest.imageUrl} cfg={cfg} glow={active} />
      )}
    </svg>
  );
}

function HeaderBadge({
  x,
  y,
  w,
  h,
  title,
  sub,
  icon,
  tone,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  icon: ShopIcon;
  tone: ShopTone;
  cfg: ShopPageSvgControls;
}) {
  const headerToken = cfg.componentTokens.headerLayer;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={headerToken.badgeRadius}
        fill={cfg.colors.headerFillAlt}
        stroke={cfg.colors.headerBadgeStroke}
        strokeWidth={headerToken.badgeStrokeWidth}
        strokeOpacity={headerToken.badgeStrokeOpacity}
      />
      <MiniIcon type={icon} x={x + headerToken.badgeIconX} y={y + h / 2 - headerToken.badgeIconSize / 2} size={headerToken.badgeIconSize} tone={tone} cfg={cfg} />
      <Txt x={x + headerToken.badgeTextX} y={y + h / 2 + headerToken.badgeTitleYShift} size={headerToken.badgeTitleSize} weight={headerToken.badgeTitleWeight} cfg={cfg}>{title}</Txt>
      <Txt x={x + headerToken.badgeTextX} y={y + h / 2 + headerToken.badgeSubYShift} size={headerToken.badgeSubSize} fill={cfg.colors.headerBadgeSubText} cfg={cfg}>{sub}</Txt>
    </g>
  );
}

function MarketplaceCartIcon({ x, y, size, cfg }: { x: number; y: number; size: number; cfg: ShopPageSvgControls }) {
  const token = cfg.iconTokens.cart;
  const scale = size / token.baseSize;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx={token.centerX} cy={token.centerY} r={token.outerR} fill="url(#shopCartOrbGradient)" stroke={cfg.colors.edgeStroke} strokeWidth={token.outerStrokeWidth} filter="url(#shopSoftGlow)" />
      <circle cx={token.centerX} cy={token.centerY} r={token.innerR} fill={cfg.colors.cartInnerFill} stroke={cfg.colors.cartInnerStroke} strokeOpacity={token.innerStrokeOpacity} strokeWidth={token.innerStrokeWidth} />
      <image href={SHOP_MARKETPLACE_CART_IMAGE_URL} x={token.imageX} y={token.imageY} width={token.imageSize} height={token.imageSize} preserveAspectRatio="xMidYMid meet" mask="url(#shopCartImageMask)" />
    </g>
  );
}

function ArenaCreditCoinIcon({ x, y, size, cfg }: { x: number; y: number; size: number; cfg: ShopPageSvgControls }) {
  const token = cfg.iconTokens.arenaCoin;
  const scale = size / token.baseSize;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx={token.centerX} cy={token.centerY} r={token.outerR} fill="url(#shopAcCoinGradient)" stroke={cfg.colors.coinOuterStroke} strokeWidth={token.outerStrokeWidth} filter="url(#shopSoftGlow)" />
      <circle cx={token.centerX} cy={token.centerY} r={token.innerR} fill="none" stroke={cfg.colors.coinInnerStroke} strokeOpacity={token.innerStrokeOpacity} strokeWidth={token.innerStrokeWidth} />
      <circle cx={token.centerX} cy={token.centerY} r={token.centerR} fill={`rgba(255,255,255,${token.centerFillOpacity})`} stroke={cfg.colors.gold} strokeOpacity={token.centerStrokeOpacity} strokeWidth={token.centerStrokeWidth} />
      <Txt x={token.textX} y={token.textY} anchor="middle" size={token.textSize} weight={token.textWeight} fill={cfg.colors.coinText} cfg={cfg}>AC</Txt>
    </g>
  );
}

function HeaderLayer({
  x,
  y,
  w,
  h,
  rightX,
  acBalance,
  cfg,
  onArenaCreditsInfo,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rightX: number;
  acBalance: number;
  cfg: ShopPageSvgControls;
  onArenaCreditsInfo: () => void;
}) {
  const token = cfg.componentTokens.headerLayer;
  const copy = SHOP_UI_COPY.header;
  const bodyX = x + token.pad + cfg.header.cartZoneW + token.bodyGap;
  const badgeTotal = cfg.header.badgeW * 3 + cfg.header.badgeGap * 2;
  const badgesX = x + w - token.pad - badgeTotal;
  const balanceX = x + w + cfg.header.gap;
  const balanceW = Math.max(token.balanceMinWidth, rightX - balanceX - cfg.header.gap);
  return (
    <g>
      <Panel
        x={x}
        y={y}
        w={w}
        h={h}
        r={cfg.header.panelRadius}
        strokeWidth={token.panelStrokeWidth}
        strokeOpacity={token.panelStrokeOpacity}
        glowStrokeWidth={token.panelGlowStrokeWidth}
        glowOpacity={token.panelGlowOpacity}
        cfg={cfg}
      >
        <MarketplaceCartIcon x={x + token.pad} y={y + h / 2 - cfg.header.cartSize / 2} size={cfg.header.cartSize} cfg={cfg} />
        <line x1={x + token.pad + cfg.header.cartZoneW} y1={y + token.dividerTopPad} x2={x + token.pad + cfg.header.cartZoneW} y2={y + h - token.dividerBottomPad} stroke={cfg.colors.line} strokeWidth={token.dividerStrokeWidth} />
        <Txt x={bodyX} y={y + token.titleY} size={cfg.header.titleSize} weight={token.titleWeight} cfg={cfg}>{copy.title}</Txt>
        {copy.badges.map((badge, index) => (
          <HeaderBadge
            key={badge.title}
            x={badgesX + index * (cfg.header.badgeW + cfg.header.badgeGap)}
            y={y + token.badgeY}
            w={cfg.header.badgeW}
            h={cfg.header.badgeH}
            title={badge.title}
            sub={badge.sub}
            icon={badge.icon as ShopIcon}
            tone={badge.tone as ShopTone}
            cfg={cfg}
          />
        ))}
        <line x1={bodyX} y1={y + token.separatorY} x2={x + w - token.pad} y2={y + token.separatorY} stroke={cfg.colors.line} strokeWidth={token.separatorStrokeWidth} strokeOpacity={token.bodySeparatorOpacity} />
        <Txt x={bodyX + (w - (bodyX - x) - token.pad) / 2} y={y + token.subtitleY} fill={cfg.colors.mutedText} size={cfg.header.subtitleSize} weight={token.subtitleWeight} anchor="middle" cfg={cfg}>{copy.subtitle}</Txt>
      </Panel>
      <g className="shop-page-svg-clickable" onClick={onArenaCreditsInfo} role="button" tabIndex={0}>
        <Panel
          x={balanceX}
          y={y}
          w={balanceW}
          h={h}
          r={token.balanceRadius}
          strokeWidth={token.balancePanelStrokeWidth}
          strokeOpacity={token.balancePanelStrokeOpacity}
          glowStrokeWidth={token.balancePanelGlowStrokeWidth}
          glowOpacity={token.balancePanelGlowOpacity}
          cfg={cfg}
        >
          <ArenaCreditCoinIcon x={balanceX + token.balanceCoinX} y={y + token.balanceCoinY} size={token.balanceCoinSize} cfg={cfg} />
          <line x1={balanceX + token.balanceDividerX} y1={y + token.balanceDividerTop} x2={balanceX + token.balanceDividerX} y2={y + h - token.balanceDividerBottom} stroke={cfg.colors.line} strokeWidth={token.balanceDividerStrokeWidth} />
          <Txt x={balanceX + token.balanceTextX} y={y + token.balanceTitleY} fill={cfg.colors.balanceText} size={token.balanceTitleSize} weight={token.balanceTitleWeight} cfg={cfg}>{copy.balanceTitle}</Txt>
          <Txt x={balanceX + token.balanceTextX} y={y + token.balanceValueY} fill={cfg.colors.gold} size={token.balanceValueSize} weight={token.balanceValueWeight} cfg={cfg}>{acBalance.toLocaleString()}</Txt>
          <Txt x={balanceX + token.balanceUnitX} y={y + token.balanceUnitY} size={token.balanceUnitSize} weight={token.balanceUnitWeight} fill={cfg.colors.balanceUnitText} cfg={cfg}>{copy.balanceUnit}</Txt>
          <Txt x={balanceX + token.balanceTextX} y={y + token.balanceSubY} fill={cfg.colors.headerBadgeSubText} size={token.balanceSubSize} cfg={cfg}>{copy.balanceSub}</Txt>
        </Panel>
      </g>
    </g>
  );
}

function TopStatsLayer({
  x,
  y,
  w,
  h,
  cfg,
  onElite,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  onElite: () => void;
}) {
  const token = cfg.componentTokens.topStatsLayer;
  const passW = Math.min(token.passMaxW, Math.max(token.passMinW, w * token.passRatioW));
  const statStart = x + token.padX + passW + token.gapAfterPass;
  const statW = (w - token.padX * 2 - passW - token.gapAfterPass - token.statRightReserve) / SHOP_HEADER_STATS.length;
  return (
    <Panel
      x={x}
      y={y}
      w={w}
      h={h}
      r={token.panelRadius}
      stroke={cfg.colors.statsPanelStroke}
      strokeWidth={token.panelStrokeWidth}
      strokeOpacity={token.panelStrokeOpacity}
      glowStrokeWidth={token.panelGlowStrokeWidth}
      glowOpacity={token.panelGlowOpacity}
      cfg={cfg}
    >
      <g onClick={onElite} role="button" tabIndex={0} className="shop-page-svg-clickable">
        <rect x={x + token.padX} y={y + token.passY} width={passW} height={token.passH} rx={token.passRadius} fill={cfg.colors.headerFillAlt} stroke={cfg.colors.statsPassStroke} strokeWidth={token.passStrokeWidth} strokeOpacity={token.passStrokeOpacity} />
        <MiniIcon type="crown" x={x + token.padX + token.passIconX} y={y + token.passY + token.passIconY} size={token.passIconSize} tone="gold" cfg={cfg} />
        <Txt x={x + token.padX + token.passTextX} y={y + token.passY + token.passTitleY} fill={cfg.colors.balanceText} size={token.passTitleSize} weight={token.passTitleWeight} cfg={cfg}>Active Pass</Txt>
        <Txt x={x + token.padX + token.passTextX} y={y + token.passY + token.passValueY} size={token.passValueSize} weight={token.passValueWeight} cfg={cfg}>Champion</Txt>
      </g>
      {SHOP_HEADER_STATS.map((stat, index) => (
        <g key={stat.label}>
          <rect x={statStart + index * (statW + token.statGap)} y={y + token.statY} width={statW} height={token.statH} rx={token.statRadius} fill={cfg.colors.statsCardFill} stroke={cfg.colors.statsCardStroke} strokeWidth={token.statStrokeWidth} strokeOpacity={token.statStrokeOpacity} />
          <Txt x={statStart + index * (statW + token.statGap) + statW / 2} y={y + token.statY + token.statLabelY} anchor="middle" size={token.statLabelSize} fill={cfg.colors.headerBadgeSubText} weight={token.statLabelWeight} cfg={cfg}>{stat.label}</Txt>
          <Txt x={statStart + index * (statW + token.statGap) + statW / 2} y={y + token.statY + token.statValueY} anchor="middle" size={token.statValueSize} weight={token.statValueWeight} cfg={cfg}>{stat.value}</Txt>
        </g>
      ))}
    </Panel>
  );
}

function SectionFrame({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  rightText,
  accent,
  children,
  cfg,
  countText,
  pageIndex = 0,
  pageCount = 1,
  onRightTextClick,
  onPrevious,
  onNext,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
  rightText?: string;
  accent: string;
  children: ReactNode;
  cfg: ShopPageSvgControls;
  countText?: string;
  pageIndex?: number;
  pageCount?: number;
  onRightTextClick?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const handleY = y + Math.max(0, (h - token.handleH) / 2);
  const showCarouselChrome = Boolean(countText);
  const resolvedPageCount = Math.max(1, pageCount);
  const canPage = resolvedPageCount > 1;
  const tabY = y + token.tabTop;
  const countW = countText ? token.countTabW : 0;
  const countX = x + token.countTabX;
  const labelW = Math.max(token.titleTabMinW, Math.min(token.titleTabMaxW, title.length * token.titleTabCharW + 58));
  const labelX = countX + countW + token.titleTabGap;
  const titleLineX = Math.min(x + w - 90, labelX + labelW + 16);
  const tabBottom = tabY + token.tabH;
  const contentRect = sectionFrameContentRect(x, y, w, h, cfg, showCarouselChrome);
  const footerLineY = y + h - token.footerLineBottom;
  const safePageIndex = ((pageIndex % resolvedPageCount) + resolvedPageCount) % resolvedPageCount;
  const dotsW = Math.max(0, resolvedPageCount - 1) * token.dotGap + resolvedPageCount * token.dotW;
  const dotsX = x + w / 2 - dotsW / 2;
  return (
    <g>
      <g filter="url(#shopGlassGlow)">
        <path d={lobbyRoundedRectPath(x, y, w, h, token.radius)} fill="none" stroke={cfg.colors.frameStroke} strokeWidth={token.outerGlowStrokeWidth} opacity={token.outerGlowOpacity} filter="url(#shopSoftGlow)" />
        <path d={lobbyRoundedRectPath(x, y, w, h, token.radius)} fill={cfg.colors.frameFill} stroke={cfg.colors.frameStroke} strokeWidth={token.outerStrokeWidth} />
        <path d={lobbyRoundedRectPath(x + token.glassInset, y + token.glassInset, w - token.glassInset * 2, h - token.glassInset * 2, token.glassRadius)} fill={cfg.colors.frameGlassFill} stroke={cfg.colors.frameGlassStroke} strokeWidth={token.innerStrokeWidth} />
        <path d={lobbyRoundedRectPath(x + token.glassHighlightInset, y + token.glassHighlightInset, w - token.glassHighlightInset * 2, Math.min(token.glassHighlightH, h - token.glassHighlightInset * 2), token.glassRadius)} fill={cfg.colors.frameGlassHighlightFill} stroke="none" />
        <line x1={titleLineX} y1={y + token.headerLineY} x2={x + w - token.headerLineRightPad} y2={y + token.headerLineY} stroke={cfg.colors.frameRail} strokeWidth={token.headerLineStrokeWidth} opacity={token.headerLineOpacity} />
        {countText ? (
          <path d={`M ${countX} ${tabBottom} V ${tabY + token.tabRadius} Q ${countX} ${tabY} ${countX + token.tabRadius} ${tabY} H ${countX + countW - token.tabRadius} Q ${countX + countW} ${tabY} ${countX + countW} ${tabY + token.tabRadius} V ${tabBottom} Z`} fill={cfg.colors.frameCountFill} stroke={cfg.colors.frameCountStroke} strokeWidth={token.countTabStrokeWidth} />
        ) : null}
        {countText ? <Txt x={countX + countW / 2} y={tabY + token.tabH * token.countTextBaselineRatio} anchor="middle" size={token.countTextSize} weight={token.countTextWeight} cfg={cfg}>{countText}</Txt> : null}
        <path d={`M ${labelX} ${tabBottom} V ${tabY + token.tabRadius} Q ${labelX} ${tabY} ${labelX + token.tabRadius} ${tabY} H ${labelX + labelW - token.tabRadius} Q ${labelX + labelW} ${tabY} ${labelX + labelW} ${tabY + token.tabRadius} V ${tabBottom} Z`} fill={cfg.colors.frameTitleFill} stroke={cfg.colors.frameTitleStroke} strokeWidth={token.titleTabStrokeWidth} />
        <path d={`M ${labelX + token.titleHighlightInsetX} ${tabY + token.tabRadius + token.titleHighlightTopShift} H ${labelX + labelW - token.titleHighlightInsetX} V ${tabY + token.tabRadius + token.titleHighlightTopShift + token.titleHighlightH} H ${labelX + token.titleHighlightInsetX} Z`} fill={cfg.colors.frameTitleHighlightFill} stroke="none" />
        <Txt x={labelX + labelW / 2} y={tabY + token.tabH * token.titleTextBaselineRatio} anchor="middle" fill={cfg.colors.frameTitleText} size={token.titleTextSize} weight={token.titleTextWeight} cfg={cfg}>{title}</Txt>
        {countText ? null : <WrappedText x={x + token.subtitleX} y={y + token.subtitleY} width={w - token.subtitleRightReserve} lines={subtitle} size={token.subtitleSize} lineHeight={token.subtitleLineHeight} fill={cfg.colors.frameSubtitleText} maxLines={token.subtitleMaxLines} cfg={cfg} />}
        {rightText ? (
          <g onClick={onRightTextClick} role="button" tabIndex={0} className="shop-page-svg-clickable">
            <rect x={x + w - token.rightTextPad - token.rightUnderlineWidth - 14} y={y + 4} width={token.rightUnderlineWidth + 34} height={cfg.mainBody.headerH - 8} fill="transparent" />
            <Txt x={x + w - token.rightTextPad} y={y + token.rightTextY} anchor="end" fill={cfg.colors.frameActionText} size={token.rightTextSize} weight={token.rightTextWeight} cfg={cfg}>{rightText}</Txt>
            <line x1={x + w - token.rightTextPad - token.rightUnderlineWidth} y1={y + token.rightUnderlineY} x2={x + w - token.rightTextPad} y2={y + token.rightUnderlineY} stroke={cfg.colors.frameActionText} strokeOpacity={token.rightUnderlineOpacity} />
          </g>
        ) : null}
        <rect x={contentRect.x} y={contentRect.y} width={contentRect.w} height={contentRect.h} rx={token.contentRadius} fill="none" stroke={accent} strokeWidth={token.contentStrokeWidth} opacity={token.contentStrokeOpacity} />
        {countText ? <line x1={x + token.footerLineInset} y1={footerLineY} x2={x + w - token.footerLineInset} y2={footerLineY} stroke={cfg.colors.frameRail} strokeWidth={token.footerLineStrokeWidth} opacity={token.footerLineOpacity} /> : null}
        {countText ? (
          <g>
            {Array.from({ length: resolvedPageCount }, (_, index) => (
              <rect
                key={index}
                x={dotsX + index * (token.dotW + token.dotGap)}
                y={y + h - token.dotBottom}
                width={token.dotW}
                height={token.dotH}
                rx={token.dotH / 2}
                fill={index === safePageIndex ? cfg.colors.frameDotActive : cfg.colors.frameDotInactive}
                opacity={index === safePageIndex ? 1 : 0.55}
              />
            ))}
          </g>
        ) : null}
      </g>
      {children}
      {showCarouselChrome ? <CarouselSideHandle x={x - token.handleOutset} y={handleY} side="left" label={`Previous ${title} items`} active={canPage} cfg={cfg} onClick={() => onPrevious?.()} /> : null}
      {showCarouselChrome ? <CarouselSideHandle x={x + w - token.handleW + token.handleOutset} y={handleY} side="right" label={`Next ${title} items`} active={canPage} cfg={cfg} onClick={() => onNext?.()} /> : null}
    </g>
  );
}

function ProductTile({
  x,
  y,
  w,
  h,
  item,
  cfg,
  selected = false,
  loading = false,
  onInspect,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  cfg: ShopPageSvgControls;
  selected?: boolean;
  loading?: boolean;
  onInspect?: () => void;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor(item.tone, cfg);
  const token = cfg.componentTokens.productTile;
  const chrome = cfg.componentTokens.cardChrome;
  const creditPack = isCreditPackTile(item);
  const headerH = creditPack ? token.creditHeaderH : token.defaultHeaderH;
  const footerH = item.price ? (creditPack ? token.creditFooterH : token.defaultFooterH) : token.infoFooterH;
  const imageY = y + headerH;
  const footerY = y + h - footerH;
  const disabled = tileDisabled(item, onClick);
  const infoOnly = !item.price && !item.product;
  const titleXOffset = creditPack ? token.creditTitleX : infoOnly ? token.infoTitleX : token.defaultTitleX;
  const titleRightReserve = creditPack ? token.creditTitleReserve : infoOnly ? item.badge ? token.infoBadgeTitleReserve : token.infoTitleReserve : token.defaultTitleReserve;
  const titleSize = creditPack ? token.creditTitleSize : infoOnly ? token.infoTitleSize : token.defaultTitleSize;
  const badgeW = infoOnly ? token.infoBadgeW : token.defaultBadgeW;
  const badgeRight = infoOnly ? token.infoBadgeRight : token.defaultBadgeRight;
  const badgeTextRight = infoOnly ? token.infoBadgeTextRight : token.defaultBadgeTextRight;
  const activeFill = alphaColor(color, chrome.activeFillOpacity);
  return (
    <g onClick={onInspect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="shop-page-svg-clickable">
      <Panel x={x} y={y} w={w} h={h} r={token.radius} fill={hovered || selected ? activeFill : cfg.colors.panelFill} stroke={selected || hovered ? color : cfg.colors.tileStroke} cfg={cfg}>
        <HeaderBar x={x + token.headerInset} y={y + token.headerInset} w={w - token.headerInset * 2} h={headerH} fill={cfg.colors.headerFillAlt} stroke={color} cfg={cfg}>
          {creditPack ? null : <MiniIcon type={item.icon} x={x + token.iconX} y={y + token.iconY} size={token.iconSize} tone={item.tone} cfg={cfg} />}
          <WrappedText x={x + titleXOffset} y={y + (creditPack ? token.creditTitleY : token.defaultTitleY)} width={w - titleRightReserve} lines={item.title} size={titleSize} lineHeight={token.titleLineHeight} fill={color} weight={token.titleWeight} maxLines={1} cfg={cfg} />
          {item.badge ? (
            <>
              <rect x={x + w - badgeRight} y={y + token.badgeY} width={badgeW} height={token.badgeH} rx={cfg.svgDefaults.roundedNone} fill={color} opacity={token.badgeFillOpacity} stroke={color} />
              <Txt x={x + w - badgeTextRight} y={y + token.badgeY + token.badgeH / 2} anchor="middle" size={token.badgeTextSize} weight={token.badgeTextWeight} cfg={cfg}>{item.badge}</Txt>
            </>
          ) : null}
        </HeaderBar>
        {creditPack ? (
          <TransparentAssetImage x={x + token.creditImageInset} y={imageY + token.creditImageYOffset} w={w - token.creditImageInset * 2} h={Math.max(token.creditImageMinH, footerY - imageY + token.creditImageInset * 3)} imageUrl={item.imageUrl} cfg={cfg} glow={hovered || selected} />
        ) : (
          <>
            <ProductImage x={x + token.imageInset} y={imageY} w={w - token.imageInset * 2} h={footerY - imageY} imageUrl={item.imageUrl} cfg={cfg} />
            <rect x={x + token.imageInset} y={footerY - token.subtitleOverlayH} width={w - token.imageInset * 2} height={token.subtitleOverlayH} fill={cfg.colors.tileOverlayFill} />
            <WrappedText x={x + token.subtitleX} y={footerY - token.subtitleBottom} width={w - token.subtitlePadX} lines={item.subtitle} size={token.subtitleSize} lineHeight={token.subtitleLineHeight} fill={cfg.colors.tileSubtitleText} weight={token.subtitleWeight} maxLines={2} cfg={cfg} />
          </>
        )}
        <rect x={x + token.footerInset} y={footerY} width={w - token.footerInset * 2} height={footerH - token.footerInset} fill={cfg.colors.tileFooterFill} />
        {infoOnly ? (
          <Txt x={x + w / 2} y={footerY + footerH / 2 + 1} anchor="middle" size={token.systemTextSize} weight={token.systemTextWeight} fill={color} cfg={cfg}>System Feature</Txt>
        ) : (
          <>
            {item.price ? <Txt x={x + token.priceX} y={footerY + token.priceY} size={token.priceSize} weight={token.priceWeight} fill={color} cfg={cfg}>{item.price}</Txt> : null}
            <SvgButton
              x={x + (item.price ? w * token.buttonPriceRatio : token.buttonNoPricePad)}
              y={footerY + token.buttonY}
              w={item.price ? w * (1 - token.buttonPriceRatio) - token.buttonRightPad : w - token.buttonNoPricePad * 2}
              h={token.buttonH}
              label={loading ? 'Working' : selected ? 'Selected' : tileActionLabel(item)}
              active={Boolean(item.price) || selected}
              small
              onClick={onClick}
              disabled={loading || disabled}
              cfg={cfg}
            />
          </>
        )}
        <CardHoverChrome x={x} y={y} w={w} h={h} color={color} active={hovered || selected} selected={selected} cfg={cfg} />
      </Panel>
    </g>
  );
}

function ProductTileFixed({
  x,
  y,
  w,
  h,
  item,
  cfg,
  selected,
  loading,
  onInspect,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  cfg: ShopPageSvgControls;
  selected?: boolean;
  loading?: boolean;
  onInspect?: () => void;
  onClick?: () => void;
}) {
  return <ProductTile x={x} y={y} w={w} h={h} item={item} cfg={cfg} selected={selected} loading={loading} onInspect={onInspect} onClick={onClick} />;
}

function InfoCategoryTile({
  x,
  y,
  w,
  h,
  item,
  cfg,
  selected,
  minimal = false,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  cfg: ShopPageSvgControls;
  selected?: boolean;
  minimal?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor(item.tone, cfg);
  const token = cfg.componentTokens.infoCategoryTile;
  const chrome = cfg.componentTokens.cardChrome;
  const active = Boolean(selected || hovered);
  const headerH = Math.min(token.headerMaxH, Math.max(token.headerMinH, h * token.headerRatio));
  const footerH = minimal ? 0 : Math.min(token.footerMaxH, Math.max(token.footerMinH, h * token.footerRatio));
  const bodyY = y + headerH;
  const footerY = y + h - footerH;
  const assetW = minimal ? Math.min(w - token.minimalAssetPadX, Math.max(token.minimalAssetMinW, w * token.minimalAssetRatio)) : Math.min(token.standardAssetMaxW, Math.max(token.standardAssetMinW, w * token.standardAssetRatio));
  const assetH = minimal ? Math.max(token.minimalAssetMinH, footerY - bodyY - token.minimalAssetBottomPad) : Math.max(token.standardAssetMinH, footerY - bodyY - token.standardAssetBottomPad);
  const assetX = minimal ? x + (w - assetW) / 2 : x + token.assetX;
  const assetY = minimal ? bodyY + token.minimalAssetY : bodyY + token.standardAssetY;
  const textX = assetX + assetW + token.textGap;
  const textW = w - (textX - x) - token.textRightPad;
  const clickable = Boolean(onClick);
  const titleTextWidth = minimal ? w - (item.badge ? token.minimalBadgeTitleReserve : token.minimalTitleReserve) : w - token.standardTitleReserve;
  const titleTextSize = minimal ? token.minimalTitleSize : token.standardTitleSize;
  const titleTextY = minimal ? y + headerH / 2 + token.minimalTitleYShift : y + headerH / 2 + token.standardTitleYShift;
  const titleLineHeight = minimal ? token.minimalTitleLineHeight : token.standardTitleLineHeight;
  const titleMaxLines = minimal ? 2 : 1;
  const activeFill = alphaColor(color, chrome.activeFillOpacity);

  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={clickable ? 'shop-page-svg-clickable' : undefined} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={cfg.svgDefaults.roundedNone} fill={active ? activeFill : cfg.colors.panelFill} stroke={active ? color : cfg.colors.tileStroke} strokeWidth={active ? token.cardActiveStrokeWidth : token.cardDefaultStrokeWidth} />
      <HeaderBar x={x + 1} y={y + 1} w={w - 2} h={headerH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
        <MiniIcon type={item.icon} x={x + token.iconX} y={y + Math.max(5, headerH / 2 - token.iconSize / 2)} size={token.iconSize} tone={item.tone} cfg={cfg} />
        <WrappedText x={x + token.titleX} y={titleTextY} width={titleTextWidth} lines={item.title} size={titleTextSize} lineHeight={titleLineHeight} fill={color} weight={token.titleWeight} maxLines={titleMaxLines} cfg={cfg} />
        {item.badge ? (
          <>
            <rect x={x + w - token.badgeRight} y={y + token.badgeY} width={token.badgeW} height={headerH - token.badgeVPad} rx={cfg.svgDefaults.roundedNone} fill={color} opacity={token.badgeFillOpacity} stroke={color} strokeOpacity={token.badgeStrokeOpacity} />
            <Txt x={x + w - token.badgeTextRight} y={y + headerH / 2 + 1} anchor="middle" size={token.badgeTextSize} weight={token.badgeTextWeight} cfg={cfg}>{item.badge}</Txt>
          </>
        ) : null}
      </HeaderBar>
      <TransparentAssetImage x={assetX} y={assetY} w={assetW} h={assetH} imageUrl={item.imageUrl} cfg={cfg} glow={active} />
      {minimal ? null : (
        <>
          <WrappedText x={textX} y={bodyY + token.bodyTextY} width={textW} lines={item.subtitle} size={token.bodyTextSize} lineHeight={token.bodyTextLineHeight} fill={cfg.colors.tileSubtitleText} weight={token.bodyTextWeight} maxLines={2} cfg={cfg} />
          <rect x={x + 1} y={footerY} width={w - 2} height={footerH - 1} fill={cfg.colors.tileFooterFill} />
          <Txt x={x + token.footerTextX} y={footerY + footerH / 2 + 1} size={token.footerTextSize} weight={token.footerTextWeight} fill={item.imageUrl ? cfg.colors.mutedText : color} cfg={cfg}>{item.imageUrl ? 'Info category' : 'Image needed'}</Txt>
          <Txt x={x + w - token.footerTextRight} y={footerY + footerH / 2 + 1} anchor="end" size={token.footerTextSize} weight={token.footerTextWeight} fill={cfg.colors.mutedText} cfg={cfg}>Click for details</Txt>
        </>
      )}
      <CardHoverChrome x={x} y={y} w={w} h={h} color={color} active={active} selected={selected} cfg={cfg} />
    </g>
  );
}

function passBenefits(item: TileItem): string[] {
  if (item.benefits?.length) return item.benefits;
  if (item.product?.benefits?.length) return item.product.benefits;
  return [...SHOP_UI_COPY.passCard.benefits];
}

function PassTile({
  x,
  y,
  w,
  h,
  item,
  cfg,
  loading,
  onInspect,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  cfg: ShopPageSvgControls;
  loading?: boolean;
  onInspect?: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor(item.tone, cfg);
  const token = cfg.componentTokens.passTile;
  const chrome = cfg.componentTokens.cardChrome;
  const compact = h < token.compactBreakpoint;
  const headerH = compact ? token.compactHeaderH : token.headerH;
  const footerH = compact ? token.compactFooterH : token.footerH;
  const bodyY = y + headerH;
  const footerY = y + h - footerH;
  const bodyH = footerY - bodyY;
  const artW = Math.min(compact ? token.compactArtMaxW : token.artMaxW, w * token.artRatioW);
  const artH = Math.min(Math.max(token.artMinH, bodyH - token.artBodyPad), artW * token.artRatioH);
  const artX = x + token.artX;
  const artY = bodyY + Math.max(token.buttonFooterPadY + 1, (bodyH - artH) / 2);
  const dividerX = artX + artW + token.dividerGap;
  const textX = dividerX + token.textGap;
  const textW = w - (textX - x) - token.textRightPad;
  const buttonW = Math.min(compact ? token.compactButtonMaxW : token.buttonMaxW, w * token.buttonRatioW);
  const disabled = item.product ? !isShopProductPurchasable(item.product) : false;
  const buttonLabel = loading ? 'Working' : item.tone === 'gold' ? SHOP_UI_COPY.passCard.lifetimeButton : SHOP_UI_COPY.passCard.selectButton;
  const benefits = passBenefits(item).map(benefit => `+ ${benefit}`);
  const benefitLineH = compact ? token.benefitCompactLineHeight : token.benefitLineHeight;
  const benefitMaxLines = compact ? Math.min(5, Math.max(3, Math.floor((bodyH - 34) / benefitLineH))) : Math.max(4, Math.floor((bodyH - 58) / benefitLineH));
  const activeFill = alphaColor(color, chrome.activeFillOpacity);
  return (
    <g onClick={onInspect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="shop-page-svg-clickable">
      <Panel x={x} y={y} w={w} h={h} r={token.radius} fill={hovered ? activeFill : cfg.colors.panelFill} stroke={hovered ? cfg.svgDefaults.selectedStroke : color} cfg={cfg}>
        <HeaderBar x={x + 1} y={y + 1} w={w - 2} h={headerH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
          <Txt x={x + token.titleX} y={y + token.titleY} fill={color} size={compact ? token.compactTitleSize : token.titleSize} weight={token.titleWeight} cfg={cfg}>{item.title}</Txt>
          {item.badge ? (
            <>
              <path d={`M ${x + w - token.badgeW} ${y + 1} H ${x + w - 1} V ${y + headerH} H ${x + w - token.badgeW + token.badgeCornerCut} Q ${x + w - token.badgeW} ${y + headerH} ${x + w - token.badgeW} ${y + headerH - token.badgeCornerCut} Z`} fill={color} opacity={token.badgeFillOpacity} stroke={color} />
              <Txt x={x + w - token.badgeTextRight} y={y + token.titleY} anchor="middle" size={token.badgeTextSize} weight={token.badgeTextWeight} cfg={cfg}>{item.badge}</Txt>
            </>
          ) : null}
        </HeaderBar>
        <TransparentAssetImage x={artX} y={artY} w={artW} h={artH} imageUrl={item.imageUrl} cfg={cfg} glow={hovered} />
        {compact ? <Txt x={dividerX} y={bodyY + bodyH / 2} anchor="middle" size={token.dividerSize} weight={token.dividerWeight} fill={color} opacity={token.dividerOpacity} cfg={cfg}>|</Txt> : null}
        <WrappedText x={textX} y={bodyY + (compact ? token.subtitleCompactY : token.subtitleY)} width={textW} lines={item.subtitle} size={compact ? token.subtitleCompactSize : token.subtitleSize} lineHeight={compact ? token.subtitleCompactLineHeight : token.subtitleLineHeight} fill={color} weight={token.subtitleWeight} maxLines={compact ? 1 : 2} cfg={cfg} />
        <WrappedText x={textX} y={bodyY + (compact ? token.benefitCompactY : token.benefitY)} width={textW} lines={benefits} size={compact ? token.benefitCompactSize : token.benefitSize} lineHeight={benefitLineH} fill={cfg.colors.tileSubtitleText} weight={token.benefitWeight} maxLines={benefitMaxLines} cfg={cfg} />
        <rect x={x + 1} y={footerY} width={w - 2} height={footerH - 1} fill={cfg.colors.tileFooterFill} />
        <Txt x={x + token.priceX} y={footerY + footerH / 2 + 2} size={compact ? token.compactPriceSize : token.priceSize} weight={token.priceWeight} cfg={cfg}>{item.price}</Txt>
        <SvgButton
          x={x + w - buttonW - token.buttonRightPad}
          y={footerY + token.buttonFooterPadY}
          w={buttonW}
          h={footerH - token.buttonFooterPadY * 2}
          label={buttonLabel}
          small
          onClick={onClick}
          disabled={loading || disabled}
          cfg={cfg}
        />
        <CardHoverChrome x={x} y={y} w={w} h={h} color={color} active={hovered} cfg={cfg} />
      </Panel>
    </g>
  );
}

function EliteBottomActionButton({
  x,
  y,
  w,
  h,
  label,
  color,
  active,
  disabled,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  active: boolean;
  disabled?: boolean;
  cfg: ShopPageSvgControls;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const lit = (active || hovered) && !disabled;
  const radius = Math.min(8, h * 0.38);
  const arrowW = Math.min(30, Math.max(22, h + 4));
  const labelW = w - arrowW;
  const innerX = x + labelW;
  const arrowCy = y + h / 2;
  const arrowPath = `${innerX + arrowW * 0.36},${arrowCy - h * 0.25} ${innerX + arrowW * 0.68},${arrowCy} ${innerX + arrowW * 0.36},${arrowCy + h * 0.25}`;
  const buttonFill = lit ? 'url(#shopActiveBlue)' : cfg.colors.buttonIdleFill;
  const arrowFill = lit ? alphaColor(color, 0.34) : cfg.colors.buttonHoverFill;
  return (
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={disabled ? undefined : (event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`shop-page-svg-clickable ${disabled ? 'is-disabled' : ''}`}
    >
      {lit ? (
        <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={radius + 2} fill="none" stroke={color} strokeWidth="2" opacity="0.32" filter="url(#shopSoftGlow)" />
      ) : null}
      <rect x={x} y={y} width={w} height={h} rx={radius} fill={disabled ? cfg.colors.buttonDisabledFill : buttonFill} stroke={color} strokeWidth="1.5" strokeOpacity={lit ? 0.98 : 0.62} opacity={disabled ? 0.48 : 1} />
      <Txt x={x + labelW / 2} y={y + h / 2 + 1} anchor="middle" size={Math.min(11.8, Math.max(9.2, labelW / Math.max(7, label.length * 0.56)))} weight="900" fill={cfg.colors.bodyText} cfg={cfg}>{label}</Txt>
      <path d={topRoundedRectPath(innerX, y, arrowW, h, radius)} fill={arrowFill} stroke={color} strokeOpacity={lit ? 0.95 : 0.72} />
      <path d={bottomRoundedRectPath(innerX, y, arrowW, h, radius)} fill={arrowFill} stroke={color} strokeOpacity={lit ? 0.95 : 0.72} />
      <polygon points={arrowPath} fill={lit ? color : cfg.colors.buttonArrowFill} filter={lit ? 'url(#shopSoftGlow)' : undefined} />
    </g>
  );
}

function EliteBottomPassCard({
  x,
  y,
  w,
  h,
  item,
  cfg,
  loading,
  onInspect,
  onBuy,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  cfg: ShopPageSvgControls;
  loading?: boolean;
  onInspect: () => void;
  onBuy: (product: ShopProduct) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor(item.tone, cfg);
  const headerH = Math.max(34, Math.min(42, h * 0.18));
  const footerH = Math.max(34, Math.min(42, h * 0.18));
  const bodyY = y + headerH;
  const footerY = y + h - footerH;
  const bodyH = Math.max(1, footerY - bodyY);
  const radius = 7;
  const artW = Math.min(Math.max(86, w * 0.24), bodyH * 0.86);
  const artH = Math.min(bodyH - 14, artW * 1.12);
  const artX = x + 16;
  const artY = bodyY + (bodyH - artH) / 2;
  const dividerX = artX + artW + 20;
  const textX = dividerX + 18;
  const textW = Math.max(80, x + w - textX - 14);
  const badgeText = item.badge ?? '';
  const badgeW = badgeText ? Math.min(106, Math.max(64, badgeText.length * 6.8 + 22)) : 0;
  const priceW = Math.min(146, Math.max(104, (item.price?.length ?? 8) * 5.8 + 28));
  const buttonW = Math.min(132, Math.max(96, w * 0.28));
  const disabled = item.product ? !isShopProductPurchasable(item.product) : false;
  const buttonLabel = loading ? 'Working' : tileActionLabel(item);
  const benefits = passBenefits(item).slice(0, Math.max(5, Math.min(9, Math.floor((bodyH - 34) / 13))));
  const benefitStartY = bodyY + 45;
  const benefitLineH = Math.max(11.2, Math.min(13.8, (footerY - benefitStartY - 10) / Math.max(1, benefits.length)));
  const titleSize = w < 360 ? 12.8 : 14.2;
  const subtitleSize = w < 360 ? 9.2 : 10.2;
  const benefitSize = w < 360 ? 8.7 : 9.5;
  const hoverRailY1 = bodyY + 12;
  const hoverRailY2 = footerY - 12;
  const hoverRailInset = 8;
  const hoverRailPairGap = 4;
  return (
    <g
      onClick={onInspect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="shop-page-svg-clickable"
    >
      <path d={lobbyRoundedRectPath(x, y, w, h, radius)} fill={hovered ? alphaColor(color, 0.13) : cfg.colors.panelFill} stroke={color} strokeWidth="1.25" strokeOpacity={hovered ? 0.95 : 0.72} />
      <path d={lobbyRoundedRectPath(x, y, w, h, radius)} fill="none" stroke={hovered ? cfg.svgDefaults.selectedStroke : color} strokeWidth={hovered ? 2.3 : 1.45} strokeOpacity={hovered ? 0.7 : 0.26} filter="url(#shopSoftGlow)" />
      {hovered ? (
        <>
          <path d={lobbyRoundedRectPath(x - 2, y - 2, w + 4, h + 4, radius + 2)} fill="none" stroke={color} strokeWidth="2.2" opacity="0.3" filter="url(#shopSoftGlow)" />
          <path d={lobbyRoundedRectPath(x + 3, y + 3, w - 6, h - 6, Math.max(2, radius - 2))} fill="none" stroke={color} strokeWidth="1.7" opacity="0.74" />
        </>
      ) : null}
      <path d={topRoundedRectPath(x + 1, y + 1, w - 2, headerH - 1, radius - 1)} fill={alphaColor(color, hovered ? 0.24 : 0.16)} stroke={color} strokeOpacity="0.85" />
      <Txt x={x + 12} y={y + headerH / 2 + 1} size={titleSize} weight="950" fill={color} cfg={cfg}>{item.title}</Txt>
      {badgeText ? (
        <g>
          <path d={`M ${x + w - badgeW} ${y + 1} H ${x + w - radius} Q ${x + w - 1} ${y + 1} ${x + w - 1} ${y + radius} V ${y + headerH} H ${x + w - badgeW + 10} Q ${x + w - badgeW} ${y + headerH} ${x + w - badgeW} ${y + headerH - 10} Z`} fill={alphaColor(color, 0.26)} stroke={color} strokeOpacity="0.9" />
          <rect x={x + w - badgeW + 2} y={y + 3} width={badgeW - 4} height={Math.max(4, headerH * 0.34)} rx="3" fill="#ffffff" opacity="0.08" />
          <Txt x={x + w - badgeW / 2} y={y + headerH / 2 + 1} anchor="middle" size="9.8" weight="900" fill={cfg.colors.bodyText} cfg={cfg}>{badgeText}</Txt>
        </g>
      ) : null}
      <TransparentAssetImage x={artX} y={artY} w={artW} h={artH} imageUrl={item.imageUrl} cfg={cfg} glow={hovered} />
      {hovered ? (
        <g pointerEvents="none">
          <rect x={x + 5} y={bodyY + 5} width={w - 10} height={bodyH - 10} rx="5" fill="none" stroke={color} strokeWidth="1.4" opacity="0.36" filter="url(#shopSoftGlow)" />
          <line x1={x + hoverRailInset} y1={hoverRailY1} x2={x + hoverRailInset} y2={hoverRailY2} stroke={color} strokeWidth="1.25" opacity="0.82" />
          <line x1={x + hoverRailInset + hoverRailPairGap} y1={hoverRailY1 + 5} x2={x + hoverRailInset + hoverRailPairGap} y2={hoverRailY2 - 5} stroke={color} strokeWidth="0.9" opacity="0.42" />
          <line x1={x + w - hoverRailInset} y1={hoverRailY1} x2={x + w - hoverRailInset} y2={hoverRailY2} stroke={color} strokeWidth="1.25" opacity="0.82" />
          <line x1={x + w - hoverRailInset - hoverRailPairGap} y1={hoverRailY1 + 5} x2={x + w - hoverRailInset - hoverRailPairGap} y2={hoverRailY2 - 5} stroke={color} strokeWidth="0.9" opacity="0.42" />
        </g>
      ) : null}
      <g opacity={hovered ? 0.9 : 0.62} pointerEvents="none">
        <line x1={dividerX} y1={bodyY + 13} x2={dividerX} y2={footerY - 13} stroke={color} strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1={dividerX - 4} y1={bodyY + 20} x2={dividerX - 4} y2={bodyY + bodyH * 0.42} stroke={color} strokeWidth="1.15" strokeLinecap="round" strokeOpacity="0.64" />
        <line x1={dividerX + 4} y1={bodyY + bodyH * 0.58} x2={dividerX + 4} y2={footerY - 20} stroke={color} strokeWidth="1.15" strokeLinecap="round" strokeOpacity="0.64" />
        <path d={`M ${dividerX} ${bodyY + bodyH * 0.44} L ${dividerX + 5} ${bodyY + bodyH * 0.5} L ${dividerX} ${bodyY + bodyH * 0.56} L ${dividerX - 5} ${bodyY + bodyH * 0.5} Z`} fill={alphaColor(color, 0.2)} stroke={color} strokeWidth="1.15" strokeOpacity="0.82" filter="url(#shopSoftGlow)" />
        <line x1={dividerX - 9} y1={bodyY + bodyH * 0.5} x2={dividerX - 16} y2={bodyY + bodyH * 0.5} stroke={color} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.48" />
        <line x1={dividerX + 9} y1={bodyY + bodyH * 0.5} x2={dividerX + 16} y2={bodyY + bodyH * 0.5} stroke={color} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.48" />
      </g>
      <WrappedText x={textX} y={bodyY + 21} width={textW} lines={item.subtitle} size={subtitleSize} lineHeight={12.8} fill={color} weight={850} maxLines={2} cfg={cfg} />
      <g>
        {benefits.map((benefit, index) => (
          <g key={`${item.title}-benefit-${benefit}`}>
            <circle cx={textX + 2.5} cy={benefitStartY + index * benefitLineH - 1} r="2" fill={color} opacity="0.92" />
            <Txt x={textX + 10} y={benefitStartY + index * benefitLineH} size={benefitSize} weight="650" fill={cfg.colors.bodyText} cfg={cfg}>{benefit}</Txt>
          </g>
        ))}
      </g>
      <path d={bottomRoundedRectPath(x + 1, footerY, w - 2, footerH - 1, radius - 1)} fill={alphaColor(color, 0.1)} stroke={color} strokeOpacity="0.58" />
      <path d={`M ${x + 1} ${footerY} H ${x + priceW} V ${footerY + footerH - 10} Q ${x + priceW} ${footerY + footerH - 1} ${x + priceW - 10} ${footerY + footerH - 1} H ${x + radius} Q ${x + 1} ${footerY + footerH - 1} ${x + 1} ${footerY + footerH - radius} Z`} fill={alphaColor(color, 0.18)} stroke={color} strokeOpacity="0.82" />
      <rect x={x + 3} y={footerY + 2} width={Math.max(4, priceW - 6)} height={Math.max(4, footerH * 0.34)} rx="3" fill="#ffffff" opacity="0.07" />
      <Txt x={x + 13} y={footerY + footerH / 2 + 1} size="12.8" weight="950" fill={cfg.colors.bodyText} cfg={cfg}>{item.price}</Txt>
      <EliteBottomActionButton
        x={x + w - buttonW - 10}
        y={footerY + 7}
        w={buttonW}
        h={footerH - 14}
        label={buttonLabel}
        color={color}
        active={hovered}
        onClick={() => {
          if (item.product) onBuy(item.product);
        }}
        disabled={loading || disabled}
        cfg={cfg}
      />
    </g>
  );
}

function EliteBottomLayer({
  x,
  y,
  w,
  h,
  items,
  cfg,
  loadingId,
  rightActionLabel,
  onRightAction,
  onInspect,
  onBuy,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  items: TileItem[];
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  rightActionLabel?: string;
  onRightAction?: () => void;
  onInspect: (item: TileItem) => void;
  onBuy: (product: ShopProduct) => void;
}) {
  const body = mainBottomOverlayContentRect(x, y, w, h);
  const pad = 10;
  const gap = 12;
  const contentX = body.x + pad;
  const contentY = body.y + pad;
  const contentW = Math.max(0, body.w - pad * 2);
  const contentH = Math.max(0, body.h - pad * 2);
  const visibleCount = Math.min(items.length, contentW < 980 ? 2 : 3);
  const cardW = visibleCount > 0 ? (contentW - gap * (visibleCount - 1)) / visibleCount : contentW;
  const visibleItems = items.slice(0, visibleCount);
  return (
    <g>
      <MainBottom
        x={x}
        y={y}
        w={w}
        h={h}
        label="Elite"
        count={items.length}
        rightActionLabel={rightActionLabel}
        onRightAction={onRightAction}
      />
      {visibleItems.map((item, index) => (
        <EliteBottomPassCard
          key={item.title}
          x={contentX + index * (cardW + gap)}
          y={contentY}
          w={cardW}
          h={contentH}
          item={item}
          cfg={cfg}
          loading={item.product ? loadingId === item.product.productId : false}
          onInspect={() => onInspect(item)}
          onBuy={onBuy}
        />
      ))}
    </g>
  );
}

function EliteLayer({
  x,
  y,
  w,
  h,
  products,
  cfg,
  loadingId,
  pageIndex,
  fillFrame = false,
  onBuy,
  onCompare,
  onInspect,
  onPageChange,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  products: ShopProduct[];
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  pageIndex: number;
  fillFrame?: boolean;
  onBuy: (product: ShopProduct) => void;
  onCompare: () => void;
  onInspect?: (item: TileItem) => void;
  onPageChange: (pageIndex: number) => void;
}) {
  const frameToken = cfg.componentTokens.sectionFrame;
  const items = tilesForTab(products, 'Elite').slice(0, 3);
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH - frameToken.footerReserve;
  const cardGap = cfg.mainBody.productGap;
  const slot = cardSlotAdjustment(cfg, fillFrame);
  const rowBounds = sectionFrameRowBounds(x, w, cfg, fillFrame);
  const visibleCount = visibleCardCount(rowBounds.w, items.length, cardGap, 0, cfg.mainBody.passCardMinW, Math.round(cfg.mainBody.passMaxVisible));
  const { pageItems, pageCount, safePageIndex } = carouselPage(items, visibleCount, pageIndex);
  const { cardW, rowX } = centeredCardRow(rowBounds.x, rowBounds.w, pageItems.length, cardGap, 0, cfg.mainBody.passCardMaxW);
  const baseCardH = fillFrame ? Math.max(104, bodyH - frameToken.bodyTopPad - 2) : Math.min(Math.max(104, bodyH - frameToken.bodyTopPad - 2), 172);
  const cardH = Math.max(64, baseCardH + slot.hShift);
  const frameH = fillFrame ? h : Math.min(h, cfg.mainBody.headerH + cardH + frameToken.footerReserve + 24);
  return (
    <SectionFrame x={x} y={y} w={w} h={frameH} title="ELITE" subtitle="Premium passes, more tools, more access, and more rewards." rightText="Compare All Benefits >" accent="#1f77a6" cfg={cfg} countText={String(items.length)} pageIndex={safePageIndex} pageCount={pageCount} onRightTextClick={onCompare} onPrevious={() => onPageChange(safePageIndex - 1)} onNext={() => onPageChange(safePageIndex + 1)}>
      <g key={`elite-${safePageIndex}`} className="shop-card-page">
        {pageItems.map((item, index) => (
          <PassTile
            key={`${item.title}-${index}`}
            x={rowX + index * (cardW + cardGap)}
            y={bodyY + frameToken.bodyTopPad + slot.yShift}
            w={cardW}
            h={cardH}
            item={item}
            cfg={cfg}
            loading={item.product ? loadingId === item.product.productId : false}
            onInspect={() => onInspect?.(item)}
            onClick={() => item.product ? onBuy(item.product) : onCompare()}
          />
        ))}
      </g>
    </SectionFrame>
  );
}

function ShelfLayer({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  items,
  compact = false,
  minimalCompact = false,
  inspectMinimalCompact = false,
  selectedItem,
  cfg,
  loadingId,
  pageIndex,
  onSelect,
  onBuy,
  onInspect,
  onPageChange,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
  items: TileItem[];
  compact?: boolean;
  minimalCompact?: boolean;
  inspectMinimalCompact?: boolean;
  selectedItem?: string | null;
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  pageIndex: number;
  onSelect?: (title: string) => void;
  onBuy: (product: ShopProduct) => void;
  onInspect?: (item: TileItem) => void;
  onPageChange: (pageIndex: number) => void;
}) {
  const frameToken = cfg.componentTokens.sectionFrame;
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH - frameToken.footerReserve;
  const infoOnlyShelf = items.length > 0 && items.every(item => !item.price && !item.product);
  const cardGap = cfg.mainBody.productGap;
  const slot = cardSlotAdjustment(cfg, !compact);
  const rowBounds = sectionFrameRowBounds(x, w, cfg, !compact);
  const compactTrack = compact || infoOnlyShelf;
  const maxVisible = compactTrack
    ? minimalCompact || infoOnlyShelf ? Math.round(cfg.mainBody.infoMaxVisible) : Math.round(cfg.mainBody.compactMaxVisible)
    : Math.round(cfg.mainBody.productMaxVisible);
  const minCardW = compactTrack
    ? minimalCompact || infoOnlyShelf ? cfg.mainBody.infoCardMinW : cfg.mainBody.compactCardMinW
    : cfg.mainBody.productCardMinW;
  const count = visibleCardCount(rowBounds.w, items.length, cardGap, 0, minCardW, maxVisible);
  const { pageItems, pageCount, safePageIndex } = carouselPage(items, count, pageIndex);
  const maxCardW = compactTrack
    ? minimalCompact || infoOnlyShelf ? cfg.mainBody.infoCardMaxW : cfg.mainBody.compactCardMaxW
    : cfg.mainBody.productCardMaxW;
  const { cardW, rowX } = centeredCardRow(rowBounds.x, rowBounds.w, pageItems.length, cardGap, 0, maxCardW);
  const cardH = Math.max(48, bodyH - frameToken.bodyTopPad - 2 + slot.hShift);
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={title} subtitle={subtitle} accent={cfg.colors.shelfAccent} cfg={cfg} countText={String(items.length)} pageIndex={safePageIndex} pageCount={pageCount} onPrevious={() => onPageChange(safePageIndex - 1)} onNext={() => onPageChange(safePageIndex + 1)}>
      <g key={`${title}-${safePageIndex}`} className="shop-card-page">
        {pageItems.map((item, index) => (
          compact ? (
            <InfoCategoryTile
              key={`${item.title}-${index}`}
              x={rowX + index * (cardW + cardGap)}
              y={bodyY + frameToken.bodyTopPad + slot.yShift}
              w={cardW}
              h={cardH}
              item={item}
              cfg={cfg}
              selected={selectedItem === item.title}
              minimal={minimalCompact}
              onClick={() => {
                onSelect?.(item.title);
                if (!minimalCompact || inspectMinimalCompact) onInspect?.(item);
              }}
            />
          ) : (
          <ProductTileFixed
            key={`${item.title}-${index}`}
            x={rowX + index * (cardW + cardGap)}
            y={bodyY + frameToken.bodyTopPad + slot.yShift}
            w={cardW}
            h={cardH}
              item={item}
              cfg={cfg}
              selected={selectedItem === item.title}
              loading={item.product ? loadingId === item.product.productId : false}
              onInspect={() => onInspect?.(item)}
              onClick={() => {
                if (item.product) onBuy(item.product);
              }}
            />
          )
        ))}
      </g>
    </SectionFrame>
  );
}

function VaultGridFrame({
  x,
  y,
  w,
  h,
  accent,
  cfg,
  deckName,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  cfg: ShopPageSvgControls;
  deckName?: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const label = deckName ?? '';
  const labelH = Math.max(20, Math.min(28, h * 0.28));
  const cardW = Math.min(28, w * 0.18);
  const cardH = Math.min(42, h * 0.46);
  const cardY = y + Math.max(8, h * 0.12);
  const cardStartX = x + w / 2 - cardW * 1.22;
  const edge = hovered ? cfg.colors.activeBlue : accent;
  const chrome = cfg.componentTokens.cardChrome;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      className="shop-page-svg-clickable"
    >
      {hovered ? <rect x={x - chrome.hoverPad} y={y - chrome.hoverPad} width={w + chrome.hoverPad * 2} height={h + chrome.hoverPad * 2} rx={cfg.componentTokens.sectionFrame.contentRadius} fill="none" stroke={edge} strokeWidth={chrome.hoverOuterStrokeWidth} strokeOpacity=".34" filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.componentTokens.sectionFrame.contentRadius} fill={hovered ? alphaColor(cfg.colors.activeBlue, chrome.activeFillOpacity) : cfg.colors.vaultGridFill} stroke={edge} strokeWidth={hovered ? 1.4 : 1} strokeOpacity={hovered ? 0.86 : 0.42} />
      {[0, 1, 2].map((cardIndex) => {
        const rotate = [-9, 0, 9][cardIndex];
        const cardX = cardStartX + cardIndex * cardW * 0.72;
        return (
          <g key={cardIndex} transform={`rotate(${rotate} ${cardX + cardW / 2} ${cardY + cardH / 2})`}>
            <rect x={cardX} y={cardY} width={cardW} height={cardH} rx={cfg.componentTokens.sectionFrame.contentRadius / 2} fill={cfg.colors.headerFillAlt} stroke={edge} strokeWidth="1" strokeOpacity={hovered ? 0.92 : 0.72} />
            <rect x={cardX + 4} y={cardY + 5} width={cardW - 8} height={cardH - 10} rx={cfg.componentTokens.sectionFrame.contentRadius / 3} fill={cfg.colors.tableHeaderFill} stroke={cfg.colors.bodyText} strokeWidth=".6" strokeOpacity=".16" />
          </g>
        );
      })}
      <rect x={x + 1} y={y + h - labelH - 1} width={w - 2} height={labelH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.tileFooterFill} stroke={edge} strokeWidth=".7" strokeOpacity={hovered ? 0.72 : 0.34} />
      {label ? (
        <text x={x + w / 2} y={y + h - labelH / 2} fill={hovered ? edge : cfg.colors.bodyText} fontSize={Math.max(7, Math.min(9.5, w / Math.max(12, label.length * 0.62)))} fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">{label}</text>
      ) : null}
    </g>
  );
}

function VaultSelectableCircle({
  x,
  y,
  size,
  imageUrl,
  index,
  accent,
  cfg,
  selected,
  onSelect,
  clipImage,
}: {
  x: number;
  y: number;
  size: number;
  imageUrl: string;
  index: number;
  accent: string;
  cfg: ShopPageSvgControls;
  selected: boolean;
  onSelect: (index: number) => void;
  clipImage: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const center = size / 2;
  const clipId = `shopVaultCircleClip${index}`;
  const badgeW = Math.min(38, size * 0.62);
  const badgeH = Math.max(11, Math.min(14, size * 0.18));
  const green = cfg.colors.green;
  const hoverBlue = cfg.colors.activeBlue;
  const active = hovered || selected;
  const ringColor = hovered ? hoverBlue : selected ? green : accent;
  const scale = hovered ? 1.08 : selected ? 1.03 : 1;
  const imageInset = clipImage ? 5 : Math.max(3, size * 0.06);
  const showBaseCircle = clipImage;
  const showInteractionCircle = clipImage || hovered || selected;
  return (
    <g
      transform={`translate(${x} ${y}) translate(${center} ${center}) scale(${scale}) translate(${-center} ${-center})`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(index);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      className="shop-page-svg-clickable"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={center} cy={center} r={center - 5} />
        </clipPath>
      </defs>
      {active ? <circle cx={center} cy={center} r={center - 1} fill="none" stroke={ringColor} strokeWidth={selected ? 3 : 2} strokeOpacity={clipImage || hovered ? selected ? 0.92 : 0.5 : 0.26} filter="url(#shopSoftGlow)" /> : null}
      {showBaseCircle ? <circle cx={center} cy={center} r={center - 2} fill={selected ? `${green}18` : `${accent}10`} stroke={ringColor} strokeWidth={selected ? 1.8 : 1.2} strokeOpacity={selected ? 0.96 : 0.64} /> : null}
      {showBaseCircle ? <circle cx={center} cy={center} r={center - 8} fill={cfg.colors.tileFooterFill} stroke={cfg.colors.bodyText} strokeWidth=".8" strokeOpacity=".22" /> : null}
      <image href={imageUrl} x={imageInset} y={imageInset} width={size - imageInset * 2} height={size - imageInset * 2} preserveAspectRatio={clipImage ? 'xMidYMid slice' : 'xMidYMid meet'} clipPath={clipImage ? `url(#${clipId})` : undefined} />
      {showInteractionCircle ? <circle cx={center} cy={center} r={center - 5} fill="none" stroke={ringColor} strokeWidth={selected ? 1.8 : 1.1} strokeOpacity={clipImage ? selected ? 0.96 : 0.78 : hovered ? 0.72 : 0.34} /> : null}
      <rect x={center - badgeW / 2} y={size - badgeH - 1} width={badgeW} height={badgeH} rx={badgeH / 2} fill={green} stroke={cfg.colors.bodyText} strokeWidth=".45" strokeOpacity=".38" />
      <text x={center} y={size - badgeH / 2} fill={cfg.colors.headerFill} fontSize={Math.max(6.4, badgeH * 0.58)} fontWeight="950" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">FREE</text>
      {selected ? (
        <g>
          <circle cx={size - 9} cy="9" r="8" fill={green} stroke={cfg.colors.bodyText} strokeWidth=".7" strokeOpacity=".52" />
          <path d={`M ${size - 13} 9 L ${size - 10} 12 L ${size - 5} 6`} fill="none" stroke={cfg.colors.headerFill} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : null}
    </g>
  );
}

function VaultDeckPreviewLayer({
  x,
  y,
  w,
  h,
  cfg,
  deckItem,
  renderDeckPreview,
  onClose,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  deckItem: ShopVaultDeckPreviewItem;
  renderDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
  onClose: () => void;
}) {
  const bodyY = y + cfg.mainBody.headerH;
  const contentX = x + 18;
  const contentY = bodyY + 12;
  const contentW = w - 36;
  const contentH = h - cfg.mainBody.headerH - 28;
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title="DECK PREVIEW" subtitle={deckItem.title} rightText="Back To Vault" accent="#ffd36a" cfg={cfg} onRightTextClick={onClose}>
      <foreignObject x={contentX} y={contentY} width={contentW} height={contentH}>
        <div className="shop-deck-preview-host">
          {renderDeckPreview ? renderDeckPreview(deckItem) : <div className="shop-deck-preview-host__empty">Deck preview unavailable.</div>}
        </div>
      </foreignObject>
    </SectionFrame>
  );
}

function VaultShowcaseLayer({
  x,
  y,
  w,
  h,
  cfg,
  activeGroupKey,
  vaultDeckItems,
  onGroupChange,
  onDeckPreview,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  activeGroupKey: string;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  onGroupChange: (key: string) => void;
  onDeckPreview: (item: ShopVaultDeckPreviewItem | null) => void;
}) {
  const [gridScrollState, setGridScrollState] = useState<{ groupKey: string; value: number }>({ groupKey: activeGroupKey, value: 0 });
  const [gridDrag, setGridDrag] = useState<{ groupKey: string; pointerX: number; scrollX: number } | null>(null);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);
  const [selectedProfileFrameIndex, setSelectedProfileFrameIndex] = useState(0);
  const activeGroup = SHOP_VAULT_SHOWCASE_GROUPS.find(group => group.key === activeGroupKey) ?? SHOP_VAULT_SHOWCASE_GROUPS[0];
  const accent = toneColor(activeGroup.tone, cfg);
  const frameToken = cfg.componentTokens.sectionFrame;
  const token = cfg.componentTokens.vaultShowcase;
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH - frameToken.footerReserve;
  const pad = token.pad;
  const heroX = x + pad;
  const heroY = bodyY + token.heroTop;
  const heroW = Math.min(token.heroMaxW, Math.max(token.heroMinW, w * token.heroRatioW));
  const heroH = bodyH - token.heroVPad;
  const dividerX = heroX + heroW + token.dividerGap;
  const gridX = dividerX + token.gridGap;
  const gridY = heroY;
  const gridW = w - (gridX - x) - pad;
  const gridH = heroH;
  const isAvatarGrid = activeGroup.key === 'avatars';
  const isProfileFrameGrid = activeGroup.key === 'frames';
  const isDeckGrid = activeGroup.key === 'decks';
  const isSelectableCircleGrid = isAvatarGrid || isProfileFrameGrid;
  const selectableCircleImages = isAvatarGrid ? avatarImageUrls : isProfileFrameGrid ? activeGroup.items.map(item => item.imageUrl).filter(Boolean) : [];
  const deckItems = vaultDeckItems && vaultDeckItems.length > 0
    ? vaultDeckItems
    : activeGroup.items.map((item, index) => ({ id: `${activeGroup.key}-${index}`, title: item.title }));
  const rows = isSelectableCircleGrid ? token.selectableRows : isDeckGrid ? token.deckRows : token.defaultRows;
  const scrollbarH = token.scrollbarH;
  const frameGap = isSelectableCircleGrid ? token.selectableFrameGap : token.frameGap;
  const viewportH = gridH - scrollbarH - token.scrollbarGap;
  const frameH = (viewportH - frameGap * (rows - 1)) / rows;
  const avatarSize = Math.max(token.avatarMinSize, Math.min(token.avatarMaxSize, frameH - 1));
  const frameW = isSelectableCircleGrid ? avatarSize + token.selectableFramePad : isDeckGrid ? Math.max(token.deckMinW, Math.min(token.deckMaxW, gridW / token.deckRatioW)) : Math.max(token.defaultMinW, Math.min(token.defaultMaxW, gridW / token.defaultRatioW));
  const columns = isSelectableCircleGrid ? Math.ceil(selectableCircleImages.length / rows) : isDeckGrid ? Math.max(token.minDeckColumns, deckItems.length) : Math.max(token.minDeckColumns, activeGroup.items.length + token.defaultExtraColumns);
  const contentW = columns * frameW + (columns - 1) * frameGap;
  const maxScrollX = Math.max(0, contentW - gridW);
  const rawScrollX = gridScrollState.groupKey === activeGroupKey ? gridScrollState.value : 0;
  const scrollX = clampNumber(rawScrollX, 0, maxScrollX);
  const thumbW = maxScrollX > 0 ? Math.max(token.thumbMinW, gridW * (gridW / contentW)) : gridW;
  const thumbTravel = Math.max(0, gridW - thumbW);
  const thumbX = maxScrollX > 0 ? (scrollX / maxScrollX) * thumbTravel : 0;
  const pageCount = Math.max(1, Math.ceil(contentW / Math.max(1, gridW)));
  const pageIndex = maxScrollX > 0 ? Math.min(pageCount - 1, Math.round(scrollX / Math.max(1, gridW))) : 0;
  const movePage = (delta: -1 | 1) => {
    setGridScrollState({ groupKey: activeGroupKey, value: clampNumber(scrollX + delta * gridW, 0, maxScrollX) });
  };

  return (
    <SectionFrame x={x} y={y} w={w} h={h} title="VAULT" subtitle="Deck drops, card backs, table themes, frames, and free avatar identity." accent={cfg.colors.violet} cfg={cfg} countText={String(activeGroup.items.length)} pageIndex={pageIndex} pageCount={pageCount} onPrevious={() => movePage(-1)} onNext={() => movePage(1)}>
      <rect x={heroX} y={heroY} width={heroW} height={heroH} rx={cfg.componentTokens.sectionFrame.contentRadius} fill={cfg.colors.vaultHeroFill} />
      <g onClick={() => onGroupChange(activeGroup.key)} role="button" tabIndex={0} className="shop-page-svg-clickable">
        <TransparentAssetImage x={heroX + token.heroImageInset} y={heroY + token.heroImageInset} w={heroW - token.heroImageInset * 2} h={heroH - token.heroImageInset * 2} imageUrl={activeGroup.heroImageUrl} cfg={cfg} glow />
      </g>
      <line x1={dividerX} y1={heroY + 6} x2={dividerX} y2={heroY + heroH - 6} stroke={accent} strokeWidth="1.2" strokeOpacity=".42" />
      <Txt x={dividerX} y={heroY + heroH / 2} anchor="middle" size="28" weight="650" fill={accent} opacity={0.7} cfg={cfg}>|</Txt>
      <svg
        x={gridX}
        y={gridY}
        width={gridW}
        height={gridH}
        overflow="hidden"
        onMouseDown={(event) => {
          if (event.button !== 0 && event.button !== 1) return;
          event.preventDefault();
          setGridDrag({ groupKey: activeGroupKey, pointerX: event.clientX, scrollX });
        }}
        onMouseMove={(event) => {
          if (!gridDrag || gridDrag.groupKey !== activeGroupKey) return;
          event.preventDefault();
          setGridScrollState({ groupKey: activeGroupKey, value: clampNumber(gridDrag.scrollX - (event.clientX - gridDrag.pointerX), 0, maxScrollX) });
        }}
        onMouseUp={() => setGridDrag(null)}
        onMouseLeave={() => setGridDrag(null)}
        onAuxClick={(event) => event.preventDefault()}
        onWheel={(event) => {
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
          setGridScrollState(state => {
            const value = state.groupKey === activeGroupKey ? state.value : 0;
            return { groupKey: activeGroupKey, value: clampNumber(value + delta, 0, maxScrollX) };
          });
        }}
        className="shop-page-svg-clickable"
      >
        <rect x="0" y="0" width={gridW} height={viewportH} rx={cfg.componentTokens.sectionFrame.contentRadius} fill={cfg.colors.vaultGridFill} stroke={accent} strokeWidth="1" strokeOpacity=".28" />
        <g transform={`translate(${-scrollX} 0)`}>
          {Array.from({ length: rows * columns }).map((_, index) => {
            const col = Math.floor(index / rows);
            const row = index % rows;
            const frameX = col * (frameW + frameGap);
            const frameY = row * (frameH + frameGap);
            if (isSelectableCircleGrid) {
              const imageUrl = selectableCircleImages[index];
              if (!imageUrl) return null;
              const selectedIndex = isAvatarGrid ? selectedAvatarIndex : selectedProfileFrameIndex;
              return (
                <VaultSelectableCircle
                  key={`${activeGroup.key}-selectable-${index}`}
                  x={frameX + (frameW - avatarSize) / 2}
                  y={frameY + (frameH - avatarSize) / 2}
                  size={avatarSize}
                  imageUrl={imageUrl}
                  index={index}
                  accent={accent}
                  cfg={cfg}
                  selected={selectedIndex === index}
                  onSelect={isAvatarGrid ? setSelectedAvatarIndex : setSelectedProfileFrameIndex}
                  clipImage={isAvatarGrid}
                />
              );
            }
            const deckItem = deckItems[index % deckItems.length] ?? null;
            return <VaultGridFrame key={`${activeGroup.key}-frame-${index}`} x={frameX} y={frameY} w={frameW} h={frameH} accent={accent} cfg={cfg} deckName={deckItem?.title} onClick={isDeckGrid ? () => onDeckPreview(deckItem) : undefined} />;
          })}
        </g>
        <rect x="0" y={gridH - scrollbarH} width={gridW} height={scrollbarH} rx={scrollbarH / 2} fill={cfg.colors.vaultScrollbarFill} stroke={accent} strokeWidth="1" strokeOpacity=".25" />
        <rect x={thumbX} y={gridH - scrollbarH + token.scrollbarThumbInset} width={thumbW} height={scrollbarH - token.scrollbarThumbInset * 2} rx={(scrollbarH - token.scrollbarThumbInset * 2) / 2} fill={accent} opacity=".55" />
      </svg>
    </SectionFrame>
  );
}

function TreasuryLayer({
  x,
  y,
  w,
  h,
  products,
  cfg,
  loadingId,
  pageIndex,
  fillFrame = false,
  onBuy,
  onInfo,
  onInspect,
  onPageChange,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  products: ShopProduct[];
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  pageIndex: number;
  fillFrame?: boolean;
  onBuy: (product: ShopProduct) => void;
  onInfo: () => void;
  onInspect?: (item: TileItem) => void;
  onPageChange: (pageIndex: number) => void;
}) {
  const frameToken = cfg.componentTokens.sectionFrame;
  const items = tilesForTab(products, 'Treasury');
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH - frameToken.footerReserve;
  const gap = cfg.mainBody.productGap;
  const slot = cardSlotAdjustment(cfg, fillFrame);
  const rowBounds = sectionFrameRowBounds(x, w, cfg, fillFrame);
  const itemCount = visibleCardCount(rowBounds.w, items.length, gap, 0, cfg.mainBody.treasuryCardMinW, Math.round(cfg.mainBody.treasuryMaxVisible));
  const { pageItems, pageCount, safePageIndex } = carouselPage(items, itemCount, pageIndex);
  const { cardW, rowX } = centeredCardRow(rowBounds.x, rowBounds.w, pageItems.length, gap, 0, cfg.mainBody.treasuryCardMaxW);
  const baseCardH = fillFrame ? Math.max(104, bodyH - frameToken.bodyTopPad - 2) : Math.min(Math.max(104, bodyH - frameToken.bodyTopPad - 2), 158);
  const cardH = Math.max(64, baseCardH + slot.hShift);
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title="TREASURY" subtitle="Buy Arena Credits, the marketplace balance used across Ocentra." rightText="What is Arena Credits?" accent="#1f77a6" cfg={cfg} countText={String(items.length)} pageIndex={safePageIndex} pageCount={pageCount} onRightTextClick={onInfo} onPrevious={() => onPageChange(safePageIndex - 1)} onNext={() => onPageChange(safePageIndex + 1)}>
      <g key={`treasury-${safePageIndex}`} className="shop-card-page">
        {pageItems.map((item, index) => (
          <ProductTileFixed
            key={`${item.title}-${index}`}
            x={rowX + index * (cardW + gap)}
            y={bodyY + frameToken.bodyTopPad + slot.yShift}
            w={cardW}
            h={cardH}
            item={item}
            cfg={cfg}
            loading={item.product ? loadingId === item.product.productId : false}
            onInspect={() => onInspect?.(item)}
            onClick={() => item.product && onBuy(item.product)}
          />
        ))}
      </g>
    </SectionFrame>
  );
}

function InfoDetailLayer({
  x,
  y,
  w,
  h,
  mode,
  cfg,
  onClose,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  mode: 'arenaCredits' | 'eliteBenefits';
  cfg: ShopPageSvgControls;
  onClose: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const accent = mode === 'arenaCredits' ? cfg.colors.activeBlue : cfg.colors.gold;
  const bodyY = y + cfg.mainBody.headerH;
  if (mode === 'eliteBenefits') {
    const detail = SHOP_INFO_DETAILS.eliteBenefits;
    const tableX = x + token.comparisonTablePadX;
    const tableY = bodyY + token.comparisonTableTop;
    const tableW = w - token.comparisonTablePadX * 2;
    const labelW = token.comparisonLabelW;
    const tierCount = detail.tiers.length;
    const colW = (tableW - labelW) / tierCount;
    const headH = token.comparisonHeadH;
    const rowH = Math.min(token.comparisonMaxRowH, (h - cfg.mainBody.headerH - headH - token.comparisonBottomReserve) / detail.rows.length);
    return (
      <SectionFrame x={x} y={y} w={w} h={h} title={detail.title} subtitle={detail.subtitle} rightText={detail.cta} accent={accent} cfg={cfg} onRightTextClick={onClose}>
        <rect x={tableX} y={tableY} width={tableW} height={headH + rowH * detail.rows.length} fill={cfg.colors.tableFill} stroke={accent} strokeOpacity=".35" />
        <rect x={tableX} y={tableY} width={labelW} height={headH} fill={cfg.colors.tableHeaderFill} stroke={cfg.colors.tableGridStroke} />
        <Txt x={tableX + token.comparisonBenefitX} y={tableY + token.comparisonBenefitY} size={token.comparisonBenefitSize} weight="950" fill={accent} cfg={cfg}>Benefit</Txt>
        {detail.tiers.map((tier, index) => {
          const cx = tableX + labelW + index * colW;
          const color = toneColor(tier.tone as ShopTone, cfg);
          return (
            <g key={tier.key}>
              <rect x={cx} y={tableY} width={colW} height={headH} fill={`${color}18`} stroke={color} strokeOpacity=".55" />
              <Txt x={cx + colW / 2} y={tableY + token.comparisonTierTitleY} anchor="middle" size={token.comparisonTierTitleSize} weight="950" fill={color} cfg={cfg}>{tier.title}</Txt>
              <Txt x={cx + colW / 2} y={tableY + token.comparisonTierPriceY} anchor="middle" size={token.comparisonTierPriceSize} weight="750" fill={cfg.colors.tileSubtitleText} cfg={cfg}>{tier.price}</Txt>
            </g>
          );
        })}
        {detail.rows.map((row, rowIndex) => {
          const rowY = tableY + headH + rowIndex * rowH;
          return (
            <g key={row.label}>
              <rect x={tableX} y={rowY} width={labelW} height={rowH} fill={rowIndex % 2 ? cfg.colors.tableRowFillOdd : cfg.colors.tableRowFillEven} stroke={cfg.colors.tableGridStroke} strokeOpacity=".8" />
              <Txt x={tableX + token.comparisonBenefitX} y={rowY + rowH / 2 + 1} size={token.comparisonRowLabelSize} weight="850" fill={cfg.colors.tileSubtitleText} cfg={cfg}>{row.label}</Txt>
              {row.values.map((value, valueIndex) => {
                const cx = tableX + labelW + valueIndex * colW;
                return (
                  <g key={`${row.label}-${valueIndex}`}>
                    <rect x={cx} y={rowY} width={colW} height={rowH} fill={rowIndex % 2 ? cfg.colors.tableRowFillOdd : cfg.colors.tableRowFillEven} stroke={cfg.colors.tableGridStroke} strokeOpacity=".55" />
                    <WrappedText x={cx + colW / 2} y={rowY + rowH / 2 + 1} width={colW - 10} lines={value} size={token.comparisonValueSize} lineHeight={token.comparisonValueLineHeight} fill={cfg.colors.frameSubtitleText} weight={650} maxLines={1} anchor="middle" cfg={cfg} />
                  </g>
                );
              })}
            </g>
          );
        })}
        <Txt x={tableX} y={y + h - token.comparisonNoteBottom} size={token.comparisonNoteSize} fill={cfg.colors.mutedText} weight="550" cfg={cfg}>Comparison is mock data for layout only; real tier benefits can wire into this surface later.</Txt>
        <SvgButton x={x + w - token.comparisonButtonRight} y={y + h - token.comparisonButtonBottom} w={token.comparisonButtonW} h={token.comparisonButtonH} label={detail.cta} active small onClick={onClose} cfg={cfg} />
      </SectionFrame>
    );
  }
  const detail = SHOP_INFO_DETAILS.arenaCredits;
  const imageW = Math.min(token.detailImageMaxW, w * token.detailImageRatio);
  const textX = x + token.detailImageX + imageW + token.detailTextGap;
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={detail.title} subtitle={detail.subtitle} rightText={detail.cta} accent={accent} cfg={cfg} onRightTextClick={onClose}>
      <ProductImage x={x + token.detailImageX} y={bodyY + token.detailImageTop} w={imageW} h={h - cfg.mainBody.headerH - token.detailImageBottomPad} imageUrl={SHOP_STATIC_CREDIT_PACKS[2].imageUrl} cfg={cfg} />
      <rect x={x + token.detailImageX} y={bodyY + token.detailImageTop} width={imageW} height={h - cfg.mainBody.headerH - token.detailImageBottomPad} fill="none" stroke={accent} strokeOpacity=".32" />
      <Txt x={textX} y={bodyY + token.detailTitleTop} size={token.detailTitleSize} weight="950" fill={accent} cfg={cfg}>{detail.title}</Txt>
      <WrappedText x={textX} y={bodyY + token.detailSubtitleTop} width={w - (textX - x) - 28} lines={detail.subtitle} size={token.detailSubtitleSize} lineHeight={token.detailSubtitleLineHeight} fill={cfg.colors.tileSubtitleText} weight={600} maxLines={token.detailSubtitleMaxLines} cfg={cfg} />
      {detail.bullets.map((row, index) => (
        <g key={row}>
          <circle cx={textX + 5} cy={bodyY + token.detailBulletStartY + index * token.detailBulletGap} r={token.detailBulletR} fill={accent} />
          <WrappedText x={textX + token.detailBulletTextX} y={bodyY + token.detailBulletStartY + index * token.detailBulletGap} width={w - (textX - x) - 46} lines={row} size={token.detailBulletSize} lineHeight={token.detailBulletLineHeight} fill={cfg.colors.frameSubtitleText} weight={550} maxLines={2} cfg={cfg} />
        </g>
      ))}
      <SvgButton x={textX} y={y + h - token.detailButtonBottom} w={token.detailButtonW} h={token.detailButtonH} label={detail.cta} active small onClick={onClose} cfg={cfg} />
    </SectionFrame>
  );
}

function TileDetailLayer({
  x,
  y,
  w,
  h,
  item,
  cfg,
  onClose,
  onBuy,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  onBuy: (product: ShopProduct) => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const accent = toneColor(item.tone, cfg);
  const bodyY = y + cfg.mainBody.headerH;
  const imageW = Math.min(token.detailImageMaxW, w * token.detailImageRatio);
  const imageH = h - cfg.mainBody.headerH - token.detailImageBottomPad;
  const textX = x + token.detailImageX + imageW + token.detailTextGap;
  const passTile = item.product?.productType === 'SUBSCRIPTION' || SHOP_STATIC_PASSES.some(pass => pass.title === item.title);
  const detailLines = passTile
    ? passBenefits(item)
    : isCreditPackTile(item)
      ? ['One-time Arena Credit purchase', 'Adds marketplace balance after checkout sync', 'Use for tools, cosmetics, access, and event entry']
      : item.benefits?.length ? item.benefits : [item.subtitle];
  const disabled = item.product ? !isShopProductPurchasable(item.product) : !item.price || Boolean(item.price.toLowerCase().includes('coming soon'));
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={`${item.title} DETAILS`} subtitle={item.subtitle} rightText="Back To Shop" accent={accent} cfg={cfg} onRightTextClick={onClose}>
      <TransparentAssetImage x={x + token.detailImageX} y={bodyY + token.detailImageTop} w={imageW} h={imageH} imageUrl={item.imageUrl} cfg={cfg} glow />
      <Txt x={textX} y={bodyY + token.detailTitleTop} size={token.detailTitleSize} weight="950" fill={accent} cfg={cfg}>{item.title}</Txt>
      {item.badge ? <Txt x={textX} y={bodyY + token.detailSubtitleTop} size={token.detailSubtitleSize} weight="950" fill={accent} cfg={cfg}>{item.badge}</Txt> : null}
      {item.price ? <Txt x={textX} y={bodyY + token.detailBulletStartY - token.detailBulletGap} size={token.detailTitleSize} weight="950" cfg={cfg}>{item.price}</Txt> : null}
      <WrappedText x={textX} y={bodyY + token.detailBulletStartY} width={w - (textX - x) - token.detailTextGap} lines={detailLines.map(line => `+ ${line}`)} size={token.detailBulletSize} lineHeight={token.detailBulletLineHeight} fill={cfg.colors.tileSubtitleText} weight={650} maxLines={10} cfg={cfg} />
      <SvgButton
        x={textX}
        y={y + h - token.detailButtonBottom}
        w={token.detailButtonW}
        h={token.detailButtonH}
        label={tileActionLabel(item)}
        active
        small
        onClick={() => item.product && onBuy(item.product)}
        disabled={disabled}
        cfg={cfg}
      />
    </SectionFrame>
  );
}

function MainBody({
  x,
  y,
  w,
  activeTab,
  products,
  loadingId,
  specialView,
  infoRequest,
  bottomPreviewTarget,
  sectionBottomY,
  cfg,
  onClearSpecial,
  onClearBottomPreview,
  onInfoHandled,
  onBuy,
  dailyRewardStatus,
  onDailyRewardSpin,
  vaultDeckItems,
  renderVaultDeckPreview,
}: {
  x: number;
  y: number;
  w: number;
  activeTab: ShopTab;
  products: ShopProduct[];
  loadingId: string | null;
  specialView: 'earnRewards' | null;
  infoRequest: 'arenaCredits' | 'eliteBenefits' | null;
  bottomPreviewTarget: BottomPreviewTarget | null;
  sectionBottomY?: number;
  cfg: ShopPageSvgControls;
  onClearSpecial: () => void;
  onClearBottomPreview: () => void;
  onInfoHandled: () => void;
  onBuy: (product: ShopProduct) => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  renderVaultDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
}) {
  const [selectedTileDetail, setSelectedTileDetail] = useState<TileItem | null>(null);
  const [activeInfoDetail, setActiveInfoDetail] = useState<'arenaCredits' | 'eliteBenefits' | null>(null);
  const [activeVaultGroupKey, setActiveVaultGroupKey] = useState(SHOP_VAULT_SHOWCASE_GROUPS[0]?.key ?? '');
  const [vaultTopSelectionKey, setVaultTopSelectionKey] = useState<string | null>(null);
  const [activeDeckPreviewItem, setActiveDeckPreviewItem] = useState<ShopVaultDeckPreviewItem | null>(null);
  const [topPageByTab, setTopPageByTab] = useState<Partial<Record<ShopTab, number>>>({});
  const [bottomPageByTab, setBottomPageByTab] = useState<Partial<Record<ShopTab, number>>>({});
  const displayedInfoDetail = infoRequest ?? activeInfoDetail;
  const resolvedSectionBottomY = sectionBottomY ?? cfg.mainBody.sectionBottomY;
  const topH = cfg.mainBody.topBoxH;
  const bottomH = resolvedSectionBottomY - y - topH - cfg.mainBody.boxGap;
  const bottomY = y + topH + cfg.mainBody.boxGap;
  const bottomTab = nextShopTab(activeTab);
  const displayedBottomTab = bottomPreviewTarget && bottomPreviewTarget !== 'Earn Free AC' ? bottomPreviewTarget : bottomTab;

  const openInfoDetail = (mode: 'arenaCredits' | 'eliteBenefits') => {
    setSelectedTileDetail(null);
    setActiveInfoDetail(mode);
    onInfoHandled();
  };

  const openTileDetail = (item: TileItem) => {
    setActiveInfoDetail(null);
    onInfoHandled();
    setSelectedTileDetail(item);
  };

  const closeBottomDetail = () => {
    setSelectedTileDetail(null);
    setActiveInfoDetail(null);
    setActiveDeckPreviewItem(null);
    onInfoHandled();
  };

  const actionForTab = (tab: ShopTab): { label: string; onAction: () => void } | undefined => {
    if (tab === 'Treasury') {
      return { label: 'What is Arena Credits?', onAction: () => openInfoDetail('arenaCredits') };
    }
    if (tab === 'Elite') {
      return { label: 'Compare All Benefits >', onAction: () => openInfoDetail('eliteBenefits') };
    }
    return undefined;
  };

  if (SHOP_MAIN_USE_HOME_FEATURED_BASELINE) {
    const topFrameBounds = mainSlotFrameBounds(x, w, cfg, 'top');
    const bottomFrameBounds = mainSlotFrameBounds(x, w, cfg, 'bottom');
    const topAction = actionForTab(activeTab);
    const bottomAction = actionForTab(displayedBottomTab);
    const showEarnRewards = specialView === 'earnRewards' || bottomPreviewTarget === 'Earn Free AC';
    const topTileItems = tilesForTab(products, activeTab);
    const topVaultGroups = activeTab === 'Vault' ? SHOP_VAULT_SHOWCASE_GROUPS : [];
    const topPlayAccessItems = activeTab === 'Play Access' ? SHOP_SECTIONS['Play Access'].categories ?? [] : [];
    const topEventItems = activeTab === 'Events' ? SHOP_SECTIONS.Events.featured ?? SHOP_SECTIONS.Events.categories ?? [] : [];
    const topCards = activeTab === 'Vault'
      ? topVaultGroups.map(vaultGroupToMainCarouselCard)
      : activeTab === 'Play Access'
        ? topPlayAccessItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, 'play-access'))
        : activeTab === 'Events'
          ? topEventItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, 'events'))
          : topTileItems.map((item, index) => tileToMainCarouselCard(item, index, loadingId));
    const bottomTileItems = displayedBottomTab === 'Treasury' || displayedBottomTab === 'Elite'
      ? tilesForTab(products, displayedBottomTab)
      : [];
    const bottomVaultGroup = SHOP_VAULT_SHOWCASE_GROUPS.find(group => group.key === activeVaultGroupKey) ?? SHOP_VAULT_SHOWCASE_GROUPS[0];
    const bottomVaultItems = displayedBottomTab === 'Vault' ? bottomVaultGroup?.items ?? [] : [];
    const bottomPlayAccessItems = displayedBottomTab === 'Play Access' ? SHOP_SECTIONS['Play Access'].featured ?? SHOP_SECTIONS['Play Access'].categories ?? [] : [];
    const bottomEventItems = displayedBottomTab === 'Events' ? SHOP_SECTIONS.Events.featured ?? SHOP_SECTIONS.Events.categories ?? [] : [];
    const bottomVaultPrefix = `vault-${bottomVaultGroup?.key ?? 'default'}`;
    const bottomCards = displayedBottomTab === 'Vault'
      ? bottomVaultItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, bottomVaultPrefix))
      : displayedBottomTab === 'Play Access'
        ? bottomPlayAccessItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, 'play-access-bottom'))
        : displayedBottomTab === 'Events'
          ? bottomEventItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, 'events-bottom'))
          : bottomTileItems.map((item, index) => tileToMainCarouselCard(item, index, loadingId));
    const handleTopCardAction = (card: ShopMainCarouselCardItem) => {
      if (activeTab === 'Vault') {
        const group = topVaultGroups.find(item => `vault:${item.key}` === card.key);
        if (!group) return;
        setActiveVaultGroupKey(group.key);
        setVaultTopSelectionKey(group.key);
        setSelectedTileDetail(null);
        setActiveInfoDetail(null);
        setActiveDeckPreviewItem(null);
        onInfoHandled();
        return;
      }
      if (activeTab === 'Play Access') {
        const tile = topPlayAccessItems.find((item, index) => staticTopCardKey('play-access', item, index) === card.key);
        if (!tile) return;
        openTileDetail(tile);
        return;
      }
      if (activeTab === 'Events') {
        const tile = topEventItems.find((item, index) => staticTopCardKey('events', item, index) === card.key);
        if (!tile) return;
        openTileDetail(tile);
        return;
      }
      const tile = topTileItems.find((item, index) => tileCardKey(item, index) === card.key);
      if (!tile) return;
      if (tile.product && isShopProductPurchasable(tile.product)) {
        onBuy(tile.product);
        return;
      }
      openTileDetail(tile);
    };
    const handleBottomCardAction = (card: ShopMainCarouselCardItem) => {
      if (displayedBottomTab === 'Vault') {
        const item = bottomVaultItems.find((candidate, index) => staticTopCardKey(bottomVaultPrefix, candidate, index) === card.key);
        if (item) openTileDetail(item);
        return;
      }
      if (displayedBottomTab === 'Play Access') {
        const item = bottomPlayAccessItems.find((candidate, index) => staticTopCardKey('play-access-bottom', candidate, index) === card.key);
        if (item) openTileDetail(item);
        return;
      }
      if (displayedBottomTab === 'Events') {
        const item = bottomEventItems.find((candidate, index) => staticTopCardKey('events-bottom', candidate, index) === card.key);
        if (item) openTileDetail(item);
        return;
      }
      const tile = bottomTileItems.find((item, index) => tileCardKey(item, index) === card.key);
      if (!tile) return;
      if (tile.product && isShopProductPurchasable(tile.product)) {
        onBuy(tile.product);
        return;
      }
      openTileDetail(tile);
    };

    if (showEarnRewards) {
      return (
        <EarnRewardsBottomLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          cfg={cfg}
          onClose={() => {
            onClearSpecial();
            onClearBottomPreview();
          }}
          dailyRewardStatus={dailyRewardStatus}
          onDailyRewardSpin={onDailyRewardSpin}
        />
      );
    }

    return (
      <g>
        <MainTop x={topFrameBounds.x} y={y} w={topFrameBounds.w} h={topH} label={activeTab} cards={topCards} onCardAction={handleTopCardAction} rightActionLabel={topAction?.label} onRightAction={topAction?.onAction} />
        {displayedInfoDetail ? (
          <InfoDetailLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} mode={displayedInfoDetail} cfg={cfg} onClose={closeBottomDetail} />
        ) : selectedTileDetail ? (
          <TileDetailLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} item={selectedTileDetail} cfg={cfg} onClose={closeBottomDetail} onBuy={onBuy} />
        ) : displayedBottomTab === 'Elite' ? (
          <EliteBottomLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} items={bottomTileItems} cfg={cfg} loadingId={loadingId} rightActionLabel={bottomAction?.label} onRightAction={bottomAction?.onAction} onInspect={openTileDetail} onBuy={onBuy} />
        ) : (
          <MainBottom x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} label={displayedBottomTab} cards={bottomCards} onCardAction={handleBottomCardAction} rightActionLabel={bottomAction?.label} onRightAction={bottomAction?.onAction} />
        )}
      </g>
    );
  }

  const pageFor = (slot: 'top' | 'bottom', tab: ShopTab): number => {
    return (slot === 'top' ? topPageByTab[tab] : bottomPageByTab[tab]) ?? 0;
  };

  const setPageFor = (slot: 'top' | 'bottom', tab: ShopTab, pageIndex: number) => {
    const setter = slot === 'top' ? setTopPageByTab : setBottomPageByTab;
    setter(state => ({ ...state, [tab]: pageIndex }));
  };

  const renderTabLayer = (tab: ShopTab, layerY: number, layerH: number, slot: 'top' | 'bottom') => {
    const fillFrame = slot === 'bottom';
    const frameBounds = mainSlotFrameBounds(x, w, cfg, slot);
    const pageIndex = pageFor(slot, tab);
    const setPageIndex = (nextPageIndex: number) => setPageFor(slot, tab, nextPageIndex);
    if (tab === 'Treasury') {
      return <TreasuryLayer x={frameBounds.x} y={layerY} w={frameBounds.w} h={layerH} products={products} cfg={cfg} loadingId={loadingId} pageIndex={pageIndex} fillFrame={fillFrame} onBuy={onBuy} onInfo={() => openInfoDetail('arenaCredits')} onInspect={openTileDetail} onPageChange={setPageIndex} />;
    }
    if (tab === 'Elite') {
      return <EliteLayer x={frameBounds.x} y={layerY} w={frameBounds.w} h={layerH} products={products} cfg={cfg} loadingId={loadingId} pageIndex={pageIndex} fillFrame={fillFrame} onBuy={onBuy} onCompare={() => openInfoDetail('eliteBenefits')} onInspect={openTileDetail} onPageChange={setPageIndex} />;
    }
    if (tab === 'Vault' && slot === 'bottom') {
      return <VaultShowcaseLayer x={frameBounds.x} y={layerY} w={frameBounds.w} h={layerH} cfg={cfg} activeGroupKey={activeVaultGroupKey} vaultDeckItems={vaultDeckItems} onGroupChange={setActiveVaultGroupKey} onDeckPreview={(item) => {
        setSelectedTileDetail(null);
        setActiveInfoDetail(null);
        setActiveDeckPreviewItem(item);
      }} />;
    }
    const section = SHOP_SECTIONS[tab];
    const categoryItems = section.categories ?? [];
    const productItems = tilesForTab(products, tab);
    const featuredItems = tab === 'Play Access' ? section.featured ?? categoryItems : productItems.length > 0 ? productItems : section.featured ?? categoryItems;
    const compact = slot === 'top';
    const topInfoBadgeMode = compact && (tab === 'Vault' || tab === 'Play Access' || tab === 'Events');
    return (
      <ShelfLayer
        x={frameBounds.x}
        y={layerY}
        w={frameBounds.w}
        h={layerH}
        title={section.title}
        subtitle={section.subtitle}
        items={compact ? categoryItems : featuredItems}
        compact={compact}
        minimalCompact={topInfoBadgeMode}
        inspectMinimalCompact={topInfoBadgeMode && tab !== 'Vault'}
        selectedItem={tab === 'Vault' && compact ? vaultGroupTitleFromKey(vaultTopSelectionKey) : undefined}
        cfg={cfg}
        loadingId={loadingId}
        pageIndex={pageIndex}
        onSelect={(title) => {
          if (tab === 'Vault' && compact) {
            const key = vaultGroupKeyFromTitle(title);
            setActiveVaultGroupKey(key);
            setVaultTopSelectionKey(key);
            setSelectedTileDetail(null);
            setActiveInfoDetail(null);
            setActiveDeckPreviewItem(null);
            onInfoHandled();
          }
        }}
        onBuy={onBuy}
        onInspect={openTileDetail}
        onPageChange={setPageIndex}
      />
    );
  };

  if (specialView === 'earnRewards') {
    return (
      <EarnRewardsLayer
        x={x}
        y={y}
        w={w}
        h={resolvedSectionBottomY - y}
        cfg={cfg}
        onClose={onClearSpecial}
        dailyRewardStatus={dailyRewardStatus}
        onDailyRewardSpin={onDailyRewardSpin}
      />
    );
  }

  if (activeDeckPreviewItem) {
    return (
      <VaultDeckPreviewLayer
        x={x}
        y={y}
        w={w}
        h={resolvedSectionBottomY - y}
        cfg={cfg}
        deckItem={activeDeckPreviewItem}
        renderDeckPreview={renderVaultDeckPreview}
        onClose={() => setActiveDeckPreviewItem(null)}
      />
    );
  }

  const bottomFrameBounds = mainSlotFrameBounds(x, w, cfg, 'bottom');

  return (
    <g>
      {renderTabLayer(activeTab, y, topH, 'top')}
      {displayedInfoDetail ? (
        <InfoDetailLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} mode={displayedInfoDetail} cfg={cfg} onClose={closeBottomDetail} />
      ) : selectedTileDetail ? (
        <TileDetailLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} item={selectedTileDetail} cfg={cfg} onClose={closeBottomDetail} onBuy={onBuy} />
      ) : bottomPreviewTarget === 'Earn Free AC' ? (
        <EarnRewardsLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} cfg={cfg} onClose={onClearBottomPreview} dailyRewardStatus={dailyRewardStatus} onDailyRewardSpin={onDailyRewardSpin} />
      ) : activeTab === 'Vault' && vaultTopSelectionKey && !bottomPreviewTarget ? (
        renderTabLayer('Vault', bottomY, bottomH, 'bottom')
      ) : (
        renderTabLayer(displayedBottomTab, bottomY, bottomH, 'bottom')
      )}
    </g>
  );
}

function SideNavCard({
  x,
  y,
  w,
  h,
  item,
  selected,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: typeof SHOP_SIDE_ITEMS[number];
  selected: boolean;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const token = cfg.componentTokens.sideNavCard;
  const color = selected ? cfg.colors.activeBlue : toneColor(item.tone, cfg);
  const imageSize = Math.min(cfg.leftPanel.imageMaxSize, h - token.imageHeightPad);
  const imageX = x + token.imageInsetX;
  const imageY = y + (h - imageSize) / 2;
  const textX = imageX + imageSize + token.textGap;
  const titleSize = item.title.length > token.compactTitleLength ? token.compactTitleSize : token.titleSize;
  const activeFill = alphaColor(color, cfg.componentTokens.cardChrome.activeFillOpacity);
  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={cfg.svgDefaults.cursorPointerClassName} role="button" tabIndex={0}>
      {selected ? (
        <>
          <rect x={x - token.selectedPad} y={y - token.selectedPad} width={w + token.selectedPad * 2} height={h + token.selectedPad * 2} rx={token.selectedGlowRadius} fill="none" stroke={color} strokeWidth={token.selectedGlowStrokeWidth} opacity={token.selectedGlowOpacity} filter="url(#shopSoftGlow)" />
          <path d={`M ${x + w - token.arrowEdgeInset} ${y + token.arrowTopInset} L ${x + w + 18} ${y + h / 2} L ${x + w - token.arrowEdgeInset} ${y + h - token.arrowTopInset} Z`} fill={color} filter="url(#shopSoftGlow)" />
        </>
      ) : null}
      {hovered && !selected ? <rect x={x - token.hoverPad} y={y - token.hoverPad} width={w + token.hoverPad * 2} height={h + token.hoverPad * 2} rx={token.hoverGlowRadius} fill="none" stroke={color} strokeWidth={token.hoverGlowStrokeWidth} opacity={token.hoverGlowOpacity} filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.leftPanel.cardRadius} fill={selected ? alphaColor(cfg.colors.activeBlue, 0.36) : hovered ? activeFill : cfg.colors.panelFill} stroke={selected || hovered ? color : cfg.colors.tileStroke} strokeWidth={selected || hovered ? 1.6 : 1.25} />
      <TransparentAssetImage x={imageX} y={imageY} w={imageSize} h={imageSize} imageUrl={item.imageUrl} cfg={cfg} glow={selected || hovered} cyanGlow={hovered && !selected} />
      <Txt x={textX} y={y + token.titleY} size={titleSize} weight="950" cfg={cfg}>{item.title}</Txt>
      <WrappedText x={textX} y={y + token.subtitleY} width={w - (textX - x) - token.subtitleRightPad} lines={item.subtitle} size={token.subtitleSize} lineHeight={token.subtitleLineHeight} fill={cfg.colors.mutedText} maxLines={2} cfg={cfg} />
    </g>
  );
}

function EarnFreeSideCard({
  x,
  y,
  w,
  h,
  selected,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  selected: boolean;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const earn = cfg.componentTokens.leftEarnPanel;
  const token = cfg.componentTokens.sideNavCard;
  const active = selected || hovered;
  const color = cfg.colors.activeBlue;
  const imageX = x + earn.imageInsetX;
  const imageY = y + earn.imageTop;
  const imageW = w - earn.imageInsetX * 2;
  const imageH = Math.max(earn.imageMinH, h - earn.imageBottomReserve);
  const badgeX = x + earn.buttonInsetX;
  const badgeY = y + h - earn.buttonBottom;
  const badgeW = w - earn.buttonInsetX * 2;
  const arrowH = cfg.leftPanel.cardH - token.arrowTopInset * 2;
  const arrowTop = y + h / 2 - arrowH / 2;
  const arrowBottom = arrowTop + arrowH;
  const activeFill = alphaColor(color, cfg.componentTokens.cardChrome.activeFillOpacity);
  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} role="button" tabIndex={0} className="shop-page-svg-clickable">
      {selected ? (
        <>
          <rect x={x - token.selectedPad} y={y - token.selectedPad} width={w + token.selectedPad * 2} height={h + token.selectedPad * 2} rx={token.selectedGlowRadius} fill="none" stroke={color} strokeWidth={token.selectedGlowStrokeWidth} opacity={token.selectedGlowOpacity} filter="url(#shopSoftGlow)" />
          <path d={`M ${x + w - token.arrowEdgeInset} ${arrowTop} L ${x + w + 18} ${y + h / 2} L ${x + w - token.arrowEdgeInset} ${arrowBottom} Z`} fill={color} filter="url(#shopSoftGlow)" />
        </>
      ) : null}
      {hovered && !selected ? <rect x={x - token.hoverPad} y={y - token.hoverPad} width={w + token.hoverPad * 2} height={h + token.hoverPad * 2} rx={token.hoverGlowRadius} fill="none" stroke={color} strokeWidth={token.hoverGlowStrokeWidth} opacity={token.hoverGlowOpacity} filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.leftPanel.earnRadius} fill={selected ? alphaColor(cfg.colors.activeBlue, 0.36) : hovered ? activeFill : cfg.colors.panelFill} stroke={active ? color : cfg.colors.tileStroke} strokeWidth={active ? 1.6 : 1.25} />
      <HeaderBar x={x + earn.headerInset} y={y + earn.headerInset} w={w - earn.headerInset * 2} h={earn.headerH} cfg={cfg} stroke={color}>
        <Txt x={x + earn.headerTitleX} y={y + earn.headerTitleY} size={earn.headerTitleSize} weight="950" cfg={cfg}>{SHOP_UI_COPY.earnPanel.title}</Txt>
      </HeaderBar>
      <TransparentAssetImage x={imageX} y={imageY} w={imageW} h={imageH} imageUrl={SHOP_EARN_FREE_AC_IMAGE_URL} cfg={cfg} glow={active} cyanGlow={hovered && !selected} />
      <WrappedText x={x + earn.textInsetX} y={y + h - earn.textBottom} width={w - earn.textInsetX * 2} lines={SHOP_UI_COPY.earnPanel.description} size={earn.textSize} lineHeight={earn.textLineHeight} fill={cfg.colors.frameSubtitleText} maxLines={earn.textMaxLines} cfg={cfg} />
      <rect x={badgeX} y={badgeY} width={badgeW} height={earn.buttonH} rx={cfg.svgDefaults.roundedNone} fill={active ? 'url(#shopActiveBlue)' : cfg.colors.buttonIdleFill} stroke={active ? color : cfg.colors.buttonIdleStroke} strokeWidth="1.15" />
      <Txt x={badgeX + badgeW / 2 - 8} y={badgeY + earn.buttonH / 2 + 1} size="9.5" weight="850" anchor="middle" cfg={cfg}>{SHOP_UI_COPY.earnPanel.buttonLabel}</Txt>
      <line x1={badgeX + badgeW - 24} y1={badgeY + 1} x2={badgeX + badgeW - 24} y2={badgeY + earn.buttonH - 1} stroke={active ? color : cfg.colors.buttonIdleStroke} />
      <path d={`M ${badgeX + badgeW - 15} ${badgeY + 7} L ${badgeX + badgeW - 7} ${badgeY + earn.buttonH / 2} L ${badgeX + badgeW - 15} ${badgeY + earn.buttonH - 7} Z`} fill={active ? cfg.colors.buttonArrowHoverFill : cfg.colors.buttonArrowFill} />
    </g>
  );
}

function LeftSidePanel({
  x,
  y,
  w,
  h,
  activeTab,
  earnActive,
  cfg,
  onTabChange,
  onEarn,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  activeTab: ShopTab;
  earnActive: boolean;
  cfg: ShopPageSvgControls;
  onTabChange: (tab: ShopTab) => void;
  onEarn: () => void;
}) {
  const cardX = x + cfg.leftPanel.cardInsetX;
  const cardW = w - cfg.leftPanel.cardInsetX * 2;
  const earnY = y + cfg.leftPanel.pad + SHOP_SIDE_ITEMS.length * cfg.leftPanel.cardH + (SHOP_SIDE_ITEMS.length - 1) * cfg.leftPanel.cardGap + cfg.leftPanel.earnGap;
  const earn = cfg.componentTokens.leftEarnPanel;
  const earnH = Math.max(earn.imageMinH + earn.imageTop, y + h - earnY - cfg.leftPanel.earnBottomPad);
  const earnX = x + cfg.leftPanel.earnInsetX;
  const earnW = w - cfg.leftPanel.earnInsetX * 2;
  return (
    <Panel x={x} y={y} w={w} h={h} r={cfg.leftPanel.panelRadius} stroke={cfg.colors.panelStroke} cfg={cfg}>
      {SHOP_SIDE_ITEMS.map((item, index) => (
        <SideNavCard
          key={item.key}
          x={cardX}
          y={y + cfg.leftPanel.pad + index * (cfg.leftPanel.cardH + cfg.leftPanel.cardGap)}
          w={cardW}
          h={cfg.leftPanel.cardH}
          item={item}
          selected={activeTab === item.key && !earnActive}
          cfg={cfg}
          onClick={() => onTabChange(item.key)}
        />
      ))}
      <EarnFreeSideCard x={earnX} y={earnY} w={earnW} h={earnH} selected={earnActive} cfg={cfg} onClick={onEarn} />
    </Panel>
  );
}

function RightPreviewContent({
  x,
  y,
  w,
  h,
  active,
  cfg,
  acBalance,
  onElite,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  active: string;
  cfg: ShopPageSvgControls;
  acBalance: number;
  onElite: () => void;
}) {
  const token = cfg.componentTokens.rightPanel;
  if (active === 'wallet') {
    const dotColors = [cfg.colors.gold, cfg.colors.activeBlue, cfg.colors.green, cfg.colors.violet, cfg.colors.orange];
    const rows = SHOP_RIGHT_ROWS.wallet.map((row, index) => index === 0 ? [row[0], `${acBalance.toLocaleString()} ${row[1]}`] : row);
    return (
      <g>
        <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.gold} cfg={cfg}>WALLET & BALANCE</Txt>
        {rows.map((row, index) => <InfoRow key={row[0]} x={x + token.rowX} y={y + token.walletFirstRowY + index * token.walletRowGap} w={w - token.rowX * 2} label={row[0]} value={row[1]} dotFill={dotColors[index]} cfg={cfg} />)}
      </g>
    );
  }

  if (active === 'pass') {
    return (
      <g>
        <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.violet} cfg={cfg}>ACTIVE PASS</Txt>
        <ProductImage x={x + token.imageInsetX} y={y + token.passImageY} w={w - token.imageInsetX * 2} h={token.passImageH} imageUrl={SHOP_STATIC_PASSES[1].imageUrl} cfg={cfg} />
        <rect x={x + token.imageInsetX} y={y + token.passOverlayY} width={w - token.imageInsetX * 2} height={token.passOverlayH} fill={cfg.colors.tileOverlayFill} />
        <Txt x={x + token.imageInsetX + token.rowX} y={y + token.passOverlayY + token.passOverlayH / 2 - 1} size={token.accountNameSize} weight="950" cfg={cfg}>Champion Pass</Txt>
        <SvgButton x={x} y={y + h - token.bottomButtonH} w={w} h={token.bottomButtonH} label="Manage Pass" small onClick={onElite} cfg={cfg} />
      </g>
    );
  }

  if (active === 'events') {
    return (
      <g>
        <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.violet} cfg={cfg}>UPCOMING EVENTS</Txt>
        {SHOP_RIGHT_ROWS.events.map((row, index) => (
          <g key={row[0]}>
            <rect x={x + token.rowX} y={y + token.eventFirstRowY + index * token.eventRowGap} width={w - token.rowX * 2} height={token.eventRowH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.rowFill} stroke={cfg.colors.violet} />
            <Txt x={x + token.rowX * 2} y={y + token.eventFirstRowY + token.contentTitleSize + index * token.eventRowGap} size={token.eventButtonH / 2} weight="900" cfg={cfg}>{row[0]}</Txt>
            <Txt x={x + token.rowX * 2} y={y + token.eventFirstRowY + token.contentTitleSize + token.accountEloSize + index * token.eventRowGap} fill={cfg.colors.mutedText} size={token.accountEloSize - 3.2} cfg={cfg}>{row[1]}</Txt>
            <SvgButton x={x + w - token.eventButtonRight} y={y + token.eventButtonY + index * token.eventRowGap} w={token.eventButtonW} h={token.eventButtonH} label={row[2]} small cfg={cfg} />
          </g>
        ))}
      </g>
    );
  }

  if (active === 'recent') {
    return (
      <g>
        <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.green} cfg={cfg}>RECENT PURCHASES</Txt>
        {SHOP_RIGHT_ROWS.recent.map((row, index) => <InfoRow key={row[0]} x={x + token.rowX} y={y + token.recentFirstRowY + index * token.recentRowGap} w={w - token.rowX * 2} label={row[0]} value={row[1]} stroke={cfg.colors.green} cfg={cfg} />)}
      </g>
    );
  }

  return (
    <g>
      <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.activeBlue} cfg={cfg}>ACCOUNT PREVIEW</Txt>
      <circle cx={x + token.accountAvatarX} cy={y + token.accountAvatarY} r={token.accountAvatarR} fill={alphaColor(cfg.colors.violet, 0.1)} stroke={cfg.colors.activeBlue} strokeWidth={token.previewStrokeWidth} />
      <Txt x={x + token.accountNameX} y={y + token.accountNameY} size={token.accountNameSize} weight="950" cfg={cfg}>ocentra</Txt>
      <Txt x={x + token.accountNameX} y={y + token.accountEloY} fill={cfg.colors.mutedText} size={token.accountEloSize} weight="600" cfg={cfg}>ELO 1200</Txt>
      <rect x={x + token.accountNameX} y={y + token.accountProgressY} width={w - token.accountNameX - token.contentTitleX * 2} height={token.accountProgressH} rx={token.accountProgressH / 2} fill={cfg.colors.headerFill} />
      <rect x={x + token.accountNameX} y={y + token.accountProgressY} width={Math.min(token.accountNameX + token.contentTitleX, w - token.accountNameX - token.contentTitleX * 3)} height={token.accountProgressH} rx={token.accountProgressH / 2} fill={cfg.colors.activeBlue} />
      <SvgButton x={x} y={y + h - token.bottomButtonH} w={w} h={token.bottomButtonH} label="View Profile" small cfg={cfg} />
    </g>
  );
}

function RightSidePanel({
  x,
  y,
  w,
  h,
  cfg,
  acBalance,
  onElite,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  acBalance: number;
  onElite: () => void;
}) {
  const [active, setActive] = useState('account');
  const activeMeta = SHOP_RIGHT_TABS.find(tab => tab.id === active) ?? SHOP_RIGHT_TABS[0];
  const token = cfg.componentTokens.rightPanel;
  const mainH = h - cfg.rightPanel.pad * 2 - cfg.rightPanel.tabGap * SHOP_RIGHT_TABS.length - cfg.rightPanel.tabH * SHOP_RIGHT_TABS.length;
  const mainX = x + cfg.rightPanel.pad;
  const mainY = y + cfg.rightPanel.pad;
  const mainW = w - cfg.rightPanel.pad * 2;
  const tabsY = mainY + mainH;
  const selectorH = h - cfg.rightPanel.pad - tabsY + y;
  return (
    <Panel x={x} y={y} w={w} h={h} r={cfg.rightPanel.radius} stroke={cfg.colors.panelStroke} cfg={cfg}>
      <path d={topRoundedRectPath(mainX, mainY, mainW, mainH, token.panelRadius)} fill="none" stroke={activeMeta.accent} strokeWidth={token.previewGlowWidth} opacity={token.previewGlowOpacity} filter="url(#shopSoftGlow)" />
      <path d={topRoundedRectPath(mainX, mainY, mainW, mainH, token.panelRadius)} fill={cfg.colors.panelFill} stroke={activeMeta.accent} strokeWidth={token.previewStrokeWidth} />
      <HeaderBar
        x={mainX + token.previewHeaderInset}
        y={mainY + token.previewHeaderInset}
        w={mainW - token.previewHeaderInset * 2}
        h={cfg.rightPanel.previewHeaderH}
        stroke={activeMeta.accent}
        cfg={cfg}
      >
        <Txt x={mainX + token.previewHeaderTitleX} y={mainY + token.previewHeaderTitleY} size={token.previewHeaderTitleSize} weight="950" fill={activeMeta.accent} cfg={cfg}>{activeMeta.title}</Txt>
      </HeaderBar>
      <RightPreviewContent x={mainX} y={mainY + cfg.rightPanel.previewHeaderH} w={mainW} h={mainH - cfg.rightPanel.previewHeaderH} active={active} cfg={cfg} acBalance={acBalance} onElite={onElite} />
      <path d={bottomRoundedRectPath(mainX, tabsY, mainW, selectorH, token.panelRadius)} fill={cfg.colors.tileFooterFill} stroke={activeMeta.accent} strokeWidth={token.previewStrokeWidth} strokeOpacity=".82" />
      {SHOP_RIGHT_TABS.map((tab, index) => (
        <g key={tab.id} onClick={() => setActive(tab.id)} role="button" tabIndex={0} className="shop-page-svg-clickable">
          <rect x={mainX} y={tabsY + token.tabStartGap + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} width={mainW} height={cfg.rightPanel.tabH} fill={cfg.colors.frameFill} />
          <line x1={mainX} y1={tabsY + token.tabStartGap + token.tabTopLineOffset + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} x2={mainX + mainW} y2={tabsY + token.tabStartGap + token.tabTopLineOffset + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} stroke={cfg.colors.line} />
          <line x1={mainX} y1={tabsY + token.tabStartGap + cfg.rightPanel.tabH - token.tabBottomLineOffset + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} x2={mainX + mainW} y2={tabsY + token.tabStartGap + cfg.rightPanel.tabH - token.tabBottomLineOffset + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} stroke={tab.accent} strokeWidth={active === tab.id ? token.tabActiveStrokeWidth : token.tabDefaultStrokeWidth} />
          <rect x={mainX + token.tabBoxInsetX} y={tabsY + token.tabStartGap + token.tabBoxInsetY + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} width={mainW - token.tabBoxInsetX * 2} height={cfg.rightPanel.tabH - token.tabBoxInsetY * 2} fill={`${tab.accent}${active === tab.id ? '26' : '12'}`} stroke={tab.accent} strokeWidth={active === tab.id ? token.tabBoxActiveStrokeWidth : token.tabBoxDefaultStrokeWidth} />
          <rect x={mainX + token.tabBoxInsetX} y={tabsY + token.tabStartGap + token.tabBoxInsetY + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} width={token.tabAccentW} height={cfg.rightPanel.tabH - token.tabBoxInsetY * 2} fill={tab.accent} opacity={active === tab.id ? .95 : .62} />
          <Txt x={mainX + mainW / 2} y={tabsY + token.tabStartGap + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap) + cfg.rightPanel.tabH / 2 + 1} size={token.tabTextSize} weight="950" fill={active === tab.id ? cfg.colors.bodyText : cfg.colors.tileSubtitleText} anchor="middle" cfg={cfg}>{tab.title}</Txt>
        </g>
      ))}
    </Panel>
  );
}

function PreviewPanel({
  x,
  y,
  w,
  h,
  row,
  cfg,
  onSelect,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  row: typeof SHOP_PREVIEWS[number];
  cfg: ShopPageSvgControls;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const token = cfg.componentTokens.bottomPreviewPanel;
  const previewItems = row.items.map((label, index) => {
    return {
      key: `${row.title}-${index}`,
      label,
      imageUrl: row.imageUrls[index],
    };
  });
  const itemW = (w - cfg.bottomPreview.sidePad * 2 - cfg.bottomPreview.cardGap * Math.max(0, previewItems.length - 1)) / previewItems.length;
  const itemH = h - cfg.bottomPreview.headerH - cfg.bottomPreview.bottomPad;
  const bodyX = x + cfg.bottomPreview.sidePad;
  const bodyY = y + cfg.bottomPreview.headerH + token.cardInset;
  const bodyW = w - cfg.bottomPreview.sidePad * 2;
  const bodyH = itemH - token.cardInset;
  const showLabels = row.tab !== 'Vault';
  const footerH = showLabels ? Math.min(token.overlayMaxH, Math.max(token.overlayMinH, bodyH * token.overlayRatio)) : 0;
  const artH = Math.max(34, showLabels ? bodyH - footerH : bodyH - token.cardInset);
  const labelBoxY = bodyH - footerH + token.labelBoxInsetY;
  const labelBoxH = Math.max(16, footerH - token.labelBoxInsetY * 2);
  const itemStep = itemW + cfg.bottomPreview.cardGap;
  return (
    <g className={cfg.svgDefaults.cursorPointerClassName} onClick={onSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {hovered ? <path d={topRoundedRectPath(x - token.hoverPad, y - token.hoverPad, w + token.hoverPad * 2, h + token.hoverPad * 2, token.radius)} fill="none" stroke={row.accent} strokeWidth={token.hoverStrokeWidth} opacity={token.hoverOpacity} filter="url(#shopSoftGlow)" /> : null}
      <path d={topRoundedRectPath(x, y, w, h, token.radius)} fill={hovered ? `${row.accent}12` : cfg.colors.panelFill} stroke={row.accent} strokeWidth={hovered ? token.hoverPanelStrokeWidth : token.panelStrokeWidth} />
      <HeaderBar x={x + token.cardInset} y={y + token.cardInset} w={w - token.cardInset * 2} h={cfg.bottomPreview.headerH} stroke={row.accent} cfg={cfg}>
        <MiniIcon type="crate" x={x + token.headerIconX} y={y + token.headerIconY} size={token.headerIconSize} tone="cyan" cfg={cfg} />
        <Txt x={x + token.titleX} y={y + token.titleY} size={token.titleSize} weight="950" cfg={cfg}>{row.title}</Txt>
        <Txt x={x + token.titleX} y={y + token.subtitleY} size={token.subtitleSize} fill={cfg.colors.mutedText} cfg={cfg}>{row.subtitle}</Txt>
      </HeaderBar>
      <svg x={bodyX} y={bodyY} width={bodyW} height={bodyH} overflow="hidden">
        <g className="shop-preview-item-track">
          {previewItems.map((item, index) => {
            const itemX = index * itemStep;
            const labelBoxX = itemX + token.labelBoxInsetX;
            const labelBoxW = Math.max(20, itemW - token.labelBoxInsetX * 2);
            const labelTextW = Math.max(8, labelBoxW - token.labelInsetX * 2);
            const labelFontSize = Math.min(token.labelSize, Math.max(7.2, labelTextW / Math.max(8.5, item.label.length * 0.62)));
            const artX = itemX + token.cardInset;
            const artY = token.cardInset;
            const artW = itemW - token.cardInset * 2;
            const artBoxH = artH - token.cardInset;
            return (
              <g key={`${item.key}-${index}`}>
                <TransparentAssetImage x={artX} y={artY} w={artW} h={artBoxH} imageUrl={item.imageUrl} cfg={cfg} glow={hovered} />
                <rect x={artX} y={artY} width={artW} height={artBoxH} rx={token.cardRadius} fill="none" stroke={row.accent} strokeWidth={token.panelStrokeWidth} strokeOpacity={token.imageStrokeOpacity} />
                {showLabels ? (
                  <>
                    <rect x={labelBoxX} y={labelBoxY} width={labelBoxW} height={labelBoxH} rx={token.labelBoxRadius} fill="none" stroke={row.accent} strokeWidth={token.labelBoxGlowStrokeWidth} opacity={token.labelBoxGlowOpacity} filter="url(#shopSoftGlow)" />
                    <rect x={labelBoxX} y={labelBoxY} width={labelBoxW} height={labelBoxH} rx={token.labelBoxRadius} fill={cfg.colors.tileFooterFill} stroke={row.accent} strokeWidth={token.labelBoxStrokeWidth} strokeOpacity=".9" />
                    <Txt x={labelBoxX + labelBoxW / 2} y={labelBoxY + labelBoxH / 2 + 0.5} anchor="middle" size={labelFontSize} weight="900" fill={cfg.colors.bodyText} cfg={cfg}>{item.label}</Txt>
                  </>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </g>
  );
}

function FooterLayer({ x, y, w, h, cfg }: { x: number; y: number; w: number; h: number; cfg: ShopPageSvgControls }) {
  const token = cfg.componentTokens.footerLayer;
  const columns = SHOP_UI_COPY.footer.slice(0, Math.max(1, Math.min(SHOP_UI_COPY.footer.length, Math.round(cfg.footer.columns))));
  const colW = w / columns.length;
  return (
    <g>
      <path d={bottomRoundedRectPath(x, y, w, h, cfg.footer.radius)} fill={cfg.colors.footerFill} stroke={cfg.colors.panelStroke} strokeWidth={token.strokeWidth} />
      <line x1={x + token.topLineInset} y1={y + 1} x2={x + w - token.topLineInset} y2={y + 1} stroke={cfg.colors.edgeStroke} strokeOpacity={token.topLineOpacity} />
      {columns.map((item, index) => {
        const cx = x + index * colW;
        return (
          <g key={item.title}>
            <rect x={cx} y={y + 1} width={colW} height={h - 2} fill={cfg.colors.tableRowFillOdd} />
            {index > 0 ? <line x1={cx} y1={y + token.separatorPad} x2={cx} y2={y + h - token.separatorPad} stroke={cfg.colors.line} /> : null}
            <MiniIcon type={item.icon as ShopIcon} x={cx + cfg.footer.iconLeftPad} y={y + h / 2 - token.iconYPad} size={token.iconSize} tone={item.tone as ShopTone} cfg={cfg} />
            <Txt x={cx + colW / 2} y={y + h / 2 + token.titleY} size={cfg.footer.titleSize} weight="850" anchor="middle" cfg={cfg}>{item.title}</Txt>
            <Txt x={cx + colW / 2} y={y + h / 2 + token.subtitleY} size={cfg.footer.subtitleSize} fill={cfg.colors.mutedText} anchor="middle" cfg={cfg}>{item.sub}</Txt>
          </g>
        );
      })}
    </g>
  );
}

function EarnQuestCard({
  x,
  y,
  w,
  h,
  quest,
  cfg,
  featured = false,
  selected = false,
  onAction,
  dailyRewardStatus,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  quest: ShopQuest;
  cfg: ShopPageSvgControls;
  featured?: boolean;
  selected?: boolean;
  onAction: (quest: ShopQuest) => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
}) {
  const [hovered, setHovered] = useState(false);
  const token = cfg.componentTokens.earnRewards;
  const color = toneColor(quest.tone, cfg);
  const headerH = featured ? token.questFeaturedHeaderH : token.questHeaderH;
  const footerH = token.questFooterH;
  const imageY = y + headerH;
  const featuredFooterY = y + h - footerH;
  const compactFooterY = y + h - footerH;
  const compactArtY = imageY + 1;
  const compactArtH = Math.max(54, compactFooterY - compactArtY);
  const featuredArtY = imageY + 1;
  const featuredRewardBandH = token.questFeaturedRewardBandH;
  const featuredArtH = Math.max(110, featuredFooterY - featuredArtY - featuredRewardBandH);
  const rewardBadgeW = Math.min(featured ? 156 : 132, w * 0.52);
  return (
    <g className={cfg.svgDefaults.cursorPointerClassName} onClick={() => onAction(quest)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} role="button" tabIndex={0}>
      {(hovered || selected) ? (
        <rect x={x - token.questHoverPad} y={y - token.questHoverPad} width={w + token.questHoverPad * 2} height={h + token.questHoverPad * 2} rx={cfg.svgDefaults.roundedNone} fill="none" stroke={color} strokeWidth={selected ? token.questSelectedStrokeWidth : token.questHoverStrokeWidth} opacity={selected ? token.questSelectedOutlineOpacity : token.questHoverOutlineOpacity} filter="url(#shopSoftGlow)" />
      ) : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.svgDefaults.roundedNone} fill={hovered || selected ? alphaColor(color, token.questActiveFillOpacity) : cfg.colors.earnQuestCardFill} stroke={selected ? cfg.svgDefaults.selectedStroke : color} strokeOpacity={hovered || selected ? token.questActiveStrokeOpacity : token.questIdleStrokeOpacity} strokeWidth={selected ? token.questCardSelectedStrokeWidth : hovered ? token.questCardHoverStrokeWidth : token.questCardIdleStrokeWidth} />
      <HeaderBar x={x + token.questInset} y={y + token.questInset} w={w - token.questInset * 2} h={headerH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
        <WrappedText x={x + w / 2} y={y + (featured ? 20 : 17)} width={w - 24} lines={quest.title} size={featured ? 14 : 10.8} lineHeight={featured ? 15 : 11} fill={color} weight={950} maxLines={1} anchor="middle" cfg={cfg} />
      </HeaderBar>
      {featured ? (
        <>
          <RewardQuestArtwork x={x + 1} y={featuredArtY} w={w - 2} h={featuredArtH} quest={quest} cfg={cfg} featured active={hovered || selected} onSpin={() => onAction(quest)} reward={dailyRewardStatus} />
          <rect x={x + token.questRewardBadgeX} y={featuredFooterY - token.questRewardBadgeTop} width={rewardBadgeW} height={token.questRewardBadgeH} rx={cfg.svgDefaults.roundedNone} fill={alphaColor(color, token.questRewardBadgeFillOpacity)} stroke={color} strokeOpacity={token.questFeaturedBadgeStrokeOpacity} />
          <Txt x={x + token.questFeaturedRewardTextX} y={featuredFooterY - token.questFeaturedRewardTextY} size={token.questFeaturedRewardSize} weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
          <rect x={x + 1} y={featuredFooterY} width={w - 2} height={footerH - 1} fill={cfg.colors.earnQuestFooterFill} />
          <SvgButton x={x + 12} y={featuredFooterY + 5} w={w - 24} h={footerH - 10} label={quest.action} active small onClick={() => onAction(quest)} cfg={cfg} />
        </>
      ) : (
        <>
          <RewardQuestArtwork x={x + 1} y={compactArtY} w={w - 2} h={compactArtH} quest={quest} cfg={cfg} featured={false} active={hovered || selected} onSpin={() => onAction(quest)} reward={dailyRewardStatus} />
          <rect x={x + 1} y={compactFooterY} width={w - 2} height={footerH - 1} fill={cfg.colors.earnQuestFooterFill} />
          <rect x={x + 12} y={compactFooterY + 5} width={rewardBadgeW} height={footerH - 10} rx={cfg.svgDefaults.roundedNone} fill={alphaColor(color, token.questRewardBadgeFillOpacity)} stroke={color} strokeOpacity={token.questCompactBadgeStrokeOpacity} />
          <Txt x={x + 24} y={compactFooterY + footerH / 2} size={token.questRewardSize} weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
          <rect x={x + w - token.questCadenceBadgeRight} y={compactFooterY + 5} width={token.questCadenceBadgeW} height={footerH - 10} rx={cfg.svgDefaults.roundedNone} fill={alphaColor(color, token.questRewardBadgeFillOpacity)} stroke={color} strokeOpacity={token.questCadenceBadgeStrokeOpacity} />
          <Txt x={x + w - token.questCadenceTextRight} y={compactFooterY + footerH / 2} anchor="middle" size={token.questCadenceTextSize} fill={cfg.colors.earnQuestText} weight={token.questCadenceTextWeight} cfg={cfg}>{quest.cadence}</Txt>
        </>
      )}
    </g>
  );
}

function RewardActionOverlay({
  x,
  y,
  w,
  h,
  quest,
  cfg,
  onClose,
  onSpin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  quest: ShopQuest;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  onSpin: () => void;
}) {
  const token = cfg.componentTokens.earnRewards;
  const copy = SHOP_UI_COPY.earnRewards;
  const color = toneColor(quest.tone, cfg);
  const isShare = quest.group === 'Share';
  const isInvite = quest.key === 'invite_friend';
  const title = isShare ? `${copy.shareTitlePrefix} ${quest.title}` : isInvite ? copy.inviteTitle : `${copy.completeTitlePrefix} ${quest.title}`;
  const helper = isShare ? copy.shareHelper : isInvite ? copy.inviteHelper : copy.defaultHelper;
  const chips = isShare ? copy.shareChips : isInvite ? copy.inviteChips : copy.defaultChips;
  const hasSpinReward = quest.reward.toLowerCase().includes('spin') || quest.details.some(detail => detail.toLowerCase().includes('spin'));
  const primaryLabel = isShare ? copy.openShare : isInvite ? copy.copyInvite : copy.start;
  const secondaryLabel = isInvite ? copy.checkVerify : copy.verifySpin;
  const artW = Math.min(token.overlayArtMaxW, w * token.overlayArtRatio);
  const artX = x + token.overlayArtX;
  const artY = y + token.overlayArtY;
  const artH = h - token.overlayArtBottomReserve;
  const detailX = artX + artW + token.overlayDetailGap;
  const detailW = w - (detailX - x) - token.overlayDetailRightPad;
  const stepY = artY + token.overlayStepTopOffset;
  const statusY = y + h - token.overlayStatusBottom;
  const buttonW = (w - token.overlayButtonOuterPad * 2 - token.overlayButtonGap) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={cfg.colors.earnOverlayScrimFill} />
      <rect x={x + token.overlayPad} y={y + token.overlayPad} width={w - token.overlayPad * 2} height={h - token.overlayPad * 2} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.earnOverlayPanelFill} stroke={color} strokeWidth={token.overlayPanelStrokeWidth} filter="url(#shopSoftGlow)" />
      <HeaderBar x={x + token.overlayHeaderX} y={y + token.overlayHeaderY} w={w - token.overlayHeaderPadW} h={token.overlayHeaderH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
        <MiniIcon type={quest.icon} x={x + token.overlayIconX} y={y + token.overlayIconY} size={token.overlayIconSize} tone={quest.tone} cfg={cfg} />
        <WrappedText x={x + token.overlayTitleX} y={y + token.overlayTitleY} width={w - token.overlayTitleRightReserve} lines={title} size={token.overlayTitleSize} lineHeight={token.overlayTitleLineHeight} fill={color} weight={950} maxLines={1} cfg={cfg} />
        <SvgButton x={x + w - token.overlayCloseRight} y={y + token.overlayCloseY} w={token.overlayCloseW} h={token.overlayCloseH} label={copy.closeLabel} small arrow={false} onClick={onClose} cfg={cfg} />
      </HeaderBar>
      <rect x={artX} y={artY} width={artW} height={artH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.earnOverlayArtFill} stroke={color} strokeOpacity={token.overlayStatusStrokeOpacity} />
      <RewardQuestArtwork x={artX + 1} y={artY + 1} w={artW - 2} h={Math.max(120, artH - token.overlayArtFooterH)} quest={quest} cfg={cfg} featured={false} active />
      <rect x={artX + 1} y={artY + artH - token.overlayArtFooterH} width={artW - 2} height={token.overlayArtFooterVisibleH} fill={cfg.colors.earnOverlayArtFooterFill} />
      <Txt x={artX + token.overlayArtRewardX} y={artY + artH - token.overlayArtRewardY} size={token.overlayArtRewardSize} weight={token.overlayArtRewardWeight} fill={color} cfg={cfg}>{quest.reward}</Txt>
      <Txt x={artX + token.overlayArtRewardX} y={artY + artH - token.overlayArtCadenceY} size={token.overlayArtCadenceSize} fill={cfg.colors.earnOverlayMutedText} weight={token.overlayArtCadenceWeight} cfg={cfg}>{quest.cadence} reward</Txt>
      <Txt x={detailX} y={artY + token.overlayDetailTitleY} size={token.overlayDetailTitleSize} weight={token.overlayDetailTitleWeight} fill={color} cfg={cfg}>{quest.title}</Txt>
      <WrappedText x={detailX} y={artY + token.overlayDescriptionY} width={detailW} lines={quest.description} size={token.overlayDescriptionSize} lineHeight={token.overlayDescriptionLineHeight} fill={cfg.colors.earnOverlayBodyText} weight={token.overlayDescriptionWeight} maxLines={2} cfg={cfg} />
      <WrappedText x={detailX} y={artY + token.overlayHelperTextY} width={detailW} lines={helper} size={token.overlayHelperSize} lineHeight={token.overlayHelperLineHeight} fill={cfg.colors.earnOverlayMutedText} weight={token.overlayHelperWeight} maxLines={2} cfg={cfg} />
      {quest.details.map((detail, index) => (
        <g key={detail}>
          <rect x={detailX} y={stepY + index * token.overlayStepGap} width={detailW} height={token.overlayStepH} rx={cfg.svgDefaults.roundedNone} fill={index === 0 ? alphaColor(color, token.questRewardBadgeFillOpacity) : cfg.colors.earnOverlayStepFill} stroke={index === 0 ? color : cfg.colors.earnOverlayStepStroke} strokeOpacity={token.overlayStepStrokeOpacity} />
          <circle cx={detailX + token.overlayStepDotX} cy={stepY + token.overlayStepDotY + index * token.overlayStepGap} r={token.overlayStepDotR} fill={color} opacity={index === 0 ? 1 : token.overlayStepIdleDotOpacity} />
          <WrappedText x={detailX + token.overlayStepTextX} y={stepY + token.overlayStepDotY + index * token.overlayStepGap} width={detailW - token.overlayStepTextReserve} lines={detail} size={token.overlayStepTextSize} lineHeight={token.overlayStepTextLineHeight} fill={cfg.colors.earnOverlayBodyText} weight={token.overlayStepTextWeight} maxLines={1} cfg={cfg} />
        </g>
      ))}
      <rect x={detailX} y={statusY} width={detailW} height={token.overlayStatusH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.earnOverlayStatusFill} stroke={color} strokeOpacity={token.overlayStatusStrokeOpacity} />
      <Txt x={detailX + token.overlayStatusTextX} y={statusY + token.overlayStatusTitleY} size={token.overlayStatusTitleSize} weight={token.overlayStatusTitleWeight} fill={color} cfg={cfg}>{isInvite ? 'Verification' : isShare ? 'Share Target' : 'Progress'}</Txt>
      <WrappedText x={detailX + token.overlayStatusTextX} y={statusY + token.overlayStatusChipsY} width={detailW - token.overlayStatusChipsReserve} lines={chips.join('  /  ')} size={token.overlayStatusChipsSize} lineHeight={token.overlayStatusChipsLineHeight} fill={cfg.colors.earnOverlayMutedText} weight={token.overlayStatusChipsWeight} maxLines={1} cfg={cfg} />
      <SvgButton x={x + token.overlayButtonOuterPad} y={y + h - token.overlayButtonBottom} w={buttonW} h={token.overlayButtonH} label={primaryLabel} active small cfg={cfg} />
      <SvgButton x={x + token.overlayButtonOuterPad + token.overlayButtonGap + buttonW} y={y + h - token.overlayButtonBottom} w={buttonW} h={token.overlayButtonH} label={secondaryLabel} active small onClick={hasSpinReward ? onSpin : undefined} cfg={cfg} />
    </g>
  );
}

function EarnRewardFrameCard({
  x,
  y,
  w,
  h,
  quest,
  cfg,
  featured = false,
  selected = false,
  onAction,
  dailyRewardStatus,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  quest: ShopQuest;
  cfg: ShopPageSvgControls;
  featured?: boolean;
  selected?: boolean;
  onAction: (quest: ShopQuest) => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor(quest.tone, cfg);
  const radius = featured ? 8 : 7;
  const headerH = featured ? Math.min(44, Math.max(34, h * 0.13)) : Math.min(34, Math.max(27, h * 0.2));
  const footerH = featured ? Math.min(58, Math.max(44, h * 0.15)) : Math.min(38, Math.max(30, h * 0.21));
  const bodyY = y + headerH;
  const bodyH = Math.max(1, h - headerH - footerH);
  const footerY = y + h - footerH;
  const artPad = featured ? 12 : 8;
  const titleSize = featured ? 15 : 11.8;
  const titleY = y + headerH / 2 + titleSize * 0.32;
  const rewardW = Math.min(featured ? 158 : 116, w * 0.45);
  const active = hovered || selected;
  const featurePlateY = bodyY + 4;
  const featurePlateH = Math.max(156, Math.min(bodyH * 0.62, bodyH - 126));
  const featureArtH = Math.max(138, featurePlateH - 18);
  const featureArtW = Math.min(w - artPad * 2, Math.max(176, featureArtH * 1.12));
  const featureArtX = x + (w - featureArtW) / 2;
  const featureArtY = featurePlateY + (featurePlateH - featureArtH) / 2;
  const featureDividerY = featurePlateY + featurePlateH + 7;
  const featureTextX = x + 18;
  const featureTextY = featureDividerY + 31;
  const featureTextW = Math.max(80, w - 36);
  const featureDetailsY = Math.min(footerY - 52, featureTextY + 58);
  const compactArtH = Math.max(40, bodyH - 8);
  const compactArtW = Math.min(w - artPad * 2, compactArtH * 1.38);
  return (
    <g
      className={cfg.svgDefaults.cursorPointerClassName}
      onClick={() => onAction(quest)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
    >
      {active ? (
        <>
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={radius + 2} fill="none" stroke={color} strokeWidth={selected ? 2.4 : 1.9} opacity={selected ? 0.46 : 0.28} filter="url(#shopSoftGlow)" />
          <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={Math.max(2, radius - 2)} fill="none" stroke={color} strokeWidth="1" opacity="0.28" />
        </>
      ) : null}
      <path d={lobbyRoundedRectPath(x, y, w, h, radius)} fill={active ? alphaColor(color, 0.075) : cfg.colors.earnQuestCardFill} stroke={active || selected ? color : cfg.colors.frameGlassStroke} strokeWidth={selected ? 1.8 : active ? 1.45 : 1.05} strokeOpacity={active || selected ? 0.92 : 0.62} />
      {!featured ? <rect x={x + 1} y={bodyY} width={w - 2} height={bodyH} fill="url(#shopRewardHaloGradient)" opacity={active ? 0.54 : 0.38} /> : null}
      <path d={topRoundedRectPath(x, y, w, headerH, radius)} fill={alphaColor(color, active ? 0.22 : 0.13)} stroke={color} strokeOpacity={active ? 0.9 : 0.58} strokeWidth="1" />
      <WrappedText x={x + 12} y={titleY} width={w - 24} lines={quest.title} size={titleSize} lineHeight={titleSize + 1.5} fill={color} weight={950} maxLines={1} cfg={cfg} />
      {featured ? (
        <>
          <rect x={x + 1} y={featurePlateY} width={w - 2} height={featurePlateH} fill="url(#shopRewardHaloGradient)" opacity={active ? 0.56 : 0.42} />
          <RewardQuestArtwork x={featureArtX} y={featureArtY} w={featureArtW} h={featureArtH} quest={quest} cfg={cfg} featured active={active} onSpin={() => onAction(quest)} reward={dailyRewardStatus} showBackground={false} />
          <line x1={x + 14} y1={featureDividerY} x2={x + w / 2 - 27} y2={featureDividerY} stroke={color} strokeWidth="2" strokeOpacity="0.9" />
          <rect x={x + w / 2 - 20} y={featureDividerY - 2} width="10" height="4" rx="2" fill={color} opacity="0.9" />
          <rect x={x + w / 2 - 5} y={featureDividerY - 2} width="10" height="4" rx="2" fill={cfg.colors.gold} opacity="0.95" />
          <rect x={x + w / 2 + 10} y={featureDividerY - 2} width="10" height="4" rx="2" fill={color} opacity="0.9" />
          <line x1={x + w / 2 + 27} y1={featureDividerY} x2={x + w - 14} y2={featureDividerY} stroke={color} strokeWidth="2" strokeOpacity="0.9" />
          <Txt x={featureTextX} y={featureTextY} size={12.6} weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
          <WrappedText x={featureTextX} y={featureTextY + 23} width={featureTextW} lines={quest.description} size={10.3} lineHeight={13.2} fill={cfg.colors.earnQuestText} weight={680} maxLines={3} cfg={cfg} />
          <WrappedText x={featureTextX} y={featureDetailsY} width={featureTextW} lines={quest.details.map(detail => `+ ${detail}`)} size={9.4} lineHeight={12.4} fill={cfg.colors.mutedText} weight={650} maxLines={4} cfg={cfg} />
        </>
      ) : (
        <RewardQuestArtwork x={x + (w - compactArtW) / 2} y={bodyY + 4} w={compactArtW} h={compactArtH} quest={quest} cfg={cfg} featured={false} active={active} onSpin={() => onAction(quest)} reward={dailyRewardStatus} showBackground={false} />
      )}
      <path d={bottomRoundedRectPath(x, footerY, w, footerH, radius)} fill={alphaColor(color, active ? 0.16 : 0.09)} stroke={color} strokeOpacity={active ? 0.8 : 0.46} strokeWidth="1" />
      <rect x={x + 10} y={footerY + Math.max(5, (footerH - 24) / 2)} width={rewardW} height={Math.min(24, footerH - 8)} rx="5" fill={alphaColor(color, 0.14)} stroke={color} strokeOpacity="0.66" />
      <Txt x={x + 20} y={footerY + footerH / 2 + 1} size={featured ? 11.4 : 9.2} weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
      <rect x={x + w - 84} y={footerY + Math.max(5, (footerH - 24) / 2)} width={72} height={Math.min(24, footerH - 8)} rx="5" fill={alphaColor(color, 0.1)} stroke={color} strokeOpacity="0.42" />
      <Txt x={x + w - 48} y={footerY + footerH / 2 + 1} anchor="middle" size={featured ? 9.4 : 8.1} fill={cfg.colors.earnQuestText} weight="850" cfg={cfg}>{quest.cadence}</Txt>
    </g>
  );
}

function EarnRewardsBottomLayer({
  x,
  y,
  w,
  h,
  cfg,
  onClose,
  dailyRewardStatus,
  onDailyRewardSpin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
}) {
  const [selectedQuestKey, setSelectedQuestKey] = useState(SHOP_QUESTS[0].key);
  const [actionQuestKey, setActionQuestKey] = useState<string | null>(null);
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const body = mainBottomOverlayContentRect(x, y, w, h);
  const gap = 10;
  const pad = 10;
  const contentX = body.x + pad;
  const contentY = body.y + pad;
  const contentW = Math.max(0, body.w - pad * 2);
  const contentH = Math.max(0, body.h - pad * 2);
  const selectedQuest = SHOP_QUESTS.find(quest => quest.key === selectedQuestKey) ?? SHOP_QUESTS[0];
  const quests = SHOP_QUESTS.filter(quest => quest.key !== selectedQuest.key);
  const gridCols = contentW < 860 ? 2 : 3;
  const visibleQuests = quests.slice(0, gridCols * 2);
  const gridRows = Math.max(1, Math.ceil(visibleQuests.length / gridCols));
  const featureW = Math.min(360, Math.max(288, contentW * 0.3));
  const gridX = contentX + featureW + gap;
  const gridW = Math.max(0, contentX + contentW - gridX);
  const gridCardW = gridCols > 0 ? (gridW - gap * (gridCols - 1)) / gridCols : gridW;
  const gridCardH = gridRows > 0 ? (contentH - gap * (gridRows - 1)) / gridRows : contentH;
  const actionQuest = actionQuestKey ? SHOP_QUESTS.find(quest => quest.key === actionQuestKey) : null;
  const selectQuest = (quest: ShopQuest) => {
    setSelectedQuestKey(quest.key);
    setActionQuestKey(null);
  };
  const openQuestAction = (quest: ShopQuest) => {
    setSelectedQuestKey(quest.key);
    if (quest.key === 'daily_spin') {
      setActionQuestKey(null);
      setSpinnerOpen(true);
      return;
    }
    setActionQuestKey(quest.key);
  };
  return (
    <g>
      <MainBottom
        x={x}
        y={y}
        w={w}
        h={h}
        label={SHOP_UI_COPY.earnRewards.title}
        count={SHOP_QUESTS.length}
        rightActionLabel={SHOP_UI_COPY.earnRewards.backLabel}
        onRightAction={onClose}
      />
      <EarnRewardFrameCard x={contentX} y={contentY} w={featureW} h={contentH} quest={selectedQuest} cfg={cfg} featured selected onAction={openQuestAction} dailyRewardStatus={dailyRewardStatus} />
      {visibleQuests.map((quest, index) => {
        const col = index % gridCols;
        const row = Math.floor(index / gridCols);
        return (
          <EarnRewardFrameCard
            key={quest.key}
            x={gridX + col * (gridCardW + gap)}
            y={contentY + row * (gridCardH + gap)}
            w={gridCardW}
            h={gridCardH}
            quest={quest}
            cfg={cfg}
            selected={quest.key === selectedQuest.key}
            onAction={selectQuest}
            dailyRewardStatus={dailyRewardStatus}
          />
        );
      })}
      {actionQuest ? (
        <RewardActionOverlay
          x={gridX - 6}
          y={contentY - 6}
          w={gridW + 12}
          h={contentH + 12}
          quest={actionQuest}
          cfg={cfg}
          onClose={() => setActionQuestKey(null)}
          onSpin={() => {
            setActionQuestKey(null);
            setSpinnerOpen(true);
          }}
        />
      ) : null}
      <DailySpinSpinnerSvg
        open={spinnerOpen}
        onClose={() => setSpinnerOpen(false)}
        canvas={{ x, y, w, h }}
        reward={dailyRewardStatus}
        onSpin={onDailyRewardSpin}
      />
    </g>
  );
}

function EarnRewardsLayer({
  x,
  y,
  w,
  h,
  cfg,
  onClose,
  dailyRewardStatus,
  onDailyRewardSpin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
}) {
  const [selectedQuestKey, setSelectedQuestKey] = useState(SHOP_QUESTS[0].key);
  const [actionQuestKey, setActionQuestKey] = useState<string | null>(null);
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const token = cfg.componentTokens.earnRewards;
  const accent = cfg.colors.green;
  const bodyY = y + cfg.mainBody.headerH;
  const featureW = Math.min(token.featureMaxW, w * token.featureRatio);
  const featureH = h - cfg.mainBody.headerH - token.bottomPad;
  const gap = token.gap;
  const gridX = x + 22 + featureW + gap;
  const gridW = w - (gridX - x) - 22;
  const gridCardW = (gridW - gap * (token.gridCols - 1)) / token.gridCols;
  const gridCardH = (featureH - gap) / 2;
  const selectedQuest = SHOP_QUESTS.find(quest => quest.key === selectedQuestKey) ?? SHOP_QUESTS[0];
  const actionQuest = actionQuestKey ? SHOP_QUESTS.find(quest => quest.key === actionQuestKey) : null;
  const quests = SHOP_QUESTS.filter(quest => quest.key !== selectedQuest.key).slice(0, token.gridCols * 2);
  const startQuest = (quest: ShopQuest) => {
    setSelectedQuestKey(quest.key);
    if (quest.key === 'daily_spin') {
      setActionQuestKey(null);
      setSpinnerOpen(true);
      return;
    }
    setActionQuestKey(quest.key);
  };
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={SHOP_UI_COPY.earnRewards.title} subtitle={SHOP_UI_COPY.earnRewards.subtitle} rightText={SHOP_UI_COPY.earnRewards.backLabel} accent={accent} cfg={cfg} onRightTextClick={onClose}>
      <EarnQuestCard x={x + 22} y={bodyY + token.bodyTopPad} w={featureW} h={featureH} quest={selectedQuest} cfg={cfg} featured selected onAction={startQuest} dailyRewardStatus={dailyRewardStatus} />
      {quests.map((quest, index) => {
        const col = index % token.gridCols;
        const row = Math.floor(index / token.gridCols);
        return (
          <EarnQuestCard
            key={quest.key}
            x={gridX + col * (gridCardW + gap)}
            y={bodyY + token.bodyTopPad + row * (gridCardH + gap)}
            w={gridCardW}
            h={gridCardH}
            quest={quest}
            cfg={cfg}
            selected={quest.key === selectedQuest.key}
            onAction={startQuest}
            dailyRewardStatus={dailyRewardStatus}
          />
        );
      })}
      {actionQuest ? (
        <RewardActionOverlay
          x={gridX - token.overlayPad / 2}
          y={bodyY + token.bodyTopPad - token.overlayPad / 2}
          w={gridW + token.overlayPad}
          h={featureH + token.overlayPad}
          quest={actionQuest}
          cfg={cfg}
          onClose={() => setActionQuestKey(null)}
          onSpin={() => {
            setActionQuestKey(null);
            setSpinnerOpen(true);
          }}
        />
      ) : null}
      <DailySpinSpinnerSvg
        open={spinnerOpen}
        onClose={() => setSpinnerOpen(false)}
        canvas={{ x, y, w, h }}
        reward={dailyRewardStatus}
        onSpin={onDailyRewardSpin}
      />
    </SectionFrame>
  );
}

export function ShopPageSvgSurface({
  activeTab,
  products,
  loadingProducts,
  loadingId,
  error,
  acBalance,
  onTabChange,
  onClearError,
  onBuy,
  controls,
  dailyRewardStatus,
  onDailyRewardSpin,
  vaultDeckItems,
  renderVaultDeckPreview,
}: ShopPageSvgSurfaceProps) {
  const cfg = useMemo(() => normalizeShopPageSvgControls(controls), [controls]);
  const mainRef = useRef<HTMLElement | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  const [previewStart, setPreviewStart] = useState(0);
  const [previewResetting, setPreviewResetting] = useState(false);
  const [bottomPreviewTarget, setBottomPreviewTarget] = useState<BottomPreviewTarget | null>(null);
  const [bottomPreviewVersion, setBottomPreviewVersion] = useState(0);
  const [specialView, setSpecialView] = useState<'earnRewards' | null>(null);
  const [infoRequest, setInfoRequest] = useState<'arenaCredits' | 'eliteBenefits' | null>(null);
  const previewHoldMs = Math.max(cfg.bottomPreview.carouselIntervalMs, 5600);

  useEffect(() => {
    const target = mainRef.current;
    if (!target || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSurfaceSize((current) => {
        const nextWidth = Math.round(width);
        const nextHeight = Math.round(height);
        return current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight };
      });
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPreviewStart(value => value + 1);
    }, previewHoldMs);
    return () => window.clearInterval(id);
  }, [previewHoldMs]);

  useEffect(() => {
    if (previewStart < SHOP_PREVIEWS.length) return undefined;
    const id = window.setTimeout(() => {
      setPreviewResetting(true);
      setPreviewStart(value => value >= SHOP_PREVIEWS.length ? value - SHOP_PREVIEWS.length : value);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPreviewResetting(false));
      });
    }, 1040);
    return () => window.clearTimeout(id);
  }, [previewStart]);

  const metrics = useMemo<Metrics>(() => {
    const canvasWidth = surfaceSize.width > 0 && surfaceSize.height > 0
      ? Math.max(1100, Math.min(2600, Math.round(cfg.canvas.height * (surfaceSize.width / surfaceSize.height))))
      : cfg.canvas.width;
    const leftX = cfg.layout.outerPad;
    const leftY = cfg.layout.topY;
    const mainX = leftX + cfg.layout.leftW + cfg.layout.mainGap;
    const rightX = canvasWidth - cfg.layout.outerPad - cfg.layout.rightW;
    const mainW = rightX - mainX - cfg.layout.mainGap;
    const headerTotalW = canvasWidth - cfg.layout.outerPad - mainX;
    const headerSideW = (headerTotalW - cfg.header.arenaCreditW - cfg.header.gap * 2) / 2;
    const headerCenterX = mainX + headerSideW + cfg.header.gap;
    const headerStatsX = headerCenterX + cfg.header.arenaCreditW + cfg.header.gap;
    return { leftX, leftY, mainX, mainW, rightX, headerSideW, headerCenterX, headerStatsX };
  }, [cfg, surfaceSize]);

  const canvasWidth = surfaceSize.width > 0 && surfaceSize.height > 0
    ? Math.max(1100, Math.min(2600, Math.round(cfg.canvas.height * (surfaceSize.width / surfaceSize.height))))
    : cfg.canvas.width;

  const previewViewportW = canvasWidth - cfg.layout.outerPad * 2;
  const previewWidths = useMemo(() => {
    const visiblePanels = Math.max(1, Math.round(cfg.bottomPreview.visibleCount));
    const targetWidth = (previewViewportW - cfg.bottomPreview.gap * Math.max(0, visiblePanels - 1)) / visiblePanels;
    return SHOP_PREVIEWS.map(row => Math.max(targetWidth, previewPanelWidth(row, cfg)));
  }, [cfg, previewViewportW]);

  const previewTrackLayout = useMemo(() => {
    return previewWidths.reduce(
      (layout, width) => ({
        offsets: [...layout.offsets, layout.cycleWidth],
        cycleWidth: layout.cycleWidth + width + cfg.bottomPreview.gap,
      }),
      { offsets: [] as number[], cycleWidth: 0 },
    );
  }, [cfg.bottomPreview.gap, previewWidths]);

  const previewTrackRows = useMemo(() => {
    return Array.from({ length: SHOP_PREVIEWS.length * 3 }).map((_, index) => {
      const sourceIndex = index % SHOP_PREVIEWS.length;
      const cycle = Math.floor(index / SHOP_PREVIEWS.length);
      return {
        row: SHOP_PREVIEWS[sourceIndex],
        width: previewWidths[sourceIndex],
        x: cfg.layout.outerPad + cycle * previewTrackLayout.cycleWidth + previewTrackLayout.offsets[sourceIndex],
      };
    });
  }, [cfg.layout.outerPad, previewTrackLayout, previewWidths]);

  const selectTab = (tab: ShopTab) => {
    setSpecialView(null);
    setInfoRequest(null);
    setBottomPreviewTarget(null);
    onTabChange(tab);
  };

  const selectPreview = (row: typeof SHOP_PREVIEWS[number]) => {
    setInfoRequest(null);
    if (row.tab === 'Earn Free AC') {
      setBottomPreviewTarget(null);
      setSpecialView('earnRewards');
      setBottomPreviewVersion(version => version + 1);
      return;
    }
    setSpecialView(null);
    setBottomPreviewTarget(row.tab);
    setBottomPreviewVersion(version => version + 1);
  };
  const previewLocalIndex = previewStart % SHOP_PREVIEWS.length;
  const previewCycleIndex = Math.floor(previewStart / SHOP_PREVIEWS.length);
  const previewTrackX = previewCycleIndex * previewTrackLayout.cycleWidth + previewTrackLayout.offsets[previewLocalIndex];
  const frameToken = cfg.componentTokens.sectionFrame;
  const bottomPreviewY = cfg.layout.bottomPreviewY;
  const mainSectionBottomY = Math.max(cfg.mainBody.sectionBottomY, bottomPreviewY - frameToken.mainToPreviewGap);
  const leftPanelH = Math.max(cfg.layout.sidePanelH, mainSectionBottomY - cfg.layout.topY);
  const rightPanelH = mainSectionBottomY - cfg.layout.mainY;

  return (
    <main ref={mainRef} className="shop-page-svg-main">
      <svg
        viewBox={`0 0 ${canvasWidth} ${cfg.canvas.height}`}
        className="shop-page-svg-surface"
        role="img"
        aria-label="Arena Marketplace page layout"
        preserveAspectRatio={cfg.svgDefaults.preserveAspectRatio}
      >
        <LobbySvgDefs />
        <defs>
          <filter id="shopSoftGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation={cfg.svgDefaults.softGlowStdDeviation} result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="shopGlassGlow" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB"><feDropShadow dx={cfg.componentTokens.glassEffects.glowDx} dy={cfg.componentTokens.glassEffects.glowDy} stdDeviation={cfg.componentTokens.glassEffects.glowStdDeviation} floodColor={cfg.colors.glassGlowColor} floodOpacity={cfg.componentTokens.glassEffects.glowOpacity} /><feDropShadow dx={cfg.componentTokens.glassEffects.shadowDx} dy={cfg.componentTokens.glassEffects.shadowDy} stdDeviation={cfg.componentTokens.glassEffects.shadowStdDeviation} floodColor={cfg.colors.glassShadowColor} floodOpacity={cfg.componentTokens.glassEffects.shadowOpacity} /></filter>
          <filter id="shopCyanImageGlow" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0.12 0 0 0 0.05 0 0.48 0 0 0.62 0 0 0.9 0 0.95 0 0 0 1 0" result="cyanized" /><feGaussianBlur in="cyanized" stdDeviation={cfg.componentTokens.glassEffects.cyanGlowStdDeviation} result="cyanBlur" /><feMerge><feMergeNode in="cyanBlur" /><feMergeNode in="cyanized" /></feMerge></filter>
          <linearGradient id="shopActiveBlue" x1="0" x2="1"><stop offset="0" stopColor={cfg.colors.activeBlue} /><stop offset="1" stopColor={cfg.colors.headerFillAlt} /></linearGradient>
          <linearGradient id="shopImageShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#020813" stopOpacity="0.10" /><stop offset="0.72" stopColor="#020813" stopOpacity="0.18" /><stop offset="1" stopColor="#020813" stopOpacity="0.78" /></linearGradient>
          <mask id="shopCartImageMask" x="0" y="0" width="54" height="54" maskUnits="userSpaceOnUse"><circle cx="27" cy="27" r="18" fill="#fff" /></mask>
          <radialGradient id="shopCartOrbGradient" cx="35%" cy="25%" r="70%"><stop offset="0" stopColor={cfg.colors.frameTitleText} stopOpacity="0.34" /><stop offset="0.42" stopColor={cfg.colors.activeBlue} stopOpacity="0.32" /><stop offset="1" stopColor={cfg.colors.headerFill} stopOpacity="0.96" /></radialGradient>
          <linearGradient id="shopCartStrokeGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={cfg.colors.cartInnerStroke} /><stop offset="0.52" stopColor={cfg.colors.activeBlue} /><stop offset="1" stopColor={cfg.colors.gold} /></linearGradient>
          <radialGradient id="shopAcCoinGradient" cx="34%" cy="24%" r="72%"><stop offset="0" stopColor={cfg.colors.balanceUnitText} /><stop offset="0.35" stopColor={cfg.colors.gold} /><stop offset="0.72" stopColor={cfg.colors.orange} /><stop offset="1" stopColor={cfg.colors.coinInnerStroke} /></radialGradient>
          <radialGradient id="shopRewardHaloGradient" cx="50%" cy="50%" r="78%"><stop offset="0" stopColor={cfg.colors.bodyText} stopOpacity=".34" /><stop offset=".42" stopColor={cfg.colors.tileSubtitleText} stopOpacity=".3" /><stop offset=".72" stopColor={cfg.colors.frameTitleText} stopOpacity=".18" /><stop offset="1" stopColor={cfg.colors.activeBlue} stopOpacity=".05" /></radialGradient>
          <clipPath id="shopPreviewTrackClip"><rect x={cfg.layout.outerPad - 6} y={bottomPreviewY - 6} width={previewViewportW + 12} height={cfg.layout.bottomPreviewH + 12} /></clipPath>
        </defs>
        <rect width={canvasWidth} height={cfg.canvas.height} fill={cfg.svgDefaults.canvasFill} />
        <LeftSidePanel x={metrics.leftX} y={metrics.leftY} w={cfg.layout.leftW} h={leftPanelH} activeTab={activeTab} earnActive={specialView === 'earnRewards' || bottomPreviewTarget === 'Earn Free AC'} cfg={cfg} onTabChange={selectTab} onEarn={() => {
          setBottomPreviewTarget(null);
          setSpecialView('earnRewards');
        }} />
        <HeaderLayer
          x={metrics.mainX}
          y={cfg.layout.topY}
          w={metrics.headerSideW}
          h={cfg.layout.headerH}
          rightX={metrics.headerCenterX + cfg.header.arenaCreditW + cfg.header.gap}
          acBalance={acBalance}
          cfg={cfg}
          onArenaCreditsInfo={() => {
            setSpecialView(null);
            setInfoRequest('arenaCredits');
            setBottomPreviewTarget(null);
            onTabChange('Treasury');
          }}
        />
        <TopStatsLayer x={metrics.headerStatsX} y={cfg.layout.topY} w={metrics.headerSideW} h={cfg.layout.headerH} cfg={cfg} onElite={() => selectTab('Elite')} />
        <MainBody
          key={`${activeTab}-${bottomPreviewVersion}`}
          x={metrics.mainX}
          y={cfg.layout.mainY}
          w={metrics.mainW}
          activeTab={activeTab}
          products={products}
          loadingId={loadingId}
          specialView={specialView}
          infoRequest={infoRequest}
          bottomPreviewTarget={bottomPreviewTarget}
          sectionBottomY={mainSectionBottomY}
          cfg={cfg}
          onClearSpecial={() => setSpecialView(null)}
          onClearBottomPreview={() => setBottomPreviewTarget(null)}
          onInfoHandled={() => setInfoRequest(null)}
          onBuy={onBuy}
          dailyRewardStatus={dailyRewardStatus}
          onDailyRewardSpin={onDailyRewardSpin}
          vaultDeckItems={vaultDeckItems}
          renderVaultDeckPreview={renderVaultDeckPreview}
        />
        <RightSidePanel x={metrics.rightX} y={cfg.layout.mainY} w={cfg.layout.rightW} h={rightPanelH} cfg={cfg} acBalance={acBalance} onElite={() => selectTab('Elite')} />
        <g clipPath="url(#shopPreviewTrackClip)">
          <g
            className="shop-preview-track"
            style={{
              transform: `translateX(${-previewTrackX}px)`,
              transition: previewResetting ? 'none' : 'transform 980ms cubic-bezier(.16,1.18,.34,1)',
            }}
          >
            {previewTrackRows.map(({ row, width, x: panelX }, index) => (
              <PreviewPanel key={`${row.title}-${index}`} x={panelX} y={bottomPreviewY} w={width} h={cfg.layout.bottomPreviewH} row={row} cfg={cfg} onSelect={() => selectPreview(row)} />
            ))}
          </g>
        </g>
        <FooterLayer x={cfg.layout.outerPad} y={cfg.layout.footerY} w={canvasWidth - cfg.layout.outerPad * 2} h={cfg.layout.footerH} cfg={cfg} />
        {loadingProducts ? (
          <g>
            <rect x={metrics.mainX} y={cfg.layout.mainY} width={metrics.mainW} height={mainSectionBottomY - cfg.layout.mainY} fill="rgba(2,10,19,.52)" />
            <Txt x={metrics.mainX + metrics.mainW / 2} y={cfg.layout.mainY + 250} anchor="middle" size="24" weight="950" fill="#bcecff" cfg={cfg}>Loading marketplace...</Txt>
          </g>
        ) : null}
        {error ? (
          <g>
            <rect x={metrics.mainX + 80} y={cfg.layout.mainY + 150} width={metrics.mainW - 160} height="120" rx="0" fill="rgba(60,10,22,.86)" stroke={cfg.colors.danger} />
            <Txt x={metrics.mainX + metrics.mainW / 2} y={cfg.layout.mainY + 195} anchor="middle" size="17" weight="950" fill="#ffd7dd" cfg={cfg}>{error}</Txt>
            <SvgButton x={metrics.mainX + metrics.mainW / 2 - 80} y={cfg.layout.mainY + 230} w={160} h={28} label="Clear Error" active small onClick={onClearError} cfg={cfg} />
          </g>
        ) : null}
      </svg>
    </main>
  );
}
