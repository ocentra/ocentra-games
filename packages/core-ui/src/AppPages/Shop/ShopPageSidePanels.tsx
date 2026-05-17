import { useState } from 'react';
import { HeaderBar, InfoRow, Panel, ProductImage, SvgButton, Txt, WrappedText } from './ShopPageSvgPrimitives';
import {
  SHOP_EARN_FREE_AC_IMAGE_URL,
  type ShopRightTab,
  type ShopSideItem,
} from './ShopPageSvgData';
import type { ShopPageContentData } from './ShopPageSvgContent';
import { bottomRoundedRectPath, toneColor, topRoundedRectPath } from './ShopPageSvgGeometry';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import type { ShopTab } from './ShopPageSvgTypes';
import { alphaColor, fitSingleLineTextSize } from './ShopPageSvgUtils';
import { TransparentAssetImage } from './ShopPageAssetArtwork';
import { SectionFrame } from './ShopPageSectionFrame';
import { sectionFrameContentRect } from './ShopPageSectionFrameGeometry';
import { roundedRectPath as lobbyRoundedRectPath } from '../Lobby/LobbyPageSvgGeometry';

export type ShopRightTabId = ShopRightTab['id'];

function rightPanelMeta(id: ShopRightTabId, content: ShopPageContentData): ShopRightTab {
  return content.rightTabs.find(tab => tab.id === id) ?? content.rightTabs[0];
}

function rightPanelDetailRows(id: ShopRightTabId, acBalance: number, content: ShopPageContentData): Array<{ label: string; value: string; detail: string }> {
  if (id === 'wallet') {
    const details = content.rightDetails.wallet;
    return content.rightRows.wallet.map((row, index) => ({
      label: row[0],
      value: index === 0 ? `${acBalance.toLocaleString()} ${row[1]}` : row[1],
      detail: details[index]?.detail ?? 'Account balance state for this shop tab.',
    }));
  }
  if (id === 'events') {
    const details = content.rightDetails.events;
    return content.rightRows.events.map((row, index) => ({
      label: row[0],
      value: row[1],
      detail: details[index]?.detail ?? `${row[2]} state for this event entry.`,
    }));
  }
  if (id === 'recent') {
    const details = content.rightDetails.recent;
    return content.rightRows.recent.map((row, index) => ({
      label: row[0],
      value: row[1],
      detail: details[index]?.detail ?? (row[1].startsWith('+') ? 'Credit added to marketplace balance.' : 'Marketplace purchase recorded in account history.'),
    }));
  }
  return content.rightDetails[id] ?? content.rightDetails.account;
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
        <Txt x={x + earn.headerTitleX} y={y + earn.headerTitleY} size={earn.headerTitleSize} weight="950" cfg={cfg}>{content.uiCopy.earnPanel.title}</Txt>
      </HeaderBar>
      <TransparentAssetImage x={imageX} y={imageY} w={imageW} h={imageH} imageUrl={SHOP_EARN_FREE_AC_IMAGE_URL} cfg={cfg} glow={active} cyanGlow={hovered && !selected} />
      <WrappedText x={x + earn.textInsetX} y={y + h - earn.textBottom} width={w - earn.textInsetX * 2} lines={content.uiCopy.earnPanel.description} size={earn.textSize} lineHeight={earn.textLineHeight} fill={cfg.colors.frameSubtitleText} maxLines={earn.textMaxLines} cfg={cfg} />
      <rect x={badgeX} y={badgeY} width={badgeW} height={earn.buttonH} rx={cfg.svgDefaults.roundedNone} fill={active ? 'url(#shopActiveBlue)' : cfg.colors.buttonIdleFill} stroke={active ? color : cfg.colors.buttonIdleStroke} strokeWidth="1.15" />
      <Txt x={badgeX + badgeW / 2 - 8} y={badgeY + earn.buttonH / 2 + 1} size="9.5" weight="850" anchor="middle" cfg={cfg}>{content.uiCopy.earnPanel.buttonLabel}</Txt>
      <line x1={badgeX + badgeW - 24} y1={badgeY + 1} x2={badgeX + badgeW - 24} y2={badgeY + earn.buttonH - 1} stroke={active ? color : cfg.colors.buttonIdleStroke} />
      <path d={`M ${badgeX + badgeW - 15} ${badgeY + 7} L ${badgeX + badgeW - 7} ${badgeY + earn.buttonH / 2} L ${badgeX + badgeW - 15} ${badgeY + earn.buttonH - 7} Z`} fill={active ? cfg.colors.buttonArrowHoverFill : cfg.colors.buttonArrowFill} />
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
  content,
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
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onTabChange: (tab: ShopTab) => void;
  onEarn: () => void;
}) {
  const cardX = x + cfg.leftPanel.cardInsetX;
  const cardW = w - cfg.leftPanel.cardInsetX * 2;
  const sideItems = content.sideItems;
  const earnY = y + cfg.leftPanel.pad + sideItems.length * cfg.leftPanel.cardH + Math.max(0, sideItems.length - 1) * cfg.leftPanel.cardGap + cfg.leftPanel.earnGap;
  const earn = cfg.componentTokens.leftEarnPanel;
  const earnH = Math.max(earn.imageMinH + earn.imageTop, y + h - earnY - cfg.leftPanel.earnBottomPad);
  const earnX = x + cfg.leftPanel.earnInsetX;
  const earnW = w - cfg.leftPanel.earnInsetX * 2;
  return (
    <Panel x={x} y={y} w={w} h={h} r={cfg.leftPanel.panelRadius} stroke={cfg.colors.panelStroke} cfg={cfg}>
      {sideItems.map((item, index) => (
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
      <EarnFreeSideCard x={earnX} y={earnY} w={earnW} h={earnH} selected={earnActive} content={content} cfg={cfg} onClick={onEarn} />
    </Panel>
  );
}

function RightPreviewContent({
  x,
  y,
  w,
  h: _h,
  active,
  content,
  cfg,
  acBalance,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  active: ShopRightTabId;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  acBalance: number;
}) {
  const token = cfg.componentTokens.rightPanel;
  if (active === 'wallet') {
    const dotColors = [cfg.colors.gold, cfg.colors.activeBlue, cfg.colors.green, cfg.colors.violet, cfg.colors.orange];
    const rows = content.rightRows.wallet.map((row, index) => index === 0 ? [row[0], `${acBalance.toLocaleString()} ${row[1]}`] : row);
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
        <ProductImage x={x + token.imageInsetX} y={y + token.passImageY} w={w - token.imageInsetX * 2} h={token.passImageH} imageUrl={(content.passes[1] ?? content.passes[0])?.imageUrl ?? ''} cfg={cfg} />
        <rect x={x + token.imageInsetX} y={y + token.passOverlayY} width={w - token.imageInsetX * 2} height={token.passOverlayH} fill={cfg.colors.tileOverlayFill} />
        <Txt x={x + token.imageInsetX + token.rowX} y={y + token.passOverlayY + token.passOverlayH / 2 - 1} size={token.accountNameSize} weight="950" cfg={cfg}>Champion Pass</Txt>
      </g>
    );
  }

  if (active === 'events') {
    return (
      <g>
        <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.violet} cfg={cfg}>UPCOMING EVENTS</Txt>
        {content.rightRows.events.map((row, index) => (
          <g key={row[0]}>
            <rect x={x + token.rowX} y={y + token.eventFirstRowY + index * token.eventRowGap} width={w - token.rowX * 2} height={token.eventRowH} rx={cfg.svgDefaults.roundedNone} fill={cfg.colors.rowFill} stroke={cfg.colors.violet} />
            <Txt x={x + token.rowX * 2} y={y + token.eventFirstRowY + token.contentTitleSize + index * token.eventRowGap} size={token.eventButtonH / 2} weight="900" cfg={cfg}>{row[0]}</Txt>
            <Txt x={x + token.rowX * 2} y={y + token.eventFirstRowY + token.contentTitleSize + token.accountEloSize + index * token.eventRowGap} fill={cfg.colors.mutedText} size={token.accountEloSize - 3.2} cfg={cfg}>{row[1]}</Txt>
            <rect x={x + w - token.eventButtonRight} y={y + token.eventButtonY + index * token.eventRowGap} width={token.eventButtonW} height={token.eventButtonH} rx="4" fill={alphaColor(cfg.colors.violet, 0.12)} stroke={cfg.colors.violet} strokeOpacity="0.48" />
            <Txt x={x + w - token.eventButtonRight + token.eventButtonW / 2} y={y + token.eventButtonY + token.eventButtonH / 2 + index * token.eventRowGap + 1} anchor="middle" size="8.6" weight="900" fill={cfg.colors.tileSubtitleText} cfg={cfg}>{row[2]}</Txt>
          </g>
        ))}
      </g>
    );
  }

  if (active === 'recent') {
    return (
      <g>
        <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.green} cfg={cfg}>RECENT PURCHASES</Txt>
        {content.rightRows.recent.map((row, index) => <InfoRow key={row[0]} x={x + token.rowX} y={y + token.recentFirstRowY + index * token.recentRowGap} w={w - token.rowX * 2} label={row[0]} value={row[1]} stroke={cfg.colors.green} cfg={cfg} />)}
      </g>
    );
  }

  return (
    <g>
      <Txt x={x + token.contentTitleX} y={y + token.contentTitleY} size={token.contentTitleSize} weight="950" fill={cfg.colors.activeBlue} cfg={cfg}>ACCOUNT PREVIEW</Txt>
      <circle cx={x + token.accountAvatarX} cy={y + token.accountAvatarY} r={token.accountAvatarR} fill={alphaColor(cfg.colors.violet, 0.1)} stroke={cfg.colors.activeBlue} strokeWidth={token.previewStrokeWidth} />
      <Txt x={x + token.accountNameX} y={y + token.accountNameY} size={token.accountNameSize} weight="950" cfg={cfg}>{content.uiCopy.rightPanel.profileName}</Txt>
      <Txt x={x + token.accountNameX} y={y + token.accountEloY} fill={cfg.colors.mutedText} size={token.accountEloSize} weight="600" cfg={cfg}>{content.uiCopy.rightPanel.profileElo}</Txt>
      <rect x={x + token.accountNameX} y={y + token.accountProgressY} width={w - token.accountNameX - token.contentTitleX * 2} height={token.accountProgressH} rx={token.accountProgressH / 2} fill={cfg.colors.headerFill} />
      <rect x={x + token.accountNameX} y={y + token.accountProgressY} width={Math.min(token.accountNameX + token.contentTitleX, w - token.accountNameX - token.contentTitleX * 3)} height={token.accountProgressH} rx={token.accountProgressH / 2} fill={cfg.colors.activeBlue} />
    </g>
  );
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
      <Txt x={x + w / 2} y={y + h / 2 + 1} size={Math.max(8.8, Math.min(10.8, w / Math.max(16, tab.title.length * 0.72)))} weight="950" fill={selected ? cfg.colors.bodyText : cfg.colors.tileSubtitleText} anchor="middle" cfg={cfg}>{tab.title}</Txt>
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
  acBalance: number;
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
              <Txt x={mainX + mainW - 43} y={mainY + token.previewHeaderInset + 17} anchor="middle" size="8.4" weight="950" fill={cfg.colors.bodyText} cfg={cfg}>MORE...</Txt>
            </g>
          ) : null}
        </HeaderBar>
        <RightPreviewContent x={mainX} y={mainY + cfg.rightPanel.previewHeaderH} w={mainW} h={mainH - cfg.rightPanel.previewHeaderH} active={active} content={content} cfg={cfg} acBalance={acBalance} />
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
  acBalance: number;
  content: ShopPageContentData;
  cfg: ShopPageSvgControls;
  onClose: () => void;
  onElite: () => void;
}) {
  const meta = rightPanelMeta(active, content);
  const rows = rightPanelDetailRows(active, acBalance, content);
  const contentRect = sectionFrameContentRect(x, y, w, h, cfg, false, false);
  const pad = Math.max(8, Math.min(14, contentRect.w * 0.012));
  const panelX = contentRect.x + pad;
  const panelY = contentRect.y + pad;
  const panelW = Math.max(260, contentRect.w - pad * 2);
  const availablePanelH = Math.max(160, contentRect.h - pad * 2);
  const rowGap = 10;
  const rowTopPad = Math.max(14, Math.min(22, availablePanelH * 0.045));
  const rowBottomPad = active === 'pass' ? 58 : rowTopPad;
  const rowAreaH = Math.max(0, availablePanelH - rowTopPad - rowBottomPad);
  const rowH = Math.max(42, Math.min(66, (rowAreaH - rowGap * Math.max(0, rows.length - 1)) / Math.max(1, rows.length)));
  const panelH = Math.min(availablePanelH, rowTopPad + rows.length * rowH + rowGap * Math.max(0, rows.length - 1) + rowBottomPad);
  const rowAreaY = panelY + rowTopPad;
  return (
    <SectionFrame x={x} y={y} w={w} h={h} title={meta.title} subtitle="" rightText="Back To Shop" accent={meta.accent} cfg={cfg} onRightTextClick={onClose} hideSubtitle>
      <path d={lobbyRoundedRectPath(panelX, panelY, panelW, panelH, 8)} fill={alphaColor(meta.accent, 0.055)} stroke={meta.accent} strokeWidth="1.1" strokeOpacity="0.44" />
      {rows.map((row, index) => {
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
          label="Open Elite Shop"
          active
          small
          onClick={onElite}
          cfg={cfg}
        />
      ) : null}
    </SectionFrame>
  );
}
