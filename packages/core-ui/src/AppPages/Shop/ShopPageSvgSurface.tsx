import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type WheelEvent } from 'react';
import {
  isShopProductPurchasable,
  productPriceLabel,
  productsForShopTab,
  type ShopIcon,
  type ShopQuest,
  type ShopStaticItem,
  type ShopTone,
  type ShopVaultShowcaseGroup,
} from './ShopPageSvgData';
import {
  normalizeShopPageContent,
  type ShopPageContentData,
} from './ShopPageSvgContent';
import {
  HeaderBar,
  MiniIcon,
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
import { TransparentAssetImage } from './ShopPageAssetArtwork';
import {
  BottomPanel,
  type BottomPreviewTarget,
  type PreviewPanelItem,
  type ResolvedPreviewRow,
} from './ShopPageBottomPanel';
import { previewPanelWidthForCardCount } from './ShopPageBottomPanelGeometry';
import { FooterLayer } from './ShopPageFooter';
import { HeaderLayer, TopStatsLayer } from './ShopPageHeader';
import { MainBottom } from './ShopPageMainBottom';
import { MainTop } from './ShopPageMainTop';
import { SectionFrame } from './ShopPageSectionFrame';
import {
  mainBottomOverlayContentRect,
  mainSlotFrameBounds,
  sectionFrameContentRect,
} from './ShopPageSectionFrameGeometry';
import { LeftSidePanel, RightPanelDetailLayer, RightSidePanel, type ShopRightTabId } from './ShopPageSidePanels';
import type { ShopMainCarouselCardItem } from './ShopPageMainCarouselFrame.types';
import { alphaColor, clampNumber, fitSingleLineTextSize } from './ShopPageSvgUtils';
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
  content?: Partial<ShopPageContentData> | null;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  renderVaultDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
};

type Metrics = {
  leftX: number;
  leftY: number;
  leftW: number;
  mainX: number;
  mainW: number;
  rightX: number;
  rightW: number;
  headerSideW: number;
  headerCenterX: number;
  headerStatsX: number;
};

type TileItem = ShopStaticItem & {
  product?: ShopProduct;
};

type ShopPreviewSourceRow = ShopPageContentData['previews'][number];

const PREFERRED_BOTTOM_PREVIEW_ITEMS = 4;
const SHOP_RESPONSIVE_MIN_LEFT_W = 118;
const SHOP_RESPONSIVE_MIN_RIGHT_W = 212;
const SHOP_RESPONSIVE_MIN_MAIN_W = 390;

function staticCreditPackForProduct(product: ShopProduct, index: number, content: ShopPageContentData): ShopStaticItem {
  const amount = product.acAmount ?? Number(product.displayName.match(/\d+/)?.[0]);
  return content.creditPacks.find(pack => pack.title.startsWith(`${amount} `)) ?? content.creditPacks[index % content.creditPacks.length];
}

function staticPassForProduct(product: ShopProduct, index: number, content: ShopPageContentData): ShopStaticItem {
  const name = product.displayName.toLowerCase();
  if (name.includes('founder')) return content.passes[2] ?? content.passes[0];
  if (name.includes('champion')) return content.passes[1] ?? content.passes[0];
  if (name.includes('arena')) return content.passes[0];
  return content.passes[index % content.passes.length];
}

function productToTile(product: ShopProduct, index: number, content: ShopPageContentData): TileItem {
  if (product.productType === 'AC_CREDITS') {
    return {
      ...staticCreditPackForProduct(product, index, content),
      product,
    };
  }
  if (product.productType === 'SUBSCRIPTION') {
    return {
      ...staticPassForProduct(product, index, content),
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

function tileFallbacks(tab: ShopTab, content: ShopPageContentData): TileItem[] {
  if (tab === 'Treasury') return content.creditPacks;
  if (tab === 'Elite') return content.passes;
  return content.sections[tab].featured ?? content.sections[tab].categories ?? [];
}

function tilesForTab(products: ShopProduct[], tab: ShopTab, content: ShopPageContentData): TileItem[] {
  const real = productsForShopTab(products, tab).map((product, index) => productToTile(product, index, content));
  if (tab === 'Treasury' && real.length > 0) {
    return [
      ...real.slice(0, content.creditPacks.length - 1),
      ...content.creditPacks.slice(real.length),
    ];
  }
  return real.length > 0 ? real : tileFallbacks(tab, content);
}

function wrapPreviewIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return ((value % count) + count) % count;
}

function nextSidePanelTab(tab: ShopTab, content: ShopPageContentData): ShopTab {
  const sideTabs = content.sideItems.map(item => item.key);
  if (sideTabs.length === 0) return tab;
  const currentIndex = sideTabs.indexOf(tab);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  return sideTabs[nextIndex % sideTabs.length] ?? tab;
}

function staticItemToPreviewItem(item: ShopStaticItem, index: number, prefix: string): PreviewPanelItem {
  return {
    key: `${prefix}-${item.title}-${index}`,
    label: item.title,
    imageUrl: item.imageUrl,
  };
}

function previewItemsForRow(row: ShopPreviewSourceRow, products: ShopProduct[], content: ShopPageContentData): PreviewPanelItem[] {
  if (row.tab === 'Earn Free AC') {
    return content.quests.map(quest => ({
      key: quest.key,
      label: quest.title,
      imageUrl: quest.imageUrl,
    }));
  }
  if (row.tab === 'Vault') {
    return content.vaultShowcaseGroups.map(group => ({
      key: group.key,
      label: group.title,
      imageUrl: group.heroImageUrl,
    }));
  }
  if (row.tab === 'Play Access') {
    const items = content.sections['Play Access'].featured ?? content.sections['Play Access'].categories ?? [];
    return items.map((item, index) => staticItemToPreviewItem(item, index, 'play-access-preview'));
  }
  if (row.tab === 'Events') {
    const items = content.sections.Events.featured ?? content.sections.Events.categories ?? [];
    return items.map((item, index) => staticItemToPreviewItem(item, index, 'events-preview'));
  }
  return tilesForTab(products, row.tab, content).map((item, index) => staticItemToPreviewItem(item, index, `${row.tab.toLowerCase()}-preview`));
}

function minimumShopCanvasWidth(cfg: ShopPageSvgControls): number {
  return Math.ceil(
    cfg.layout.outerPad * 2
    + SHOP_RESPONSIVE_MIN_LEFT_W
    + SHOP_RESPONSIVE_MIN_RIGHT_W
    + SHOP_RESPONSIVE_MIN_MAIN_W
    + cfg.layout.mainGap * 2,
  );
}

function shopCanvasWidthForSurface(cfg: ShopPageSvgControls, surfaceSize: { width: number; height: number }): number {
  if (surfaceSize.width <= 0 || surfaceSize.height <= 0) return cfg.canvas.width;
  const ratioWidth = Math.round(cfg.canvas.height * (surfaceSize.width / surfaceSize.height));
  return Math.max(minimumShopCanvasWidth(cfg), Math.min(2600, ratioWidth));
}

function responsiveColumnWidths(canvasWidth: number, cfg: ShopPageSvgControls): { leftW: number; mainW: number; rightW: number } {
  const availableW = canvasWidth - cfg.layout.outerPad * 2 - cfg.layout.mainGap * 2;
  const desiredSideW = cfg.layout.leftW + cfg.layout.rightW;
  const sideScale = desiredSideW > 0
    ? clampNumber((availableW - SHOP_RESPONSIVE_MIN_MAIN_W) / desiredSideW, 0, 1)
    : 1;
  const leftW = clampNumber(cfg.layout.leftW * sideScale, SHOP_RESPONSIVE_MIN_LEFT_W, cfg.layout.leftW);
  const rightW = clampNumber(cfg.layout.rightW * sideScale, SHOP_RESPONSIVE_MIN_RIGHT_W, cfg.layout.rightW);
  const mainW = Math.max(SHOP_RESPONSIVE_MIN_MAIN_W, availableW - leftW - rightW);
  return { leftW, mainW, rightW };
}

function isCreditPackTile(item: TileItem, content: ShopPageContentData): boolean {
  return item.product?.productType === 'AC_CREDITS' || content.creditPacks.some(pack => pack.title === item.title);
}

function tileActionLabel(item: TileItem, content: ShopPageContentData): string {
  if (item.title === 'Custom AC') return 'Custom Top Up';
  if (isCreditPackTile(item, content)) return 'Buy Now';
  if (item.price?.toLowerCase() === 'free') return 'Claim Free';
  if (item.price?.toLowerCase().includes('coming soon')) return 'Coming Soon';
  if (item.price?.toLowerCase().includes('printable')) return 'Buy Digital';
  if (item.tone === 'gold' && item.title.toLowerCase().includes('founder')) return content.uiCopy.passCard.lifetimeButton;
  if (item.product?.productType === 'SUBSCRIPTION' || content.passes.some(pass => pass.title === item.title)) return content.uiCopy.passCard.selectButton;
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
    actionLabel: 'View',
    loading: item.product ? loadingId === item.product.productId : false,
    disabled: false,
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
    actionLabel: 'View',
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

function vaultGroupToTile(group: ShopVaultShowcaseGroup): TileItem {
  const itemTitles = group.items.map(item => item.title).filter(Boolean);
  return {
    title: group.title,
    subtitle: group.subtitle,
    tone: group.tone,
    icon: group.icon,
    badge: group.badge,
    imageUrl: group.heroImageUrl,
    price: group.badge === 'FREE' ? 'Free' : group.badge === 'SOON' ? 'Coming Soon' : undefined,
    benefits: itemTitles.length > 0 ? itemTitles : [group.subtitle],
  };
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

function bottomCardBenefits(item: TileItem, content: ShopPageContentData): string[] {
  if (item.benefits?.length) return item.benefits;
  if (item.product?.benefits?.length) return item.product.benefits;
  if (isCreditPackTile(item, content)) {
    return ['One-time Arena Credit top-up', 'Adds to marketplace balance', 'Use for tools, vault, access, and events'];
  }
  return [item.subtitle].filter(Boolean);
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
  const labelSize = Math.min(Math.max(11.8, h * 0.44), Math.max(9.2, labelW / Math.max(7, label.length * 0.56)));
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
      <Txt x={x + labelW / 2} y={y + h / 2 + 1} anchor="middle" size={labelSize} weight="900" fill={cfg.colors.bodyText} cfg={cfg}>{label}</Txt>
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
  content,
  cfg,
  loading,
  expanded = false,
  onInspect,
  onBuy,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  loading?: boolean;
  expanded?: boolean;
  onInspect: () => void;
  onBuy: (product: ShopProduct) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor(item.tone, cfg);
  const passLike = item.product?.productType === 'SUBSCRIPTION' || content.passes.some(pass => pass.title === item.title);
  const headerH = expanded ? Math.max(48, Math.min(62, h * 0.16)) : Math.max(34, Math.min(42, h * 0.18));
  const footerH = expanded ? Math.max(46, Math.min(58, h * 0.15)) : Math.max(34, Math.min(42, h * 0.18));
  const bodyY = y + headerH;
  const footerY = y + h - footerH;
  const bodyH = Math.max(1, footerY - bodyY);
  const radius = 7;
  const artRatio = expanded ? 0.28 : passLike ? 0.24 : 0.31;
  const artMin = expanded ? 150 : passLike ? 86 : 104;
  const artHeightCap = bodyH * (passLike ? 0.86 : 0.94);
  const artW = Math.min(Math.max(artMin, w * artRatio), artHeightCap);
  const artH = Math.min(bodyH - (expanded ? 28 : 14), artW * 1.12);
  const artX = x + (expanded ? 30 : 16);
  const artY = bodyY + (bodyH - artH) / 2;
  const dividerX = artX + artW + (expanded ? 30 : 20);
  const textX = dividerX + (expanded ? 28 : 18);
  const textW = Math.max(80, x + w - textX - (expanded ? 30 : 14));
  const benefitTextX = textX + (expanded ? 14 : 10);
  const benefitTextW = Math.max(42, x + w - benefitTextX - (expanded ? 30 : 18));
  const badgeText = item.badge ?? '';
  const badgeW = badgeText ? Math.min(expanded ? 132 : 106, Math.max(expanded ? 86 : 64, badgeText.length * (expanded ? 8.2 : 6.8) + 22)) : 0;
  const titleW = Math.max(72, w - badgeW - 28);
  const footerValue = item.price ?? item.badge ?? 'Details';
  const priceW = expanded
    ? Math.min(230, Math.max(142, footerValue.length * 10.6 + 34))
    : Math.min(156, Math.max(104, footerValue.length * 5.8 + 28));
  const buttonW = expanded ? Math.min(190, Math.max(132, w * 0.24)) : Math.min(132, Math.max(96, w * 0.28));
  const disabled = item.product ? !isShopProductPurchasable(item.product) : false;
  const buttonLabel = loading ? 'Working' : expanded ? tileActionLabel(item, content) : 'View';
  const subtitleText = Array.isArray(item.subtitle) ? item.subtitle.join(' ') : item.subtitle;
  const subtitleSize = fitSingleLineTextSize(
    subtitleText,
    textW,
    expanded ? 18.4 : w < 360 ? 12.2 : 13.4,
    expanded ? 25 : w < 360 ? 15.2 : 17.2,
    0.47,
  );
  const subtitleLineHeight = subtitleSize + 3;
  const benefitStartY = bodyY + Math.max(expanded ? 76 : 48, subtitleLineHeight + (expanded ? 48 : 33));
  const targetBenefitLineH = expanded ? 18 : 12.2;
  const benefits = bottomCardBenefits(item, content).slice(0, Math.max(3, Math.min(9, Math.floor((footerY - benefitStartY - 10) / targetBenefitLineH))));
  const benefitLineH = expanded
    ? Math.max(15.2, Math.min(20.2, (footerY - benefitStartY - 16) / Math.max(1, benefits.length)))
    : Math.max(11.2, Math.min(13.8, (footerY - benefitStartY - 10) / Math.max(1, benefits.length)));
  const titleSize = fitSingleLineTextSize(item.title, titleW, expanded ? 20 : w < 360 ? 14.2 : 15.4, expanded ? 28 : w < 360 ? 16.2 : 18.2, 0.5);
  const badgeTextSize = badgeText ? fitSingleLineTextSize(badgeText, badgeW - 16, expanded ? 12.8 : 10.4, expanded ? 15 : 12, 0.58) : 10.4;
  const benefitSize = expanded ? Math.max(13.2, Math.min(16.2, benefitLineH * 0.72)) : w < 360 ? 8.7 : 9.5;
  const hoverRailY1 = bodyY + 12;
  const hoverRailY2 = footerY - 12;
  const hoverRailInset = 8;
  const hoverRailPairGap = 4;
  const shineSuffix = `${item.title}-${item.price ?? ''}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
  const shineId = `shopElitePassCircularShine-${shineSuffix}`;
  const shineClipId = `shopElitePassCircularClip-${shineSuffix}`;
  return (
    <g
      onClick={onInspect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="shop-page-svg-clickable"
    >
      <defs>
        <clipPath id={shineClipId}>
          <path d={lobbyRoundedRectPath(x, y, w, h, radius)} />
        </clipPath>
        <radialGradient id={shineId} gradientUnits="userSpaceOnUse" cx={x + w * 0.5} cy={y - h * 0.02} r={Math.max(w, h) * 0.86}>
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="0.2" stopColor={cfg.colors.bodyText} stopOpacity="0.11" />
          <stop offset="0.46" stopColor={color} stopOpacity="0.07" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
          <animate attributeName="cx" values={`${x + w * 0.5};${x + w * 1.02};${x + w * 0.5};${x - w * 0.02};${x + w * 0.5}`} dur="13.5s" repeatCount="indefinite" />
          <animate attributeName="cy" values={`${y - h * 0.02};${y + h * 0.5};${y + h * 1.02};${y + h * 0.5};${y - h * 0.02}`} dur="13.5s" repeatCount="indefinite" />
        </radialGradient>
      </defs>
      <path d={lobbyRoundedRectPath(x, y, w, h, radius)} fill={hovered ? alphaColor(color, 0.13) : cfg.colors.panelFill} stroke={color} strokeWidth="1.25" strokeOpacity={hovered ? 0.95 : 0.72} />
      <path d={lobbyRoundedRectPath(x + 1, y + 1, w - 2, h - 2, radius - 1)} fill={`url(#${shineId})`} opacity={hovered ? 0.62 : 0.38} clipPath={`url(#${shineClipId})`} pointerEvents="none" />
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
          <Txt x={x + w - badgeW / 2} y={y + headerH / 2 + 1} anchor="middle" size={badgeTextSize} weight="900" fill={cfg.colors.bodyText} cfg={cfg}>{badgeText}</Txt>
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
      <WrappedText x={textX} y={bodyY + 24} width={textW} lines={item.subtitle} size={subtitleSize} lineHeight={subtitleLineHeight} fill={color} weight={900} maxLines={1} cfg={cfg} />
      <g>
        {benefits.map((benefit, index) => {
          const fittedBenefitSize = fitSingleLineTextSize(benefit, benefitTextW, expanded ? 10.8 : 6.8, benefitSize, 0.48);
          return (
            <g key={`${item.title}-benefit-${benefit}`}>
              <circle cx={textX + (expanded ? 4 : 2.5)} cy={benefitStartY + index * benefitLineH - 1} r={expanded ? 3.2 : 2} fill={color} opacity="0.92" />
              <Txt x={benefitTextX} y={benefitStartY + index * benefitLineH} size={fittedBenefitSize} weight="650" fill={cfg.colors.bodyText} cfg={cfg}>{benefit}</Txt>
            </g>
          );
        })}
      </g>
      <path d={bottomRoundedRectPath(x + 1, footerY, w - 2, footerH - 1, radius - 1)} fill={alphaColor(color, 0.1)} stroke={color} strokeOpacity="0.58" />
      <path d={`M ${x + 1} ${footerY} H ${x + priceW} V ${footerY + footerH - 10} Q ${x + priceW} ${footerY + footerH - 1} ${x + priceW - 10} ${footerY + footerH - 1} H ${x + radius} Q ${x + 1} ${footerY + footerH - 1} ${x + 1} ${footerY + footerH - radius} Z`} fill={alphaColor(color, 0.18)} stroke={color} strokeOpacity="0.82" />
      <rect x={x + 3} y={footerY + 2} width={Math.max(4, priceW - 6)} height={Math.max(4, footerH * 0.34)} rx="3" fill="#ffffff" opacity="0.07" />
      <Txt x={x + (expanded ? 18 : 13)} y={footerY + footerH / 2 + 1} size={expanded ? 18 : 12.8} weight="950" fill={cfg.colors.bodyText} cfg={cfg}>{footerValue}</Txt>
      <EliteBottomActionButton
        x={x + w - buttonW - 10}
        y={footerY + 7}
        w={buttonW}
        h={footerH - 14}
        label={buttonLabel}
        color={color}
        active={hovered}
        onClick={() => {
          if (expanded && item.product) onBuy(item.product);
          else onInspect();
        }}
        disabled={loading || disabled}
        cfg={cfg}
      />
    </g>
  );
}

function BottomDetailCardsLayer({
  x,
  y,
  w,
  h,
  label,
  items,
  content,
  cfg,
  loadingId,
  pageIndex,
  rightActionLabel,
  onRightAction,
  onInspect,
  onBuy,
  onPageChange,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: ShopTab;
  items: TileItem[];
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  pageIndex: number;
  rightActionLabel?: string;
  onRightAction?: () => void;
  onInspect: (item: TileItem) => void;
  onBuy: (product: ShopProduct) => void;
  onPageChange: (pageIndex: number) => void;
}) {
  const body = mainBottomOverlayContentRect(x, y, w, h);
  const token = cfg.componentTokens.sectionFrame;
  const pad = 10;
  const gap = 12;
  const contentX = body.x + pad;
  const contentY = body.y + pad;
  const contentW = Math.max(0, body.w - pad * 2);
  const contentH = Math.max(0, body.h - pad * 2);
  const minCardW = label === 'Treasury'
    ? cfg.mainBody.treasuryCardMinW
    : label === 'Elite'
      ? cfg.mainBody.passCardMinW
      : cfg.mainBody.productCardMinW;
  const maxCardW = label === 'Treasury'
    ? cfg.mainBody.treasuryCardMaxW
    : label === 'Elite'
      ? cfg.mainBody.passCardMaxW
      : cfg.mainBody.productCardMaxW;
  const maxVisible = label === 'Treasury'
    ? Math.round(cfg.mainBody.treasuryMaxVisible)
    : label === 'Elite'
      ? Math.round(cfg.mainBody.passMaxVisible)
      : Math.round(cfg.mainBody.productMaxVisible);
  const visibleCount = visibleCardCount(contentW, items.length, gap, 0, minCardW, maxVisible);
  const rawCardW = visibleCount > 0 ? (contentW - gap * (visibleCount - 1)) / visibleCount : contentW;
  const cardW = Math.max(minCardW, Math.min(maxCardW, rawCardW));
  const rowW = visibleCount * cardW + Math.max(0, visibleCount - 1) * gap;
  const rowX = contentX + Math.max(0, (contentW - rowW) / 2);
  const { pageItems, pageCount, safePageIndex } = carouselPage(items, visibleCount, pageIndex);
  const canPage = pageCount > 1;
  const dotsW = Math.max(0, pageCount - 1) * token.dotGap + pageCount * token.dotW;
  const dotsX = x + w / 2 - dotsW / 2;
  const dotsY = y + h - token.dotBottom - 2;
  const hitTop = y + Math.max(16, h * 0.16);
  const hitH = Math.max(80, h * 0.62);
  return (
    <g>
      <MainBottom
        x={x}
        y={y}
        w={w}
        h={h}
        label={label}
        count={items.length}
        rightActionLabel={rightActionLabel}
        onRightAction={onRightAction}
      />
      {canPage ? (
        <>
          <g role="button" tabIndex={0} aria-label={`Previous ${label} items`} className="shop-page-svg-clickable" onClick={() => onPageChange(safePageIndex - 1)}>
            <rect x={x - 34} y={hitTop} width="74" height={hitH} fill="transparent" />
          </g>
          <g role="button" tabIndex={0} aria-label={`Next ${label} items`} className="shop-page-svg-clickable" onClick={() => onPageChange(safePageIndex + 1)}>
            <rect x={x + w - 40} y={hitTop} width="74" height={hitH} fill="transparent" />
          </g>
          <g>
            {Array.from({ length: pageCount }, (_, dotIndex) => (
              <g key={`${label}-bottom-dot-${dotIndex}`} role="button" tabIndex={0} aria-label={`${label} page ${dotIndex + 1}`} className="shop-page-svg-clickable" onClick={() => onPageChange(dotIndex)}>
                <rect
                  x={dotsX + dotIndex * (token.dotW + token.dotGap) - 2}
                  y={dotsY - 4}
                  width={token.dotW + 4}
                  height={token.dotH + 8}
                  fill="transparent"
                />
                <rect
                  x={dotsX + dotIndex * (token.dotW + token.dotGap)}
                  y={dotsY}
                  width={token.dotW}
                  height={token.dotH}
                  rx={token.dotH / 2}
                  fill={dotIndex === safePageIndex ? cfg.colors.frameDotActive : cfg.colors.frameDotInactive}
                  opacity={dotIndex === safePageIndex ? 1 : 0.82}
                />
              </g>
            ))}
          </g>
        </>
      ) : null}
      {pageItems.map((item, index) => (
        <EliteBottomPassCard
          key={item.title}
          x={rowX + index * (cardW + gap)}
          y={contentY}
          w={cardW}
          h={contentH}
          item={item}
          content={content}
          cfg={cfg}
          loading={item.product ? loadingId === item.product.productId : false}
          onInspect={() => onInspect(item)}
          onBuy={onBuy}
        />
      ))}
    </g>
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

function VaultGridMessage({
  x,
  y,
  w,
  h,
  accent,
  cfg,
  title,
  lines,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  cfg: ShopPageSvgControls;
  title: string;
  lines: string[];
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={cfg.componentTokens.sectionFrame.contentRadius} fill={alphaColor(accent, 0.12)} stroke={accent} strokeWidth="1.2" strokeOpacity="0.48" />
      <rect x={x + 1} y={y + 1} width={w - 2} height={Math.max(28, h * 0.2)} rx={cfg.componentTokens.sectionFrame.contentRadius - 1} fill={alphaColor(accent, 0.18)} stroke={accent} strokeOpacity="0.32" />
      <Txt x={x + 16} y={y + 26} size={Math.max(13, Math.min(18, w * 0.055))} weight="950" fill={accent} cfg={cfg}>{title}</Txt>
      <WrappedText x={x + 16} y={y + 55} width={w - 32} lines={lines} size={Math.max(10, Math.min(13.4, w * 0.04))} lineHeight={17} fill={cfg.colors.bodyText} weight={650} maxLines={5} cfg={cfg} />
      <line x1={x + 18} y1={y + h - 24} x2={x + w - 18} y2={y + h - 24} stroke={accent} strokeWidth="1.2" strokeOpacity="0.46" />
      <Txt x={x + w / 2} y={y + h - 10} anchor="middle" size="10" weight="900" fill={cfg.colors.mutedText} cfg={cfg}>Check back later</Txt>
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
  content,
  cfg,
  activeGroupKey,
  vaultDeckItems,
  onGroupChange,
  onGroupInspect,
  onDeckPreview,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  activeGroupKey: string;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  onGroupChange: (key: string) => void;
  onGroupInspect: (group: ShopVaultShowcaseGroup) => void;
  onDeckPreview: (item: ShopVaultDeckPreviewItem | null) => void;
}) {
  const [gridScrollState, setGridScrollState] = useState<{ groupKey: string; value: number }>({ groupKey: activeGroupKey, value: 0 });
  const [gridDrag, setGridDrag] = useState<{ groupKey: string; pointerX: number; scrollX: number } | null>(null);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);
  const [selectedProfileFrameIndex, setSelectedProfileFrameIndex] = useState(0);
  const activeGroup = content.vaultShowcaseGroups.find(group => group.key === activeGroupKey) ?? content.vaultShowcaseGroups[0];
  if (!activeGroup) return null;
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
  const isLimitedPlaceholderGrid = activeGroup.key === 'card-backs' || activeGroup.key === 'table-themes';
  const isSelectableCircleGrid = isAvatarGrid || isProfileFrameGrid;
  const selectableCircleImages = isAvatarGrid ? avatarImageUrls : isProfileFrameGrid ? activeGroup.items.map(item => item.imageUrl).filter(Boolean) : [];
  const deckItems = vaultDeckItems && vaultDeckItems.length > 0
    ? vaultDeckItems
    : activeGroup.items.map((item, index) => ({ id: `${activeGroup.key}-${index}`, title: item.title }));
  const rows = isSelectableCircleGrid ? token.selectableRows : isDeckGrid ? token.deckRows : isLimitedPlaceholderGrid ? 1 : token.defaultRows;
  const scrollbarH = token.scrollbarH;
  const frameGap = isSelectableCircleGrid ? token.selectableFrameGap : token.frameGap;
  const viewportH = gridH - scrollbarH - token.scrollbarGap;
  const rawFrameH = (viewportH - frameGap * (rows - 1)) / rows;
  const frameH = isLimitedPlaceholderGrid ? Math.min(rawFrameH, Math.max(96, viewportH * 0.58)) : rawFrameH;
  const frameYOffset = isLimitedPlaceholderGrid ? (viewportH - frameH) / 2 : 0;
  const avatarSize = Math.max(token.avatarMinSize, Math.min(token.avatarMaxSize, frameH - 1));
  const frameW = isSelectableCircleGrid ? avatarSize + token.selectableFramePad : isDeckGrid ? Math.max(token.deckMinW, Math.min(token.deckMaxW, gridW / token.deckRatioW)) : Math.max(token.defaultMinW, Math.min(token.defaultMaxW, gridW / token.defaultRatioW));
  const gridStaticItemCount = isLimitedPlaceholderGrid ? Math.min(2, activeGroup.items.length) : activeGroup.items.length;
  const itemColumns = isSelectableCircleGrid
    ? Math.ceil(selectableCircleImages.length / rows)
    : isDeckGrid
      ? Math.max(token.minDeckColumns, deckItems.length)
      : Math.max(1, gridStaticItemCount);
  const showGridMessage = !isDeckGrid;
  const messageColumnSpan = showGridMessage ? 2 : 0;
  const columns = itemColumns + messageColumnSpan;
  const messageTitle = activeGroup.key === 'card-backs'
    ? 'Card backs dropping soon'
    : activeGroup.key === 'table-themes'
      ? 'Table themes dropping soon'
      : activeGroup.key === 'frames'
        ? 'Paid frames soon'
        : 'Paid avatars soon';
  const messageLines = activeGroup.key === 'card-backs'
    ? ['Default card backs stay free.', 'Premium animated backs will appear in this grid when the art is ready.']
    : activeGroup.key === 'table-themes'
      ? ['The default table theme stays active.', 'More room surfaces and competitive table moods will drop here.']
      : activeGroup.key === 'frames'
        ? ['Free profile frames are available now.', 'More custom paid profile frames are dropping soon.']
        : ['Free avatars are available now.', 'More premium paid avatars are dropping soon.'];
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
      <g onClick={() => {
        onGroupChange(activeGroup.key);
        onGroupInspect(activeGroup);
      }} role="button" tabIndex={0} className="shop-page-svg-clickable">
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
            const frameY = frameYOffset + row * (frameH + frameGap);
            if (showGridMessage && col >= itemColumns) {
              if (col !== itemColumns || row !== 0) return null;
              return (
                <VaultGridMessage
                  key={`${activeGroup.key}-message`}
                  x={frameX}
                  y={Math.max(0, frameYOffset)}
                  w={frameW * messageColumnSpan + frameGap * Math.max(0, messageColumnSpan - 1)}
                  h={viewportH - Math.max(0, frameYOffset) * 2}
                  accent={accent}
                  cfg={cfg}
                  title={messageTitle}
                  lines={messageLines}
                />
              );
            }
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
            const deckItem = isDeckGrid ? deckItems[index] ?? null : null;
            const staticItem = isDeckGrid ? null : activeGroup.items[index] ?? null;
            if (!isDeckGrid && !staticItem) return null;
            return <VaultGridFrame key={`${activeGroup.key}-frame-${index}`} x={frameX} y={frameY} w={frameW} h={frameH} accent={accent} cfg={cfg} deckName={isDeckGrid ? deckItem?.title : staticItem?.title} onClick={isDeckGrid ? () => onDeckPreview(deckItem) : undefined} />;
          })}
        </g>
        <rect x="0" y={gridH - scrollbarH} width={gridW} height={scrollbarH} rx={scrollbarH / 2} fill={cfg.colors.vaultScrollbarFill} stroke={accent} strokeWidth="1" strokeOpacity=".25" />
        <rect x={thumbX} y={gridH - scrollbarH + token.scrollbarThumbInset} width={thumbW} height={scrollbarH - token.scrollbarThumbInset * 2} rx={(scrollbarH - token.scrollbarThumbInset * 2) / 2} fill={accent} opacity=".55" />
      </svg>
    </SectionFrame>
  );
}

function InfoDetailLayer({
  x,
  y,
  w,
  h,
  mode,
  content,
  cfg,
  onClose,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  mode: 'arenaCredits' | 'eliteBenefits';
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClose: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const accent = mode === 'arenaCredits' ? cfg.colors.activeBlue : cfg.colors.gold;
  const bodyY = y + cfg.mainBody.headerH;
  if (mode === 'eliteBenefits') {
    const detail = content.infoDetails.eliteBenefits;
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
  const detail = content.infoDetails.arenaCredits;
  const imageW = Math.min(token.detailImageMaxW, w * token.detailImageRatio);
  const textX = x + token.detailImageX + imageW + token.detailTextGap;
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={detail.title} subtitle={detail.subtitle} rightText={detail.cta} accent={accent} cfg={cfg} onRightTextClick={onClose} hideTitleTab hideSubtitle>
      <ProductImage x={x + token.detailImageX} y={bodyY + token.detailImageTop} w={imageW} h={h - cfg.mainBody.headerH - token.detailImageBottomPad} imageUrl={(content.creditPacks[2] ?? content.creditPacks[0])?.imageUrl ?? ''} cfg={cfg} />
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
  content,
  cfg,
  onClose,
  onBuy,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  onBuy: (product: ShopProduct) => void;
}) {
  const accent = toneColor(item.tone, cfg);
  const contentRect = sectionFrameContentRect(x, y, w, h, cfg, false);
  const pad = Math.max(20, Math.min(34, contentRect.w * 0.03));
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={`${item.title} DETAILS`} subtitle={item.subtitle} rightText="Back To Shop" accent={accent} cfg={cfg} onRightTextClick={onClose}>
      <EliteBottomPassCard
        x={contentRect.x + pad}
        y={contentRect.y + pad}
        w={Math.max(320, contentRect.w - pad * 2)}
        h={Math.max(180, contentRect.h - pad * 2)}
        item={item}
        content={content}
        cfg={cfg}
        expanded
        onInspect={() => undefined}
        onBuy={onBuy}
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
  content,
  loadingId,
  acBalance,
  specialView,
  infoRequest,
  bottomPreviewTarget,
  rightPanelDetail,
  sectionBottomY,
  cfg,
  onClearSpecial,
  onClearBottomPreview,
  onClearRightPanelDetail,
  onInfoHandled,
  onBuy,
  onElite,
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
  content: ShopPageContentData;
  loadingId: string | null;
  acBalance: number;
  specialView: 'earnRewards' | null;
  infoRequest: 'arenaCredits' | 'eliteBenefits' | null;
  bottomPreviewTarget: BottomPreviewTarget | null;
  rightPanelDetail: ShopRightTabId | null;
  sectionBottomY?: number;
  cfg: ShopPageSvgControls;
  onClearSpecial: () => void;
  onClearBottomPreview: () => void;
  onClearRightPanelDetail: () => void;
  onInfoHandled: () => void;
  onBuy: (product: ShopProduct) => void;
  onElite: () => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  renderVaultDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
}) {
  const [selectedTileDetail, setSelectedTileDetail] = useState<TileItem | null>(null);
  const [activeInfoDetail, setActiveInfoDetail] = useState<'arenaCredits' | 'eliteBenefits' | null>(null);
  const [activeVaultGroupKey, setActiveVaultGroupKey] = useState(content.vaultShowcaseGroups[0]?.key ?? '');
  const [vaultTopSelectionKey, setVaultTopSelectionKey] = useState<string | null>(null);
  const [activeDeckPreviewItem, setActiveDeckPreviewItem] = useState<ShopVaultDeckPreviewItem | null>(null);
  const [topRoutedBottomTab, setTopRoutedBottomTab] = useState<ShopTab | null>(null);
  const [bottomPageByTab, setBottomPageByTab] = useState<Partial<Record<ShopTab, number>>>({});
  const displayedInfoDetail = infoRequest ?? activeInfoDetail;
  const resolvedSectionBottomY = sectionBottomY ?? cfg.mainBody.sectionBottomY;
  const topH = cfg.mainBody.topBoxH;
  const bottomH = resolvedSectionBottomY - y - topH - cfg.mainBody.boxGap;
  const bottomY = y + topH + cfg.mainBody.boxGap;
  const displayedBottomTab = bottomPreviewTarget && bottomPreviewTarget !== 'Earn Free AC' ? bottomPreviewTarget : topRoutedBottomTab ?? nextSidePanelTab(activeTab, content);

  const openInfoDetail = (mode: 'arenaCredits' | 'eliteBenefits') => {
    setSelectedTileDetail(null);
    setActiveDeckPreviewItem(null);
    setActiveInfoDetail(mode);
    onInfoHandled();
  };

  const openTileDetail = (item: TileItem) => {
    setActiveInfoDetail(null);
    setActiveDeckPreviewItem(null);
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

    const topFrameBounds = mainSlotFrameBounds(x, w, cfg, 'top');
    const bottomFrameBounds = mainSlotFrameBounds(x, w, cfg, 'bottom');
    const topAction = actionForTab(activeTab);
    const bottomAction = actionForTab(displayedBottomTab);
    const showEarnRewards = specialView === 'earnRewards' || bottomPreviewTarget === 'Earn Free AC';
    const topTileItems = tilesForTab(products, activeTab, content);
    const topVaultGroups = activeTab === 'Vault' ? content.vaultShowcaseGroups : [];
    const topPlayAccessItems = activeTab === 'Play Access' ? content.sections['Play Access'].categories ?? [] : [];
    const topEventItems = activeTab === 'Events' ? content.sections.Events.featured ?? content.sections.Events.categories ?? [] : [];
    const topCards = activeTab === 'Vault'
      ? topVaultGroups.map(vaultGroupToMainCarouselCard)
      : activeTab === 'Play Access'
        ? topPlayAccessItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, 'play-access'))
        : activeTab === 'Events'
          ? topEventItems.map((item, index) => staticItemToImageMainCarouselCard(item, index, 'events'))
          : topTileItems.map((item, index) => tileToMainCarouselCard(item, index, loadingId));
    const bottomTileItems = displayedBottomTab === 'Treasury' || displayedBottomTab === 'Elite'
      ? tilesForTab(products, displayedBottomTab, content)
      : [];
    const bottomVaultGroup = content.vaultShowcaseGroups.find(group => group.key === activeVaultGroupKey) ?? content.vaultShowcaseGroups[0];
    const bottomVaultItems = displayedBottomTab === 'Vault' ? bottomVaultGroup?.items ?? [] : [];
    const bottomPlayAccessItems = displayedBottomTab === 'Play Access' ? content.sections['Play Access'].featured ?? content.sections['Play Access'].categories ?? [] : [];
    const bottomEventItems = displayedBottomTab === 'Events' ? content.sections.Events.featured ?? content.sections.Events.categories ?? [] : [];
    const bottomDetailItems = displayedBottomTab === 'Vault'
      ? bottomVaultItems
      : displayedBottomTab === 'Play Access'
        ? bottomPlayAccessItems
        : displayedBottomTab === 'Events'
          ? bottomEventItems
          : bottomTileItems;
    const bottomPageIndex = bottomPageByTab[displayedBottomTab] ?? 0;
    const setBottomPageIndex = (nextPageIndex: number) => {
      setBottomPageByTab(state => ({ ...state, [displayedBottomTab]: nextPageIndex }));
    };
    const showVaultShowcase = displayedBottomTab === 'Vault' || (activeTab === 'Vault' && Boolean(vaultTopSelectionKey) && !bottomPreviewTarget);
    const routeTopCardToBottom = (tab: ShopTab, itemIndex: number) => {
      setTopRoutedBottomTab(tab);
      setBottomPageByTab(state => ({ ...state, [tab]: Math.max(0, Math.floor(itemIndex / 3)) }));
      setSelectedTileDetail(null);
      setActiveInfoDetail(null);
      setActiveDeckPreviewItem(null);
      onInfoHandled();
    };
    const handleTopCardAction = (card: ShopMainCarouselCardItem) => {
      if (activeTab === 'Vault') {
        const groupIndex = topVaultGroups.findIndex(item => `vault:${item.key}` === card.key);
        const group = groupIndex >= 0 ? topVaultGroups[groupIndex] : undefined;
        if (!group) return;
        setActiveVaultGroupKey(group.key);
        setVaultTopSelectionKey(group.key);
        routeTopCardToBottom('Vault', groupIndex);
        return;
      }
      if (activeTab === 'Play Access') {
        const tileIndex = topPlayAccessItems.findIndex((item, index) => staticTopCardKey('play-access', item, index) === card.key);
        if (tileIndex < 0) return;
        routeTopCardToBottom('Play Access', tileIndex);
        return;
      }
      if (activeTab === 'Events') {
        const tileIndex = topEventItems.findIndex((item, index) => staticTopCardKey('events', item, index) === card.key);
        if (tileIndex < 0) return;
        routeTopCardToBottom('Events', tileIndex);
        return;
      }
      const tileIndex = topTileItems.findIndex((item, index) => tileCardKey(item, index) === card.key);
      if (tileIndex < 0) return;
      routeTopCardToBottom(activeTab, tileIndex);
    };
    if (showEarnRewards) {
      return (
        <EarnRewardsBottomLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          content={content}
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

    if (rightPanelDetail) {
      return (
        <RightPanelDetailLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          active={rightPanelDetail}
          content={content}
          cfg={cfg}
          acBalance={acBalance}
          onClose={onClearRightPanelDetail}
          onElite={onElite}
        />
      );
    }

    if (activeDeckPreviewItem) {
      return (
        <VaultDeckPreviewLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          cfg={cfg}
          deckItem={activeDeckPreviewItem}
          renderDeckPreview={renderVaultDeckPreview}
          onClose={() => setActiveDeckPreviewItem(null)}
        />
      );
    }

    if (selectedTileDetail) {
      return (
        <TileDetailLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          item={selectedTileDetail}
          content={content}
          cfg={cfg}
          onClose={closeBottomDetail}
          onBuy={onBuy}
        />
      );
    }

    return (
      <g>
        <MainTop x={topFrameBounds.x} y={y} w={topFrameBounds.w} h={topH} label={activeTab} cards={topCards} onCardAction={handleTopCardAction} rightActionLabel={topAction?.label} onRightAction={topAction?.onAction} />
        {displayedInfoDetail ? (
          <InfoDetailLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} mode={displayedInfoDetail} content={content} cfg={cfg} onClose={closeBottomDetail} />
        ) : showVaultShowcase ? (
          <VaultShowcaseLayer
            x={bottomFrameBounds.x}
            y={bottomY}
            w={bottomFrameBounds.w}
            h={bottomH}
            content={content}
            cfg={cfg}
            activeGroupKey={activeVaultGroupKey}
            vaultDeckItems={vaultDeckItems}
            onGroupChange={setActiveVaultGroupKey}
            onGroupInspect={(group) => openTileDetail(vaultGroupToTile(group))}
            onDeckPreview={(item) => {
              setSelectedTileDetail(null);
              setActiveInfoDetail(null);
              setActiveDeckPreviewItem(item);
            }}
          />
        ) : bottomDetailItems.length > 0 ? (
          <BottomDetailCardsLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} label={displayedBottomTab} items={bottomDetailItems} content={content} cfg={cfg} loadingId={loadingId} pageIndex={bottomPageIndex} rightActionLabel={bottomAction?.label} onRightAction={bottomAction?.onAction} onInspect={openTileDetail} onBuy={onBuy} onPageChange={setBottomPageIndex} />
        ) : (
          <MainBottom x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} label={displayedBottomTab} rightActionLabel={bottomAction?.label} onRightAction={bottomAction?.onAction} />
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
  content,
  cfg,
  onClose,
  onSpin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  quest: ShopQuest;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  onSpin: () => void;
}) {
  const token = cfg.componentTokens.earnRewards;
  const copy = content.uiCopy.earnRewards;
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
  content,
  cfg,
  onClose,
  dailyRewardStatus,
  onDailyRewardSpin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
}) {
  const [selectedQuestKey, setSelectedQuestKey] = useState(content.quests[0]?.key ?? '');
  const [actionQuestKey, setActionQuestKey] = useState<string | null>(null);
  const [spinnerOpen, setSpinnerOpen] = useState(false);
  const body = mainBottomOverlayContentRect(x, y, w, h);
  const gap = 10;
  const pad = 10;
  const contentX = body.x + pad;
  const contentY = body.y + pad;
  const contentW = Math.max(0, body.w - pad * 2);
  const contentH = Math.max(0, body.h - pad * 2);
  const selectedQuest = content.quests.find(quest => quest.key === selectedQuestKey) ?? content.quests[0];
  const quests = content.quests.filter(quest => quest.key !== selectedQuest?.key);
  const gridCols = contentW < 860 ? 2 : 3;
  const visibleQuests = quests.slice(0, gridCols * 2);
  const gridRows = Math.max(1, Math.ceil(visibleQuests.length / gridCols));
  const featureW = Math.min(360, Math.max(288, contentW * 0.3));
  const gridX = contentX + featureW + gap;
  const gridW = Math.max(0, contentX + contentW - gridX);
  const gridCardW = gridCols > 0 ? (gridW - gap * (gridCols - 1)) / gridCols : gridW;
  const gridCardH = gridRows > 0 ? (contentH - gap * (gridRows - 1)) / gridRows : contentH;
  const actionQuest = actionQuestKey ? content.quests.find(quest => quest.key === actionQuestKey) : null;
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
        label={content.uiCopy.earnRewards.title}
        count={content.quests.length}
        rightActionLabel={content.uiCopy.earnRewards.backLabel}
        onRightAction={onClose}
      />
      {selectedQuest ? <EarnRewardFrameCard x={contentX} y={contentY} w={featureW} h={contentH} quest={selectedQuest} cfg={cfg} featured selected onAction={openQuestAction} dailyRewardStatus={dailyRewardStatus} /> : null}
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
          content={content}
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
  content,
  dailyRewardStatus,
  onDailyRewardSpin,
  vaultDeckItems,
  renderVaultDeckPreview,
}: ShopPageSvgSurfaceProps) {
  const cfg = useMemo(() => normalizeShopPageSvgControls(controls), [controls]);
  const shopContent = useMemo(() => normalizeShopPageContent(content), [content]);
  const mainRef = useRef<HTMLElement | null>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
  const [previewStart, setPreviewStart] = useState(0);
  const [previewResetting, setPreviewResetting] = useState(false);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [previewDrag, setPreviewDrag] = useState<{ startX: number; startIndex: number } | null>(null);
  const [bottomPreviewTarget, setBottomPreviewTarget] = useState<BottomPreviewTarget | null>(null);
  const [bottomPreviewVersion, setBottomPreviewVersion] = useState(0);
  const [rightPreviewTarget, setRightPreviewTarget] = useState<ShopRightTabId>('account');
  const [rightDetailTarget, setRightDetailTarget] = useState<ShopRightTabId | null>(null);
  const [specialView, setSpecialView] = useState<'earnRewards' | null>(null);
  const [infoRequest, setInfoRequest] = useState<'arenaCredits' | 'eliteBenefits' | null>(null);
  const previewHoldMs = Math.max(cfg.bottomPreview.carouselIntervalMs, 5600);
  const resolvedPreviewRows = useMemo<ResolvedPreviewRow[]>(() => {
    return shopContent.previews.map(row => ({
      title: row.title,
      tab: row.tab,
      subtitle: row.subtitle,
      accent: row.accent,
      previewItems: previewItemsForRow(row, products, shopContent),
    }));
  }, [products, shopContent]);
  const previewRowCount = resolvedPreviewRows.length;

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
    if (previewPaused || previewRowCount <= 1) return undefined;
    const id = window.setInterval(() => {
      setPreviewStart(value => value + 1);
    }, previewHoldMs);
    return () => window.clearInterval(id);
  }, [previewHoldMs, previewPaused, previewRowCount]);

  useEffect(() => {
    if (previewRowCount <= 0 || previewStart < previewRowCount) return undefined;
    const id = window.setTimeout(() => {
      setPreviewResetting(true);
      setPreviewStart(value => value >= previewRowCount ? value - previewRowCount : value);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPreviewResetting(false));
      });
    }, 1040);
    return () => window.clearTimeout(id);
  }, [previewRowCount, previewStart]);

  const metrics = useMemo<Metrics>(() => {
    const canvasWidth = shopCanvasWidthForSurface(cfg, surfaceSize);
    const columns = responsiveColumnWidths(canvasWidth, cfg);
    const leftX = cfg.layout.outerPad;
    const leftY = cfg.layout.topY;
    const mainX = leftX + columns.leftW + cfg.layout.mainGap;
    const rightX = canvasWidth - cfg.layout.outerPad - columns.rightW;
    const mainW = rightX - mainX - cfg.layout.mainGap;
    const headerTotalW = canvasWidth - cfg.layout.outerPad - mainX;
    const headerCreditW = Math.max(cfg.header.arenaCreditW, cfg.componentTokens.headerLayer.balanceMinWidth);
    const headerSideW = (headerTotalW - headerCreditW - cfg.header.gap * 2) / 2;
    const headerCenterX = mainX + headerSideW + cfg.header.gap;
    const headerStatsX = headerCenterX + headerCreditW + cfg.header.gap;
    return { leftX, leftY, leftW: columns.leftW, mainX, mainW, rightX, rightW: columns.rightW, headerSideW, headerCenterX, headerStatsX };
  }, [cfg, surfaceSize]);

  const canvasWidth = shopCanvasWidthForSurface(cfg, surfaceSize);

  const previewViewportW = canvasWidth - cfg.layout.outerPad * 2;
  const previewPreferredPanelW = previewPanelWidthForCardCount(PREFERRED_BOTTOM_PREVIEW_ITEMS, cfg);
  const previewMaxSlots = Math.max(1, Math.min(previewRowCount, Math.round(cfg.bottomPreview.visibleCount)));
  const previewVisibleSlots = Math.max(
    1,
    Math.min(
      previewMaxSlots,
      Math.max(1, Math.floor((previewViewportW + cfg.bottomPreview.gap) / (previewPreferredPanelW + cfg.bottomPreview.gap))),
    ),
  );
  const previewPanelW = Math.max(260, (previewViewportW - cfg.bottomPreview.gap * Math.max(0, previewVisibleSlots - 1)) / previewVisibleSlots);
  const previewWidths = useMemo(() => {
    return resolvedPreviewRows.map(() => previewPanelW);
  }, [previewPanelW, resolvedPreviewRows]);

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
    return Array.from({ length: previewRowCount * 3 }).map((_, index) => {
      const sourceIndex = index % previewRowCount;
      const cycle = Math.floor(index / previewRowCount);
      return {
        row: resolvedPreviewRows[sourceIndex],
        width: previewWidths[sourceIndex],
        x: cfg.layout.outerPad + cycle * previewTrackLayout.cycleWidth + previewTrackLayout.offsets[sourceIndex],
      };
    });
  }, [cfg.layout.outerPad, previewRowCount, previewTrackLayout, previewWidths, resolvedPreviewRows]);

  const selectTab = (tab: ShopTab) => {
    setSpecialView(null);
    setInfoRequest(null);
    setBottomPreviewTarget(null);
    setRightDetailTarget(null);
    setBottomPreviewVersion(version => version + 1);
    onTabChange(tab);
  };

  const selectPreview = (row: ResolvedPreviewRow) => {
    setInfoRequest(null);
    setRightDetailTarget(null);
    if (row.tab === 'Earn Free AC') {
      setBottomPreviewTarget(null);
      setSpecialView('earnRewards');
      setBottomPreviewVersion(version => version + 1);
      return;
    }
    setSpecialView(null);
    setBottomPreviewTarget(null);
    onTabChange(row.tab);
    setBottomPreviewVersion(version => version + 1);
  };

  const selectRightPreview = (id: ShopRightTabId) => {
    setRightPreviewTarget(id);
    setRightDetailTarget(null);
  };

  const openRightPreviewDetail = () => {
    setSpecialView(null);
    setInfoRequest(null);
    setBottomPreviewTarget(null);
    setRightDetailTarget(rightPreviewTarget);
  };
  const previewLocalIndex = wrapPreviewIndex(previewStart, previewRowCount);
  const previewCycleIndex = previewRowCount > 0 ? Math.floor(previewStart / previewRowCount) : 0;
  const previewTrackX = previewCycleIndex * previewTrackLayout.cycleWidth + (previewTrackLayout.offsets[previewLocalIndex] ?? 0);
  const previewPanelStep = previewPanelW + cfg.bottomPreview.gap;
  const shiftPreview = (delta: number) => {
    if (previewRowCount <= 1) return;
    setPreviewResetting(false);
    setPreviewStart(value => wrapPreviewIndex(wrapPreviewIndex(value, previewRowCount) + delta, previewRowCount));
  };
  const handlePreviewWheel = (event: WheelEvent<SVGGElement>) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 8) return;
    event.preventDefault();
    event.stopPropagation();
    shiftPreview(delta > 0 ? 1 : -1);
  };
  const handlePreviewMouseDown = (event: MouseEvent<SVGGElement>) => {
    if (previewRowCount <= 1) return;
    event.preventDefault();
    setPreviewPaused(true);
    setPreviewDrag({ startX: event.clientX, startIndex: wrapPreviewIndex(previewStart, previewRowCount) });
  };
  const handlePreviewMouseMove = (event: MouseEvent<SVGGElement>) => {
    if (!previewDrag || previewRowCount <= 1) return;
    const dragStep = Math.max(80, previewPanelStep * 0.45);
    const delta = Math.trunc((previewDrag.startX - event.clientX) / dragStep);
    setPreviewResetting(false);
    setPreviewStart(wrapPreviewIndex(previewDrag.startIndex + delta, previewRowCount));
  };
  const handlePreviewMouseLeave = () => {
    setPreviewPaused(false);
    setPreviewDrag(null);
  };
  const frameToken = cfg.componentTokens.sectionFrame;
  const bottomPreviewY = cfg.layout.footerY - cfg.layout.bottomPreviewH - frameToken.previewGap;
  const mainSectionBottomY = bottomPreviewY - frameToken.mainToPreviewGap;
  const leftPanelH = mainSectionBottomY - cfg.layout.topY;
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
        <LeftSidePanel x={metrics.leftX} y={metrics.leftY} w={metrics.leftW} h={leftPanelH} activeTab={activeTab} earnActive={specialView === 'earnRewards' || bottomPreviewTarget === 'Earn Free AC'} content={shopContent} cfg={cfg} onTabChange={selectTab} onEarn={() => {
          setBottomPreviewTarget(null);
          setRightDetailTarget(null);
          setSpecialView('earnRewards');
        }} />
        <HeaderLayer
          x={metrics.mainX}
          y={cfg.layout.topY}
          w={metrics.headerSideW}
          h={cfg.layout.headerH}
          rightX={metrics.headerCenterX + cfg.header.arenaCreditW + cfg.header.gap}
          acBalance={acBalance}
          content={shopContent}
          cfg={cfg}
          onArenaCreditsInfo={() => {
            setSpecialView(null);
            setInfoRequest('arenaCredits');
            setBottomPreviewTarget(null);
            setRightDetailTarget(null);
            onTabChange('Treasury');
          }}
        />
        <TopStatsLayer x={metrics.headerStatsX} y={cfg.layout.topY} w={metrics.headerSideW} h={cfg.layout.headerH} content={shopContent} cfg={cfg} onElite={() => selectTab('Elite')} />
        <MainBody
          key={`${activeTab}-${bottomPreviewVersion}-${rightDetailTarget ?? 'right-preview-idle'}`}
          x={metrics.mainX}
          y={cfg.layout.mainY}
          w={metrics.mainW}
          activeTab={activeTab}
          products={products}
          content={shopContent}
          loadingId={loadingId}
          acBalance={acBalance}
          specialView={specialView}
          infoRequest={infoRequest}
          bottomPreviewTarget={bottomPreviewTarget}
          rightPanelDetail={rightDetailTarget}
          sectionBottomY={mainSectionBottomY}
          cfg={cfg}
          onClearSpecial={() => setSpecialView(null)}
          onClearBottomPreview={() => setBottomPreviewTarget(null)}
          onClearRightPanelDetail={() => setRightDetailTarget(null)}
          onInfoHandled={() => setInfoRequest(null)}
          onBuy={onBuy}
          onElite={() => selectTab('Elite')}
          dailyRewardStatus={dailyRewardStatus}
          onDailyRewardSpin={onDailyRewardSpin}
          vaultDeckItems={vaultDeckItems}
          renderVaultDeckPreview={renderVaultDeckPreview}
        />
        <RightSidePanel x={metrics.rightX} y={cfg.layout.mainY} w={metrics.rightW} h={rightPanelH} content={shopContent} cfg={cfg} acBalance={acBalance} active={rightPreviewTarget} onActiveChange={selectRightPreview} onPreviewOpen={openRightPreviewDetail} />
        <BottomPanel
          y={bottomPreviewY}
          h={cfg.layout.bottomPreviewH}
          cfg={cfg}
          trackRows={previewTrackRows}
          trackX={previewTrackX}
          resetting={previewResetting}
          onSelect={selectPreview}
          onMouseEnter={() => setPreviewPaused(true)}
          onMouseLeave={handlePreviewMouseLeave}
          onMouseDown={handlePreviewMouseDown}
          onMouseMove={handlePreviewMouseMove}
          onMouseUp={() => setPreviewDrag(null)}
          onWheel={handlePreviewWheel}
        />
        <FooterLayer x={cfg.layout.outerPad} y={cfg.layout.footerY} w={canvasWidth - cfg.layout.outerPad * 2} h={cfg.layout.footerH} content={shopContent} cfg={cfg} />
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
