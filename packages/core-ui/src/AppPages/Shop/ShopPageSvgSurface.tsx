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
import {
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from './ShopPageSvgSurfaceControls';
import { Defs as LobbySvgDefs } from '../Lobby/LobbyPageSvgPrimitives';
import { MiniRewardSpinner } from '../Lobby/LobbyPageSvgPrefabs';
import { SpinnerPopup } from '../Lobby/LobbyPageSvgPopups';
import { avatarImageUrls } from '@ocentra/app-assets/avatars';
import {
  DEFAULT_LOBBY_PAGE_SVG_CONTROLS,
  type LobbyPageSvgControls,
} from '../Lobby/LobbyPageSvgSurfaceControls';
import type { ShopProduct, ShopTab, ShopVaultDeckPreviewItem } from './ShopPageSvgTypes';
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

const SHOP_REWARD_SPINNER_CONTROLS: LobbyPageSvgControls = {
  ...DEFAULT_LOBBY_PAGE_SVG_CONTROLS,
  spinner: {
    ...DEFAULT_LOBBY_PAGE_SVG_CONTROLS.spinner,
    radius: 188,
    innerRadius: 44,
    startTextRadius: 84,
    startTextSize: 13,
    resultY: -58,
    numberBoxW: 118,
    numberBoxH: 46,
    centerGoldR: 70,
    arrowHeight: 126,
  },
};

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

function tileDisabled(item: TileItem, onClick?: () => void): boolean {
  if (item.product) return !isShopProductPurchasable(item.product);
  if (!onClick) return true;
  return Boolean(item.price?.toLowerCase().includes('coming soon'));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function MissingAssetPlaceholder({
  x,
  y,
  w,
  h,
  label = 'ASSET NEEDED',
  compact = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  compact?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="0" fill="rgba(4,14,28,.54)" stroke="#2d5d7b" strokeWidth="1" strokeDasharray="5 5" />
      <line x1={x + 8} y1={y + 8} x2={x + w - 8} y2={y + h - 8} stroke="#2d5d7b" strokeOpacity=".72" />
      <line x1={x + w - 8} y1={y + 8} x2={x + 8} y2={y + h - 8} stroke="#2d5d7b" strokeOpacity=".72" />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize={compact ? 7.2 : 8.6} fontWeight="900" fill="#8fb9d9">{label}</text>
    </g>
  );
}

function TransparentAssetImage({
  x,
  y,
  w,
  h,
  imageUrl,
  glow = false,
  cyanGlow = false,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  glow?: boolean;
  cyanGlow?: boolean;
  opacity?: number;
}) {
  if (!imageUrl) {
    return <MissingAssetPlaceholder x={x} y={y} w={w} h={h} compact={h < 72 || w < 100} />;
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
  featured,
  active,
  onSpin,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  quest: ShopQuest;
  featured: boolean;
  active: boolean;
  onSpin?: () => void;
}) {
  const cx = w / 2;
  const cy = h / 2;
  const artW = featured ? w * 0.94 : w * 0.86;
  const artH = featured ? h * 0.92 : h * 0.82;
  const showSpinner = quest.key === 'daily_spin' && featured;
  return (
    <svg x={x} y={y} width={w} height={h} overflow="hidden">
      <rect x="0" y="0" width={w} height={h} fill="url(#shopRewardHaloGradient)" opacity={active ? 0.72 : 0.58} filter={active ? 'url(#shopSoftGlow)' : undefined} />
      {showSpinner ? (
        <MiniRewardSpinner x={w * 0.03} y={h * 0.02} w={w * 0.94} h={h * 0.94} onClick={onSpin ?? (() => undefined)} />
      ) : (
        <TransparentAssetImage x={cx - artW / 2} y={cy - artH / 2} w={artW} h={artH} imageUrl={quest.imageUrl} glow={active} />
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
      <rect x={x} y={y} width={w} height={h} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.headerFillAlt} stroke="#1d4f72" />
      <MiniIcon type={icon} x={x + headerToken.badgeIconX} y={y + h / 2 - headerToken.badgeIconSize / 2} size={headerToken.badgeIconSize} tone={tone} cfg={cfg} />
      <Txt x={x + headerToken.badgeTextX} y={y + h / 2 + headerToken.badgeTitleYShift} size="8.6" weight="900" cfg={cfg}>{title}</Txt>
      <Txt x={x + headerToken.badgeTextX} y={y + h / 2 + headerToken.badgeSubYShift} size="7" fill="#8fb9d9" cfg={cfg}>{sub}</Txt>
    </g>
  );
}

function MarketplaceCartIcon({ x, y, size, cfg }: { x: number; y: number; size: number; cfg: ShopPageSvgControls }) {
  const token = cfg.iconTokens.cart;
  const scale = size / token.baseSize;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="27" cy="27" r={token.outerR} fill="url(#shopCartOrbGradient)" stroke={cfg.colors.edgeStroke} strokeWidth={token.outerStrokeWidth} filter="url(#shopSoftGlow)" />
      <circle cx="27" cy="27" r={token.innerR} fill="rgba(2,10,24,.34)" stroke="#9ff4ff" strokeOpacity=".36" />
      <image href={SHOP_MARKETPLACE_CART_IMAGE_URL} x="8" y="8" width="38" height="38" preserveAspectRatio="xMidYMid meet" mask="url(#shopCartImageMask)" />
    </g>
  );
}

function ArenaCreditCoinIcon({ x, y, size, cfg }: { x: number; y: number; size: number; cfg: ShopPageSvgControls }) {
  const token = cfg.iconTokens.arenaCoin;
  const scale = size / token.baseSize;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="28" cy="28" r={token.outerR} fill="url(#shopAcCoinGradient)" stroke="#fff0a6" strokeWidth={token.outerStrokeWidth} filter="url(#shopSoftGlow)" />
      <circle cx="28" cy="28" r={token.innerR} fill="none" stroke="#7a3b00" strokeOpacity=".58" strokeWidth={token.innerStrokeWidth} />
      <circle cx="28" cy="28" r={token.centerR} fill="rgba(255,255,255,.08)" stroke={cfg.colors.gold} strokeOpacity=".62" />
      <Txt x={token.textX} y={token.textY} anchor="middle" size={token.textSize} weight={token.textWeight} fill="#3b2100" cfg={cfg}>AC</Txt>
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
      <Panel x={x} y={y} w={w} h={h} r={cfg.header.panelRadius} cfg={cfg}>
        <MarketplaceCartIcon x={x + token.pad} y={y + h / 2 - cfg.header.cartSize / 2} size={cfg.header.cartSize} cfg={cfg} />
        <line x1={x + token.pad + cfg.header.cartZoneW} y1={y + token.dividerTopPad} x2={x + token.pad + cfg.header.cartZoneW} y2={y + h - token.dividerBottomPad} stroke={cfg.colors.line} />
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
        <line x1={bodyX} y1={y + token.separatorY} x2={x + w - token.pad} y2={y + token.separatorY} stroke={cfg.colors.line} strokeOpacity={token.bodySeparatorOpacity} />
        <Txt x={bodyX + (w - (bodyX - x) - token.pad) / 2} y={y + token.subtitleY} fill={cfg.colors.mutedText} size={cfg.header.subtitleSize} weight={token.subtitleWeight} anchor="middle" cfg={cfg}>{copy.subtitle}</Txt>
      </Panel>
      <g className="shop-page-svg-clickable" onClick={onArenaCreditsInfo} role="button" tabIndex={0}>
        <Panel x={balanceX} y={y} w={balanceW} h={h} r={token.balanceRadius} cfg={cfg}>
          <ArenaCreditCoinIcon x={balanceX + token.balanceCoinX} y={y + token.balanceCoinY} size={token.balanceCoinSize} cfg={cfg} />
          <line x1={balanceX + token.balanceDividerX} y1={y + token.balanceDividerTop} x2={balanceX + token.balanceDividerX} y2={y + h - token.balanceDividerBottom} stroke={cfg.colors.line} />
          <Txt x={balanceX + token.balanceTextX} y={y + token.balanceTitleY} fill="#bcecff" size={token.balanceTitleSize} weight={token.balanceTitleWeight} cfg={cfg}>{copy.balanceTitle}</Txt>
          <Txt x={balanceX + token.balanceTextX} y={y + token.balanceValueY} fill={cfg.colors.gold} size={token.balanceValueSize} weight={token.balanceValueWeight} cfg={cfg}>{acBalance.toLocaleString()}</Txt>
          <Txt x={balanceX + token.balanceUnitX} y={y + token.balanceUnitY} size={token.balanceUnitSize} weight={token.balanceUnitWeight} fill="#fff2bf" cfg={cfg}>{copy.balanceUnit}</Txt>
          <Txt x={balanceX + token.balanceTextX} y={y + token.balanceSubY} fill="#8fb9d9" size={token.balanceSubSize} cfg={cfg}>{copy.balanceSub}</Txt>
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
    <Panel x={x} y={y} w={w} h={h} r={token.panelRadius} stroke="#1d6b99" cfg={cfg}>
      <g onClick={onElite} role="button" tabIndex={0} className="shop-page-svg-clickable">
        <rect x={x + token.padX} y={y + token.passY} width={passW} height={token.passH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.headerFillAlt} stroke="#465979" />
        <MiniIcon type="crown" x={x + token.padX + 14} y={y + token.passY + 13} size={31} tone="gold" cfg={cfg} />
        <Txt x={x + token.padX + 60} y={y + token.passY + 18} fill="#bcecff" size="11" weight="850" cfg={cfg}>Active Pass</Txt>
        <Txt x={x + token.padX + 60} y={y + token.passY + 39} size="15" weight="950" cfg={cfg}>Champion</Txt>
      </g>
      {SHOP_HEADER_STATS.map((stat, index) => (
        <g key={stat.label}>
          <rect x={statStart + index * (statW + token.statGap)} y={y + token.statY} width={statW} height={token.statH} rx={cfg.svgDefaults.roundedNone} fill="rgba(255,255,255,.025)" stroke="#304f72" />
          <Txt x={statStart + index * (statW + token.statGap) + statW / 2} y={y + token.statY + 18} anchor="middle" size="8.4" fill="#8fb9d9" weight="750" cfg={cfg}>{stat.label}</Txt>
          <Txt x={statStart + index * (statW + token.statGap) + statW / 2} y={y + token.statY + 40} anchor="middle" size="15" weight="950" cfg={cfg}>{stat.value}</Txt>
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
  onRightTextClick,
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
  onRightTextClick?: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  return (
    <Panel x={x} y={y} w={w} h={h} r={token.radius} stroke={accent} cfg={cfg}>
      <HeaderBar x={x + token.inset} y={y + token.inset} w={w - token.inset * 2} h={cfg.mainBody.headerH} stroke={accent} cfg={cfg}>
        <Txt x={x + token.titleX} y={y + token.titleY} size={token.titleSize} weight={token.titleWeight} cfg={cfg}>{title}</Txt>
        <WrappedText x={x + token.subtitleX} y={y + token.subtitleY} width={w - token.subtitleRightReserve} lines={subtitle} size={token.subtitleSize} lineHeight={token.subtitleLineHeight} fill="#c6e5f8" maxLines={token.subtitleMaxLines} cfg={cfg} />
        {rightText ? (
          <g onClick={onRightTextClick} role="button" tabIndex={0} className="shop-page-svg-clickable">
            <rect x={x + w - token.rightTextPad - token.rightUnderlineWidth - 14} y={y + 4} width={token.rightUnderlineWidth + 34} height={cfg.mainBody.headerH - 8} fill="transparent" />
            <Txt x={x + w - token.rightTextPad} y={y + token.rightTextY} anchor="end" fill="#8fe8ff" size={token.rightTextSize} weight={token.rightTextWeight} cfg={cfg}>{rightText}</Txt>
            <line x1={x + w - token.rightTextPad - token.rightUnderlineWidth} y1={y + token.rightUnderlineY} x2={x + w - token.rightTextPad} y2={y + token.rightUnderlineY} stroke="#8fe8ff" strokeOpacity={token.rightUnderlineOpacity} />
          </g>
        ) : null}
      </HeaderBar>
      {children}
    </Panel>
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
  const creditPack = isCreditPackTile(item);
  const headerH = creditPack ? 30 : 34;
  const footerH = item.price ? (creditPack ? 30 : 34) : 30;
  const imageY = y + headerH;
  const footerY = y + h - footerH;
  const disabled = tileDisabled(item, onClick);
  const infoOnly = !item.price && !item.product;
  const titleXOffset = creditPack ? 20 : infoOnly ? 34 : 40;
  const titleRightReserve = creditPack ? 104 : infoOnly ? item.badge ? 90 : 52 : 132;
  const titleSize = creditPack ? 13.6 : infoOnly ? 9.2 : 12.4;
  const badgeW = infoOnly ? 42 : 58;
  const badgeRight = infoOnly ? 52 : 72;
  const badgeTextRight = infoOnly ? 31 : 43;
  return (
    <g onClick={onInspect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="shop-page-svg-clickable">
      <Panel x={x} y={y} w={w} h={h} r={9} fill={hovered || selected ? `${color}18` : cfg.colors.panelFill} stroke={selected || hovered ? color : '#1e6089'} cfg={cfg}>
        {(hovered || selected) ? <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="0" fill="none" stroke={color} strokeWidth="1.8" opacity=".85" filter="url(#shopSoftGlow)" /> : null}
        <HeaderBar x={x + 1} y={y + 1} w={w - 2} h={headerH} fill={cfg.colors.headerFillAlt} stroke={color} cfg={cfg}>
          {creditPack ? null : <MiniIcon type={item.icon} x={x + 13} y={y + 8} size={18} tone={item.tone} cfg={cfg} />}
          <WrappedText x={x + titleXOffset} y={y + (creditPack ? 16 : 18)} width={w - titleRightReserve} lines={item.title} size={titleSize} lineHeight={11} fill={color} weight={950} maxLines={1} cfg={cfg} />
          {item.badge ? (
            <>
              <rect x={x + w - badgeRight} y={y + 8} width={badgeW} height="18" rx="0" fill={color} opacity=".22" stroke={color} />
              <Txt x={x + w - badgeTextRight} y={y + 17} anchor="middle" size="7.3" weight="900" cfg={cfg}>{item.badge}</Txt>
            </>
          ) : null}
        </HeaderBar>
        {creditPack ? (
          <TransparentAssetImage x={x + 2} y={imageY - 2} w={w - 4} h={Math.max(56, footerY - imageY + 6)} imageUrl={item.imageUrl} glow={hovered || selected} />
        ) : (
          <>
            <ProductImage x={x + 1} y={imageY} w={w - 2} h={footerY - imageY} imageUrl={item.imageUrl} cfg={cfg} />
            <rect x={x + 1} y={footerY - 48} width={w - 2} height="48" fill="rgba(1,8,18,.68)" />
            <WrappedText x={x + 12} y={footerY - 30} width={w - 24} lines={item.subtitle} size={9} lineHeight={10} fill="#dff5ff" weight={650} maxLines={2} cfg={cfg} />
          </>
        )}
        <rect x={x + 1} y={footerY} width={w - 2} height={footerH - 1} fill="rgba(4,15,28,.82)" />
        {infoOnly ? (
          <Txt x={x + w / 2} y={footerY + footerH / 2 + 1} anchor="middle" size="8.8" weight="900" fill={color} cfg={cfg}>System Feature</Txt>
        ) : (
          <>
            {item.price ? <Txt x={x + 12} y={footerY + 17} size="11" weight="950" fill={color} cfg={cfg}>{item.price}</Txt> : null}
            <SvgButton
              x={x + (item.price ? w * 0.42 : 10)}
              y={footerY + 6}
              w={item.price ? w * 0.58 - 12 : w - 20}
              h={20}
              label={loading ? 'Working' : selected ? 'Selected' : tileActionLabel(item)}
              active={Boolean(item.price) || selected}
              small
              onClick={onClick}
              disabled={loading || disabled}
              cfg={cfg}
            />
          </>
        )}
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
  const active = Boolean(selected || hovered);
  const headerH = Math.min(28, Math.max(22, h * 0.34));
  const footerH = minimal ? 0 : Math.min(22, Math.max(16, h * 0.24));
  const bodyY = y + headerH;
  const footerY = y + h - footerH;
  const assetW = minimal ? Math.min(w - 24, Math.max(74, w * 0.48)) : Math.min(62, Math.max(42, w * 0.24));
  const assetH = minimal ? Math.max(62, footerY - bodyY - 12) : Math.max(28, footerY - bodyY - 8);
  const assetX = minimal ? x + (w - assetW) / 2 : x + 10;
  const assetY = minimal ? bodyY + 8 : bodyY + 4;
  const textX = assetX + assetW + 12;
  const textW = w - (textX - x) - 12;
  const clickable = Boolean(onClick);

  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={clickable ? 'shop-page-svg-clickable' : undefined} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}>
      {active ? <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="0" fill="none" stroke={color} strokeWidth={hovered ? 2 : 1.4} opacity={hovered ? 0.34 : 0.24} filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx="0" fill={active ? `${color}12` : cfg.colors.panelFill} stroke={active ? color : '#1e6089'} strokeWidth={active ? 1.5 : 1.15} />
      <HeaderBar x={x + 1} y={y + 1} w={w - 2} h={headerH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
        <MiniIcon type={item.icon} x={x + 12} y={y + Math.max(5, headerH / 2 - 8)} size={16} tone={item.tone} cfg={cfg} />
        <WrappedText x={x + 38} y={y + headerH / 2 + 1} width={w - 104} lines={item.title} size={10.2} lineHeight={11} fill={color} weight={950} maxLines={1} cfg={cfg} />
        {item.badge ? (
          <>
            <rect x={x + w - 72} y={y + 6} width="58" height={headerH - 12} rx={cfg.svgDefaults.roundedNone} fill={color} opacity=".2" stroke={color} strokeOpacity=".52" />
            <Txt x={x + w - 43} y={y + headerH / 2 + 1} anchor="middle" size="7" weight="900" cfg={cfg}>{item.badge}</Txt>
          </>
        ) : null}
      </HeaderBar>
      <TransparentAssetImage x={assetX} y={assetY} w={assetW} h={assetH} imageUrl={item.imageUrl} glow={active} />
      {minimal ? null : (
        <>
          <WrappedText x={textX} y={bodyY + 16} width={textW} lines={item.subtitle} size={8.4} lineHeight={10} fill="#dff5ff" weight={650} maxLines={2} cfg={cfg} />
          <rect x={x + 1} y={footerY} width={w - 2} height={footerH - 1} fill="rgba(4,15,28,.82)" />
          <Txt x={x + 12} y={footerY + footerH / 2 + 1} size="7.8" weight="850" fill={item.imageUrl ? '#9ed6ff' : color} cfg={cfg}>{item.imageUrl ? 'Info category' : 'Image needed'}</Txt>
          <Txt x={x + w - 12} y={footerY + footerH / 2 + 1} anchor="end" size="7.8" weight="850" fill="#9ed6ff" cfg={cfg}>Click for details</Txt>
        </>
      )}
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
  const compact = h < 230;
  const headerH = compact ? 32 : 34;
  const footerH = compact ? 30 : 38;
  const bodyY = y + headerH;
  const footerY = y + h - footerH;
  const bodyH = footerY - bodyY;
  const artW = Math.min(compact ? 78 : 116, w * 0.28);
  const artH = Math.min(Math.max(62, bodyH - 14), artW * 1.18);
  const artX = x + 10;
  const artY = bodyY + Math.max(7, (bodyH - artH) / 2);
  const dividerX = artX + artW + 8;
  const textX = dividerX + 12;
  const textW = w - (textX - x) - 12;
  const buttonW = Math.min(compact ? 124 : 150, w * 0.36);
  const disabled = item.product ? !isShopProductPurchasable(item.product) : false;
  const buttonLabel = loading ? 'Working' : item.tone === 'gold' ? SHOP_UI_COPY.passCard.lifetimeButton : SHOP_UI_COPY.passCard.selectButton;
  const benefits = passBenefits(item).map(benefit => `+ ${benefit}`);
  const benefitLineH = compact ? 8.6 : 10.6;
  const benefitMaxLines = compact ? Math.min(5, Math.max(3, Math.floor((bodyH - 34) / benefitLineH))) : Math.max(4, Math.floor((bodyH - 58) / benefitLineH));
  return (
    <g onClick={onInspect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="shop-page-svg-clickable">
      {hovered ? <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="0" fill="none" stroke={color} strokeWidth="2.4" opacity=".3" filter="url(#shopSoftGlow)" /> : null}
      <Panel x={x} y={y} w={w} h={h} r={9} fill={hovered ? `${color}12` : cfg.colors.panelFill} stroke={hovered ? cfg.svgDefaults.selectedStroke : color} cfg={cfg}>
        <HeaderBar x={x + 1} y={y + 1} w={w - 2} h={headerH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
          <Txt x={x + 16} y={y + 18} fill={color} size={compact ? 12.6 : 15} weight="950" cfg={cfg}>{item.title}</Txt>
          {item.badge ? (
            <>
              <path d={`M ${x + w - 86} ${y + 1} H ${x + w - 1} V ${y + headerH} H ${x + w - 76} Q ${x + w - 86} ${y + headerH} ${x + w - 86} ${y + headerH - 10} Z`} fill={color} opacity=".28" stroke={color} />
              <Txt x={x + w - 43} y={y + 18} anchor="middle" size="8" weight="900" cfg={cfg}>{item.badge}</Txt>
            </>
          ) : null}
        </HeaderBar>
        <TransparentAssetImage x={artX} y={artY} w={artW} h={artH} imageUrl={item.imageUrl} glow={hovered} />
        {compact ? <Txt x={dividerX} y={bodyY + bodyH / 2} anchor="middle" size="24" weight="550" fill={color} opacity={0.68} cfg={cfg}>|</Txt> : null}
        <WrappedText x={textX} y={bodyY + (compact ? 15 : 20)} width={textW} lines={item.subtitle} size={compact ? 7.6 : 10.2} lineHeight={compact ? 8.8 : 12} fill={color} weight={900} maxLines={compact ? 1 : 2} cfg={cfg} />
        <WrappedText x={textX} y={bodyY + (compact ? 31 : 52)} width={textW} lines={benefits} size={compact ? 7 : 8.2} lineHeight={benefitLineH} fill="#dff5ff" weight={650} maxLines={benefitMaxLines} cfg={cfg} />
        <rect x={x + 1} y={footerY} width={w - 2} height={footerH - 1} fill="rgba(4,15,28,.82)" />
        <Txt x={x + 14} y={footerY + footerH / 2 + 2} size={compact ? 13 : 15} weight="950" cfg={cfg}>{item.price}</Txt>
        <SvgButton
          x={x + w - buttonW - 8}
          y={footerY + 6}
          w={buttonW}
          h={footerH - 12}
          label={buttonLabel}
          small
          onClick={onClick}
          disabled={loading || disabled}
          cfg={cfg}
        />
      </Panel>
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
  fillFrame = false,
  onBuy,
  onCompare,
  onInspect,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  products: ShopProduct[];
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  fillFrame?: boolean;
  onBuy: (product: ShopProduct) => void;
  onCompare: () => void;
  onInspect?: (item: TileItem) => void;
}) {
  const items = tilesForTab(products, 'Elite').slice(0, 3);
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH;
  const cardGap = 12;
  const cardW = (w - 44 - cardGap * 2) / 3;
  const cardH = fillFrame ? Math.max(104, bodyH - 24) : Math.min(Math.max(104, bodyH - 24), 172);
  const frameH = fillFrame ? h : Math.min(h, cfg.mainBody.headerH + cardH + 24);
  const rowW = items.length * cardW + Math.max(0, items.length - 1) * cardGap;
  const rowX = x + Math.max(22, (w - rowW) / 2);
  return (
    <SectionFrame x={x} y={y} w={w} h={frameH} title="ELITE" subtitle="Premium passes, more tools, more access, and more rewards." rightText="Compare All Benefits >" accent="#1f77a6" cfg={cfg} onRightTextClick={onCompare}>
      {items.map((item, index) => (
        <PassTile
          key={`${item.title}-${index}`}
          x={rowX + index * (cardW + cardGap)}
          y={bodyY + 12}
          w={cardW}
          h={cardH}
          item={item}
          cfg={cfg}
          loading={item.product ? loadingId === item.product.productId : false}
          onInspect={() => onInspect?.(item)}
          onClick={() => item.product ? onBuy(item.product) : onCompare()}
        />
      ))}
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
  selectedItem,
  cfg,
  loadingId,
  onSelect,
  onBuy,
  onInspect,
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
  selectedItem?: string | null;
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  onSelect?: (title: string) => void;
  onBuy: (product: ShopProduct) => void;
  onInspect?: (item: TileItem) => void;
}) {
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH;
  const infoOnlyShelf = items.length > 0 && items.every(item => !item.price && !item.product);
  const count = compact || infoOnlyShelf ? Math.min(items.length, 6) : 3;
  const cardGap = 12;
  const cardW = (w - 44 - cardGap * (count - 1)) / count;
  const cardH = bodyH - 24;
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={title} subtitle={subtitle} rightText={compact || infoOnlyShelf ? undefined : 'Buy products'} accent="#1f77a6" cfg={cfg}>
      {items.slice(0, count).map((item, index) => (
        compact ? (
          <InfoCategoryTile
            key={`${item.title}-${index}`}
            x={x + 22 + index * (cardW + cardGap)}
            y={bodyY + 12}
            w={cardW}
            h={cardH}
            item={item}
            cfg={cfg}
            selected={selectedItem === item.title}
            minimal={minimalCompact}
            onClick={() => {
              onSelect?.(item.title);
              if (!minimalCompact) onInspect?.(item);
            }}
          />
        ) : (
          <ProductTileFixed
            key={`${item.title}-${index}`}
            x={x + 22 + index * (cardW + cardGap)}
            y={bodyY + 12}
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
    </SectionFrame>
  );
}

function VaultGridFrame({
  x,
  y,
  w,
  h,
  accent,
  deckName,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
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
  const edge = hovered ? '#54e2ff' : accent;

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      className="shop-page-svg-clickable"
    >
      {hovered ? <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="9" fill="none" stroke={edge} strokeWidth="2.2" strokeOpacity=".34" filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx="8" fill={hovered ? 'rgba(84,226,255,.07)' : 'rgba(4,16,30,.32)'} stroke={edge} strokeWidth={hovered ? 1.4 : 1} strokeOpacity={hovered ? 0.86 : 0.42} />
      {[0, 1, 2].map((cardIndex) => {
        const rotate = [-9, 0, 9][cardIndex];
        const cardX = cardStartX + cardIndex * cardW * 0.72;
        return (
          <g key={cardIndex} transform={`rotate(${rotate} ${cardX + cardW / 2} ${cardY + cardH / 2})`}>
            <rect x={cardX} y={cardY} width={cardW} height={cardH} rx="4" fill="rgba(8,28,48,.86)" stroke={edge} strokeWidth="1" strokeOpacity={hovered ? 0.92 : 0.72} />
            <rect x={cardX + 4} y={cardY + 5} width={cardW - 8} height={cardH - 10} rx="3" fill="rgba(255,255,255,.035)" stroke="#ffffff" strokeWidth=".6" strokeOpacity=".16" />
          </g>
        );
      })}
      <rect x={x + 1} y={y + h - labelH - 1} width={w - 2} height={labelH} rx="0" fill="rgba(2,10,19,.78)" stroke={edge} strokeWidth=".7" strokeOpacity={hovered ? 0.72 : 0.34} />
      {label ? (
        <text x={x + w / 2} y={y + h - labelH / 2} fill={hovered ? edge : '#f4fbff'} fontSize={Math.max(7, Math.min(9.5, w / Math.max(12, label.length * 0.62)))} fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">{label}</text>
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
  selected: boolean;
  onSelect: (index: number) => void;
  clipImage: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const center = size / 2;
  const clipId = `shopVaultCircleClip${index}`;
  const badgeW = Math.min(38, size * 0.62);
  const badgeH = Math.max(11, Math.min(14, size * 0.18));
  const green = '#22e79d';
  const hoverBlue = '#54e2ff';
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
      {showBaseCircle ? <circle cx={center} cy={center} r={center - 8} fill="rgba(2,10,19,.44)" stroke="#ffffff" strokeWidth=".8" strokeOpacity=".22" /> : null}
      <image href={imageUrl} x={imageInset} y={imageInset} width={size - imageInset * 2} height={size - imageInset * 2} preserveAspectRatio={clipImage ? 'xMidYMid slice' : 'xMidYMid meet'} clipPath={clipImage ? `url(#${clipId})` : undefined} />
      {showInteractionCircle ? <circle cx={center} cy={center} r={center - 5} fill="none" stroke={ringColor} strokeWidth={selected ? 1.8 : 1.1} strokeOpacity={clipImage ? selected ? 0.96 : 0.78 : hovered ? 0.72 : 0.34} /> : null}
      <rect x={center - badgeW / 2} y={size - badgeH - 1} width={badgeW} height={badgeH} rx={badgeH / 2} fill={green} stroke="#ffffff" strokeWidth=".45" strokeOpacity=".38" />
      <text x={center} y={size - badgeH / 2} fill="#061326" fontSize={Math.max(6.4, badgeH * 0.58)} fontWeight="950" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif">FREE</text>
      {selected ? (
        <g>
          <circle cx={size - 9} cy="9" r="8" fill={green} stroke="#ffffff" strokeWidth=".7" strokeOpacity=".52" />
          <path d={`M ${size - 13} 9 L ${size - 10} 12 L ${size - 5} 6`} fill="none" stroke="#061326" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH;
  const pad = 18;
  const heroX = x + pad;
  const heroY = bodyY + 14;
  const heroW = Math.min(310, Math.max(246, w * 0.28));
  const heroH = bodyH - 28;
  const dividerX = heroX + heroW + 12;
  const gridX = dividerX + 18;
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
  const rows = isSelectableCircleGrid || isDeckGrid ? 2 : 3;
  const scrollbarH = 12;
  const frameGap = isSelectableCircleGrid || isDeckGrid ? 4 : 10;
  const viewportH = gridH - scrollbarH - 8;
  const frameH = (viewportH - frameGap * (rows - 1)) / rows;
  const avatarSize = Math.max(42, Math.min(88, frameH - 1));
  const frameW = isSelectableCircleGrid ? avatarSize + 12 : isDeckGrid ? Math.max(104, Math.min(138, gridW / 4.8)) : Math.max(126, Math.min(172, gridW / 3.2));
  const columns = isSelectableCircleGrid ? Math.ceil(selectableCircleImages.length / rows) : isDeckGrid ? Math.max(12, deckItems.length) : Math.max(10, activeGroup.items.length + 6);
  const contentW = columns * frameW + (columns - 1) * frameGap;
  const maxScrollX = Math.max(0, contentW - gridW);
  const rawScrollX = gridScrollState.groupKey === activeGroupKey ? gridScrollState.value : 0;
  const scrollX = clampNumber(rawScrollX, 0, maxScrollX);
  const thumbW = maxScrollX > 0 ? Math.max(52, gridW * (gridW / contentW)) : gridW;
  const thumbTravel = Math.max(0, gridW - thumbW);
  const thumbX = maxScrollX > 0 ? (scrollX / maxScrollX) * thumbTravel : 0;

  return (
    <SectionFrame x={x} y={y} w={w} h={h} title="VAULT" subtitle="Deck drops, card backs, table themes, frames, and free avatar identity." accent="#8b5cff" cfg={cfg}>
      <rect x={heroX} y={heroY} width={heroW} height={heroH} rx="10" fill="rgba(5,18,34,.38)" />
      <g onClick={() => onGroupChange(activeGroup.key)} role="button" tabIndex={0} className="shop-page-svg-clickable">
        <TransparentAssetImage x={heroX + 18} y={heroY + 18} w={heroW - 36} h={heroH - 36} imageUrl={activeGroup.heroImageUrl} glow />
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
        <rect x="0" y="0" width={gridW} height={viewportH} rx="9" fill="rgba(3,13,24,.22)" stroke={accent} strokeWidth="1" strokeOpacity=".28" />
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
                  selected={selectedIndex === index}
                  onSelect={isAvatarGrid ? setSelectedAvatarIndex : setSelectedProfileFrameIndex}
                  clipImage={isAvatarGrid}
                />
              );
            }
            const deckItem = deckItems[index % deckItems.length] ?? null;
            return <VaultGridFrame key={`${activeGroup.key}-frame-${index}`} x={frameX} y={frameY} w={frameW} h={frameH} accent={accent} deckName={deckItem?.title} onClick={isDeckGrid ? () => onDeckPreview(deckItem) : undefined} />;
          })}
        </g>
        <rect x="0" y={gridH - scrollbarH} width={gridW} height={scrollbarH} rx={scrollbarH / 2} fill="rgba(2,10,19,.74)" stroke={accent} strokeWidth="1" strokeOpacity=".25" />
        <rect x={thumbX} y={gridH - scrollbarH + 2} width={thumbW} height={scrollbarH - 4} rx={(scrollbarH - 4) / 2} fill={accent} opacity=".55" />
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
  fillFrame = false,
  onBuy,
  onInfo,
  onInspect,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  products: ShopProduct[];
  cfg: ShopPageSvgControls;
  loadingId: string | null;
  fillFrame?: boolean;
  onBuy: (product: ShopProduct) => void;
  onInfo: () => void;
  onInspect?: (item: TileItem) => void;
}) {
  const items = tilesForTab(products, 'Treasury');
  const bodyY = y + cfg.mainBody.headerH;
  const bodyH = h - cfg.mainBody.headerH;
  const itemCount = Math.min(5, items.length);
  const gap = cfg.mainBody.productGap;
  const availableCardW = (w - 44 - gap * Math.max(0, itemCount - 1)) / itemCount;
  const cardW = Math.max(92, Math.min(228, availableCardW));
  const cardH = fillFrame ? Math.max(104, bodyH - 24) : Math.min(Math.max(104, bodyH - 24), 158);
  const rowW = itemCount * cardW + Math.max(0, itemCount - 1) * gap;
  const rowX = x + Math.max(22, (w - rowW) / 2);
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title="TREASURY" subtitle="Buy Arena Credits, the marketplace balance used across Ocentra." rightText="What is Arena Credits?" accent="#1f77a6" cfg={cfg} onRightTextClick={onInfo}>
      {items.slice(0, itemCount).map((item, index) => (
        <ProductTileFixed
          key={`${item.title}-${index}`}
          x={rowX + index * (cardW + gap)}
          y={bodyY + 12}
          w={cardW}
          h={cardH}
          item={item}
          cfg={cfg}
          loading={item.product ? loadingId === item.product.productId : false}
          onInspect={() => onInspect?.(item)}
          onClick={() => item.product && onBuy(item.product)}
        />
      ))}
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
        <rect x={tableX} y={tableY} width={tableW} height={headH + rowH * detail.rows.length} fill="rgba(2,10,19,.42)" stroke={accent} strokeOpacity=".35" />
        <rect x={tableX} y={tableY} width={labelW} height={headH} fill="rgba(255,255,255,.035)" stroke="#274e70" />
        <Txt x={tableX + token.comparisonBenefitX} y={tableY + token.comparisonBenefitY} size={token.comparisonBenefitSize} weight="950" fill={accent} cfg={cfg}>Benefit</Txt>
        {detail.tiers.map((tier, index) => {
          const cx = tableX + labelW + index * colW;
          const color = toneColor(tier.tone as ShopTone, cfg);
          return (
            <g key={tier.key}>
              <rect x={cx} y={tableY} width={colW} height={headH} fill={`${color}18`} stroke={color} strokeOpacity=".55" />
              <Txt x={cx + colW / 2} y={tableY + token.comparisonTierTitleY} anchor="middle" size={token.comparisonTierTitleSize} weight="950" fill={color} cfg={cfg}>{tier.title}</Txt>
              <Txt x={cx + colW / 2} y={tableY + token.comparisonTierPriceY} anchor="middle" size={token.comparisonTierPriceSize} weight="750" fill="#dff5ff" cfg={cfg}>{tier.price}</Txt>
            </g>
          );
        })}
        {detail.rows.map((row, rowIndex) => {
          const rowY = tableY + headH + rowIndex * rowH;
          return (
            <g key={row.label}>
              <rect x={tableX} y={rowY} width={labelW} height={rowH} fill={rowIndex % 2 ? 'rgba(255,255,255,.022)' : 'rgba(255,255,255,.04)'} stroke="#274e70" strokeOpacity=".8" />
              <Txt x={tableX + token.comparisonBenefitX} y={rowY + rowH / 2 + 1} size={token.comparisonRowLabelSize} weight="850" fill="#dff5ff" cfg={cfg}>{row.label}</Txt>
              {row.values.map((value, valueIndex) => {
                const cx = tableX + labelW + valueIndex * colW;
                return (
                  <g key={`${row.label}-${valueIndex}`}>
                    <rect x={cx} y={rowY} width={colW} height={rowH} fill={rowIndex % 2 ? 'rgba(255,255,255,.012)' : 'rgba(255,255,255,.026)'} stroke="#274e70" strokeOpacity=".55" />
                    <WrappedText x={cx + colW / 2} y={rowY + rowH / 2 + 1} width={colW - 10} lines={value} size={token.comparisonValueSize} lineHeight={token.comparisonValueLineHeight} fill="#c6e5f8" weight={650} maxLines={1} anchor="middle" cfg={cfg} />
                  </g>
                );
              })}
            </g>
          );
        })}
        <Txt x={tableX} y={y + h - token.comparisonNoteBottom} size={token.comparisonNoteSize} fill="#9ed6ff" weight="550" cfg={cfg}>Comparison is mock data for layout only; real tier benefits can wire into this surface later.</Txt>
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
      <WrappedText x={textX} y={bodyY + token.detailSubtitleTop} width={w - (textX - x) - 28} lines={detail.subtitle} size={token.detailSubtitleSize} lineHeight={token.detailSubtitleLineHeight} fill="#dff5ff" weight={600} maxLines={token.detailSubtitleMaxLines} cfg={cfg} />
      {detail.bullets.map((row, index) => (
        <g key={row}>
          <circle cx={textX + 5} cy={bodyY + token.detailBulletStartY + index * token.detailBulletGap} r={token.detailBulletR} fill={accent} />
          <WrappedText x={textX + token.detailBulletTextX} y={bodyY + token.detailBulletStartY + index * token.detailBulletGap} width={w - (textX - x) - 46} lines={row} size={token.detailBulletSize} lineHeight={token.detailBulletLineHeight} fill="#c6e5f8" weight={550} maxLines={2} cfg={cfg} />
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
  const accent = toneColor(item.tone, cfg);
  const bodyY = y + cfg.mainBody.headerH;
  const imageW = Math.min(300, w * 0.28);
  const imageH = h - cfg.mainBody.headerH - 60;
  const textX = x + 34 + imageW + 30;
  const passTile = item.product?.productType === 'SUBSCRIPTION' || SHOP_STATIC_PASSES.some(pass => pass.title === item.title);
  const detailLines = passTile
    ? passBenefits(item)
    : isCreditPackTile(item)
      ? ['One-time Arena Credit purchase', 'Adds marketplace balance after checkout sync', 'Use for tools, cosmetics, access, and event entry']
      : item.benefits?.length ? item.benefits : [item.subtitle];
  const disabled = item.product ? !isShopProductPurchasable(item.product) : !item.price || Boolean(item.price.toLowerCase().includes('coming soon'));
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={`${item.title} DETAILS`} subtitle={item.subtitle} rightText="Back To Shop" accent={accent} cfg={cfg} onRightTextClick={onClose}>
      <TransparentAssetImage x={x + 28} y={bodyY + 20} w={imageW} h={imageH} imageUrl={item.imageUrl} glow />
      <Txt x={textX} y={bodyY + 34} size="20" weight="950" fill={accent} cfg={cfg}>{item.title}</Txt>
      {item.badge ? <Txt x={textX} y={bodyY + 62} size="10" weight="950" fill={accent} cfg={cfg}>{item.badge}</Txt> : null}
      {item.price ? <Txt x={textX} y={bodyY + 92} size="18" weight="950" cfg={cfg}>{item.price}</Txt> : null}
      <WrappedText x={textX} y={bodyY + 126} width={w - (textX - x) - 34} lines={detailLines.map(line => `+ ${line}`)} size={11} lineHeight={15} fill="#dff5ff" weight={650} maxLines={10} cfg={cfg} />
      <SvgButton
        x={textX}
        y={y + h - 48}
        w={190}
        h={28}
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
  cfg,
  onClearSpecial,
  onClearBottomPreview,
  onInfoHandled,
  onBuy,
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
  cfg: ShopPageSvgControls;
  onClearSpecial: () => void;
  onClearBottomPreview: () => void;
  onInfoHandled: () => void;
  onBuy: (product: ShopProduct) => void;
  vaultDeckItems?: ShopVaultDeckPreviewItem[];
  renderVaultDeckPreview?: (item: ShopVaultDeckPreviewItem | null) => ReactNode;
}) {
  const [selectedTileDetail, setSelectedTileDetail] = useState<TileItem | null>(null);
  const [activeInfoDetail, setActiveInfoDetail] = useState<'arenaCredits' | 'eliteBenefits' | null>(null);
  const [activeVaultGroupKey, setActiveVaultGroupKey] = useState(SHOP_VAULT_SHOWCASE_GROUPS[0]?.key ?? '');
  const [vaultTopSelectionKey, setVaultTopSelectionKey] = useState<string | null>(null);
  const [activeDeckPreviewItem, setActiveDeckPreviewItem] = useState<ShopVaultDeckPreviewItem | null>(null);
  const displayedInfoDetail = infoRequest ?? activeInfoDetail;
  const topH = cfg.mainBody.topBoxH;
  const bottomH = cfg.mainBody.sectionBottomY - y - topH - cfg.mainBody.boxGap;
  const bottomY = y + topH + cfg.mainBody.boxGap;
  const bottomTab = nextShopTab(activeTab);

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

  const renderTabLayer = (tab: ShopTab, layerY: number, layerH: number, slot: 'top' | 'bottom') => {
    const fillFrame = slot === 'bottom';
    if (tab === 'Treasury') {
      return <TreasuryLayer x={x} y={layerY} w={w} h={layerH} products={products} cfg={cfg} loadingId={loadingId} fillFrame={fillFrame} onBuy={onBuy} onInfo={() => openInfoDetail('arenaCredits')} onInspect={openTileDetail} />;
    }
    if (tab === 'Elite') {
      return <EliteLayer x={x} y={layerY} w={w} h={layerH} products={products} cfg={cfg} loadingId={loadingId} fillFrame={fillFrame} onBuy={onBuy} onCompare={() => openInfoDetail('eliteBenefits')} onInspect={openTileDetail} />;
    }
    if (tab === 'Vault' && slot === 'bottom') {
      return <VaultShowcaseLayer x={x} y={layerY} w={w} h={layerH} cfg={cfg} activeGroupKey={activeVaultGroupKey} vaultDeckItems={vaultDeckItems} onGroupChange={setActiveVaultGroupKey} onDeckPreview={(item) => {
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
    return (
      <ShelfLayer
        x={x}
        y={layerY}
        w={w}
        h={layerH}
        title={section.title}
        subtitle={section.subtitle}
        items={compact ? categoryItems : featuredItems}
        compact={compact}
        minimalCompact={tab === 'Vault' && compact}
        selectedItem={tab === 'Vault' && compact ? vaultGroupTitleFromKey(vaultTopSelectionKey) : undefined}
        cfg={cfg}
        loadingId={loadingId}
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
      />
    );
  };

  if (specialView === 'earnRewards') {
    return (
      <EarnRewardsLayer
        x={x}
        y={y}
        w={w}
        h={cfg.mainBody.sectionBottomY - y}
        cfg={cfg}
        onClose={onClearSpecial}
      />
    );
  }

  if (activeDeckPreviewItem) {
    return (
      <VaultDeckPreviewLayer
        x={x}
        y={y}
        w={w}
        h={cfg.mainBody.sectionBottomY - y}
        cfg={cfg}
        deckItem={activeDeckPreviewItem}
        renderDeckPreview={renderVaultDeckPreview}
        onClose={() => setActiveDeckPreviewItem(null)}
      />
    );
  }

  return (
    <g>
      {renderTabLayer(activeTab, y, topH, 'top')}
      {displayedInfoDetail ? (
        <InfoDetailLayer x={x} y={bottomY} w={w} h={bottomH} mode={displayedInfoDetail} cfg={cfg} onClose={closeBottomDetail} />
      ) : selectedTileDetail ? (
        <TileDetailLayer x={x} y={bottomY} w={w} h={bottomH} item={selectedTileDetail} cfg={cfg} onClose={closeBottomDetail} onBuy={onBuy} />
      ) : bottomPreviewTarget === 'Earn Free AC' ? (
        <EarnRewardsLayer x={x} y={bottomY} w={w} h={bottomH} cfg={cfg} onClose={onClearBottomPreview} />
      ) : activeTab === 'Vault' && vaultTopSelectionKey && !bottomPreviewTarget ? (
        renderTabLayer('Vault', bottomY, bottomH, 'bottom')
      ) : (
        renderTabLayer(bottomPreviewTarget ?? bottomTab, bottomY, bottomH, 'bottom')
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
  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={cfg.svgDefaults.cursorPointerClassName} role="button" tabIndex={0}>
      {selected ? (
        <>
          <rect x={x - token.selectedPad} y={y - token.selectedPad} width={w + token.selectedPad * 2} height={h + token.selectedPad * 2} rx={token.selectedGlowRadius} fill="none" stroke={color} strokeWidth={token.selectedGlowStrokeWidth} opacity={token.selectedGlowOpacity} filter="url(#shopSoftGlow)" />
          <path d={`M ${x + w - token.arrowEdgeInset} ${y + token.arrowTopInset} L ${x + w + 18} ${y + h / 2} L ${x + w - token.arrowEdgeInset} ${y + h - token.arrowTopInset} Z`} fill={color} filter="url(#shopSoftGlow)" />
        </>
      ) : null}
      {hovered && !selected ? <rect x={x - token.hoverPad} y={y - token.hoverPad} width={w + token.hoverPad * 2} height={h + token.hoverPad * 2} rx={token.hoverGlowRadius} fill="none" stroke={color} strokeWidth={token.hoverGlowStrokeWidth} opacity={token.hoverGlowOpacity} filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.leftPanel.cardRadius} fill={selected ? 'rgba(11,59,103,.58)' : hovered ? `${color}12` : cfg.colors.panelFill} stroke={selected || hovered ? color : '#183e5e'} strokeWidth={selected || hovered ? 1.6 : 1.25} />
      <TransparentAssetImage x={imageX} y={imageY} w={imageSize} h={imageSize} imageUrl={item.imageUrl} glow={selected || hovered} cyanGlow={hovered && !selected} />
      <Txt x={textX} y={y + token.titleY} size={titleSize} weight="950" cfg={cfg}>{item.title}</Txt>
      <WrappedText x={textX} y={y + token.subtitleY} width={w - (textX - x) - token.subtitleRightPad} lines={item.subtitle} size={token.subtitleSize} lineHeight={token.subtitleLineHeight} fill="#9ed6ff" maxLines={2} cfg={cfg} />
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
  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} role="button" tabIndex={0} className="shop-page-svg-clickable">
      {selected ? (
        <>
          <rect x={x - token.selectedPad} y={y - token.selectedPad} width={w + token.selectedPad * 2} height={h + token.selectedPad * 2} rx={token.selectedGlowRadius} fill="none" stroke={color} strokeWidth={token.selectedGlowStrokeWidth} opacity={token.selectedGlowOpacity} filter="url(#shopSoftGlow)" />
          <path d={`M ${x + w - token.arrowEdgeInset} ${arrowTop} L ${x + w + 18} ${y + h / 2} L ${x + w - token.arrowEdgeInset} ${arrowBottom} Z`} fill={color} filter="url(#shopSoftGlow)" />
        </>
      ) : null}
      {hovered && !selected ? <rect x={x - token.hoverPad} y={y - token.hoverPad} width={w + token.hoverPad * 2} height={h + token.hoverPad * 2} rx={token.hoverGlowRadius} fill="none" stroke={color} strokeWidth={token.hoverGlowStrokeWidth} opacity={token.hoverGlowOpacity} filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.leftPanel.earnRadius} fill={selected ? 'rgba(11,59,103,.58)' : hovered ? `${color}12` : cfg.colors.panelFill} stroke={active ? color : '#2c78a1'} strokeWidth={active ? 1.6 : 1.25} />
      <HeaderBar x={x + earn.headerInset} y={y + earn.headerInset} w={w - earn.headerInset * 2} h={earn.headerH} cfg={cfg} stroke={color}>
        <Txt x={x + earn.headerTitleX} y={y + earn.headerTitleY} size={earn.headerTitleSize} weight="950" cfg={cfg}>{SHOP_UI_COPY.earnPanel.title}</Txt>
      </HeaderBar>
      <TransparentAssetImage x={imageX} y={imageY} w={imageW} h={imageH} imageUrl={SHOP_EARN_FREE_AC_IMAGE_URL} glow={active} cyanGlow={hovered && !selected} />
      <WrappedText x={x + earn.textInsetX} y={y + h - earn.textBottom} width={w - earn.textInsetX * 2} lines={SHOP_UI_COPY.earnPanel.description} size={earn.textSize} lineHeight={earn.textLineHeight} fill="#a6c8e2" maxLines={earn.textMaxLines} cfg={cfg} />
      <rect x={badgeX} y={badgeY} width={badgeW} height={earn.buttonH} rx="0" fill={active ? 'url(#shopActiveBlue)' : 'rgba(7,22,42,.82)'} stroke={active ? color : '#22557b'} strokeWidth="1.15" />
      <Txt x={badgeX + badgeW / 2 - 8} y={badgeY + earn.buttonH / 2 + 1} size="9.5" weight="850" anchor="middle" cfg={cfg}>{SHOP_UI_COPY.earnPanel.buttonLabel}</Txt>
      <line x1={badgeX + badgeW - 24} y1={badgeY + 1} x2={badgeX + badgeW - 24} y2={badgeY + earn.buttonH - 1} stroke={active ? color : '#22557b'} />
      <path d={`M ${badgeX + badgeW - 15} ${badgeY + 7} L ${badgeX + badgeW - 7} ${badgeY + earn.buttonH / 2} L ${badgeX + badgeW - 15} ${badgeY + earn.buttonH - 7} Z`} fill={active ? '#9ff4ff' : '#78c8ff'} />
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
    <Panel x={x} y={y} w={w} h={h} r={cfg.leftPanel.panelRadius} stroke="#185b85" cfg={cfg}>
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
  if (active === 'wallet') {
    const dotColors = [cfg.colors.gold, cfg.colors.activeBlue, cfg.colors.green, cfg.colors.violet, cfg.colors.orange];
    const rows = SHOP_RIGHT_ROWS.wallet.map((row, index) => index === 0 ? [row[0], `${acBalance.toLocaleString()} ${row[1]}`] : row);
    return (
      <g>
        <Txt x={x + 16} y={y + 22} size="13" weight="950" fill={cfg.colors.gold} cfg={cfg}>WALLET & BALANCE</Txt>
        {rows.map((row, index) => <InfoRow key={row[0]} x={x + 14} y={y + 46 + index * 34} w={w - 28} label={row[0]} value={row[1]} dotFill={dotColors[index]} cfg={cfg} />)}
      </g>
    );
  }

  if (active === 'pass') {
    return (
      <g>
        <Txt x={x + 16} y={y + 22} size="13" weight="950" fill={cfg.colors.violet} cfg={cfg}>ACTIVE PASS</Txt>
        <ProductImage x={x + 16} y={y + 42} w={w - 32} h={118} imageUrl={SHOP_STATIC_PASSES[1].imageUrl} cfg={cfg} />
        <rect x={x + 16} y={y + 122} width={w - 32} height="38" fill="rgba(1,8,18,.68)" />
        <Txt x={x + 30} y={y + 140} size="15" weight="950" cfg={cfg}>Champion Pass</Txt>
        <SvgButton x={x} y={y + h - 30} w={w} h={30} label="Manage Pass" small onClick={onElite} cfg={cfg} />
      </g>
    );
  }

  if (active === 'events') {
    return (
      <g>
        <Txt x={x + 16} y={y + 22} size="13" weight="950" fill="#de4fe8" cfg={cfg}>UPCOMING EVENTS</Txt>
        {SHOP_RIGHT_ROWS.events.map((row, index) => (
          <g key={row[0]}>
            <rect x={x + 14} y={y + 48 + index * 50} width={w - 28} height="38" rx="0" fill="rgba(255,255,255,.026)" stroke="#4a2b6d" />
            <Txt x={x + 28} y={y + 62 + index * 50} size="10.8" weight="900" cfg={cfg}>{row[0]}</Txt>
            <Txt x={x + 28} y={y + 78 + index * 50} fill="#9ed6ff" size="8.8" cfg={cfg}>{row[1]}</Txt>
            <SvgButton x={x + w - 78} y={y + 57 + index * 50} w={52} h={22} label={row[2]} small cfg={cfg} />
          </g>
        ))}
      </g>
    );
  }

  if (active === 'recent') {
    return (
      <g>
        <Txt x={x + 16} y={y + 22} size="13" weight="950" fill={cfg.colors.green} cfg={cfg}>RECENT PURCHASES</Txt>
        {SHOP_RIGHT_ROWS.recent.map((row, index) => <InfoRow key={row[0]} x={x + 14} y={y + 48 + index * 35} w={w - 28} label={row[0]} value={row[1]} stroke="#245f56" cfg={cfg} />)}
      </g>
    );
  }

  return (
    <g>
      <Txt x={x + 16} y={y + 22} size="13" weight="950" fill={cfg.colors.activeBlue} cfg={cfg}>ACCOUNT PREVIEW</Txt>
      <circle cx={x + 58} cy={y + 86} r="38" fill="rgba(83,29,151,.10)" stroke={cfg.colors.activeBlue} strokeWidth="2" />
      <Txt x={x + 112} y={y + 68} size="17" weight="950" cfg={cfg}>ocentra</Txt>
      <Txt x={x + 112} y={y + 92} fill="#9ed6ff" size="12" weight="600" cfg={cfg}>ELO 1200</Txt>
      <rect x={x + 112} y={y + 116} width={w - 148} height="8" rx="4" fill="#10233a" />
      <rect x={x + 112} y={y + 116} width={Math.min(132, w - 170)} height="8" rx="4" fill="#5193ff" />
      <SvgButton x={x} y={y + h - 30} w={w} h={30} label="View Profile" small cfg={cfg} />
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
  const mainH = h - cfg.rightPanel.pad * 2 - cfg.rightPanel.tabGap * SHOP_RIGHT_TABS.length - cfg.rightPanel.tabH * SHOP_RIGHT_TABS.length;
  const mainX = x + cfg.rightPanel.pad;
  const mainY = y + cfg.rightPanel.pad;
  const mainW = w - cfg.rightPanel.pad * 2;
  const tabsY = mainY + mainH;
  const selectorH = h - cfg.rightPanel.pad - tabsY + y;
  return (
    <Panel x={x} y={y} w={w} h={h} r={14} stroke="#1c638e" cfg={cfg}>
      <path d={topRoundedRectPath(mainX, mainY, mainW, mainH, cfg.rightPanel.radius)} fill="none" stroke={activeMeta.accent} strokeWidth="3" opacity=".14" filter="url(#shopSoftGlow)" />
      <path d={topRoundedRectPath(mainX, mainY, mainW, mainH, cfg.rightPanel.radius)} fill={cfg.colors.panelFill} stroke={activeMeta.accent} strokeWidth="1.3" />
      <HeaderBar x={mainX + 1} y={mainY + 1} w={mainW - 2} h={cfg.rightPanel.previewHeaderH} stroke={activeMeta.accent} cfg={cfg}>
        <Txt x={mainX + 16} y={mainY + 21} size="13" weight="950" fill={activeMeta.accent} cfg={cfg}>{activeMeta.title}</Txt>
      </HeaderBar>
      <RightPreviewContent x={mainX} y={mainY + cfg.rightPanel.previewHeaderH} w={mainW} h={mainH - cfg.rightPanel.previewHeaderH} active={active} cfg={cfg} acBalance={acBalance} onElite={onElite} />
      <path d={bottomRoundedRectPath(mainX, tabsY, mainW, selectorH, cfg.rightPanel.radius)} fill="rgba(4,15,28,.34)" stroke={activeMeta.accent} strokeWidth="1.3" strokeOpacity=".82" />
      {SHOP_RIGHT_TABS.map((tab, index) => (
        <g key={tab.id} onClick={() => setActive(tab.id)} role="button" tabIndex={0} className="shop-page-svg-clickable">
          <rect x={mainX} y={tabsY + 6 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} width={mainW} height={cfg.rightPanel.tabH} fill="rgba(5,18,34,.42)" />
          <line x1={mainX} y1={tabsY + 8 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} x2={mainX + mainW} y2={tabsY + 8 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} stroke="#163f5e" />
          <line x1={mainX} y1={tabsY + 6 + cfg.rightPanel.tabH - 2 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} x2={mainX + mainW} y2={tabsY + 6 + cfg.rightPanel.tabH - 2 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} stroke={tab.accent} strokeWidth={active === tab.id ? 1.8 : 1.05} />
          <rect x={mainX + 10} y={tabsY + 11 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} width={mainW - 20} height={cfg.rightPanel.tabH - 10} fill={`${tab.accent}${active === tab.id ? '26' : '12'}`} stroke={tab.accent} strokeWidth={active === tab.id ? 1.35 : 0.9} />
          <rect x={mainX + 10} y={tabsY + 11 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)} width="4" height={cfg.rightPanel.tabH - 10} fill={tab.accent} opacity={active === tab.id ? .95 : .62} />
          <Txt x={mainX + mainW / 2} y={tabsY + 6 + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap) + cfg.rightPanel.tabH / 2 + 1} size="13" weight="950" fill={active === tab.id ? '#fff' : '#dff5ff'} anchor="middle" cfg={cfg}>{tab.title}</Txt>
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
        <Txt x={x + token.titleX} y={y + token.subtitleY} size={token.subtitleSize} fill="#9ed6ff" cfg={cfg}>{row.subtitle}</Txt>
      </HeaderBar>
      <svg x={bodyX} y={bodyY} width={bodyW} height={bodyH} overflow="hidden">
        <g className="shop-preview-item-track">
          {previewItems.map((item, index) => {
            const itemX = index * itemStep;
            const labelBoxX = itemX + token.labelBoxInsetX;
            const labelBoxW = Math.max(20, itemW - token.labelBoxInsetX * 2);
            const labelFontSize = Math.min(token.labelSize, Math.max(7.2, labelBoxW / Math.max(8.5, item.label.length * 0.62)));
            return (
              <g key={`${item.key}-${index}`}>
                <TransparentAssetImage x={itemX + token.cardInset} y={token.cardInset} w={itemW - token.cardInset * 2} h={artH - token.cardInset} imageUrl={item.imageUrl} glow={hovered} />
                {showLabels ? (
                  <>
                    <rect x={labelBoxX} y={labelBoxY} width={labelBoxW} height={labelBoxH} rx={token.labelBoxRadius} fill="none" stroke={row.accent} strokeWidth={token.labelBoxGlowStrokeWidth} opacity={token.labelBoxGlowOpacity} filter="url(#shopSoftGlow)" />
                    <rect x={labelBoxX} y={labelBoxY} width={labelBoxW} height={labelBoxH} rx={token.labelBoxRadius} fill="rgba(1,8,18,.76)" stroke={row.accent} strokeWidth={token.labelBoxStrokeWidth} strokeOpacity=".9" />
                    <Txt x={labelBoxX + labelBoxW / 2} y={labelBoxY + labelBoxH / 2 + 0.5} anchor="middle" size={labelFontSize} weight="900" fill="#f4fbff" cfg={cfg}>{item.label}</Txt>
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
  const columns = SHOP_UI_COPY.footer;
  const colW = w / columns.length;
  return (
    <g>
      <path d={bottomRoundedRectPath(x, y, w, h, cfg.footer.radius)} fill={cfg.colors.footerFill} stroke="#1c638e" strokeWidth={token.strokeWidth} />
      <line x1={x + token.topLineInset} y1={y + 1} x2={x + w - token.topLineInset} y2={y + 1} stroke={cfg.colors.edgeStroke} strokeOpacity={token.topLineOpacity} />
      {columns.map((item, index) => {
        const cx = x + index * colW;
        return (
          <g key={item.title}>
            <rect x={cx} y={y + 1} width={colW} height={h - 2} fill="rgba(255,255,255,.012)" />
            {index > 0 ? <line x1={cx} y1={y + token.separatorPad} x2={cx} y2={y + h - token.separatorPad} stroke="#123b58" /> : null}
            <MiniIcon type={item.icon as ShopIcon} x={cx + cfg.footer.iconLeftPad} y={y + h / 2 - token.iconYPad} size={token.iconSize} tone={item.tone as ShopTone} cfg={cfg} />
            <Txt x={cx + colW / 2} y={y + h / 2 + token.titleY} size={cfg.footer.titleSize} weight="850" anchor="middle" cfg={cfg}>{item.title}</Txt>
            <Txt x={cx + colW / 2} y={y + h / 2 + token.subtitleY} size={cfg.footer.subtitleSize} fill="#9ed6ff" anchor="middle" cfg={cfg}>{item.sub}</Txt>
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
  const featuredRewardBandH = 36;
  const featuredArtH = Math.max(110, featuredFooterY - featuredArtY - featuredRewardBandH);
  const rewardBadgeW = Math.min(featured ? 156 : 132, w * 0.52);
  return (
    <g className={cfg.svgDefaults.cursorPointerClassName} onClick={() => onAction(quest)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} role="button" tabIndex={0}>
      {(hovered || selected) ? (
        <rect x={x - token.questHoverPad} y={y - token.questHoverPad} width={w + token.questHoverPad * 2} height={h + token.questHoverPad * 2} rx={cfg.svgDefaults.roundedNone} fill="none" stroke={color} strokeWidth={selected ? token.questSelectedStrokeWidth : token.questHoverStrokeWidth} opacity={selected ? 0.46 : 0.3} filter="url(#shopSoftGlow)" />
      ) : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.svgDefaults.roundedNone} fill={hovered || selected ? `${color}12` : 'rgba(5,20,34,.58)'} stroke={selected ? cfg.svgDefaults.selectedStroke : color} strokeOpacity={hovered || selected ? 0.98 : 0.74} strokeWidth={selected ? 2 : hovered ? 1.8 : 1.2} />
      <HeaderBar x={x + token.questInset} y={y + token.questInset} w={w - token.questInset * 2} h={headerH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
        <WrappedText x={x + w / 2} y={y + (featured ? 20 : 17)} width={w - 24} lines={quest.title} size={featured ? 14 : 10.8} lineHeight={featured ? 15 : 11} fill={color} weight={950} maxLines={1} anchor="middle" cfg={cfg} />
      </HeaderBar>
      {featured ? (
        <>
          <RewardQuestArtwork x={x + 1} y={featuredArtY} w={w - 2} h={featuredArtH} quest={quest} featured active={hovered || selected} onSpin={() => onAction(quest)} />
          <rect x={x + 18} y={featuredFooterY - 31} width={rewardBadgeW} height="24" rx="0" fill={`${color}18`} stroke={color} strokeOpacity=".76" />
          <Txt x={x + 30} y={featuredFooterY - 19} size={token.questFeaturedRewardSize} weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
          <rect x={x + 1} y={featuredFooterY} width={w - 2} height={footerH - 1} fill="rgba(4,15,28,.82)" />
          <SvgButton x={x + 12} y={featuredFooterY + 5} w={w - 24} h={footerH - 10} label={quest.action} active small onClick={() => onAction(quest)} cfg={cfg} />
        </>
      ) : (
        <>
          <RewardQuestArtwork x={x + 1} y={compactArtY} w={w - 2} h={compactArtH} quest={quest} featured={false} active={hovered || selected} onSpin={() => onAction(quest)} />
          <rect x={x + 1} y={compactFooterY} width={w - 2} height={footerH - 1} fill="rgba(4,15,28,.82)" />
          <rect x={x + 12} y={compactFooterY + 5} width={rewardBadgeW} height={footerH - 10} rx="0" fill={`${color}18`} stroke={color} strokeOpacity=".62" />
          <Txt x={x + 24} y={compactFooterY + footerH / 2} size={token.questRewardSize} weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
          <rect x={x + w - 82} y={compactFooterY + 5} width="68" height={footerH - 10} rx={cfg.svgDefaults.roundedNone} fill={`${color}18`} stroke={color} strokeOpacity=".44" />
          <Txt x={x + w - 48} y={compactFooterY + footerH / 2} anchor="middle" size="7.8" fill="#dff5ff" weight="850" cfg={cfg}>{quest.cadence}</Txt>
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
  const artW = Math.min(280, w * 0.33);
  const artX = x + 28;
  const artY = y + 76;
  const artH = h - 146;
  const detailX = artX + artW + 22;
  const detailW = w - (detailX - x) - 34;
  const stepY = artY + 110;
  const statusY = y + h - 114;
  const buttonW = (w - 68) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="rgba(2,10,19,.78)" />
      <rect x={x + token.overlayPad} y={y + token.overlayPad} width={w - token.overlayPad * 2} height={h - token.overlayPad * 2} rx={cfg.svgDefaults.roundedNone} fill="rgba(5,20,34,.86)" stroke={color} strokeWidth="1.6" filter="url(#shopSoftGlow)" />
      <HeaderBar x={x + token.overlayHeaderX} y={y + token.overlayHeaderY} w={w - token.overlayHeaderPadW} h={token.overlayHeaderH} cfg={cfg} fill={cfg.colors.headerFillAlt} stroke={color}>
        <MiniIcon type={quest.icon} x={x + token.overlayIconX} y={y + token.overlayIconY} size={token.overlayIconSize} tone={quest.tone} cfg={cfg} />
        <WrappedText x={x + token.overlayTitleX} y={y + token.overlayTitleY} width={w - token.overlayTitleRightReserve} lines={title} size={token.overlayTitleSize} lineHeight={token.overlayTitleLineHeight} fill={color} weight={950} maxLines={1} cfg={cfg} />
        <SvgButton x={x + w - token.overlayCloseRight} y={y + token.overlayCloseY} w={token.overlayCloseW} h={token.overlayCloseH} label={copy.closeLabel} small arrow={false} onClick={onClose} cfg={cfg} />
      </HeaderBar>
      <rect x={artX} y={artY} width={artW} height={artH} rx={cfg.svgDefaults.roundedNone} fill="rgba(255,255,255,.026)" stroke={color} strokeOpacity=".42" />
      <RewardQuestArtwork x={artX + 1} y={artY + 1} w={artW - 2} h={Math.max(120, artH - 58)} quest={quest} featured={false} active />
      <rect x={artX + 1} y={artY + artH - 58} width={artW - 2} height="57" fill="rgba(1,8,18,.78)" />
      <Txt x={artX + 18} y={artY + artH - 36} size="18" weight="950" fill={color} cfg={cfg}>{quest.reward}</Txt>
      <Txt x={artX + 18} y={artY + artH - 15} size="9.4" fill="#9ed6ff" weight="750" cfg={cfg}>{quest.cadence} reward</Txt>
      <Txt x={detailX} y={artY + 12} size="17" weight="950" fill={color} cfg={cfg}>{quest.title}</Txt>
      <WrappedText x={detailX} y={artY + 42} width={detailW} lines={quest.description} size={10.8} lineHeight={13} fill="#dff5ff" weight={650} maxLines={2} cfg={cfg} />
      <WrappedText x={detailX} y={artY + 77} width={detailW} lines={helper} size={9.6} lineHeight={12} fill="#9ed6ff" weight={600} maxLines={2} cfg={cfg} />
      {quest.details.map((detail, index) => (
        <g key={detail}>
          <rect x={detailX} y={stepY + index * 34} width={detailW} height="26" rx={cfg.svgDefaults.roundedNone} fill={index === 0 ? `${color}18` : 'rgba(255,255,255,.032)'} stroke={index === 0 ? color : '#255c7d'} strokeOpacity=".52" />
          <circle cx={detailX + 16} cy={stepY + 13 + index * 34} r="4" fill={color} opacity={index === 0 ? 1 : 0.62} />
          <WrappedText x={detailX + 30} y={stepY + 13 + index * 34} width={detailW - 42} lines={detail} size={9.2} lineHeight={10} fill="#dff5ff" weight={650} maxLines={1} cfg={cfg} />
        </g>
      ))}
      <rect x={detailX} y={statusY} width={detailW} height="44" rx={cfg.svgDefaults.roundedNone} fill="rgba(255,255,255,.028)" stroke={color} strokeOpacity=".46" />
      <Txt x={detailX + 16} y={statusY + 17} size="10" weight="950" fill={color} cfg={cfg}>{isInvite ? 'Verification' : isShare ? 'Share Target' : 'Progress'}</Txt>
      <WrappedText x={detailX + 16} y={statusY + 34} width={detailW - 32} lines={chips.join('  /  ')} size={8.4} lineHeight={10} fill="#9ed6ff" weight={650} maxLines={1} cfg={cfg} />
      <SvgButton x={x + 28} y={y + h - token.overlayButtonBottom} w={buttonW} h={token.overlayButtonH} label={primaryLabel} active small cfg={cfg} />
      <SvgButton x={x + 40 + buttonW} y={y + h - token.overlayButtonBottom} w={buttonW} h={token.overlayButtonH} label={secondaryLabel} active small onClick={hasSpinReward ? onSpin : undefined} cfg={cfg} />
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
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: ShopPageSvgControls;
  onClose: () => void;
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
      <EarnQuestCard x={x + 22} y={bodyY + token.bodyTopPad} w={featureW} h={featureH} quest={selectedQuest} cfg={cfg} featured selected onAction={startQuest} />
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
      <SpinnerPopup
        open={spinnerOpen}
        onClose={() => setSpinnerOpen(false)}
        controls={SHOP_REWARD_SPINNER_CONTROLS}
        canvas={{ x, y, w, h }}
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

  const previewWidths = useMemo(() => SHOP_PREVIEWS.map(row => previewPanelWidth(row, cfg)), [cfg]);

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
  const previewViewportW = canvasWidth - cfg.layout.outerPad * 2;

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
          <filter id="shopCyanImageGlow" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0.12 0 0 0 0.05 0 0.48 0 0 0.62 0 0 0.9 0 0.95 0 0 0 1 0" result="cyanized" /><feGaussianBlur in="cyanized" stdDeviation="3.4" result="cyanBlur" /><feMerge><feMergeNode in="cyanBlur" /><feMergeNode in="cyanized" /></feMerge></filter>
          <linearGradient id="shopActiveBlue" x1="0" x2="1"><stop offset="0" stopColor="#0b6dc9" /><stop offset="1" stopColor="#0e2a67" /></linearGradient>
          <linearGradient id="shopImageShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#020813" stopOpacity="0.10" /><stop offset="0.72" stopColor="#020813" stopOpacity="0.18" /><stop offset="1" stopColor="#020813" stopOpacity="0.78" /></linearGradient>
          <mask id="shopCartImageMask" x="0" y="0" width="54" height="54" maskUnits="userSpaceOnUse"><circle cx="27" cy="27" r="18" fill="#fff" /></mask>
          <radialGradient id="shopCartOrbGradient" cx="35%" cy="25%" r="70%"><stop offset="0" stopColor="#8ff7ff" stopOpacity="0.34" /><stop offset="0.42" stopColor="#0b6dc9" stopOpacity="0.32" /><stop offset="1" stopColor="#061326" stopOpacity="0.96" /></radialGradient>
          <linearGradient id="shopCartStrokeGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#9ff4ff" /><stop offset="0.52" stopColor={cfg.colors.activeBlue} /><stop offset="1" stopColor={cfg.colors.gold} /></linearGradient>
          <radialGradient id="shopAcCoinGradient" cx="34%" cy="24%" r="72%"><stop offset="0" stopColor="#fff7bf" /><stop offset="0.35" stopColor={cfg.colors.gold} /><stop offset="0.72" stopColor="#d17a12" /><stop offset="1" stopColor="#6f3900" /></radialGradient>
          <radialGradient id="shopRewardHaloGradient" cx="50%" cy="50%" r="78%"><stop offset="0" stopColor="#f7ffff" stopOpacity=".34" /><stop offset=".42" stopColor="#dffbff" stopOpacity=".3" /><stop offset=".72" stopColor="#9eeeff" stopOpacity=".18" /><stop offset="1" stopColor="#54e2ff" stopOpacity=".05" /></radialGradient>
          <clipPath id="shopPreviewTrackClip"><rect x={cfg.layout.outerPad - 6} y={cfg.layout.bottomPreviewY - 6} width={previewViewportW + 12} height={cfg.layout.bottomPreviewH + 12} /></clipPath>
        </defs>
        <rect width={canvasWidth} height={cfg.canvas.height} fill={cfg.svgDefaults.canvasFill} />
        <LeftSidePanel x={metrics.leftX} y={metrics.leftY} w={cfg.layout.leftW} h={cfg.layout.sidePanelH} activeTab={activeTab} earnActive={specialView === 'earnRewards' || bottomPreviewTarget === 'Earn Free AC'} cfg={cfg} onTabChange={selectTab} onEarn={() => {
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
          cfg={cfg}
          onClearSpecial={() => setSpecialView(null)}
          onClearBottomPreview={() => setBottomPreviewTarget(null)}
          onInfoHandled={() => setInfoRequest(null)}
          onBuy={onBuy}
          vaultDeckItems={vaultDeckItems}
          renderVaultDeckPreview={renderVaultDeckPreview}
        />
        <RightSidePanel x={metrics.rightX} y={cfg.layout.mainY} w={cfg.layout.rightW} h={cfg.mainBody.sectionBottomY - cfg.layout.mainY} cfg={cfg} acBalance={acBalance} onElite={() => selectTab('Elite')} />
        <g clipPath="url(#shopPreviewTrackClip)">
          <g
            className="shop-preview-track"
            style={{
              transform: `translateX(${-previewTrackX}px)`,
              transition: previewResetting ? 'none' : 'transform 980ms cubic-bezier(.16,1.18,.34,1)',
            }}
          >
            {previewTrackRows.map(({ row, width, x: panelX }, index) => (
              <PreviewPanel key={`${row.title}-${index}`} x={panelX} y={cfg.layout.bottomPreviewY} w={width} h={cfg.layout.bottomPreviewH} row={row} cfg={cfg} onSelect={() => selectPreview(row)} />
            ))}
          </g>
        </g>
        <FooterLayer x={cfg.layout.outerPad} y={cfg.layout.footerY} w={canvasWidth - cfg.layout.outerPad * 2} h={cfg.layout.footerH} cfg={cfg} />
        {loadingProducts ? (
          <g>
            <rect x={metrics.mainX} y={cfg.layout.mainY} width={metrics.mainW} height={cfg.mainBody.sectionBottomY - cfg.layout.mainY} fill="rgba(2,10,19,.52)" />
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
