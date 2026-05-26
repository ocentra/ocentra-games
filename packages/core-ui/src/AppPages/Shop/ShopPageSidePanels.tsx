import { useState } from 'react';
import { HeaderBar, Panel, SvgButton, Txt, WrappedText } from './ShopPageSvgPrimitives';
import {
  SHOP_EARN_FREE_AC_IMAGE_URL,
  type ShopRightTab,
  type ShopSideItem,
} from './ShopPageSvgData';
import type { ShopPageContentData } from './ShopPageSvgContent';
import { bottomRoundedRectPath, toneColor, topRoundedRectPath } from './ShopPageSvgGeometry';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import type { ShopAccountSummary, ShopTab } from './ShopPageSvgTypes';
import { alphaColor, fitSingleLineTextSize } from './ShopPageSvgUtils';
import { TransparentAssetImage } from './ShopPageAssetArtwork';
import { MainBottom } from './ShopPageMainBottom';
import { mainBottomOverlayContentRect } from './ShopPageSectionFrameGeometry';
import { roundedRectPath as lobbyRoundedRectPath } from '../Lobby/LobbyPageSvgGeometry';

export type ShopRightTabId = ShopRightTab['id'];

function rightPanelMeta(id: ShopRightTabId, content: ShopPageContentData): ShopRightTab {
  return content.rightTabs.find(tab => tab.id === id) ?? content.rightTabs[0];
}

function sideItemIdentity(item: ShopSideItem): string {
  return item.id ?? item.key;
}

function rightPanelDetailRows(id: ShopRightTabId, acBalance: number | null, content: ShopPageContentData): Array<{ label: string; value: string; detail: string }> {
  if (id === 'wallet') {
    const details = content.rightDetails.wallet;
    const balanceValue = acBalance === null ? content.uiCopy.status.unknownValue : acBalance.toLocaleString();
    return content.rightRows.wallet.map((row, index) => ({
      label: row[0],
      value: index === 0 && /^[A-Z]{2,5}$/.test(row[1]) ? `${balanceValue} ${row[1]}` : row[1],
      detail: details[index]?.detail ?? '',
    }));
  }
  if (id === 'events') {
    const details = content.rightDetails.events;
    return content.rightRows.events.map((row, index) => ({
      label: row[0],
      value: row[1],
      detail: details[index]?.detail ?? '',
    }));
  }
  if (id === 'recent') {
    const details = content.rightDetails.recent;
    return content.rightRows.recent.map((row, index) => ({
      label: row[0],
      value: row[1],
      detail: details[index]?.detail ?? '',
    }));
  }
  return content.rightDetails[id] ?? content.rightDetails.account;
}

function withoutPreviewSuffix(title: string): string {
  const trimmed = title.trimEnd();
  const suffix = 'PREVIEW';
  if (!trimmed.toUpperCase().endsWith(suffix)) {
    return title;
  }
  return trimmed.slice(0, -suffix.length).trimEnd();
}

function rightPanelFullTitle(id: ShopRightTabId, content: ShopPageContentData): string {
  return withoutPreviewSuffix(rightPanelMeta(id, content).title);
}

function accountDisplayName(accountSummary: ShopAccountSummary | null | undefined, content: ShopPageContentData): string {
  return accountSummary?.displayName?.trim() || content.uiCopy.status.unknownValue;
}

function accountEmail(accountSummary: ShopAccountSummary | null | undefined, content: ShopPageContentData): string {
  return accountSummary?.email?.trim() || (accountSummary?.isGuest ? content.uiCopy.rightPanel.guestProfile : content.uiCopy.rightPanel.emailUnavailable);
}

function accountInitials(accountSummary: ShopAccountSummary | null | undefined, content: ShopPageContentData): string {
  const source = accountSummary?.displayName?.trim() || accountSummary?.email?.trim() || '';
  const initials = firstWords(source, 2)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || content.uiCopy.rightPanel.initialsUnavailable;
}

function firstWords(value: string, maxWords: number): string[] {
  const words: string[] = [];
  let current = '';
  for (const char of value.trim()) {
    if (char.trim() === '') {
      if (current.length > 0) {
        words.push(current);
        if (words.length >= maxWords) {
          return words;
        }
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0 && words.length < maxWords) {
    words.push(current);
  }
  return words;
}

function AccountProfileAvatar({
  x,
  y,
  size,
  accountSummary,
  content,
  accent,
  cfg,
}: {
  x: number;
  y: number;
  size: number;
  accountSummary?: ShopAccountSummary | null;
  content: ShopPageContentData;
  accent: string;
  cfg: ShopPageSvgControls;
}) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const clipId = `shop-account-avatar-${Math.round(x)}-${Math.round(y)}-${Math.round(size)}`;
  const photoUrl = accountSummary?.photoUrl?.trim() ?? '';
  const showPhoto = Boolean(photoUrl) && failedPhotoUrl !== photoUrl;
  return (
    <g>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <circle cx={x + size / 2} cy={y + size / 2} r={size / 2 - 1} />
        </clipPath>
      </defs>
      <circle cx={x + size / 2} cy={y + size / 2} r={size / 2} fill={alphaColor(accent, 0.22)} stroke={accent} strokeWidth="1.2" filter="url(#shopSoftGlow)" />
      {showPhoto ? (
        <image href={photoUrl} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid meet" clipPath={`url(#${clipId})`} onError={() => setFailedPhotoUrl(photoUrl)} />
      ) : (
        <Txt x={x + size / 2} y={y + size / 2 + size * 0.12} anchor="middle" size={Math.max(12, size * 0.34)} weight="950" fill={cfg.colors.bodyText} cfg={cfg}>{accountInitials(accountSummary, content)}</Txt>
      )}
      <circle cx={x + size / 2} cy={y + size / 2} r={size / 2 - 1} fill="none" stroke={cfg.colors.bodyText} strokeOpacity="0.5" strokeWidth="0.9" />
    </g>
  );
}

function AccountSummaryBand({
  x,
  y,
  w,
  h,
  accountSummary,
  content,
  accent,
  cfg,
  compact = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accountSummary?: ShopAccountSummary | null;
  content: ShopPageContentData;
  accent: string;
  cfg: ShopPageSvgControls;
  compact?: boolean;
}) {
  const avatarSize = Math.max(compact ? 34 : 54, Math.min(compact ? 44 : 66, h - 10));
  const avatarX = x + 10;
  const avatarY = y + h / 2 - avatarSize / 2;
  const textX = avatarX + avatarSize + 12;
  const name = accountDisplayName(accountSummary, content);
  const email = accountEmail(accountSummary, content);
  const copy = content.uiCopy.rightPanel;
  const chips = [
    accountSummary?.eloRating ? `${copy.eloPrefix} ${accountSummary.eloRating}` : copy.ratingUnavailable,
    accountSummary?.gamesPlayed !== undefined ? `${accountSummary.gamesPlayed} ${copy.gamesSuffix}` : copy.gamesUnavailable,
    accountSummary?.winRate !== undefined ? `${accountSummary.winRate.toFixed(1)}% ${copy.winRateSuffix}` : copy.winRateUnavailable,
  ];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={alphaColor(accent, 0.12)} stroke={accent} strokeWidth="1.1" strokeOpacity="0.56" />
      <AccountProfileAvatar x={avatarX} y={avatarY} size={avatarSize} accountSummary={accountSummary} content={content} accent={accent} cfg={cfg} />
      <Txt x={textX} y={y + (compact ? 21 : 25)} size={compact ? 11.2 : 15.2} weight="950" fill={accent} cfg={cfg}>{name}</Txt>
      <WrappedText x={textX} y={y + (compact ? 35 : 43)} width={Math.max(90, w - (textX - x) - 12)} lines={email} size={compact ? 7.1 : 9.5} lineHeight={compact ? 7.7 : 10.5} fill={cfg.colors.mutedText} weight={650} maxLines={1} cfg={cfg} />
      {!compact ? chips.map((chip, index) => {
        const chipW = Math.max(74, Math.min(118, chip.length * 6.2 + 20));
        const chipX = textX + index * (chipW + 8);
        return (
          <g key={chip}>
            <rect x={chipX} y={y + h - 25} width={chipW} height={17} rx={5} fill={alphaColor(accent, 0.1)} stroke={accent} strokeOpacity="0.42" />
            <Txt x={chipX + chipW / 2} y={y + h - 14} anchor="middle" size={7.8} weight="850" fill={cfg.colors.bodyText} cfg={cfg}>{chip}</Txt>
          </g>
        );
      }) : null}
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
  item: ShopSideItem;
  selected: boolean;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const token = cfg.componentTokens.sideNavCard;
  const color = selected ? cfg.colors.activeBlue : toneColor(item.tone, cfg);
  const stacked = w < 142;
  const imageSize = stacked ? Math.min(34, h * 0.48) : Math.min(cfg.leftPanel.imageMaxSize, h - token.imageHeightPad);
  const imageX = stacked ? x + w / 2 - imageSize / 2 : x + token.imageInsetX;
  const imageY = stacked ? y + 5 : y + (h - imageSize) / 2;
  const textX = stacked ? x + w / 2 : imageX + imageSize + token.textGap;
  const textW = stacked ? w - 14 : w - (textX - x) - token.subtitleRightPad;
  const titleSize = stacked
    ? fitSingleLineTextSize(item.title, textW, 8.8, 11.2, 0.62)
    : item.title.length > token.compactTitleLength ? token.compactTitleSize : token.titleSize;
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
      <Txt x={textX} y={stacked ? y + 48 : y + token.titleY} size={titleSize} weight="950" anchor={stacked ? 'middle' : 'start'} cfg={cfg}>{item.title}</Txt>
      <WrappedText x={textX} y={stacked ? y + 60 : y + token.subtitleY} width={textW} lines={item.subtitle} size={stacked ? 6.8 : token.subtitleSize} lineHeight={stacked ? 7.2 : token.subtitleLineHeight} fill={cfg.colors.mutedText} maxLines={stacked ? 1 : 2} anchor={stacked ? 'middle' : 'start'} cfg={cfg} />
    </g>
  );
}

function EarnFreeSideCard({
  x,
  y,
  w,
  h,
  selected,
  content,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  selected: boolean;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const earn = cfg.componentTokens.leftEarnPanel;
  const token = cfg.componentTokens.sideNavCard;
  const active = selected || hovered;
  const color = cfg.colors.activeBlue;
  const headerTitle = content.uiCopy.earnPanel.title;
  const compact = w < 132 || h < 255;
  const description = compact ? 'Quests and events earn AC.' : content.uiCopy.earnPanel.description;
  const buttonLabel = content.uiCopy.earnPanel.buttonLabel;
  const imageX = x + earn.imageInsetX;
  const imageY = y + earn.imageTop;
  const imageW = w - earn.imageInsetX * 2;
  const badgeX = x + earn.buttonInsetX;
  const badgeY = y + h - earn.buttonBottom;
  const badgeW = w - earn.buttonInsetX * 2;
  const textW = Math.max(48, w - earn.textInsetX * 2);
  const textY = y + h - earn.textBottom;
  const imageBottomLimit = textY - (compact ? 8 : 12);
  const imageH = Math.max(compact ? 44 : earn.imageMinH, Math.min(Math.max(44, h - earn.imageBottomReserve), Math.max(34, imageBottomLimit - imageY)));
  const headerTitleSize = fitSingleLineTextSize(headerTitle, Math.max(48, w - earn.headerInset * 2 - 14), compact ? 9.2 : 10.4, earn.headerTitleSize, 0.58);
  const descriptionSize = compact ? Math.max(7.4, Math.min(earn.textSize, textW / 11.5)) : earn.textSize;
  const descriptionLineHeight = compact ? Math.max(7.4, Math.min(earn.textLineHeight, descriptionSize * 1.25)) : earn.textLineHeight;
  const descriptionMaxLines = compact ? Math.max(2, Math.min(4, Math.floor(Math.max(18, badgeY - textY - 8) / descriptionLineHeight))) : earn.textMaxLines;
  const buttonTextSize = fitSingleLineTextSize(buttonLabel, Math.max(28, badgeW - 28), 7.2, 9.5, 0.48);
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
        <Txt x={x + earn.headerTitleX} y={y + earn.headerTitleY} size={headerTitleSize} weight="950" cfg={cfg}>{headerTitle}</Txt>
      </HeaderBar>
      <TransparentAssetImage x={imageX} y={imageY} w={imageW} h={imageH} imageUrl={SHOP_EARN_FREE_AC_IMAGE_URL} cfg={cfg} glow={active} cyanGlow={hovered && !selected} />
      <WrappedText x={x + earn.textInsetX} y={textY} width={textW} lines={description} size={descriptionSize} lineHeight={descriptionLineHeight} fill={cfg.colors.frameSubtitleText} maxLines={descriptionMaxLines} cfg={cfg} />
      <rect x={badgeX} y={badgeY} width={badgeW} height={earn.buttonH} rx={cfg.svgDefaults.roundedNone} fill={active ? 'url(#shopActiveBlue)' : cfg.colors.buttonIdleFill} stroke={active ? color : cfg.colors.buttonIdleStroke} strokeWidth="1.15" />
      <Txt x={badgeX + (badgeW - 24) / 2} y={badgeY + earn.buttonH / 2 + 1} size={buttonTextSize} weight="850" anchor="middle" cfg={cfg}>{buttonLabel}</Txt>
      <line x1={badgeX + badgeW - 24} y1={badgeY + 1} x2={badgeX + badgeW - 24} y2={badgeY + earn.buttonH - 1} stroke={active ? color : cfg.colors.buttonIdleStroke} />
      <path d={`M ${badgeX + badgeW - 15} ${badgeY + 7} L ${badgeX + badgeW - 7} ${badgeY + earn.buttonH / 2} L ${badgeX + badgeW - 15} ${badgeY + earn.buttonH - 7} Z`} fill={active ? cfg.colors.buttonArrowHoverFill : cfg.colors.buttonArrowFill} />
    </g>
  );
}

function SideInfoCard({
  x,
  y,
  w,
  h,
  item,
  cfg,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  item: ShopSideItem;
  cfg: ShopPageSvgControls;
}) {
  const earn = cfg.componentTokens.leftEarnPanel;
  const token = cfg.componentTokens.sideNavCard;
  const color = toneColor(item.tone, cfg);
  const compact = w < 132 || h < 180;
  const headerTitleSize = fitSingleLineTextSize(item.title, Math.max(48, w - earn.headerInset * 2 - 14), compact ? 9.2 : 10.4, earn.headerTitleSize, 0.58);
  const badgeW = w - earn.buttonInsetX * 2;
  const badgeTextSize = fitSingleLineTextSize(item.subtitle, Math.max(44, badgeW - 8), 7.6, 9.8, 0.52);
  const imageSize = Math.max(44, Math.min(w - earn.imageInsetX * 2, h * (compact ? 0.36 : 0.42), 92));
  const imageX = x + w / 2 - imageSize / 2;
  const imageY = y + earn.imageTop + (compact ? 2 : 8);
  const badgeX = x + earn.buttonInsetX;
  const badgeY = y + h - earn.buttonBottom;
  const textY = Math.min(badgeY - 20, imageY + imageSize + (compact ? 13 : 20));
  const statusLabel = item.key === 'Events' ? 'Registration' : 'Selected';
  const arrowH = cfg.leftPanel.cardH - token.arrowTopInset * 2;
  const arrowTop = y + h / 2 - arrowH / 2;
  const arrowBottom = arrowTop + arrowH;
  return (
    <g>
      <rect x={x - token.selectedPad} y={y - token.selectedPad} width={w + token.selectedPad * 2} height={h + token.selectedPad * 2} rx={token.selectedGlowRadius} fill="none" stroke={color} strokeWidth={token.selectedGlowStrokeWidth} opacity={token.selectedGlowOpacity} filter="url(#shopSoftGlow)" />
      <path d={`M ${x + w - token.arrowEdgeInset} ${arrowTop} L ${x + w + 18} ${y + h / 2} L ${x + w - token.arrowEdgeInset} ${arrowBottom} Z`} fill={color} filter="url(#shopSoftGlow)" />
      <rect x={x} y={y} width={w} height={h} rx={cfg.leftPanel.earnRadius} fill={alphaColor(cfg.colors.activeBlue, 0.28)} stroke={color} strokeWidth="1.6" strokeOpacity="0.9" />
      <HeaderBar x={x + earn.headerInset} y={y + earn.headerInset} w={w - earn.headerInset * 2} h={earn.headerH} cfg={cfg} stroke={color}>
        <Txt x={x + earn.headerTitleX} y={y + earn.headerTitleY} size={headerTitleSize} weight="950" cfg={cfg}>{item.title}</Txt>
      </HeaderBar>
      <TransparentAssetImage x={imageX} y={imageY} w={imageSize} h={imageSize} imageUrl={item.imageUrl} cfg={cfg} glow />
      <Txt x={x + w / 2} y={textY} size={compact ? 8.2 : 9.4} weight="850" anchor="middle" fill={color} cfg={cfg}>{statusLabel}</Txt>
      <rect x={badgeX} y={badgeY} width={badgeW} height={earn.buttonH} rx={cfg.svgDefaults.roundedNone} fill={alphaColor(color, 0.16)} stroke={color} strokeWidth="1.15" strokeOpacity="0.78" />
      <Txt x={x + w / 2} y={badgeY + earn.buttonH / 2 + 1} size={badgeTextSize} weight="850" anchor="middle" fill={cfg.colors.bodyText} cfg={cfg}>{item.subtitle}</Txt>
    </g>
  );
}

export function LeftSidePanel({
  x,
  y,
  w,
  h,
  activeTab,
  earnActive,
  showEarnPanel = true,
  sideInfoItemKey,
  content,
  cfg,
  onTabChange,
  onSideItemAction,
  onEarn,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  activeTab: ShopTab;
  earnActive: boolean;
  showEarnPanel?: boolean;
  sideInfoItemKey?: ShopTab | null;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onTabChange: (tab: ShopTab) => void;
  onSideItemAction?: (item: ShopSideItem) => void;
  onEarn: () => void;
}) {
  const cardX = x + cfg.leftPanel.cardInsetX;
  const cardW = w - cfg.leftPanel.cardInsetX * 2;
  const sideInfoItem = sideInfoItemKey ? content.sideItems.find(item => item.key === sideInfoItemKey) ?? null : null;
  const sideInfoIdentity = sideInfoItem ? sideItemIdentity(sideInfoItem) : null;
  const sideItems = sideInfoIdentity ? content.sideItems.filter(item => sideItemIdentity(item) !== sideInfoIdentity) : content.sideItems;
  const earnY = y + cfg.leftPanel.pad + sideItems.length * cfg.leftPanel.cardH + Math.max(0, sideItems.length - 1) * cfg.leftPanel.cardGap + cfg.leftPanel.earnGap;
  const earn = cfg.componentTokens.leftEarnPanel;
  const earnH = Math.max(earn.imageMinH + earn.imageTop, y + h - earnY - cfg.leftPanel.earnBottomPad);
  const earnX = x + cfg.leftPanel.earnInsetX;
  const earnW = w - cfg.leftPanel.earnInsetX * 2;
  return (
    <Panel x={x} y={y} w={w} h={h} r={cfg.leftPanel.panelRadius} stroke={cfg.colors.panelStroke} cfg={cfg}>
      {sideItems.map((item, index) => (
        <SideNavCard
          key={sideItemIdentity(item)}
          x={cardX}
          y={y + cfg.leftPanel.pad + index * (cfg.leftPanel.cardH + cfg.leftPanel.cardGap)}
          w={cardW}
          h={cfg.leftPanel.cardH}
          item={item}
          selected={activeTab === item.key && !earnActive && !item.rightDetailTarget}
          cfg={cfg}
          onClick={() => onSideItemAction ? onSideItemAction(item) : onTabChange(item.key)}
        />
      ))}
      {showEarnPanel ? <EarnFreeSideCard x={earnX} y={earnY} w={earnW} h={earnH} selected={earnActive} content={content} cfg={cfg} onClick={onEarn} /> : null}
      {!showEarnPanel && sideInfoItem ? <SideInfoCard x={earnX} y={earnY} w={earnW} h={earnH} item={sideInfoItem} cfg={cfg} /> : null}
    </Panel>
  );
}

function RightPreviewContent({
  x,
  y,
  w,
  h,
  active,
  content,
  cfg,
  acBalance,
  accountSummary,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  active: ShopRightTabId;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  acBalance: number | null;
  accountSummary?: ShopAccountSummary | null;
}) {
  const meta = rightPanelMeta(active, content);
  const token = cfg.componentTokens.rightPanel;
  const rows = rightPanelDetailRows(active, acBalance, content);
  const accountMode = active === 'account';
  const profileBandH = accountMode ? Math.max(46, Math.min(58, h * 0.24)) : 0;
  const visibleRows = accountMode
    ? rows.slice(1, 4)
    : rows.slice(0, active === 'events' ? 3 : 4);
  const rowX = x + token.rowX;
  const rowW = w - token.rowX * 2;
  const rowGap = 7;
  const rowTop = y + 12 + profileBandH;
  const rowH = Math.max(24, Math.min(38, (h - 22 - profileBandH - rowGap * Math.max(0, visibleRows.length - 1)) / Math.max(1, visibleRows.length)));
  return (
    <g>
      {accountMode ? (
        <AccountSummaryBand
          x={rowX}
          y={y + 8}
          w={rowW}
          h={profileBandH - 4}
          accountSummary={accountSummary}
          content={content}
          accent={meta.accent}
          cfg={cfg}
          compact
        />
      ) : null}
      {visibleRows.map((row, index) => {
        const rowY = rowTop + index * (rowH + rowGap);
        const labelSize = fitSingleLineTextSize(row.label, rowW * 0.52, 8.4, 10.8, 0.62);
        const valueSize = fitSingleLineTextSize(row.value, rowW * 0.36, 8.2, 10.6, 0.58);
        return (
          <g key={`${active}-preview-${row.label}`}>
            <rect x={rowX} y={rowY} width={rowW} height={rowH} rx={cfg.svgDefaults.roundedNone} fill={index === 0 ? alphaColor(meta.accent, 0.14) : cfg.colors.rowFill} stroke={meta.accent} strokeWidth={index === 0 ? 1.25 : 0.9} strokeOpacity={index === 0 ? 0.72 : 0.38} />
            <rect x={rowX} y={rowY} width={4} height={rowH} rx={2} fill={meta.accent} opacity={index === 0 ? 0.95 : 0.58} />
            <Txt x={rowX + 11} y={rowY + rowH * 0.42} size={labelSize} weight="950" fill={index === 0 ? meta.accent : cfg.colors.bodyText} cfg={cfg}>{row.label}</Txt>
            <Txt x={rowX + rowW - 10} y={rowY + rowH * 0.42} size={valueSize} weight="950" anchor="end" fill={meta.accent} cfg={cfg}>{row.value}</Txt>
            <WrappedText x={rowX + 11} y={rowY + rowH - 8} width={rowW - 22} lines={row.detail} size={6.9} lineHeight={7.6} fill={cfg.colors.mutedText} weight={600} maxLines={1} cfg={cfg} />
          </g>
        );
      })}
    </g>
  );
}

function splitRightPanelTabTitle(title: string): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [title];
  if (title.includes('&')) {
    const markerIndex = words.indexOf('&');
    if (markerIndex > 0 && markerIndex < words.length - 1) {
      return [words.slice(0, markerIndex + 1).join(' '), words.slice(markerIndex + 1).join(' ')];
    }
  }
  const splitAt = Math.ceil(words.length / 2);
  return [words.slice(0, splitAt).join(' '), words.slice(splitAt).join(' ')];
}

function RightPanelSelectorCard({
  x,
  y,
  w,
  h,
  tab,
  selected,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tab: ShopRightTab;
  selected: boolean;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const token = cfg.componentTokens.sideNavCard;
  const color = selected ? cfg.colors.activeBlue : tab.accent;
  const active = selected || hovered;
  const activeFill = alphaColor(color, cfg.componentTokens.cardChrome.activeFillOpacity);
  const arrowTop = y + token.arrowTopInset;
  const arrowBottom = y + h - token.arrowTopInset;
  const labelW = Math.max(24, w - 16);
  const singleLineReadableMin = 8.4;
  const rawSingleLineSize = labelW / (Math.max(1, tab.title.length) * 0.58);
  const compactLabel = rawSingleLineSize < singleLineReadableMin;
  const labelLines = compactLabel ? splitRightPanelTabTitle(tab.title) : [tab.title];
  const singleLineSize = fitSingleLineTextSize(tab.title, labelW, singleLineReadableMin, 10.8, 0.58);
  const lineSize = labelLines.length > 1
    ? Math.min(9.6, Math.min(...labelLines.map(line => fitSingleLineTextSize(line, labelW, 7.2, 9.6, 0.58))))
    : singleLineSize;
  const fill = selected ? cfg.colors.bodyText : cfg.colors.tileSubtitleText;
  return (
    <g onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={cfg.svgDefaults.cursorPointerClassName} role="button" tabIndex={0}>
      {selected ? (
        <>
          <rect x={x - token.selectedPad} y={y - token.selectedPad} width={w + token.selectedPad * 2} height={h + token.selectedPad * 2} rx={token.selectedGlowRadius} fill="none" stroke={color} strokeWidth={token.selectedGlowStrokeWidth} opacity={token.selectedGlowOpacity} filter="url(#shopSoftGlow)" />
          <path d={`M ${x + token.arrowEdgeInset} ${arrowTop} L ${x - 18} ${y + h / 2} L ${x + token.arrowEdgeInset} ${arrowBottom} Z`} fill={color} filter="url(#shopSoftGlow)" />
        </>
      ) : null}
      {hovered && !selected ? <rect x={x - token.hoverPad} y={y - token.hoverPad} width={w + token.hoverPad * 2} height={h + token.hoverPad * 2} rx={token.hoverGlowRadius} fill="none" stroke={color} strokeWidth={token.hoverGlowStrokeWidth} opacity={token.hoverGlowOpacity} filter="url(#shopSoftGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx={cfg.leftPanel.cardRadius} fill={selected ? alphaColor(cfg.colors.activeBlue, 0.36) : hovered ? activeFill : cfg.colors.panelFill} stroke={active ? color : cfg.colors.tileStroke} strokeWidth={active ? 1.6 : 1.25} />
      {labelLines.length > 1 ? (
        labelLines.map((line, index) => (
          <Txt key={`${tab.id}-${line}`} x={x + w / 2} y={y + h / 2 + (index === 0 ? -4.6 : 5.4)} size={lineSize} weight="950" fill={fill} anchor="middle" cfg={cfg}>{line}</Txt>
        ))
      ) : (
        <Txt x={x + w / 2} y={y + h / 2 + 1} size={lineSize} weight="950" fill={fill} anchor="middle" cfg={cfg}>{tab.title}</Txt>
      )}
    </g>
  );
}

export function RightSidePanel({
  x,
  y,
  w,
  h,
  content,
  cfg,
  acBalance,
  accountSummary,
  active,
  onActiveChange,
  onPreviewOpen,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  acBalance: number | null;
  accountSummary?: ShopAccountSummary | null;
  active: ShopRightTabId;
  onActiveChange: (id: ShopRightTabId) => void;
  onPreviewOpen: () => void;
}) {
  const [previewHovered, setPreviewHovered] = useState(false);
  const activeMeta = rightPanelMeta(active, content);
  const token = cfg.componentTokens.rightPanel;
  const sideToken = cfg.componentTokens.sideNavCard;
  const rightTabs = content.rightTabs;
  const mainH = h - cfg.rightPanel.pad * 2 - cfg.rightPanel.tabGap * rightTabs.length - cfg.rightPanel.tabH * rightTabs.length;
  const mainX = x + cfg.rightPanel.pad;
  const mainY = y + cfg.rightPanel.pad;
  const mainW = w - cfg.rightPanel.pad * 2;
  const tabsY = mainY + mainH;
  const selectorH = h - cfg.rightPanel.pad - tabsY + y;
  const arrowTop = mainY + mainH / 2 - 32;
  const arrowBottom = mainY + mainH / 2 + 32;
  return (
    <Panel x={x} y={y} w={w} h={h} r={cfg.rightPanel.radius} stroke={cfg.colors.panelStroke} cfg={cfg}>
      <g onClick={onPreviewOpen} onMouseEnter={() => setPreviewHovered(true)} onMouseLeave={() => setPreviewHovered(false)} role="button" tabIndex={0} className={cfg.svgDefaults.cursorPointerClassName}>
        {previewHovered ? (
          <>
            <rect x={mainX - sideToken.hoverPad} y={mainY - sideToken.hoverPad} width={mainW + sideToken.hoverPad * 2} height={mainH + sideToken.hoverPad * 2} rx={sideToken.hoverGlowRadius} fill="none" stroke={activeMeta.accent} strokeWidth={sideToken.hoverGlowStrokeWidth} opacity={sideToken.hoverGlowOpacity} filter="url(#shopSoftGlow)" />
            <path d={`M ${mainX + sideToken.arrowEdgeInset} ${arrowTop} L ${mainX - 18} ${mainY + mainH / 2} L ${mainX + sideToken.arrowEdgeInset} ${arrowBottom} Z`} fill={activeMeta.accent} filter="url(#shopSoftGlow)" />
          </>
        ) : null}
        <path d={topRoundedRectPath(mainX, mainY, mainW, mainH, token.panelRadius)} fill="none" stroke={activeMeta.accent} strokeWidth={previewHovered ? token.previewGlowWidth + 0.8 : token.previewGlowWidth} opacity={previewHovered ? 0.56 : token.previewGlowOpacity} filter="url(#shopSoftGlow)" />
        <path d={topRoundedRectPath(mainX, mainY, mainW, mainH, token.panelRadius)} fill={previewHovered ? alphaColor(activeMeta.accent, 0.12) : cfg.colors.panelFill} stroke={activeMeta.accent} strokeWidth={previewHovered ? token.previewStrokeWidth + 0.6 : token.previewStrokeWidth} />
        <HeaderBar
          x={mainX + token.previewHeaderInset}
          y={mainY + token.previewHeaderInset}
          w={mainW - token.previewHeaderInset * 2}
          h={cfg.rightPanel.previewHeaderH}
          stroke={activeMeta.accent}
          cfg={cfg}
        >
          <Txt x={mainX + token.previewHeaderTitleX} y={mainY + token.previewHeaderTitleY} size={token.previewHeaderTitleSize} weight="950" fill={activeMeta.accent} cfg={cfg}>{activeMeta.title}</Txt>
          {previewHovered ? (
            <g>
              <rect x={mainX + mainW - 70} y={mainY + token.previewHeaderInset + 6} width="54" height="17" rx="4" fill={alphaColor(activeMeta.accent, 0.18)} stroke={activeMeta.accent} strokeOpacity="0.72" />
              <Txt x={mainX + mainW - 43} y={mainY + token.previewHeaderInset + 17} anchor="middle" size="8.4" weight="950" fill={cfg.colors.bodyText} cfg={cfg}>{content.uiCopy.rightPanel.moreLabel}</Txt>
            </g>
          ) : null}
        </HeaderBar>
        <RightPreviewContent x={mainX} y={mainY + cfg.rightPanel.previewHeaderH} w={mainW} h={mainH - cfg.rightPanel.previewHeaderH} active={active} content={content} cfg={cfg} acBalance={acBalance} accountSummary={accountSummary} />
      </g>
      <path d={bottomRoundedRectPath(mainX, tabsY, mainW, selectorH, token.panelRadius)} fill={cfg.colors.tileFooterFill} stroke={activeMeta.accent} strokeWidth={token.previewStrokeWidth} strokeOpacity=".82" />
      {rightTabs.map((tab, index) => (
        <RightPanelSelectorCard
          key={tab.id}
          x={mainX + token.tabBoxInsetX}
          y={tabsY + token.tabStartGap + token.tabBoxInsetY + index * (cfg.rightPanel.tabH + cfg.rightPanel.tabGap)}
          w={mainW - token.tabBoxInsetX * 2}
          h={cfg.rightPanel.tabH - token.tabBoxInsetY * 2}
          tab={tab}
          selected={active === tab.id}
          cfg={cfg}
          onClick={() => onActiveChange(tab.id)}
        />
      ))}
    </Panel>
  );
}

export function RightPanelDetailLayer({
  x,
  y,
  w,
  h,
  active,
  acBalance,
  accountSummary,
  content,
  cfg,
  onClose,
  onElite,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  active: ShopRightTabId;
  acBalance: number | null;
  accountSummary?: ShopAccountSummary | null;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  onElite: () => void;
}) {
  const meta = rightPanelMeta(active, content);
  const rows = rightPanelDetailRows(active, acBalance, content);
  const detailTitle = rightPanelFullTitle(active, content);
  const accountMode = active === 'account';
  const detailRows = accountMode ? rows.slice(1) : rows;
  const body = mainBottomOverlayContentRect(x, y, w, h, false);
  const pad = Math.max(10, Math.min(18, body.w * 0.012));
  const panelX = body.x + pad;
  const panelY = body.y + pad;
  const panelW = Math.max(260, body.w - pad * 2);
  const availablePanelH = Math.max(160, body.h - pad * 2);
  const rowGap = 10;
  const rowTopPad = Math.max(14, Math.min(22, availablePanelH * 0.045));
  const accountBandH = accountMode ? Math.max(72, Math.min(92, availablePanelH * 0.22)) : 0;
  const rowBottomPad = active === 'pass' ? 58 : rowTopPad;
  const rowAreaH = Math.max(0, availablePanelH - rowTopPad - accountBandH - rowBottomPad);
  const rowH = Math.max(42, Math.min(66, (rowAreaH - rowGap * Math.max(0, detailRows.length - 1)) / Math.max(1, detailRows.length)));
  const panelH = Math.min(availablePanelH, rowTopPad + accountBandH + detailRows.length * rowH + rowGap * Math.max(0, detailRows.length - 1) + rowBottomPad);
  const rowAreaY = panelY + rowTopPad + accountBandH;
  return (
    <g>
      <MainBottom x={x} y={y} w={w} h={h} label={detailTitle} count={detailRows.length} rightActionLabel={content.uiCopy.actions.backToShop} onRightAction={onClose} showNavigation={false} />
      <path d={lobbyRoundedRectPath(panelX, panelY, panelW, panelH, 8)} fill={alphaColor(meta.accent, 0.055)} stroke={meta.accent} strokeWidth="1.1" strokeOpacity="0.44" />
      {accountMode ? (
        <AccountSummaryBand
          x={panelX + 16}
          y={panelY + rowTopPad}
          w={panelW - 32}
          h={accountBandH - 12}
          accountSummary={accountSummary}
          content={content}
          accent={meta.accent}
          cfg={cfg}
        />
      ) : null}
      {detailRows.map((row, index) => {
        const rowY = rowAreaY + index * (rowH + rowGap);
        const activeRow = index === 0;
        return (
          <g key={`${active}-${row.label}`}>
            <rect x={panelX + 16} y={rowY} width={panelW - 32} height={rowH} rx="6" fill={activeRow ? alphaColor(meta.accent, 0.16) : cfg.colors.rowFill} stroke={meta.accent} strokeWidth={activeRow ? 1.35 : 1} strokeOpacity={activeRow ? 0.76 : 0.38} />
            <rect x={panelX + 16} y={rowY} width={5} height={rowH} rx={2.5} fill={meta.accent} opacity={activeRow ? 0.95 : 0.62} />
            <Txt x={panelX + 34} y={rowY + 19} size={activeRow ? 13.6 : 12.2} weight="950" fill={activeRow ? meta.accent : cfg.colors.bodyText} cfg={cfg}>{row.label}</Txt>
            <Txt x={panelX + panelW - 34} y={rowY + 19} size={activeRow ? 13.2 : 11.8} weight="950" anchor="end" fill={meta.accent} cfg={cfg}>{row.value}</Txt>
            <WrappedText x={panelX + 34} y={rowY + rowH - 14} width={panelW - 68} lines={row.detail} size={9.6} lineHeight={11.4} fill={cfg.colors.mutedText} weight={600} maxLines={1} cfg={cfg} />
          </g>
        );
      })}
      {active === 'pass' ? (
        <SvgButton
          x={panelX + panelW - 190}
          y={panelY + panelH - 42}
          w={170}
          h={28}
          label={content.uiCopy.rightPanel.openEliteShop}
          active
          small
          onClick={onElite}
          cfg={cfg}
        />
      ) : null}
    </g>
  );
}
