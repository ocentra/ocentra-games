import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
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
import {
  DeckPreviewView,
  type DeckPreviewAxis,
  type DeckPreviewCell,
} from '../../Common/DeckPreview/DeckPreviewView';
import { PictureViewerFrame } from '../../Common/PictureViewerFrame/PictureViewerFrame';
import { avatarImageUrls } from '@ocentra/app-assets/avatars';
import type { ShopPaymentProvider } from '@ocentra/endpoint-domain/schemas/shop';
import type {
  ShopAccountSummary,
  ShopDeckImageResolver,
  ShopDeckPreviewCard,
  ShopProduct,
  ShopTab,
  ShopVaultDeckPreviewItem,
} from './ShopPageSvgTypes';
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
import {
  mainBottomOverlayContentRect,
  mainSlotFrameBounds,
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
  purchasePrompt?: {
    product: ShopProduct;
    message?: string | null;
    busyProvider?: ShopPaymentProvider | null;
  } | null;
  onPurchaseProviderSelect?: (product: ShopProduct, provider: ShopPaymentProvider) => void;
  onPurchaseCancel?: () => void;
  controls?: Partial<ShopPageSvgControls> | null;
  content?: Partial<ShopPageContentData> | null;
  vaultDecks?: ShopVaultDeckPreviewItem[];
  resolveDeckImageUrl?: ShopDeckImageResolver;
  onVaultDeckInspect?: (deck: ShopVaultDeckPreviewItem) => void;
  accountSummary?: ShopAccountSummary | null;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
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
const SHOP_PAYMENT_PROVIDER_OPTIONS: Array<{
  provider: ShopPaymentProvider;
  label: string;
  detail: string;
}> = [
  { provider: 'stripe', label: 'Card / Stripe', detail: 'Hosted checkout when Stripe is configured.' },
  { provider: 'paypal', label: 'PayPal', detail: 'PayPal checkout placeholder until provider setup lands.' },
  { provider: 'solana', label: 'Solana', detail: 'Wallet payment placeholder until on-chain checkout lands.' },
];

type VaultGridFrameArtMode = 'cards' | 'table';

function paymentProvidersForProduct(product: ShopProduct): Array<{
  provider: ShopPaymentProvider;
  label: string;
  detail: string;
}> {
  const configured = product.paymentProviders?.length ? new Set(product.paymentProviders) : null;
  return SHOP_PAYMENT_PROVIDER_OPTIONS.filter(option => !configured || configured.has(option.provider));
}

function shopDeckImagePathToBrowserUrl(path?: string): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/')
    ? `/${normalized}`
    : `/Resources/${normalized}`;
}

function resolveShopDeckImageUrl(
  resolver: ShopDeckImageResolver | undefined,
  imageHash?: string,
  imagePath?: string,
): string | null {
  if (resolver) return resolver(imageHash, imagePath);
  return shopDeckImagePathToBrowserUrl(imagePath);
}

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

function PurchaseProviderDialog({
  x,
  y,
  w,
  product,
  message,
  busyProvider,
  cfg,
  onProviderSelect,
  onCancel,
}: {
  x: number;
  y: number;
  w: number;
  product: ShopProduct;
  message?: string | null;
  busyProvider?: ShopPaymentProvider | null;
  cfg: ShopPageSvgControls;
  onProviderSelect: (product: ShopProduct, provider: ShopPaymentProvider) => void;
  onCancel: () => void;
}) {
  const h = 246;
  const providers = paymentProvidersForProduct(product);
  const pad = 22;
  const providerGap = 12;
  const providerW = (w - pad * 2 - providerGap * (providers.length - 1)) / providers.length;
  const providerY = y + 122;
  const title = `Pay for ${product.displayName}`;
  const price = productPriceLabel(product);
  return (
    <g>
      <rect x={x - 18} y={y - 18} width={w + 36} height={h + 36} fill="rgba(2,10,18,.72)" />
      <path d={lobbyRoundedRectPath(x, y, w, h, 10)} fill="rgba(6,22,41,.96)" stroke={cfg.colors.activeBlue} strokeWidth="1.8" filter="url(#shopSoftGlow)" />
      <Txt x={x + pad} y={y + 34} size="24" weight="950" fill={cfg.colors.bodyText} cfg={cfg}>{title}</Txt>
      <Txt x={x + w - pad} y={y + 34} anchor="end" size="18" weight="950" fill={cfg.colors.gold} cfg={cfg}>{price}</Txt>
      <WrappedText x={x + pad} y={y + 66} width={w - pad * 2} lines={product.description ?? 'Choose a checkout provider to start this purchase.'} size={11.5} lineHeight={15} fill={cfg.colors.mutedText} weight={700} maxLines={2} cfg={cfg} />
      {message ? (
        <WrappedText x={x + pad} y={y + 101} width={w - pad * 2} lines={message} size={12.2} lineHeight={15} fill={cfg.colors.gold} weight={850} maxLines={2} cfg={cfg} />
      ) : (
        <Txt x={x + pad} y={y + 101} size="12.2" weight="850" fill={cfg.colors.mutedText} cfg={cfg}>Provider setup can fail gracefully without changing this shop UI.</Txt>
      )}
      {providers.map((option, index) => {
        const optionX = x + pad + index * (providerW + providerGap);
        const isBusy = busyProvider === option.provider;
        return (
          <g key={option.provider}>
            <rect x={optionX} y={providerY} width={providerW} height="74" fill={alphaColor(cfg.colors.panelFill, 0.84)} stroke={isBusy ? cfg.colors.gold : cfg.colors.activeBlue} strokeWidth="1.2" />
            <Txt x={optionX + 12} y={providerY + 25} size="15" weight="950" fill={isBusy ? cfg.colors.gold : cfg.colors.bodyText} cfg={cfg}>{isBusy ? 'Starting...' : option.label}</Txt>
            <WrappedText x={optionX + 12} y={providerY + 45} width={providerW - 24} lines={option.detail} size={8.3} lineHeight={10.5} fill={cfg.colors.mutedText} weight={700} maxLines={2} cfg={cfg} />
            <SvgButton x={optionX + providerW - 116} y={providerY + 46} w={104} h={22} label={isBusy ? 'Working' : 'Select'} active={isBusy} small arrow={false} disabled={Boolean(busyProvider)} onClick={() => onProviderSelect(product, option.provider)} cfg={cfg} />
          </g>
        );
      })}
      <SvgButton x={x + w - pad - 132} y={y + h - 42} w={132} h={26} label="Cancel" small arrow={false} onClick={onCancel} cfg={cfg} />
    </g>
  );
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
  const minimumWidth = minimumShopCanvasWidth(cfg);
  if (surfaceSize.width <= minimumWidth) return minimumWidth;
  const ratioWidth = Math.round(cfg.canvas.height * (surfaceSize.width / surfaceSize.height));
  return Math.max(minimumWidth, Math.min(2600, ratioWidth));
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

function tileActionLabel(item: TileItem, content: ShopPageContentData, tab?: ShopTab): string {
  const price = item.price?.toLowerCase() ?? '';
  if (price.includes('coming soon')) return 'Coming Soon';
  if (tab === 'Treasury') return item.title === 'Custom AC' ? 'Top Up' : 'Purchase';
  if (tab === 'Elite') {
    if (item.tone === 'gold' && item.title.toLowerCase().includes('founder')) return content.uiCopy.passCard.lifetimeButton;
    return content.uiCopy.passCard.selectButton;
  }
  if (tab === 'Events') return item.product ? 'Select' : 'View';
  if (tab === 'Play Access') return 'View';
  if (tab === 'Vault') {
    if (price === 'free') return 'Claim Free';
    if (price.includes('printable') || price.includes('digital')) return 'Buy Digital';
    return 'Open';
  }
  if (item.title === 'Custom AC') return 'Top Up';
  if (isCreditPackTile(item, content)) return 'Purchase';
  if (price === 'free') return 'Claim Free';
  if (price.includes('printable') || price.includes('digital')) return 'Buy Digital';
  if (item.tone === 'gold' && item.title.toLowerCase().includes('founder')) return content.uiCopy.passCard.lifetimeButton;
  if (item.product?.productType === 'SUBSCRIPTION' || content.passes.some(pass => pass.title === item.title)) return content.uiCopy.passCard.selectButton;
  return item.price ? 'Purchase' : 'View';
}

function tileCardKey(item: TileItem, index: number): string {
  return item.product?.productId ?? `${item.title}-${index}`;
}

function staticTopCardKey(prefix: string, item: TileItem, index: number): string {
  return `${prefix}:${item.title}:${index}`;
}

function tileToMainCarouselCard(item: TileItem, index: number, loadingId: string | null, content: ShopPageContentData, tab: ShopTab): ShopMainCarouselCardItem {
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
    actionLabel: tileActionLabel(item, content, tab),
    loading: item.product ? loadingId === item.product.productId : false,
    disabled: false,
  };
}

function staticItemToImageMainCarouselCard(item: TileItem, index: number, prefix: string): ShopMainCarouselCardItem {
  const coverImage = prefix === 'play-access' && ['Private Tables', 'Public Tables', 'Room Chat'].includes(item.title);
  const imageAnchor = item.title === 'Room Chat'
    ? 'bottom'
    : item.title.includes('Tables')
      ? 'center'
      : 'center';
  return {
    key: staticTopCardKey(prefix, item, index),
    title: item.title,
    subtitle: item.subtitle,
    bodyLines: item.benefits ?? [item.subtitle],
    layout: 'image',
    imageFit: coverImage ? 'cover' : 'contain',
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

function vaultGroupBenefits(group: ShopVaultShowcaseGroup): string[] {
  if (group.key === 'decks') {
    return ['Browse deck drops.', 'Open group details.', 'Author drops in editor.'];
  }
  if (group.key === 'card-backs') {
    return ['Manage card backs.', 'Preview upcoming backs.', 'Add backs in editor.'];
  }
  if (group.key === 'table-themes') {
    return ['Preview table themes.', 'Keep default surfaces.', 'Add themes in editor.'];
  }
  if (group.key === 'frames') {
    return ['Choose profile frames.', 'Keep free frames visible.', 'Add frames in editor.'];
  }
  if (group.key === 'avatars') {
    return ['Choose avatars.', 'Keep free avatars visible.', 'Add avatars in editor.'];
  }
  return [group.subtitle, 'Open group details.', 'Tune inventory in editor.'];
}

function vaultGroupToTile(group: ShopVaultShowcaseGroup): TileItem {
  return {
    title: group.title,
    subtitle: group.subtitle,
    tone: group.tone,
    icon: group.icon,
    badge: group.badge,
    imageUrl: group.heroImageUrl,
    price: group.badge === 'FREE' ? 'Free' : group.badge === 'SOON' ? 'Coming Soon' : undefined,
    benefits: vaultGroupBenefits(group),
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
  tab,
  cfg,
  loading,
  expanded = false,
  expandedActionLabel,
  expandedAction = 'buy',
  onInspect,
  onBuy,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TileItem;
  content: ShopPageContentData;
  tab: ShopTab;
  cfg: ShopPageSvgControls;
  loading?: boolean;
  expanded?: boolean;
  expandedActionLabel?: string;
  expandedAction?: 'buy' | 'inspect';
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
  const defaultActionLabel = tileActionLabel(item, content, tab);
  const buttonLabel = loading ? 'Working' : expanded ? expandedActionLabel ?? defaultActionLabel : defaultActionLabel;
  const buttonCanBuy = Boolean(item.product && isShopProductPurchasable(item.product) && (tab === 'Treasury' || tab === 'Elite' || item.product.productType === 'TOURNAMENT_ENTRY' || item.product.productType === 'MARKETPLACE'));
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
          if (((expanded && expandedAction === 'buy') || (!expanded && buttonCanBuy)) && item.product) onBuy(item.product);
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
  expandedItem,
  expandedActionLabel,
  expandedAction,
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
  expandedItem?: TileItem;
  expandedActionLabel?: string;
  expandedAction?: 'buy' | 'inspect';
  rightActionLabel?: string;
  onRightAction?: () => void;
  onInspect: (item: TileItem) => void;
  onBuy: (product: ShopProduct) => void;
  onPageChange: (pageIndex: number) => void;
}) {
  const measuredBody = mainBottomOverlayContentRect(x, y, w, h);
  const pad = 10;
  const gap = 12;
  const measuredContentW = Math.max(0, measuredBody.w - pad * 2);
  const minCardW = label === 'Treasury'
    ? Math.max(cfg.mainBody.treasuryCardMinW, 560)
    : label === 'Elite'
      ? Math.max(cfg.mainBody.passCardMinW, 560)
      : Math.max(cfg.mainBody.productCardMinW, 560);
  const responsiveMinCardW = Math.min(minCardW, Math.max(1, measuredContentW));
  const maxCardW = label === 'Treasury'
    ? minCardW
    : minCardW;
  const maxVisible = label === 'Treasury'
    ? Math.min(2, Math.round(cfg.mainBody.treasuryMaxVisible))
    : label === 'Elite'
      ? Math.min(2, Math.round(cfg.mainBody.passMaxVisible))
      : Math.min(2, Math.round(cfg.mainBody.productMaxVisible));
  const expanded = Boolean(expandedItem);
  const visibleCount = expanded ? 1 : visibleCardCount(measuredContentW, items.length, gap, 0, responsiveMinCardW, maxVisible);
  const rawCardW = visibleCount > 0 ? (measuredContentW - gap * (visibleCount - 1)) / visibleCount : measuredContentW;
  const cardW = expanded ? measuredContentW : Math.min(maxCardW, Math.max(responsiveMinCardW, rawCardW));
  const rowW = visibleCount * cardW + Math.max(0, visibleCount - 1) * gap;
  const { pageItems, pageCount, safePageIndex } = carouselPage(items, visibleCount, pageIndex);
  const displayItems = expandedItem ? [expandedItem] : pageItems;
  const canPage = !expanded && pageCount > 1;
  const body = expanded ? mainBottomOverlayContentRect(x, y, w, h, false) : measuredBody;
  const contentX = body.x + pad;
  const contentY = body.y + pad;
  const contentW = Math.max(0, body.w - pad * 2);
  const contentH = Math.max(0, body.h - pad * 2);
  const rowX = contentX + Math.max(0, (contentW - rowW) / 2);
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
        showNavigation={!expanded}
        navigationPageCount={pageCount}
        navigationPageIndex={safePageIndex}
        onNavigationPageChange={onPageChange}
      />
      {canPage ? (
        <>
          <g role="button" tabIndex={0} aria-label={`Previous ${label} items`} className="shop-page-svg-clickable" onClick={() => onPageChange(safePageIndex - 1)}>
            <rect x={x - 34} y={hitTop} width="74" height={hitH} fill="transparent" />
          </g>
          <g role="button" tabIndex={0} aria-label={`Next ${label} items`} className="shop-page-svg-clickable" onClick={() => onPageChange(safePageIndex + 1)}>
            <rect x={x + w - 40} y={hitTop} width="74" height={hitH} fill="transparent" />
          </g>
        </>
      ) : null}
      {displayItems.map((item, index) => (
        <EliteBottomPassCard
          key={item.title}
          x={rowX + index * (cardW + gap)}
          y={contentY}
          w={cardW}
          h={contentH}
          item={item}
          content={content}
          tab={label}
          cfg={cfg}
          loading={item.product ? loadingId === item.product.productId : false}
          expanded={expanded}
          expandedActionLabel={expandedActionLabel}
          expandedAction={expandedAction}
          onInspect={() => onInspect(item)}
          onBuy={onBuy}
        />
      ))}
    </g>
  );
}

function vaultTableThemePaints(cfg: ShopPageSvgControls, variantKey: string) {
  const variant = variantKey.toLowerCase();
  if (variant.includes('tournament')) {
    return {
      railDark: '#07192c',
      railMid: '#265473',
      railLight: cfg.colors.activeBlue,
      railEdge: '#c6f5ff',
      feltDark: '#042d37',
      feltMid: '#0b627d',
      feltLight: '#23d6c4',
      line: '#d8fbff',
    };
  }
  if (variant.includes('club')) {
    return {
      railDark: '#261902',
      railMid: '#665016',
      railLight: cfg.colors.gold,
      railEdge: '#ffe9a8',
      feltDark: '#063322',
      feltMid: '#0a6a43',
      feltLight: cfg.colors.green,
      line: '#c7ffe8',
    };
  }
  if (variant.includes('night')) {
    return {
      railDark: '#140923',
      railMid: '#4a2470',
      railLight: cfg.colors.violet,
      railEdge: '#e2c3ff',
      feltDark: '#03172c',
      feltMid: '#0b355b',
      feltLight: '#209ce8',
      line: '#c7ecff',
    };
  }
  return {
    railDark: '#341707',
    railMid: '#8b4e16',
    railLight: '#f3bd61',
    railEdge: '#ffe39c',
    feltDark: '#07372f',
    feltMid: '#09745d',
    feltLight: '#18c99a',
    line: '#b5fff0',
  };
}

function vaultTableThemePaintId(x: number, y: number, variantKey: string, suffix: string) {
  const normalized = variantKey.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
  return `shopVaultTable-${normalized}-${Math.round(x)}-${Math.round(y)}-${suffix}`;
}

function VaultTableThemeArt({
  x,
  y,
  w,
  h,
  accent,
  cfg,
  variantKey,
  active,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  cfg: ShopPageSvgControls;
  variantKey: string;
  active: boolean;
}) {
  const paints = vaultTableThemePaints(cfg, variantKey);
  const railId = vaultTableThemePaintId(x, y, variantKey, 'rail');
  const feltId = vaultTableThemePaintId(x, y, variantKey, 'felt');
  const tableW = Math.max(40, w);
  const tableH = Math.max(26, Math.min(h * 0.82, tableW * 0.44));
  const tableX = x + (w - tableW) / 2;
  const tableY = y + (h - tableH) / 2;
  const radius = Math.min(tableW, tableH) / 2;
  const innerInset = Math.max(5, Math.min(tableW, tableH) * 0.15);
  const feltInset = innerInset + Math.max(4, Math.min(tableW, tableH) * 0.08);
  const outerPath = lobbyRoundedRectPath(tableX, tableY, tableW, tableH, radius);
  const railInnerPath = lobbyRoundedRectPath(tableX + innerInset, tableY + innerInset, tableW - innerInset * 2, tableH - innerInset * 2, Math.max(2, radius - innerInset * 0.8));
  const feltPath = lobbyRoundedRectPath(tableX + feltInset, tableY + feltInset, tableW - feltInset * 2, tableH - feltInset * 2, Math.max(2, radius - feltInset * 0.74));
  const strokeW = Math.max(1.2, Math.min(3.2, tableH * 0.07));
  const centerX = tableX + tableW / 2;
  const centerY = tableY + tableH / 2;
  return (
    <g pointerEvents="none">
      <defs>
        <linearGradient id={railId} x1={tableX} x2={tableX + tableW} y1={tableY} y2={tableY + tableH} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={paints.railEdge} />
          <stop offset="15%" stopColor={paints.railLight} />
          <stop offset="43%" stopColor={paints.railMid} />
          <stop offset="78%" stopColor={paints.railDark} />
          <stop offset="100%" stopColor={paints.railLight} />
        </linearGradient>
        <radialGradient id={feltId} cx={centerX} cy={tableY + tableH * 0.38} r={Math.max(tableW, tableH) * 0.55} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={paints.feltLight} />
          <stop offset="45%" stopColor={paints.feltMid} />
          <stop offset="100%" stopColor={paints.feltDark} />
        </radialGradient>
      </defs>
      <ellipse cx={centerX} cy={tableY + tableH + Math.max(3, tableH * 0.08)} rx={tableW * 0.42} ry={Math.max(4, tableH * 0.1)} fill="#000000" opacity={active ? 0.36 : 0.24} filter="url(#shopSoftGlow)" />
      <path d={outerPath} fill={`url(#${railId})`} stroke={paints.railEdge} strokeWidth={strokeW} strokeOpacity={active ? 0.98 : 0.86} />
      <path d={outerPath} fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity={active ? 0.54 : 0.28} filter={active ? 'url(#shopSoftGlow)' : undefined} />
      <path d={railInnerPath} fill={cfg.colors.headerFill} stroke={paints.railLight} strokeWidth={Math.max(1, strokeW * 0.7)} strokeOpacity="0.84" />
      <path d={feltPath} fill={`url(#${feltId})`} stroke={paints.line} strokeWidth={Math.max(1, strokeW * 0.68)} strokeOpacity={active ? 0.92 : 0.76} />
      <path d={`M ${centerX} ${tableY + feltInset + 3} V ${tableY + tableH - feltInset - 3}`} stroke={paints.line} strokeWidth={Math.max(0.8, strokeW * 0.36)} strokeOpacity="0.34" strokeDasharray="4 4" />
      <ellipse cx={centerX} cy={centerY} rx={Math.max(7, tableW * 0.08)} ry={Math.max(2.5, tableH * 0.06)} fill={alphaColor(accent, active ? 0.28 : 0.18)} stroke={paints.line} strokeWidth=".8" strokeOpacity="0.48" />
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
  deckPrice,
  sampleCards = [],
  resolveDeckImageUrl,
  artMode = 'cards',
  variantKey,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  cfg: ShopPageSvgControls;
  deckName?: string;
  deckPrice?: string;
  sampleCards?: ShopDeckPreviewCard[];
  resolveDeckImageUrl?: ShopDeckImageResolver;
  artMode?: VaultGridFrameArtMode;
  variantKey?: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const label = deckName ?? '';
  const labelH = Math.max(20, Math.min(28, h * 0.28));
  const cardW = Math.min(42, w * 0.24);
  const cardH = Math.min(58, h * 0.54);
  const cardY = y + Math.max(8, h * 0.12);
  const cardStartX = x + w / 2 - cardW * 1.22;
  const edge = hovered ? cfg.colors.activeBlue : accent;
  const chrome = cfg.componentTokens.cardChrome;
  const interactive = Boolean(onClick);
  const badgeW = Math.min(58, Math.max(46, w * 0.32));
  const badgeH = Math.max(13, Math.min(17, h * 0.16));
  const badgeX = x + w - badgeW - 5;
  const badgeY = y + 5;
  const priceLabel = deckPrice ?? '';

  return (
    <g
      onClick={(event) => {
        if (!onClick) return;
        event.stopPropagation();
        onClick();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
      }}
      onMouseEnter={() => setHovered(interactive)}
      onMouseLeave={() => setHovered(false)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={interactive ? 'shop-page-svg-clickable' : undefined}
    >
      {hovered ? <rect x={x - chrome.hoverPad} y={y - chrome.hoverPad} width={w + chrome.hoverPad * 2} height={h + chrome.hoverPad * 2} rx={cfg.componentTokens.sectionFrame.contentRadius} fill="none" stroke={edge} strokeWidth={chrome.hoverOuterStrokeWidth} strokeOpacity=".34" filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.componentTokens.sectionFrame.contentRadius} fill={hovered ? alphaColor(cfg.colors.activeBlue, chrome.activeFillOpacity) : cfg.colors.vaultGridFill} stroke={edge} strokeWidth={hovered ? 1.4 : 1} strokeOpacity={hovered ? 0.86 : 0.42} />
      {interactive ? (
        <g opacity={hovered ? 1 : 0.72} pointerEvents="none">
          <rect x={badgeX} y={badgeY} width={badgeW} height={badgeH} rx="3" fill={alphaColor(edge, 0.18)} stroke={edge} strokeWidth="1" strokeOpacity="0.86" filter="url(#shopSoftGlow)" />
          <text x={badgeX + badgeW / 2} y={badgeY + badgeH / 2 + 3} textAnchor="middle" fill={cfg.colors.bodyText} fontSize={Math.max(6.6, Math.min(8.2, badgeW / 6.8))} fontWeight="950" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">EXPAND</text>
        </g>
      ) : null}
      {artMode === 'table' ? (
        <VaultTableThemeArt x={x + 14} y={y + 15} w={w - 28} h={Math.max(24, h - labelH - 25)} accent={edge} cfg={cfg} variantKey={variantKey ?? label} active={hovered} />
      ) : (
        [0, 1, 2].map((cardIndex) => {
          const rotate = [-9, 0, 9][cardIndex];
          const cardX = cardStartX + cardIndex * cardW * 0.72;
          const card = sampleCards[cardIndex];
          const imageUrl = card ? resolveShopDeckImageUrl(resolveDeckImageUrl, card.imageHash, card.imagePath) : null;
          const clipId = `shopVaultDeckCardClip-${Math.round(x)}-${Math.round(y)}-${cardIndex}`;
          return (
            <g key={cardIndex} transform={`rotate(${rotate} ${cardX + cardW / 2} ${cardY + cardH / 2})`}>
              <rect x={cardX} y={cardY} width={cardW} height={cardH} rx={cfg.componentTokens.sectionFrame.contentRadius / 2} fill={cfg.colors.headerFillAlt} stroke={edge} strokeWidth="1" strokeOpacity={hovered ? 0.92 : 0.72} />
              <clipPath id={clipId}>
                <rect x={cardX + 3} y={cardY + 4} width={cardW - 6} height={cardH - 8} rx={cfg.componentTokens.sectionFrame.contentRadius / 3} />
              </clipPath>
              {imageUrl ? (
                <image
                  href={imageUrl}
                  x={cardX + 3}
                  y={cardY + 4}
                  width={cardW - 6}
                  height={cardH - 8}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#${clipId})`}
                />
              ) : (
                <g>
                  <rect x={cardX + 4} y={cardY + 5} width={cardW - 8} height={cardH - 10} rx={cfg.componentTokens.sectionFrame.contentRadius / 3} fill={cfg.colors.tableHeaderFill} stroke={cfg.colors.bodyText} strokeWidth=".6" strokeOpacity=".22" strokeDasharray="3 3" />
                  <text x={cardX + cardW / 2} y={cardY + cardH / 2 - 2} textAnchor="middle" fill={cfg.colors.tileSubtitleText} fontSize={Math.max(4.8, Math.min(6.4, cardW * 0.15))} fontWeight="850" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">Missing</text>
                  <text x={cardX + cardW / 2} y={cardY + cardH / 2 + 6} textAnchor="middle" fill={cfg.colors.tileSubtitleText} fontSize={Math.max(4.8, Math.min(6.4, cardW * 0.15))} fontWeight="850" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">image</text>
                </g>
              )}
            </g>
          );
        })
      )}
      <rect x={x + 1} y={y + h - labelH - 1} width={w - 2} height={labelH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.tileFooterFill} stroke={edge} strokeWidth=".7" strokeOpacity={hovered ? 0.72 : 0.34} />
      {label ? (
        <text x={x + w / 2} y={y + h - labelH / 2} fill={hovered ? edge : cfg.colors.bodyText} fontSize={Math.max(7, Math.min(9.5, w / Math.max(12, label.length * 0.62)))} fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">{label}</text>
      ) : null}
      {priceLabel && hovered ? (
        <text x={x + w - 6} y={y + h - labelH - 6} fill={edge} fontSize={Math.max(6.8, Math.min(8.4, w * 0.055))} fontWeight="900" textAnchor="end" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">{priceLabel}</text>
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

function VaultShowcaseLayer({
  x,
  y,
  w,
  h,
  content,
  cfg,
  activeGroupKey,
  onGroupChange,
  onGroupInspect,
  deckPreviews = [],
  resolveDeckImageUrl,
  onDeckInspect,
  rightActionLabel,
  onRightAction,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  activeGroupKey: string;
  onGroupChange: (key: string) => void;
  onGroupInspect: (group: ShopVaultShowcaseGroup) => void;
  deckPreviews?: ShopVaultDeckPreviewItem[];
  resolveDeckImageUrl?: ShopDeckImageResolver;
  onDeckInspect?: (deck: ShopVaultDeckPreviewItem) => void;
  rightActionLabel?: string;
  onRightAction?: () => void;
}) {
  const [gridScrollState, setGridScrollState] = useState<{ groupKey: string; value: number }>({ groupKey: activeGroupKey, value: 0 });
  const [gridDrag, setGridDrag] = useState<{ groupKey: string; pointerX: number; scrollX: number } | null>(null);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);
  const [selectedProfileFrameIndex, setSelectedProfileFrameIndex] = useState(0);
  const activeGroup = content.vaultShowcaseGroups.find(group => group.key === activeGroupKey) ?? content.vaultShowcaseGroups[0];
  if (!activeGroup) return null;
  const accent = toneColor(activeGroup.tone, cfg);
  const token = cfg.componentTokens.vaultShowcase;
  const body = mainBottomOverlayContentRect(x, y, w, h);
  const bodyY = body.y;
  const bodyH = body.h;
  const pad = token.pad;
  const heroX = body.x + pad;
  const heroY = bodyY + token.heroTop;
  const heroW = Math.min(token.heroMaxW, Math.max(token.heroMinW, body.w * token.heroRatioW));
  const heroH = bodyH - token.heroVPad;
  const dividerX = heroX + heroW + token.dividerGap;
  const gridX = dividerX + token.gridGap;
  const gridY = heroY;
  const gridW = body.x + body.w - gridX - pad;
  const gridH = heroH;
  const isAvatarGrid = activeGroup.key === 'avatars';
  const isProfileFrameGrid = activeGroup.key === 'frames';
  const isDeckGrid = activeGroup.key === 'decks';
  const isLimitedPlaceholderGrid = activeGroup.key === 'card-backs' || activeGroup.key === 'table-themes';
  const gridFrameArtMode: VaultGridFrameArtMode = activeGroup.key === 'table-themes' ? 'table' : 'cards';
  const isSelectableCircleGrid = isAvatarGrid || isProfileFrameGrid;
  const selectableCircleImages = isAvatarGrid ? avatarImageUrls : isProfileFrameGrid ? activeGroup.items.map(item => item.imageUrl).filter(Boolean) : [];
  const deckItems = isDeckGrid ? deckPreviews : [];
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
      ? deckItems.length > 0 ? Math.max(token.minDeckColumns, deckItems.length) : 0
      : Math.max(1, gridStaticItemCount);
  const showGridMessage = !isDeckGrid || deckItems.length === 0;
  const messageColumnSpan = showGridMessage ? 2 : 0;
  const columns = itemColumns + messageColumnSpan;
  const messageTitle = activeGroup.key === 'card-backs'
    ? 'Card backs dropping soon'
    : activeGroup.key === 'table-themes'
      ? 'Table themes dropping soon'
      : activeGroup.key === 'frames'
        ? 'Paid frames soon'
        : activeGroup.key === 'decks'
          ? 'Deck assets loading'
          : 'Paid avatars soon';
  const messageLines = activeGroup.key === 'card-backs'
    ? ['Default card backs stay free.', 'Premium animated backs will appear in this grid when the art is ready.']
    : activeGroup.key === 'table-themes'
      ? ['The default table theme stays active.', 'More room surfaces and competitive table moods will drop here.']
      : activeGroup.key === 'frames'
        ? ['Free profile frames are available now.', 'More custom paid profile frames are dropping soon.']
        : activeGroup.key === 'decks'
          ? ['No deck preview assets were returned yet.', 'The Vault grid uses deck assets from the shared asset runtime.']
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
  const setGridPage = (nextPageIndex: number) => {
    setGridScrollState({ groupKey: activeGroupKey, value: clampNumber(nextPageIndex * gridW, 0, maxScrollX) });
  };

  return (
    <g>
      <MainBottom
        x={x}
        y={y}
        w={w}
        h={h}
        label="VAULT"
        count={isDeckGrid ? deckItems.length : activeGroup.items.length}
        rightActionLabel={rightActionLabel}
        onRightAction={onRightAction}
        showNavigation
        navigationPageCount={pageCount}
        navigationPageIndex={pageIndex}
        onNavigationPageChange={setGridPage}
      />
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
            if (isDeckGrid && !deckItem) return null;
            if (!isDeckGrid && !staticItem) return null;
            const frameLabel = deckItem?.title ?? staticItem?.title;
            return (
              <VaultGridFrame
                key={deckItem?.key ?? `${activeGroup.key}-frame-${index}`}
                x={frameX}
                y={frameY}
                w={frameW}
                h={frameH}
                accent={accent}
                cfg={cfg}
                deckName={frameLabel}
                deckPrice={deckItem?.price}
                sampleCards={deckItem?.sampleCards}
                resolveDeckImageUrl={resolveDeckImageUrl}
                artMode={gridFrameArtMode}
                variantKey={frameLabel}
                onClick={deckItem ? () => onDeckInspect?.(deckItem) : undefined}
              />
            );
          })}
        </g>
        <rect x="0" y={gridH - scrollbarH} width={gridW} height={scrollbarH} rx={scrollbarH / 2} fill={cfg.colors.vaultScrollbarFill} stroke={accent} strokeWidth="1" strokeOpacity=".25" />
        <rect x={thumbX} y={gridH - scrollbarH + token.scrollbarThumbInset} width={thumbW} height={scrollbarH - token.scrollbarThumbInset * 2} rx={(scrollbarH - token.scrollbarThumbInset * 2) / 2} fill={accent} opacity=".55" />
      </svg>
    </g>
  );
}

function ShopDeckPreviewLayer({
  x,
  y,
  w,
  h,
  deck,
  resolveDeckImageUrl,
  onClose,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  deck: ShopVaultDeckPreviewItem;
  resolveDeckImageUrl?: ShopDeckImageResolver;
  onClose: () => void;
}) {
  const [selectedCell, setSelectedCell] = useState<DeckPreviewCell | null>(null);
  const viewerCells = useMemo(() => deckPreviewViewerCells(deck), [deck]);
  const body = mainBottomOverlayContentRect(x, y, w, h, false);
  const pieceCount = deck.model?.totalPieces ?? deck.sampleCards.length;
  const normalizedPrice = deck.price?.toLowerCase() ?? '';
  const freeDeck = normalizedPrice === 'free' || deck.badge?.toLowerCase() === 'free';
  const deckPrice = deck.price ?? 'Price N/A';
  const primaryDeckAction = freeDeck ? 'Claim Free' : 'Buy Digital';
  const previewStyle = {
    '--deck-preview-card-track-min': '2.7rem',
    '--deck-preview-card-cell-min-height': '3.5rem',
    '--deck-preview-compact-matrix-gap': '0.36rem',
    '--deck-preview-compact-row-gap': '0.34rem',
    '--deck-preview-axis-column-width': '2.35rem',
    '--deck-preview-axis-glyph-size': '1rem',
    '--deck-preview-axis-image-size': '1.25rem',
  } as CSSProperties;

  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label="DECK PREVIEW" count={pieceCount} rightActionLabel="Back To Vault" onRightAction={onClose} showNavigation={false} />
      <foreignObject x={body.x} y={body.y} width={body.w} height={body.h}>
        <div className="shop-deck-preview-host">
          <aside className="shop-deck-preview-host__commerce">
            <div className="shop-deck-preview-host__eyebrow">{deck.badge ?? 'Digital Deck'}</div>
            <h2 className="shop-deck-preview-host__title">{deck.title}</h2>
            <div className="shop-deck-preview-host__subtitle">{deck.subtitle ?? `${pieceCount} pieces`}</div>
            <div className="shop-deck-preview-host__price">{deckPrice}</div>
            <div className="shop-deck-preview-host__actions" aria-label={`${deck.title} purchase options`}>
              <button type="button" disabled>{primaryDeckAction}</button>
              <button type="button" disabled>Printable + Digital</button>
            </div>
            <ul className="shop-deck-preview-host__notes">
              <li>{freeDeck ? 'Included starter deck.' : 'Table-ready digital deck.'}</li>
              <li>Printable export included.</li>
              <li>Card artwork included when available.</li>
            </ul>
          </aside>
          {deck.model ? (
            <div className="shop-deck-preview-host__scroll" style={previewStyle}>
              <DeckPreviewView
                model={deck.model}
                compact
                onCellClick={setSelectedCell}
                renderPiece={(cell) => <ShopDeckPreviewPieceCell cell={cell} resolveDeckImageUrl={resolveDeckImageUrl} />}
                renderAxis={(axis) => <ShopDeckPreviewAxisCell axis={axis} resolveDeckImageUrl={resolveDeckImageUrl} />}
                renderBack={(imageHash) => <ShopDeckPreviewBackCell imageHash={imageHash} resolveDeckImageUrl={resolveDeckImageUrl} />}
              />
            </div>
          ) : (
            <div className="shop-deck-preview-host__empty">No deck data available.</div>
          )}
        </div>
      </foreignObject>
      {selectedCell ? (
        <ShopDeckPictureViewerOverlay
          deck={deck}
          cell={selectedCell}
          cells={viewerCells}
          resolveDeckImageUrl={resolveDeckImageUrl}
          onSelectCell={setSelectedCell}
          onClose={() => setSelectedCell(null)}
        />
      ) : null}
    </g>
  );
}

function deckPreviewViewerCells(deck: ShopVaultDeckPreviewItem): DeckPreviewCell[] {
  const seen = new Set<string>();
  const cells: DeckPreviewCell[] = [];
  const addCell = (cell: DeckPreviewCell | ShopDeckPreviewCard | null | undefined) => {
    if (!cell) return;
    const key = cell.id || `${cell.label}:${cell.imageHash ?? ''}:${cell.imagePath ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    cells.push(cell);
  };

  for (const section of deck.model?.sections ?? []) {
    for (const cell of section.cells ?? []) addCell(cell);
    for (const cell of section.items ?? []) addCell(cell);
  }
  for (const cell of deck.sampleCards) addCell(cell);

  return cells;
}

function wrapDeckPreviewIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

function ShopDeckPictureViewerOverlay({
  deck,
  cell,
  cells,
  resolveDeckImageUrl,
  onSelectCell,
  onClose,
}: {
  deck: ShopVaultDeckPreviewItem;
  cell: DeckPreviewCell;
  cells: DeckPreviewCell[];
  resolveDeckImageUrl?: ShopDeckImageResolver;
  onSelectCell: (cell: DeckPreviewCell) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const src = resolveShopDeckImageUrl(resolveDeckImageUrl, cell.imageHash, cell.imagePath);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const currentIndex = Math.max(0, cells.findIndex(item => item.id === cell.id));
  const canCycle = cells.length > 1;
  const selectByDelta = (delta: number) => {
    if (!canCycle) return;
    onSelectCell(cells[wrapDeckPreviewIndex(currentIndex + delta, cells.length)]);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectByDelta(-1);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectByDelta(1);
    }
  };

  useEffect(() => {
    dialogRef.current?.focus();
  }, [cell.id]);

  if (typeof document === 'undefined') return null;

  return createPortal(
      <div
        ref={dialogRef}
        className="shop-picture-viewer"
        role="dialog"
        aria-label={`${deck.title} ${cell.label} picture viewer`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="shop-picture-viewer__backdrop" aria-label="Close picture viewer" onClick={onClose} />
        <section className="shop-picture-viewer__panel" aria-label={`${cell.label} image`} onClick={event => event.stopPropagation()}>
          <PictureViewerFrame
            className="shop-picture-viewer__frame"
            ariaLabel={`${cell.label} frame`}
            previousLabel="Previous card image"
            nextLabel="Next card image"
            onPrevious={canCycle ? () => selectByDelta(-1) : undefined}
            onNext={canCycle ? () => selectByDelta(1) : undefined}
          />
          <button type="button" className="shop-picture-viewer__close" onClick={onClose} aria-label="Close card detail">
            x
          </button>
          <div className="shop-picture-viewer__media">
            {src && failedSrc !== src ? (
              <img
                src={src}
                alt={cell.label}
                className="shop-picture-viewer__image"
                onError={() => setFailedSrc(src)}
              />
            ) : (
              <div className="shop-picture-viewer__missing" title={deckPieceDisplayLabel(cell.label)}>
                <span>{deckPieceDisplayLabel(cell.label)}</span>
                <strong>Missing image</strong>
              </div>
            )}
          </div>
          <div className="shop-picture-viewer__caption">
            <span>{deckPieceDisplayLabel(cell.label)}</span>
            <span>{cells.length > 0 ? `${currentIndex + 1}/${cells.length}` : '1/1'}</span>
          </div>
        </section>
      </div>,
      document.body
  );
}

function deckPieceDisplayLabel(label: string): string {
  const normalizedLabel = label.replace(/_/g, ' ');
  const standardCardMatch = /^(14|13|12|11|1|[2-9]|10) of (spades|hearts|diamonds|clubs)$/i.exec(normalizedLabel);
  if (!standardCardMatch) return normalizedLabel;
  const [, rank, suit] = standardCardMatch;
  const rankLabel: Record<string, string> = {
    '1': 'Ace',
    '11': 'Jack',
    '12': 'Queen',
    '13': 'King',
    '14': 'Ace',
  };
  return `${rankLabel[rank] ?? rank} of ${suit}`;
}

function ShopDeckPreviewPieceCell({
  cell,
  resolveDeckImageUrl,
}: {
  cell: DeckPreviewCell;
  resolveDeckImageUrl?: ShopDeckImageResolver;
}) {
  const src = resolveShopDeckImageUrl(resolveDeckImageUrl, cell.imageHash, cell.imagePath);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={cell.label}
        className="shop-deck-preview-host__piece-image"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span className="shop-deck-preview-host__piece-label" title={deckPieceDisplayLabel(cell.label)}>
      <span>{deckPieceDisplayLabel(cell.label)}</span>
      <span className="shop-deck-preview-host__missing-label">Missing image</span>
    </span>
  );
}

function ShopDeckPreviewAxisCell({
  axis,
  resolveDeckImageUrl,
}: {
  axis: DeckPreviewAxis;
  resolveDeckImageUrl?: ShopDeckImageResolver;
}) {
  const src = resolveShopDeckImageUrl(resolveDeckImageUrl, axis.imageHash, axis.imagePath);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={axis.label}
        title={axis.label}
        className="shop-deck-preview-host__axis-image"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return undefined;
}

function ShopDeckPreviewBackCell({
  imageHash,
  resolveDeckImageUrl,
}: {
  imageHash: string;
  resolveDeckImageUrl?: ShopDeckImageResolver;
}) {
  const src = resolveShopDeckImageUrl(resolveDeckImageUrl, imageHash, undefined);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt="Back"
        className="shop-deck-preview-host__back-image"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return <span className="shop-deck-preview-host__piece-label">Back</span>;
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
  const body = mainBottomOverlayContentRect(x, y, w, h, false);
  const bodyY = body.y;
  if (mode === 'eliteBenefits') {
    const detail = content.infoDetails.eliteBenefits;
    const tableX = body.x + token.comparisonTablePadX;
    const tableY = bodyY + Math.max(12, token.comparisonTableTop - 8);
    const tableW = body.w - token.comparisonTablePadX * 2;
    const labelW = token.comparisonLabelW;
    const tierCount = detail.tiers.length;
    const colW = (tableW - labelW) / tierCount;
    const headH = token.comparisonHeadH;
    const rowH = Math.min(token.comparisonMaxRowH, (body.h - headH - token.comparisonBottomReserve) / detail.rows.length);
    return (
      <g>
        <MainBottom x={x} y={y} w={w} h={h} label={detail.title} count={detail.rows.length} rightActionLabel={detail.cta} onRightAction={onClose} showNavigation={false} />
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
        <Txt x={tableX} y={body.y + body.h - Math.max(14, token.comparisonNoteBottom - 10)} size={token.comparisonNoteSize} fill={cfg.colors.mutedText} weight="550" cfg={cfg}>Comparison is mock data for layout only; real tier benefits can wire into this surface later.</Txt>
      </g>
    );
  }
  const detail = content.infoDetails.arenaCredits;
  const imageW = Math.min(token.detailImageMaxW, body.w * token.detailImageRatio);
  const imageX = body.x + token.detailImageX;
  const imageY = bodyY + token.detailImageTop;
  const imageH = body.h - token.detailImageTop - token.detailImageBottomPad;
  const textX = imageX + imageW + token.detailTextGap;
  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label={detail.title} count={detail.bullets.length} rightActionLabel={detail.cta} onRightAction={onClose} showNavigation={false} />
      <ProductImage x={imageX} y={imageY} w={imageW} h={imageH} imageUrl={(content.creditPacks[2] ?? content.creditPacks[0])?.imageUrl ?? ''} cfg={cfg} />
      <rect x={imageX} y={imageY} width={imageW} height={imageH} fill="none" stroke={accent} strokeOpacity=".32" />
      <Txt x={textX} y={bodyY + token.detailTitleTop} size={token.detailTitleSize} weight="950" fill={accent} cfg={cfg}>{detail.title}</Txt>
      <WrappedText x={textX} y={bodyY + token.detailSubtitleTop} width={body.x + body.w - textX - 28} lines={detail.subtitle} size={token.detailSubtitleSize} lineHeight={token.detailSubtitleLineHeight} fill={cfg.colors.tileSubtitleText} weight={600} maxLines={token.detailSubtitleMaxLines} cfg={cfg} />
      {detail.bullets.map((row, index) => (
        <g key={row}>
          <circle cx={textX + 5} cy={bodyY + token.detailBulletStartY + index * token.detailBulletGap} r={token.detailBulletR} fill={accent} />
          <WrappedText x={textX + token.detailBulletTextX} y={bodyY + token.detailBulletStartY + index * token.detailBulletGap} width={body.x + body.w - textX - 46} lines={row} size={token.detailBulletSize} lineHeight={token.detailBulletLineHeight} fill={cfg.colors.frameSubtitleText} weight={550} maxLines={2} cfg={cfg} />
        </g>
      ))}
    </g>
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
  accountSummary,
  sectionBottomY,
  cfg,
  onClearSpecial,
  onClearBottomPreview,
  onClearRightPanelDetail,
  onInfoHandled,
  onBuy,
  onElite,
  vaultDecks,
  resolveDeckImageUrl,
  onVaultDeckInspect,
  dailyRewardStatus,
  onDailyRewardSpin,
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
  accountSummary?: ShopAccountSummary | null;
  sectionBottomY?: number;
  cfg: ShopPageSvgControls;
  onClearSpecial: () => void;
  onClearBottomPreview: () => void;
  onClearRightPanelDetail: () => void;
  onInfoHandled: () => void;
  onBuy: (product: ShopProduct) => void;
  onElite: () => void;
  vaultDecks?: ShopVaultDeckPreviewItem[];
  resolveDeckImageUrl?: ShopDeckImageResolver;
  onVaultDeckInspect?: (deck: ShopVaultDeckPreviewItem) => void;
  dailyRewardStatus?: DailySpinRewardStatus | null;
  onDailyRewardSpin?: () => void | Promise<void>;
}) {
  const [selectedTileDetail, setSelectedTileDetail] = useState<TileItem | null>(null);
  const [bottomTileDetail, setBottomTileDetail] = useState<TileItem | null>(null);
  const [activeInfoDetail, setActiveInfoDetail] = useState<'arenaCredits' | 'eliteBenefits' | null>(null);
  const [activeVaultGroupKey, setActiveVaultGroupKey] = useState(content.vaultShowcaseGroups[0]?.key ?? '');
  const [vaultTopSelectionKey, setVaultTopSelectionKey] = useState<string | null>(null);
  const [expandedVaultGroupKey, setExpandedVaultGroupKey] = useState<string | null>(null);
  const [selectedVaultDeckKey, setSelectedVaultDeckKey] = useState<string | null>(null);
  const [topRoutedBottomTab, setTopRoutedBottomTab] = useState<ShopTab | null>(null);
  const [bottomPageByTab, setBottomPageByTab] = useState<Partial<Record<ShopTab, number>>>({});
  const displayedInfoDetail = infoRequest ?? activeInfoDetail;
  const resolvedSectionBottomY = sectionBottomY ?? cfg.mainBody.sectionBottomY;
  const topH = cfg.mainBody.topBoxH;
  const bottomH = resolvedSectionBottomY - y - topH - cfg.mainBody.boxGap;
  const bottomY = y + topH + cfg.mainBody.boxGap;
  const displayedBottomTab = bottomPreviewTarget && bottomPreviewTarget !== 'Earn Free AC' ? bottomPreviewTarget : topRoutedBottomTab ?? nextSidePanelTab(activeTab, content);
  const bottomPageSizeForTab = (tab: ShopTab) => {
    if (tab === 'Treasury') return Math.max(1, Math.min(2, Math.round(cfg.mainBody.treasuryMaxVisible)));
    if (tab === 'Elite') return Math.max(1, Math.min(2, Math.round(cfg.mainBody.passMaxVisible)));
    return Math.max(1, Math.min(2, Math.round(cfg.mainBody.productMaxVisible)));
  };

  const openInfoDetail = (mode: 'arenaCredits' | 'eliteBenefits') => {
    setSelectedTileDetail(null);
    setBottomTileDetail(null);
    setExpandedVaultGroupKey(null);
    setSelectedVaultDeckKey(null);
    setActiveInfoDetail(mode);
    onInfoHandled();
  };

  const openTileDetail = (item: TileItem) => {
    setBottomTileDetail(null);
    setExpandedVaultGroupKey(null);
    setSelectedVaultDeckKey(null);
    setActiveInfoDetail(null);
    onInfoHandled();
    setSelectedTileDetail(item);
  };

  const openBottomTileDetail = (item: TileItem, tab: ShopTab, itemIndex: number) => {
    setTopRoutedBottomTab(tab);
    setBottomPageByTab(state => ({ ...state, [tab]: Math.max(0, Math.floor(itemIndex / bottomPageSizeForTab(tab))) }));
    setSelectedTileDetail(null);
    setActiveInfoDetail(null);
    setExpandedVaultGroupKey(null);
    setSelectedVaultDeckKey(null);
    setBottomTileDetail(item);
    onInfoHandled();
  };

  const closeBottomDetail = () => {
    setSelectedTileDetail(null);
    setBottomTileDetail(null);
    setExpandedVaultGroupKey(null);
    setSelectedVaultDeckKey(null);
    setActiveInfoDetail(null);
    onInfoHandled();
  };

  const openVaultGroupDetail = (group: ShopVaultShowcaseGroup) => {
    setActiveVaultGroupKey(group.key);
    setTopRoutedBottomTab('Vault');
    setSelectedTileDetail(null);
    setBottomTileDetail(null);
    setActiveInfoDetail(null);
    setSelectedVaultDeckKey(null);
    setExpandedVaultGroupKey(group.key);
    onInfoHandled();
  };

  const openVaultDeckDetail = (deck: ShopVaultDeckPreviewItem) => {
    setActiveVaultGroupKey('decks');
    setTopRoutedBottomTab('Vault');
    setSelectedTileDetail(null);
    setBottomTileDetail(null);
    setActiveInfoDetail(null);
    setSelectedVaultDeckKey(deck.key);
    onVaultDeckInspect?.(deck);
    onInfoHandled();
  };

  const inspectBottomItem = (item: TileItem) => {
    if (displayedBottomTab === 'Vault') {
      const group = content.vaultShowcaseGroups.find(entry => entry.title === item.title);
      if (group) {
        openVaultGroupDetail(group);
        return;
      }
    }
    openTileDetail(item);
  };

  const actionForTab = (tab: ShopTab): { label: string; onAction: () => void } | undefined => {
    if (tab === 'Treasury') {
      return { label: 'What is Arena Credits?', onAction: () => openInfoDetail('arenaCredits') };
    }
    if (tab === 'Elite') {
      return { label: 'Compare All Benefits', onAction: () => openInfoDetail('eliteBenefits') };
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
          : topTileItems.map((item, index) => tileToMainCarouselCard(item, index, loadingId, content, activeTab));
    const bottomTileItems = displayedBottomTab === 'Treasury' || displayedBottomTab === 'Elite'
      ? tilesForTab(products, displayedBottomTab, content)
      : [];
    const bottomVaultItems = displayedBottomTab === 'Vault' ? content.vaultShowcaseGroups.map(vaultGroupToTile) : [];
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
    const showVaultShowcase = activeTab === 'Vault' && displayedBottomTab === 'Vault' && Boolean(vaultTopSelectionKey) && !bottomPreviewTarget;
    const selectedVaultDeck = vaultDecks?.find(deck => deck.key === selectedVaultDeckKey) ?? null;
    const routeTopCardToBottom = (tab: ShopTab, itemIndex: number) => {
      setTopRoutedBottomTab(tab);
      setBottomPageByTab(state => ({ ...state, [tab]: Math.max(0, Math.floor(itemIndex / bottomPageSizeForTab(tab))) }));
      setSelectedTileDetail(null);
      setBottomTileDetail(null);
      setExpandedVaultGroupKey(null);
      setSelectedVaultDeckKey(null);
      setActiveInfoDetail(null);
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
        const item = topPlayAccessItems[tileIndex];
        if (item) openBottomTileDetail(item, 'Play Access', tileIndex);
        return;
      }
      if (activeTab === 'Events') {
        const tileIndex = topEventItems.findIndex((item, index) => staticTopCardKey('events', item, index) === card.key);
        if (tileIndex < 0) return;
        const item = topEventItems[tileIndex];
        if (item) openBottomTileDetail(item, 'Events', tileIndex);
        return;
      }
      const tileIndex = topTileItems.findIndex((item, index) => tileCardKey(item, index) === card.key);
      if (tileIndex < 0) return;
      const item = topTileItems[tileIndex];
      if (item) openBottomTileDetail(item, activeTab, tileIndex);
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
          accountSummary={accountSummary}
          onClose={onClearRightPanelDetail}
          onElite={onElite}
        />
      );
    }

    if (selectedVaultDeck) {
      return (
        <ShopDeckPreviewLayer
          key={selectedVaultDeck.key}
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          deck={selectedVaultDeck}
          resolveDeckImageUrl={resolveDeckImageUrl}
          onClose={() => setSelectedVaultDeckKey(null)}
        />
      );
    }

    if (expandedVaultGroupKey) {
      return (
        <VaultShowcaseLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          content={content}
          cfg={cfg}
          activeGroupKey={expandedVaultGroupKey}
          onGroupChange={(key) => {
            setActiveVaultGroupKey(key);
            setExpandedVaultGroupKey(key);
          }}
          onGroupInspect={(group) => {
            setActiveVaultGroupKey(group.key);
            setExpandedVaultGroupKey(group.key);
          }}
          deckPreviews={vaultDecks}
          resolveDeckImageUrl={resolveDeckImageUrl}
          onDeckInspect={openVaultDeckDetail}
          rightActionLabel="Back To Shop"
          onRightAction={closeBottomDetail}
        />
      );
    }

    if (displayedInfoDetail) {
      return (
        <InfoDetailLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          mode={displayedInfoDetail}
          content={content}
          cfg={cfg}
          onClose={closeBottomDetail}
        />
      );
    }

    if (selectedTileDetail) {
      return (
        <BottomDetailCardsLayer
          x={bottomFrameBounds.x}
          y={y}
          w={bottomFrameBounds.w}
          h={resolvedSectionBottomY - y}
          label={displayedBottomTab}
          items={bottomDetailItems.length > 0 ? bottomDetailItems : [selectedTileDetail]}
          expandedItem={selectedTileDetail}
          content={content}
          cfg={cfg}
          loadingId={loadingId}
          pageIndex={bottomPageIndex}
          rightActionLabel="Back To Shop"
          onRightAction={closeBottomDetail}
          onInspect={inspectBottomItem}
          onBuy={onBuy}
          onPageChange={setBottomPageIndex}
        />
      );
    }

    return (
      <g>
        <MainTop x={topFrameBounds.x} y={y} w={topFrameBounds.w} h={topH} label={activeTab} cards={topCards} onCardAction={handleTopCardAction} rightActionLabel={topAction?.label} onRightAction={topAction?.onAction} />
        {bottomTileDetail ? (
          <BottomDetailCardsLayer
            x={bottomFrameBounds.x}
            y={bottomY}
            w={bottomFrameBounds.w}
            h={bottomH}
            label={displayedBottomTab}
            items={bottomDetailItems.length > 0 ? bottomDetailItems : [bottomTileDetail]}
            expandedItem={bottomTileDetail}
            content={content}
            cfg={cfg}
            loadingId={loadingId}
            pageIndex={bottomPageIndex}
            rightActionLabel={`Back To ${displayedBottomTab}`}
            onRightAction={() => setBottomTileDetail(null)}
            onInspect={inspectBottomItem}
            onBuy={onBuy}
            onPageChange={setBottomPageIndex}
          />
        ) : showVaultShowcase ? (
          <VaultShowcaseLayer
            x={bottomFrameBounds.x}
            y={bottomY}
            w={bottomFrameBounds.w}
            h={bottomH}
            content={content}
            cfg={cfg}
            activeGroupKey={activeVaultGroupKey}
            onGroupChange={setActiveVaultGroupKey}
            onGroupInspect={(group) => {
              setActiveVaultGroupKey(group.key);
              setExpandedVaultGroupKey(group.key);
            }}
            deckPreviews={vaultDecks}
            resolveDeckImageUrl={resolveDeckImageUrl}
            onDeckInspect={openVaultDeckDetail}
          />
        ) : bottomDetailItems.length > 0 ? (
          <BottomDetailCardsLayer x={bottomFrameBounds.x} y={bottomY} w={bottomFrameBounds.w} h={bottomH} label={displayedBottomTab} items={bottomDetailItems} content={content} cfg={cfg} loadingId={loadingId} pageIndex={bottomPageIndex} rightActionLabel={bottomAction?.label} onRightAction={bottomAction?.onAction} onInspect={inspectBottomItem} onBuy={onBuy} onPageChange={setBottomPageIndex} />
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
  const body = mainBottomOverlayContentRect(x, y, w, h, false);
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
        showNavigation={false}
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
  purchasePrompt,
  onPurchaseProviderSelect,
  onPurchaseCancel,
  controls,
  content,
  vaultDecks,
  resolveDeckImageUrl,
  onVaultDeckInspect,
  accountSummary,
  dailyRewardStatus,
  onDailyRewardSpin,
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
  const idealCanvasWidth = surfaceSize.width > 0 && surfaceSize.height > 0
    ? Math.round(cfg.canvas.height * (surfaceSize.width / surfaceSize.height))
    : canvasWidth;
  const preserveAspectRatio = Math.abs(canvasWidth - idealCanvasWidth) > 2
    ? 'none'
    : cfg.svgDefaults.preserveAspectRatio;

  const previewViewportW = canvasWidth - cfg.layout.outerPad * 2;
  const previewWidths = useMemo(() => {
    const maxPanelW = Math.max(260, previewViewportW);
    return resolvedPreviewRows.map((row) => {
      const preferredCount = Math.min(PREFERRED_BOTTOM_PREVIEW_ITEMS, Math.max(1, row.previewItems.length || 1));
      return Math.min(maxPanelW, previewPanelWidthForCardCount(preferredCount, cfg));
    });
  }, [cfg, previewViewportW, resolvedPreviewRows]);

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
    setBottomPreviewTarget(row.tab);
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
  const openActivePassDetail = () => {
    setSpecialView(null);
    setInfoRequest(null);
    setBottomPreviewTarget(null);
    setRightPreviewTarget('pass');
    setRightDetailTarget('pass');
  };
  const previewLocalIndex = wrapPreviewIndex(previewStart, previewRowCount);
  const previewCycleIndex = previewRowCount > 0 ? Math.floor(previewStart / previewRowCount) : 0;
  const previewTrackX = previewCycleIndex * previewTrackLayout.cycleWidth + (previewTrackLayout.offsets[previewLocalIndex] ?? 0);
  const previewPanelStep = (previewWidths[previewLocalIndex] ?? previewPanelWidthForCardCount(PREFERRED_BOTTOM_PREVIEW_ITEMS, cfg)) + cfg.bottomPreview.gap;
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
        preserveAspectRatio={preserveAspectRatio}
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
        <TopStatsLayer x={metrics.headerStatsX} y={cfg.layout.topY} w={metrics.headerSideW} h={cfg.layout.headerH} content={shopContent} cfg={cfg} onActivePass={openActivePassDetail} />
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
          accountSummary={accountSummary}
          sectionBottomY={mainSectionBottomY}
          cfg={cfg}
          onClearSpecial={() => setSpecialView(null)}
          onClearBottomPreview={() => setBottomPreviewTarget(null)}
          onClearRightPanelDetail={() => setRightDetailTarget(null)}
          onInfoHandled={() => setInfoRequest(null)}
          onBuy={onBuy}
          onElite={() => selectTab('Elite')}
          vaultDecks={vaultDecks}
          resolveDeckImageUrl={resolveDeckImageUrl}
          onVaultDeckInspect={onVaultDeckInspect}
          dailyRewardStatus={dailyRewardStatus}
          onDailyRewardSpin={onDailyRewardSpin}
        />
        <RightSidePanel x={metrics.rightX} y={cfg.layout.mainY} w={metrics.rightW} h={rightPanelH} content={shopContent} cfg={cfg} acBalance={acBalance} accountSummary={accountSummary} active={rightPreviewTarget} onActiveChange={selectRightPreview} onPreviewOpen={openRightPreviewDetail} />
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
        {purchasePrompt && onPurchaseProviderSelect && onPurchaseCancel ? (
          <PurchaseProviderDialog
            x={metrics.mainX + metrics.mainW / 2 - Math.min(620, metrics.mainW - 120) / 2}
            y={cfg.layout.mainY + 118}
            w={Math.min(620, metrics.mainW - 120)}
            product={purchasePrompt.product}
            message={purchasePrompt.message}
            busyProvider={purchasePrompt.busyProvider}
            cfg={cfg}
            onProviderSelect={onPurchaseProviderSelect}
            onCancel={onPurchaseCancel}
          />
        ) : null}
      </svg>
    </main>
  );
}
