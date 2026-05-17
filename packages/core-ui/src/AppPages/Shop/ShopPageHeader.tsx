import {
  SHOP_MARKETPLACE_CART_IMAGE_URL,
  type ShopIcon,
  type ShopTone,
} from './ShopPageSvgData';
import type { ShopPageContentData } from './ShopPageSvgContent';
import { MiniIcon, Panel, Txt } from './ShopPageSvgPrimitives';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import { fitSingleLineTextSize } from './ShopPageSvgUtils';

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

export function HeaderLayer({
  x,
  y,
  w,
  h,
  rightX,
  acBalance,
  content,
  cfg,
  onArenaCreditsInfo,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rightX: number;
  acBalance: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onArenaCreditsInfo: () => void;
}) {
  const token = cfg.componentTokens.headerLayer;
  const copy = content.uiCopy.header;
  const cartOnly = w < 218;
  const compact = w < 320;
  const cartSize = compact ? Math.min(cfg.header.cartSize, 46, Math.max(32, w - token.pad * 2)) : cfg.header.cartSize;
  const cartX = cartOnly ? x + w / 2 - cartSize / 2 : x + token.pad;
  const cartY = y + h / 2 - cartSize / 2;
  const bodyX = x + token.pad + cfg.header.cartZoneW + token.bodyGap;
  const minTitleW = compact ? 104 : 166;
  const badgeRoom = Math.max(0, w - token.pad * 2 - cfg.header.cartZoneW - token.bodyGap * 2 - minTitleW);
  const visibleBadgeCount = cartOnly ? 0 : Math.max(0, Math.min(copy.badges.length, Math.floor((badgeRoom + cfg.header.badgeGap) / (cfg.header.badgeW + cfg.header.badgeGap))));
  const visibleBadges = copy.badges.slice(0, visibleBadgeCount);
  const badgeTotal = visibleBadgeCount > 0 ? cfg.header.badgeW * visibleBadgeCount + cfg.header.badgeGap * Math.max(0, visibleBadgeCount - 1) : 0;
  const badgesX = x + w - token.pad - badgeTotal;
  const showTitle = !cartOnly;
  const showSubtitle = showTitle && !compact && w >= 390;
  const balanceX = x + w + cfg.header.gap;
  const balanceW = Math.max(token.balanceMinWidth, rightX - balanceX - cfg.header.gap);
  const titleRight = visibleBadgeCount > 0 ? badgesX - token.bodyGap : x + w - token.pad;
  const titleW = Math.max(120, titleRight - bodyX);
  const titleSize = Math.min(cfg.header.titleSize, fitSingleLineTextSize(copy.title, titleW, compact ? 14 : 18, cfg.header.titleSize, 0.48));
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
        <MarketplaceCartIcon x={cartX} y={cartY} size={cartSize} cfg={cfg} />
        {showTitle ? <line x1={x + token.pad + cfg.header.cartZoneW} y1={y + token.dividerTopPad} x2={x + token.pad + cfg.header.cartZoneW} y2={y + h - token.dividerBottomPad} stroke={cfg.colors.line} strokeWidth={token.dividerStrokeWidth} /> : null}
        {showTitle ? <Txt x={bodyX} y={y + token.titleY} size={titleSize} weight={token.titleWeight} cfg={cfg}>{copy.title}</Txt> : null}
        {visibleBadges.map((badge, index) => (
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
        {showTitle ? <line x1={bodyX} y1={y + token.separatorY} x2={x + w - token.pad} y2={y + token.separatorY} stroke={cfg.colors.line} strokeWidth={token.separatorStrokeWidth} strokeOpacity={token.bodySeparatorOpacity} /> : null}
        {showSubtitle ? <Txt x={bodyX + (w - (bodyX - x) - token.pad) / 2} y={y + token.subtitleY} fill={cfg.colors.mutedText} size={cfg.header.subtitleSize} weight={token.subtitleWeight} anchor="middle" cfg={cfg}>{copy.subtitle}</Txt> : null}
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

export function TopStatsLayer({
  x,
  y,
  w,
  h,
  content,
  cfg,
  onElite,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onElite: () => void;
}) {
  const token = cfg.componentTokens.topStatsLayer;
  const visibleStats = w < 360 ? [] : w < 500 ? content.headerStats.slice(0, 1) : w < 640 ? content.headerStats.slice(0, 2) : content.headerStats;
  const compactPass = w < 300;
  const iconOnlyPass = w < 156;
  const passW = visibleStats.length === 0
    ? Math.max(80, w - token.padX * 2)
    : Math.min(token.passMaxW, Math.max(Math.min(token.passMinW, w * 0.46), w * token.passRatioW));
  const statStart = x + token.padX + passW + token.gapAfterPass;
  const statW = visibleStats.length > 0
    ? Math.max(46, (w - token.padX * 2 - passW - token.gapAfterPass - token.statRightReserve - token.statGap * Math.max(0, visibleStats.length - 1)) / visibleStats.length)
    : 0;
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
        {!iconOnlyPass && !compactPass ? <Txt x={x + token.padX + token.passTextX} y={y + token.passY + token.passTitleY} fill={cfg.colors.balanceText} size={token.passTitleSize} weight={token.passTitleWeight} cfg={cfg}>Active Pass</Txt> : null}
        {!iconOnlyPass ? (
          <Txt
            x={compactPass ? x + token.padX + passW / 2 + token.passIconSize * 0.26 : x + token.padX + token.passTextX}
            y={compactPass ? y + token.passY + token.passH / 2 + 2 : y + token.passY + token.passValueY}
            size={compactPass ? Math.min(token.passValueSize, fitSingleLineTextSize('Champion', passW - token.passIconSize - 22, 10, token.passValueSize, 0.55)) : token.passValueSize}
            weight={token.passValueWeight}
            anchor={compactPass ? 'middle' : 'start'}
            cfg={cfg}
          >
            Champion
          </Txt>
        ) : null}
      </g>
      {visibleStats.map((stat, index) => (
        <g key={stat.label}>
          <rect x={statStart + index * (statW + token.statGap)} y={y + token.statY} width={statW} height={token.statH} rx={token.statRadius} fill={cfg.colors.statsCardFill} stroke={cfg.colors.statsCardStroke} strokeWidth={token.statStrokeWidth} strokeOpacity={token.statStrokeOpacity} />
          <Txt x={statStart + index * (statW + token.statGap) + statW / 2} y={y + token.statY + token.statLabelY} anchor="middle" size={token.statLabelSize} fill={cfg.colors.headerBadgeSubText} weight={token.statLabelWeight} cfg={cfg}>{stat.label}</Txt>
          <Txt x={statStart + index * (statW + token.statGap) + statW / 2} y={y + token.statY + token.statValueY} anchor="middle" size={token.statValueSize} weight={token.statValueWeight} cfg={cfg}>{stat.value}</Txt>
        </g>
      ))}
    </Panel>
  );
}
