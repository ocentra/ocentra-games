import type { KeyboardEvent, ReactNode } from 'react';
import {
  LOBBY_CONFIG,
  MODE_TABS,
  REWARD_SPINNER,
  SIDEBAR_ACTIONS,
  SIDEBAR_NAV_ITEMS,
} from './LobbyPageSvgData';
import { badgeWidth, roundedRectPath } from './LobbyPageSvgGeometry';
import {
  Avatar,
  Btn,
  CenterTxt,
  Icon,
  Panel,
  SideHandle,
  Txt,
} from './LobbyPageSvgPrimitives';
import type {
  FeaturedCardData,
  LobbyActiveFilterItem,
  LobbyChatMessageItem,
  LobbyFriendItem,
  LobbyHeaderStats,
  LobbyHeroMedia,
  LobbyNavigationTarget,
  LobbyPartyStatus,
  LobbyPanelRect,
  LobbyRewardStatus,
  LobbyRoomListFilterDraft,
  LobbyServerStatus,
  LobbyTableRow,
  LobbyUserSummary,
} from './LobbyPageSvgTypes';
import type { LobbyPageSvgControls } from './LobbyPageSvgSurfaceControls';

const NavigationTargetByLabel: Record<string, LobbyNavigationTarget> = {
  LOBBY: 'lobby',
  TOURNAMENTS: 'tournaments',
  LEADERBOARD: 'leaderboard',
  REWARDS: 'rewards',
  STORE: 'shop',
  PROFILE: 'profile',
  SETTINGS: 'settings',
};

function titleCaseFilter(value: string | undefined): string {
  if (!value) return 'All';
  return value
    .split('-')
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function filterSummaryValue(label: string, filters?: LobbyRoomListFilterDraft): string {
  if (!filters) return label === 'Status' ? 'Waiting' : label === 'Sort By' ? 'Newest' : 'All';
  if (label === 'Mode') return titleCaseFilter(filters.mode);
  if (label === 'Status') return titleCaseFilter(filters.status ?? 'waiting');
  if (label === 'Visibility') return titleCaseFilter(filters.visibility);
  if (label === 'Stakes') return titleCaseFilter(filters.stakeType);
  if (label === 'AI') {
    if (filters.allowAI === true) return 'Allowed';
    if (filters.allowAI === false) return 'No AI';
    return 'All';
  }
  if (label === 'Sort By') return titleCaseFilter(filters.sort ?? 'newest');
  return 'All';
}

function handleSvgButtonKey(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
}

export function SidebarAction({ x, y, w, h, label, sub, icon, active, onClick }: { x: number; y: number; w: number; h: number; label: string; sub: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <g
      className={`lobby-ui-hit ${active ? 'is-active' : ''}`}
      onClick={onClick}
      onKeyDown={(event) => handleSvgButtonKey(event, onClick)}
      filter={active ? 'url(#lobbyPurpleGlow)' : undefined}
      role="button"
      aria-label={label}
      tabIndex={0}
    >
      <rect x={x} y={y} width={w} height={h} rx="8" fill={active ? 'url(#lobbyPurpleSoft)' : '#071322'} stroke={active ? '#6d35ff' : '#1d344c'} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={Math.min(18, h * 0.35)} rx="8" fill="#fff" opacity="0.045" />
      <Icon x={x + 18} y={y + (h - Math.min(28, h * 0.5)) / 2 - 2} type={icon} />
      <Txt x={x + 56} y={y + h * 0.42} text={label} maxWidth={w - 70} size={13.2} weight="900" />
      <Txt x={x + 56} y={y + h * 0.72} text={sub} maxWidth={w - 70} size={10.2} opacity={0.7} />
    </g>
  );
}

export function MiniRewardSpinner({
  x,
  y,
  w,
  h,
  onClick,
  reward,
  disabled,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  onClick: () => void;
  reward?: LobbyRewardStatus | null;
  disabled?: boolean;
}) {
  const cx = x + w * 0.5;
  const cy = y + h * 0.56;
  const r = Math.min(w, h) * 0.31;
  const innerR = r * 0.22;
  const title = reward?.rewardLabel ?? REWARD_SPINNER.title;
  const readyLabel = reward?.claiming ? 'CLAIMING...' : reward?.readyLabel ?? REWARD_SPINNER.readyLabel;
  const isDisabled = Boolean(disabled || reward?.claiming || (reward && !reward.available && !reward.claimed));
  const toPt = (ang: number, rad: number) => {
    const a = (ang - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  };
  const wedgePath = (i: number) => {
    const a0 = i * 360 / REWARD_SPINNER.labels.length;
    const a1 = (i + 1) * 360 / REWARD_SPINNER.labels.length;
    const [p0x, p0y] = toPt(a0, innerR);
    const [p1x, p1y] = toPt(a0, r - 2);
    const [p2x, p2y] = toPt(a1, r - 2);
    const [p3x, p3y] = toPt(a1, innerR);
    return `M${p0x} ${p0y} L${p1x} ${p1y} A${r - 2} ${r - 2} 0 0 1 ${p2x} ${p2y} L${p3x} ${p3y} A${innerR} ${innerR} 0 0 0 ${p0x} ${p0y} Z`;
  };
  return (
    <g
      className={isDisabled ? '' : 'lobby-ui-hit'}
      onClick={() => {
        if (!isDisabled) onClick();
      }}
      onKeyDown={(event) => {
        if (!isDisabled) handleSvgButtonKey(event, onClick);
      }}
      filter="url(#lobbyPurpleGlow)"
      role="button"
      aria-label="DAILY REWARD"
      tabIndex={isDisabled ? -1 : 0}
      opacity={isDisabled ? 0.78 : 1}
    >
      <rect x={x} y={y} width={w} height={h} rx="10" fill="#100f2d" stroke="#6d35ff" strokeWidth="1.2" />
      <CenterTxt x={x + 12} y={y + 10} w={w - 24} h={26} text={title} size={12.8} weight="950" />
      <ellipse cx={cx} cy={cy + r * 0.96} rx={r * 0.92} ry="8" fill="#000" opacity="0.34" />
      <circle cx={cx} cy={cy} r={r + 12} fill="#071321" stroke="#58bfff" strokeWidth="1.1" filter="url(#lobbyCyanGlow)" />
      <circle cx={cx} cy={cy} r={r + 2} fill="#06111f" stroke="#7d49ff" strokeWidth="2.2" filter="url(#lobbyPurpleGlow)" />
      {REWARD_SPINNER.labels.map((label, i) => {
        const mid = i * 360 / REWARD_SPINNER.labels.length + 360 / REWARD_SPINNER.labels.length / 2;
        const [tx, ty] = toPt(mid, r * 0.73);
        return (
          <g key={`${label}-${i}`}>
            <path d={wedgePath(i)} fill={REWARD_SPINNER.colors[i]} stroke="#06111f" strokeWidth="0.55" />
            <text x={tx} y={ty} fill="#ffffff" fontSize={label.length >= 3 ? 6.5 : 7.4} fontWeight="950" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${tx} ${ty})`}>{label}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.33} fill="url(#lobbyGold)" stroke="#ffca4b" strokeWidth="0.7" filter="url(#lobbyGoldGlow)" />
      <rect x={x + 46} y={y + h - 32} width={w - 92} height="20" rx="8" fill="#17143c" stroke="#5f35e8" opacity="0.96" />
      <CenterTxt x={x + 46} y={y + h - 32} w={w - 92} h={20} text={readyLabel} size={9.5} weight="900" />
      {reward?.balanceLabel ? <CenterTxt x={x + 12} y={y + h - 54} w={w - 24} h={18} text={reward.balanceLabel} size={9.2} weight="850" fill="#95e8ff" /> : null}
    </g>
  );
}

export function Sidebar({
  controls,
  panel,
  useSampleData,
  onOpenActionPopup,
  onNavigate,
  reward,
  onClaimReward,
}: {
  controls: LobbyPageSvgControls;
  panel: LobbyPanelRect;
  useSampleData: boolean;
  onOpenActionPopup: (type: string) => void;
  onNavigate?: (target: LobbyNavigationTarget) => void;
  reward?: LobbyRewardStatus | null;
  onClaimReward?: () => void;
}) {
  const side = { ...controls.leftPanel, ...panel };
  const innerX = side.x + side.pad;
  const innerW = side.w - side.pad * 2;
  const top = { x: innerX, y: side.y + side.pad, w: innerW, h: 292 };
  const nav = { x: innerX, y: top.y + top.h + 8, w: innerW, h: 344 };
  const promo = { x: innerX, y: nav.y + nav.h + 8, w: innerW, h: side.y + side.h - (nav.y + nav.h + 8) - side.pad };
  const actionH = (top.h - 16 - side.actionGap * (SIDEBAR_ACTIONS.length - 1)) / SIDEBAR_ACTIONS.length;
  const itemH = (nav.h - 16 - side.navGap * (SIDEBAR_NAV_ITEMS.length - 1)) / SIDEBAR_NAV_ITEMS.length;
  return (
    <Panel x={side.x} y={side.y} w={side.w} h={side.h} r={{ tl: 12, tr: 0, br: 0, bl: 12 }} stroke={controls.colors.panelStroke} fill="url(#lobbySide)" strokeWidth={controls.layout.panelStrokeWidth}>
      <Panel x={top.x} y={top.y} w={top.w} h={top.h} r={10} stroke="#1f3953" fill="rgba(4,10,18,0.18)">
        {SIDEBAR_ACTIONS.map((action, i) => (
          <SidebarAction
            key={action.key}
            x={top.x + 4}
            y={top.y + 8 + (actionH + side.actionGap) * i}
            w={top.w - 8}
            h={actionH}
            label={action.label}
            sub={action.sub}
            icon={action.icon}
            active={action.active}
            onClick={() => onOpenActionPopup(action.key)}
          />
        ))}
      </Panel>
      <Panel x={nav.x} y={nav.y} w={nav.w} h={nav.h} r={10} stroke="#1f3953" fill="rgba(4,10,18,0.18)">
        {SIDEBAR_NAV_ITEMS.map(([label, icon, color, active], i) => {
          const y = nav.y + 8 + i * (itemH + side.navGap);
          return (
            <g
              key={label}
              className={`lobby-ui-hit ${active ? 'is-active' : ''}`}
              onClick={() => onNavigate?.(NavigationTargetByLabel[label] ?? 'lobby')}
              onKeyDown={(event) => handleSvgButtonKey(event, () => onNavigate?.(NavigationTargetByLabel[label] ?? 'lobby'))}
              role="button"
              aria-label={label}
              tabIndex={0}
            >
              <rect x={nav.x + 4} y={y} width={nav.w - 8} height={itemH} rx="6" fill={active ? 'url(#lobbyPurpleSoft)' : '#06111f'} stroke={active ? '#6d35ff' : '#172b42'} />
              {active ? <rect x={nav.x + 4} y={y} width="4" height={itemH} rx="2" fill="#7d49ff" /> : null}
              <Icon x={nav.x + 22} y={y + Math.max(5, (itemH - 30) / 2)} type={icon} color={color} />
              <Txt x={nav.x + 58} y={y + itemH / 2 + 4} text={label} maxWidth={nav.w - 74} size={11.4} weight={active ? 900 : 650} opacity={active ? 1 : 0.78} />
            </g>
          );
        })}
      </Panel>
      <Panel x={promo.x} y={promo.y} w={promo.w} h={promo.h} r={10} stroke="#5d1a87" fill="rgba(28,6,52,0.18)">
        {useSampleData ? (
          <MiniRewardSpinner x={promo.x + 8} y={promo.y + 6} w={promo.w - 16} h={(promo.h - 12) * controls.leftPanel.eventCardScale} onClick={() => onOpenActionPopup('spinner')} />
        ) : (
          <MiniRewardSpinner
            x={promo.x + 8}
            y={promo.y + 6}
            w={promo.w - 16}
            h={(promo.h - 12) * controls.leftPanel.eventCardScale}
            reward={reward}
            disabled={!onClaimReward || !reward?.available}
            onClick={() => onClaimReward?.()}
          />
        )}
      </Panel>
    </Panel>
  );
}

export function LayoutIconButton({ x, y, side, active, onClick, h }: { x: number; y: number; side: 'left' | 'right'; active: boolean; onClick: () => void; h: number }) {
  const bodyPath = side === 'left'
    ? roundedRectPath(x, y, 20, h, { tl: 0, tr: 5, br: 5, bl: 0 })
    : roundedRectPath(x, y, 20, h, { tl: 5, tr: 0, br: 0, bl: 5 });
  const stroke = active ? '#ffcc4e' : '#54b7ff';
  const cy = y + h / 2;
  return (
    <g className="lobby-ui-hit lobby-layout-icon" onClick={onClick} onKeyDown={(event) => handleSvgButtonKey(event, onClick)} filter={active ? 'url(#lobbyGoldGlow)' : 'url(#lobbyFrameGlow)'} role="button" aria-label={`${side === 'left' ? 'Left' : 'Right'} panel toggle`} tabIndex={0}>
      <path d={bodyPath} fill={active ? '#17122b' : '#06111f'} stroke={stroke} strokeWidth="1.4" opacity="0.96" />
      <g stroke={stroke} strokeWidth="1.45" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {side === 'left' ? (
          <>
            <path d={`M${x + 1},${y + 6} V${y + h - 6}`} opacity="0.78" />
            <rect x={x + 7} y={cy - 11} width="8" height="22" rx="1.5" />
            <path d={active ? `M${x + 9},${cy} L${x + 12},${cy - 4} M${x + 9},${cy} L${x + 12},${cy + 4}` : `M${x + 13},${cy} L${x + 10},${cy - 4} M${x + 13},${cy} L${x + 10},${cy + 4}`} />
          </>
        ) : (
          <>
            <path d={`M${x + 19},${y + 6} V${y + h - 6}`} opacity="0.78" />
            <rect x={x + 5} y={cy - 11} width="8" height="22" rx="1.5" />
            <path d={active ? `M${x + 11},${cy} L${x + 8},${cy - 4} M${x + 11},${cy} L${x + 8},${cy + 4}` : `M${x + 7},${cy} L${x + 10},${cy - 4} M${x + 7},${cy} L${x + 10},${cy + 4}`} />
          </>
        )}
      </g>
    </g>
  );
}

export function Header({
  mainB,
  leftVisible,
  rightVisible,
  onToggleLeft,
  onToggleRight,
  onWallet,
  controls,
  gameTitle,
  gameSubtitle,
  heroMedia,
  stats,
}: {
  mainB: { x: number; y: number; w: number; h: number };
  leftVisible: boolean;
  rightVisible: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onWallet?: () => void;
  controls: LobbyPageSvgControls;
  gameTitle?: string;
  gameSubtitle?: string;
  heroMedia?: LobbyHeroMedia;
  stats: LobbyHeaderStats;
}) {
  const header = controls.header;
  const hero = { x: mainB.x, y: 0, w: mainB.w, h: header.heroH };
  const claimX = hero.x + hero.w / 2;
  const leftGroupX = hero.x + header.leftStatInset;
  const rightGroupRight = hero.x + hero.w - header.rightStatInset;
  const clipId = `lobbyMainClip-${Math.round(mainB.x)}-${Math.round(mainB.w)}`;
  const slides = (heroMedia?.slides ?? []).filter(slide => slide.imageUrl);
  const slideCycleMs = Math.max(6000, slides.length * 3200);
  const displayTitle = heroMedia?.titleText ?? gameTitle ?? LOBBY_CONFIG.game.title;
  const displayTagline = heroMedia?.tagline ?? gameSubtitle ?? LOBBY_CONFIG.game.subtitle;
  return (
    <g>
      <clipPath id={clipId}>
        <path d={`M${hero.x + 12} ${hero.y} H${hero.x + hero.w - 12} Q${hero.x + hero.w} ${hero.y} ${hero.x + hero.w} ${hero.y + 12} V${hero.y + hero.h} H${hero.x} V${hero.y + 12} Q${hero.x} ${hero.y} ${hero.x + 12} ${hero.y} Z`} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={hero.x} y={hero.y} width={hero.w} height={hero.h} fill="#050b13" />
        {slides.map((slide, index) => (
          <image
            key={slide.id ?? slide.imageUrl}
            className={slides.length > 1 ? 'lobby-hero-slide' : undefined}
            href={slide.imageUrl}
            x={hero.x}
            y={hero.y}
            width={hero.w}
            height={hero.h}
            preserveAspectRatio="xMidYMid slice"
            opacity={slides.length > 1 ? undefined : 0.58}
            style={slides.length > 1 ? { animationDuration: `${slideCycleMs}ms`, animationDelay: `${index * (slideCycleMs / slides.length)}ms` } : undefined}
          />
        ))}
        <rect x={hero.x} y={hero.y} width={hero.w} height={hero.h} fill="url(#lobbyPanelWarm)" opacity="0.42" />
        {slides.length > 0 ? (
          <>
            <rect x={hero.x} y={hero.y} width={hero.w} height={hero.h} fill={heroMedia?.overlayTintColor ?? '#020611'} opacity={heroMedia?.overlayTintOpacity ?? 0.36} />
            <rect x={hero.x} y={hero.y} width={hero.w} height={hero.h} fill="url(#lobbyImageShade)" opacity="0.72" />
          </>
        ) : null}
        <ellipse cx={claimX} cy="52" rx="390" ry="92" fill="url(#lobbyTopGlow)" />
        {[hero.x + 160, hero.x + 210, hero.x + hero.w - 230, hero.x + hero.w - 178].map((lx, i) => (
          <circle key={i} cx={lx} cy={54 + (i % 2) * 18} r="36" fill="url(#lobbyLamp)" opacity="0.28" />
        ))}
        <path d={`M${hero.x} 143 H${hero.x + hero.w}`} stroke="#213b56" opacity="0.9" />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <LayoutIconButton x={hero.x} y={38} side="left" h={88} active={!leftVisible} onClick={onToggleLeft} />
        <LayoutIconButton x={hero.x + hero.w - 20} y={38} side="right" h={88} active={!rightVisible} onClick={onToggleRight} />
      </g>
      <Panel x={leftGroupX} y={header.statY} w={header.statLargeW} h={header.statLargeH} r={{ tl: 8, tr: 0, br: 0, bl: 8 }}>
        <CenterTxt x={leftGroupX} y={header.statY + 12} w={header.statLargeW} h={30} text={stats.playersOnline} size={17} weight="900" />
        <CenterTxt x={leftGroupX} y={header.statY + 45} w={header.statLargeW} h={24} text="Players Online" size={10.8} opacity={0.86} />
      </Panel>
      <Panel x={leftGroupX + header.statLargeW} y={header.smallStatY} w={header.statSmallW} h={header.statSmallH} r={{ tl: 0, tr: 8, br: 8, bl: 0 }}>
        <CenterTxt x={leftGroupX + header.statLargeW} y={header.smallStatY + 10} w={header.statSmallW} h={24} text={`* ${stats.activeMatches}`} size={15} weight="900" fill={controls.colors.green} />
        <CenterTxt x={leftGroupX + header.statLargeW} y={header.smallStatY + 35} w={header.statSmallW} h={20} text="Active" size={9.8} opacity={0.86} />
      </Panel>
      <Panel x={rightGroupRight - header.statLargeW - header.statSmallW} y={header.smallStatY} w={header.statSmallW} h={header.statSmallH} r={{ tl: 8, tr: 0, br: 0, bl: 8 }}>
        <CenterTxt x={rightGroupRight - header.statLargeW - header.statSmallW} y={header.smallStatY + 10} w={header.statSmallW} h={24} text={`* ${stats.openTables}`} size={15} weight="900" fill={controls.colors.gold} />
        <CenterTxt x={rightGroupRight - header.statLargeW - header.statSmallW} y={header.smallStatY + 35} w={header.statSmallW} h={20} text="Open" size={9.8} opacity={0.86} />
      </Panel>
      <Panel x={rightGroupRight - header.statLargeW} y={header.statY} w={header.statLargeW} h={header.statLargeH} r={{ tl: 0, tr: 8, br: 8, bl: 0 }}>
        <CenterTxt x={rightGroupRight - header.statLargeW} y={header.statY + 10} w={header.statLargeW} h={22} text="Your Balance" size={10.4} opacity={0.75} />
        <CenterTxt x={rightGroupRight - header.statLargeW} y={header.statY + 33} w={header.statLargeW} h={25} text={stats.balance} size={14.5} weight="900" fill={controls.colors.gold} />
        <Btn x={rightGroupRight - header.statLargeW + 12} y={header.statY + 62} w={header.statLargeW - 24} h={18} label="WALLET" active size={8.8} rx={5} onClick={onWallet} disabled={!onWallet} />
      </Panel>
      <g textAnchor="middle">
        {heroMedia?.logoUrl ? (
          <image href={heroMedia.logoUrl} x={claimX - 145} y={18} width="290" height="62" preserveAspectRatio="xMidYMid meet" opacity="0.96" />
        ) : (
          <text x={claimX} y="68" fontSize={header.titleSize} fontWeight="950" letterSpacing={header.titleSpacing} fill="url(#lobbyMetal)" stroke="#07090d" strokeWidth="1.3">{displayTitle}</text>
        )}
        <text x={claimX} y={heroMedia?.logoUrl ? 106 : 101} fontSize={header.subtitleSize} fontWeight="900" fill="#f2f5ff" opacity="0.9">{displayTagline}</text>
      </g>
    </g>
  );
}

export function ModeTabs({ selectedMode, onSelectMode, mainB, controls }: { selectedMode: string; onSelectMode: (mode: string) => void; mainB: { x: number; w: number }; controls: LobbyPageSvgControls }) {
  const panelX = mainB.x + 20;
  const panelY = controls.mainBody.modeTabsY;
  const panelW = mainB.w - 40;
  const panelH = controls.mainBody.modeTabsH;
  const tabY = panelY + 10;
  const tabH = Math.max(36, panelH - 24);
  const totalW = MODE_TABS.reduce((sum, tab) => sum + tab[2], 0);
  const tabsStartX = panelX + (panelW - totalW) / 2;
  const tabPositions = MODE_TABS.map((tab, index) => ({
    tab,
    x: tabsStartX + MODE_TABS.slice(0, index).reduce((sum, item) => sum + item[2], 0),
  }));
  return (
    <Panel x={panelX} y={panelY} w={panelW} h={panelH} r={9} stroke="#1b3550" fill="#06101d">
      {tabPositions.map(({ tab: [title, sub, width], x: currentX }, i) => {
        const active = selectedMode === title;
        const radius = i === 0 ? { tl: 6, tr: 0, br: 0, bl: 6 } : i === MODE_TABS.length - 1 ? { tl: 0, tr: 6, br: 6, bl: 0 } : 0;
        return (
          <g key={title} className={`lobby-ui-hit ${active ? 'is-active' : ''}`} onClick={() => onSelectMode(title)} onKeyDown={(event) => handleSvgButtonKey(event, () => onSelectMode(title))} filter={active ? 'url(#lobbyPurpleGlow)' : undefined} role="button" aria-label={title} tabIndex={0}>
            <path d={roundedRectPath(currentX, tabY, width, tabH, radius)} fill={active ? 'url(#lobbyPurpleSoft)' : '#071426'} stroke={active ? '#6d35ff' : '#243b56'} strokeWidth="1.15" />
            <CenterTxt x={currentX} y={tabY + (sub ? 5 : 0)} w={width} h={sub ? tabH * 0.54 : tabH} text={title} size={12} weight={active ? 900 : 760} fill={active ? '#f4edff' : '#d7e3f4'} />
            {sub ? <CenterTxt x={currentX} y={tabY + tabH * 0.52} w={width} h={tabH * 0.38} text={sub} size={9.2} weight="650" fill="#aebbd0" opacity={0.72} /> : null}
          </g>
        );
      })}
    </Panel>
  );
}

export function TableScene({ x, y, w, h, variant = 'green', ai = false }: { x: number; y: number; w: number; h: number; variant?: 'green' | 'purple' | 'brown'; ai?: boolean }) {
  const table = variant === 'purple' ? 'url(#lobbyTablePurple)' : variant === 'brown' ? 'url(#lobbyTableBrown)' : 'url(#lobbyTableGreen)';
  const people = [[0.18, 0.53], [0.3, 0.42], [0.48, 0.34], [0.66, 0.42], [0.82, 0.53], [0.5, 0.72]];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="url(#lobbySceneFloor)" />
      {[0.18, 0.42, 0.7, 0.88].map((p, i) => <circle key={i} cx={x + w * p} cy={y + 28 + (i % 2) * 16} r="30" fill="url(#lobbyLamp)" opacity="0.22" />)}
      <ellipse cx={x + w / 2} cy={y + h * 0.58} rx={w * 0.34} ry={h * 0.18} fill={table} stroke="#d49a4a" strokeWidth="1.1" />
      {[-26, -8, 10, 28].map((dx, i) => <rect key={i} x={x + w / 2 + dx} y={y + h * 0.57 + (i % 2) * 3} width="13" height="18" rx="2" fill="#f7ead0" stroke="#6c3c20" transform={`rotate(${i * 9 - 12} ${x + w / 2 + dx + 6} ${y + h * 0.57 + 9})`} />)}
      {people.map(([px, py], i) => (
        <g key={i}>
          <circle cx={x + w * px} cy={y + h * py} r={ai ? 16 : 13} fill={ai ? 'url(#lobbyBotAvatar)' : 'url(#lobbyAvatar)'} stroke={ai ? '#9beeff' : '#d88936'} />
          <path d={`M${x + w * px - 18},${y + h * py + 26} Q${x + w * px},${y + h * py + 8} ${x + w * px + 18},${y + h * py + 26}`} fill={ai ? '#1d3157' : '#1e2430'} stroke="#7e553a" opacity="0.9" />
        </g>
      ))}
      {ai ? <circle cx={x + w / 2} cy={y + h * 0.43} r="40" fill="none" stroke="#7d49ff" strokeWidth="2" opacity="0.75" filter="url(#lobbyPurpleGlow)" /> : null}
      <rect x={x} y={y} width={w} height={h} rx="8" fill="url(#lobbyImageShade)" />
    </g>
  );
}

export function CardBadge({ x, y, label, stroke = '#6d35ff', fill = 'rgba(5,10,20,0.82)', textFill = '#ffffff', w, h = 21, size = 8.8 }: { x: number; y: number; label: string; stroke?: string; fill?: string; textFill?: string; w?: number; h?: number; size?: number }) {
  const width = w ?? badgeWidth(label);
  return (
    <g filter="url(#lobbySoftShadow)">
      <rect x={x} y={y} width={width} height={h} rx="4" fill={fill} stroke={stroke} strokeWidth="0.9" />
      <CenterTxt x={x} y={y} w={width} h={h} text={label} size={size} weight="950" fill={textFill} />
    </g>
  );
}

export function ImageCardArt({ x, y, w, h, ai = false, tone = 'purple', variant = 'green', imageUrl }: { x: number; y: number; w: number; h: number; ai?: boolean; tone?: FeaturedCardData['tone']; variant?: FeaturedCardData['variant']; imageUrl?: string }) {
  const id = `lobbyArt-${Math.round(x)}-${Math.round(y)}`;
  const glow = tone === 'red' ? '#ff384b' : tone === 'cyan' ? '#20e6ff' : tone === 'gold' ? '#ffad3f' : '#7d49ff';
  return (
    <g>
      <clipPath id={id}><rect x={x} y={y} width={w} height={h} rx="8" /></clipPath>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#08101d" />
      <g clipPath={`url(#${id})`}>
        {imageUrl ? (
          <>
            <image href={imageUrl} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
            <rect x={x} y={y} width={w} height={h} fill="url(#lobbyImageShade)" />
          </>
        ) : (
          <TableScene x={x} y={y} w={w} h={h} variant={variant} ai={ai} />
        )}
      </g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="url(#lobbyCardHotspot)" />
      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="8" fill="none" stroke={glow} strokeWidth="0.7" opacity="0.42" />
    </g>
  );
}

export function FeaturedCard({ card, x, y, w, h, onOpen }: { card: FeaturedCardData; x: number; y: number; w: number; h: number; onOpen: (card: FeaturedCardData) => void }) {
  const stroke = card.tone === 'red' ? '#bb2838' : card.tone === 'cyan' ? '#13d9ef' : card.tone === 'gold' ? '#a86d25' : '#6d35ff';
  const footerH = 56;
  const imgH = h - 2 - footerH;
  const footerY = y + 1 + imgH;
  const action = card.cta || (card.players === '4 / 4' ? 'FULL' : 'JOIN');
  const actionTone = action === 'FULL' ? 'red' : action === 'JOIN' || action === 'START' ? 'cyan' : 'purple';
  const countLabel = card.countLabel ?? (card.players === '12' ? 'Spectators' : 'Players');
  return (
    <g className="lobby-featured-card lobby-ui-hit" onClick={() => onOpen(card)} filter="url(#lobbySoftShadow)">
      <rect x={x} y={y} width={w} height={h} rx="10" fill="#050914" stroke={stroke} strokeWidth="1.15" />
      <ImageCardArt x={x + 1} y={y + 1} w={w - 2} h={imgH} ai={card.ai} tone={card.tone} variant={card.variant} imageUrl={card.imageUrl} />
      <CardBadge x={x + 8} y={y + 8} w={badgeWidth(card.code, 42, 56)} h={20} size={8.3} label={card.code} stroke="#426b91" textFill="#d7eaff" />
      <CardBadge x={x + w - 8 - badgeWidth(card.tag, 52, Math.min(78, w - 86))} y={y + 8} w={badgeWidth(card.tag, 52, Math.min(78, w - 86))} h={20} size={8.3} label={card.tag} stroke={stroke} />
      {card.live ? <CardBadge x={x + w - 64} y={y + 32} w={56} h={18} size={7.4} label="● LIVE" stroke="#ff4f61" fill="#3a0b13" textFill="#ff6572" /> : null}
      {card.badges.slice(0, 2).map((badge, i) => <CardBadge key={badge} x={x + 10 + i * 72} y={footerY - 72} w={badgeWidth(badge, 46, 70)} h={20} size={8.2} label={badge} stroke={i % 2 === 0 ? '#1fb8ff' : '#7d49ff'} />)}
      <Txt x={x + w / 2} y={footerY - (card.subtitle ? 38 : 20)} text={card.title} maxWidth={w - 22} size={15.5} weight="950" anchor="middle" />
      {card.subtitle ? <Txt x={x + w / 2} y={footerY - 18} text={card.subtitle} maxWidth={w - 22} size={10} anchor="middle" opacity={0.68} /> : null}
      <path d={roundedRectPath(x + 1, footerY, w - 2, footerH - 1, { tl: 0, tr: 0, br: 9, bl: 9 })} fill="#030811" stroke="#203a55" strokeWidth="0.85" />
      <line x1={x + 1 + (w - 2) * 0.34} y1={footerY} x2={x + 1 + (w - 2) * 0.34} y2={footerY + footerH - 3} stroke="#27425c" strokeWidth="0.9" />
      <CenterTxt x={x + 1} y={footerY + 2} w={(w - 2) * 0.34} h={footerH * 0.55} text={card.players} size={16} weight="950" />
      <CenterTxt x={x + 1} y={footerY + footerH * 0.5} w={(w - 2) * 0.34} h={footerH * 0.42} text={countLabel} size={8.4} weight="650" opacity={0.72} />
      {card.entry ? (
        <g filter="url(#lobbyGoldGlow)">
          <rect x={x + 1 + (w - 2) * 0.34 + 6} y={footerY + 6} width={(w - 2) * 0.66 - 12} height={footerH - 13} rx="6" fill="#08111e" stroke="#263d58" />
          <CenterTxt x={x + 1 + (w - 2) * 0.34 + 6} y={footerY + 6} w={(w - 2) * 0.66 - 12} h={footerH - 13} text={card.entry} size={11} weight="950" fill="#ffca45" />
        </g>
      ) : (
        <Btn x={x + 1 + (w - 2) * 0.34 + 6} y={footerY + 6} w={(w - 2) * 0.66 - 12} h={footerH - 13} label={action} active tone={actionTone} size={10.5} rx={6} />
      )}
    </g>
  );
}


export function TablePill({ x, y, label, color = '#2b8cff' }: { x: number; y: number; label: string; color?: string }) {
  const w = badgeWidth(label, 54, 92);
  return (
    <g>
      <rect x={x} y={y} width={w} height="20" rx="4" fill={color} opacity="0.38" stroke={color} strokeWidth="0.8" />
      <CenterTxt x={x} y={y} w={w} h={20} text={label} size={8.4} weight="850" fill="#eef8ff" />
    </g>
  );
}

export function PlayerStrip({ x, y, w, h, names, ai, avatarUrls, onOpen }: { x: number; y: number; w: number; h: number; names: string[]; ai: boolean; avatarUrls?: Array<string | null>; onOpen: () => void }) {
  const pad = 7;
  const itemGap = 8;
  const itemW = Math.max(78, (w - pad * 2 - itemGap * 3) / 4);
  return (
    <g className="lobby-player-strip lobby-ui-hit" onClick={onOpen}>
      <rect x={x} y={y} width={w} height={h} fill="transparent" />
      {names.slice(0, 4).map((name, i) => {
        const itemX = x + pad + i * (itemW + itemGap);
        const open = /open/i.test(name);
        const bot = ai || /AI|GPT|Claude|Gemini|Llama|Grok|DeepSeek|Mistral/i.test(name);
        const cx = itemX + itemW / 2;
        const cy = y + h * 0.44;
        const iconR = Math.min(28, itemW * 0.34);
        return (
          <g key={`${name}-${i}`}>
            <rect x={itemX} y={y + 7} width={itemW} height={h - 14} rx="2" fill="#06111f" stroke="#24425d" strokeWidth="0.9" opacity="0.96" />
            <circle cx={cx} cy={cy} r={iconR + 3} fill="#071321" stroke={bot ? '#9beeff' : open ? '#728096' : '#f0a13a'} strokeWidth="1.25" filter={bot ? 'url(#lobbyCyanGlow)' : 'url(#lobbyGoldGlow)'} />
            <Avatar cx={cx} cy={cy} r={iconR} bot={bot} open={open} ring={bot ? '#9beeff' : open ? '#728096' : '#f0a13a'} imageUrl={avatarUrls?.[i]} />
            <rect x={itemX + 5} y={y + h - 31} width={itemW - 10} height="24" rx="2" fill="#020711" stroke="#2c4a63" opacity="0.96" />
            <CenterTxt x={itemX + 5} y={y + h - 31} w={itemW - 10} h={24} text={open ? 'OPEN SEAT' : name} size={8.7} weight="950" />
          </g>
        );
      })}
    </g>
  );
}

export function AllTableRow({
  row,
  x,
  y,
  w,
  h,
  onOpenPlayers,
  onJoinRoom,
  onLeaveRoom,
  onSpectateRoom,
  busyRoomId,
}: {
  row: LobbyTableRow;
  x: number;
  y: number;
  w: number;
  h: number;
  onOpenPlayers: (row: LobbyTableRow) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onSpectateRoom: (roomId: string) => void;
  busyRoomId: string | null;
}) {
  const stroke = row.full ? '#bb2838' : row.ai ? '#7d49ff' : row.tone === 'cyan' ? '#13d9ef' : '#6d35ff';
  const codeW = 72;
  const remainingW = w - codeW;
  const gameW = remainingW * 0.29;
  const playersW = remainingW * 0.43;
  const statW = remainingW - gameW - playersW;
  const gameX = x + codeW;
  const playersX = gameX + gameW;
  const statX = playersX + playersW;
  const countBoxW = statW * 0.38;
  const actionBoxX = statX + countBoxW;
  const actionBoxW = statW - countBoxW;
  const primaryDisabled = !row.roomId || busyRoomId === row.roomId || (row.full && !row.viewerJoined);
  const primaryTone = row.viewerJoined ? 'gold' : row.full ? 'red' : row.action === 'JOIN TABLE' ? 'cyan' : 'purple';
  const handlePrimary = () => {
    if (!row.roomId || primaryDisabled) return;
    if (row.viewerJoined) {
      onLeaveRoom(row.roomId);
      return;
    }
    onJoinRoom(row.roomId);
  };
  return (
    <g className="lobby-all-table-row lobby-ui-hit">
      <rect x={x} y={y} width={w} height={h} rx="7" fill={row.ai ? '#0b0820' : row.full ? '#0f080d' : '#04111c'} stroke={stroke} strokeWidth="1" opacity="0.97" />
      {[gameX, playersX, statX].map(lx => <line key={lx} x1={lx} y1={y + 10} x2={lx} y2={y + h - 10} stroke="#19314a" strokeWidth="0.85" />)}
      <rect x={x + 12} y={y + 14} width={codeW - 24} height={h - 28} rx="5" fill="#071426" stroke={stroke} />
      <CenterTxt x={x + 12} y={y + 14} w={codeW - 24} h={h - 28} text={row.code} size={14} weight="850" />
      <rect x={gameX + 8} y={y + 10} width={gameW - 16} height={h - 20} rx="7" fill="#07111e" stroke="#203a55" opacity="0.62" />
      <Txt x={gameX + 18} y={y + 27} text={row.title} maxWidth={gameW - 36} size={16.2} weight="950" />
      {row.tags.slice(0, 3).map((tag, i) => <TablePill key={tag} x={gameX + 18 + i * 88} y={y + 41 + (i > 1 ? 22 : 0)} label={tag} color={i === 0 ? stroke : i === 1 ? '#2b8cff' : '#45b85a'} />)}
      <Txt x={gameX + 18} y={y + h - 38} text={row.ai ? 'Watch AI models compete' : row.full ? 'Pro Rules - Slow' : 'Standard Rules - Fast'} maxWidth={gameW - 36} size={10} opacity={0.82} />
      <Txt x={gameX + 18} y={y + h - 20} text={row.ai ? 'Benchmark rules' : 'Created 2m ago'} maxWidth={gameW - 36} size={9} opacity={0.62} />
      <rect x={playersX + 8} y={y + 10} width={playersW - 16} height={h - 20} rx="7" fill="#07111e" stroke="#203a55" opacity="0.78" />
      <PlayerStrip x={playersX + 8} y={y + 12} w={playersW - 16} h={h - 24} names={row.names} ai={row.ai} avatarUrls={row.avatarUrls} onOpen={() => onOpenPlayers(row)} />
      <rect x={statX + 8} y={y + 10} width={countBoxW - 16} height={h - 20} rx="7" fill="#07111e" stroke="#203a55" />
      <CenterTxt x={statX + 8} y={y + 18} w={countBoxW - 16} h={24} text={row.players.includes('/') ? 'Players' : 'Spectators'} size={9.4} weight="800" opacity={0.78} />
      <CenterTxt x={statX + 8} y={y + 46} w={countBoxW - 16} h={38} text={row.players} size={18} weight="950" />
      <CenterTxt x={statX + 8} y={y + 90} w={countBoxW - 16} h={20} text="Spectators" size={8.8} weight="760" opacity={0.72} />
      <CenterTxt x={statX + 8} y={y + 112} w={countBoxW - 16} h={22} text={row.spectators} size={15} weight="900" />
      {row.live ? <TablePill x={actionBoxX + actionBoxW - 68} y={y + 10} label="● LIVE" color="#ff4f61" /> : null}
      {row.entry ? <CenterTxt x={actionBoxX + 12} y={y + 28} w={actionBoxW - 24} h={28} text={`${row.entry} Entry`} size={11.2} weight="950" fill="#ffca45" /> : null}
      <Btn x={actionBoxX + 12} y={y + 58} w={actionBoxW - 24} h={34} label={row.action} active tone={primaryTone} size={11} disabled={primaryDisabled} onClick={handlePrimary} />
      <Btn x={actionBoxX + 12} y={y + 98} w={actionBoxW - 24} h={28} label={row.viewerJoined ? 'PLAYERS' : 'SPECTATE'} size={9.5} onClick={() => row.roomId && !row.viewerJoined ? onSpectateRoom(row.roomId) : onOpenPlayers(row)} />
    </g>
  );
}

export function FiltersBox({ x, y, w, h = 44, filters, onOpenFilter }: { x: number; y: number; w: number; h?: number; filters?: LobbyRoomListFilterDraft; onOpenFilter: () => void }) {
  const filterItems = [
    ['Mode', filterSummaryValue('Mode', filters), 118],
    ['Status', filterSummaryValue('Status', filters), 132],
    ['Visibility', filterSummaryValue('Visibility', filters), 134],
    ['Stakes', filterSummaryValue('Stakes', filters), 118],
    ['AI', filterSummaryValue('AI', filters), 142],
    ['Sort By', filterSummaryValue('Sort By', filters), 144],
  ] as const;
  const gap = 10;
  const filterButtonW = 126;
  const fixedW = filterItems.reduce((sum, f) => sum + f[2], 0) + filterButtonW + gap * filterItems.length;
  const scale = Math.min(1, (w - 16) / fixedW);
  let cursor = x + 8;
  return (
    <Panel x={x} y={y} w={w} h={h} r={8} stroke="#1d3b55" fill="#06101d">
      {filterItems.map(([label, value, baseW]) => {
        const currentX = cursor;
        const currentW = baseW * scale;
        cursor += currentW + gap * scale;
        return (
          <g key={label} className="lobby-ui-hit" onClick={onOpenFilter}>
            <rect x={currentX} y={y + (h - 34) / 2} width={currentW} height="34" rx="6" fill="#071321" stroke="#213a56" strokeWidth="1" />
            <Txt x={currentX + 14} y={y + h / 2 + 4} text={label} maxWidth={currentW * 0.48} size={11} weight="650" />
            <Txt x={currentX + currentW - 30} y={y + h / 2 + 4} text={value} maxWidth={currentW * 0.44} size={11} weight="760" anchor="end" />
            <path d={`M${currentX + currentW - 19},${y + h / 2 - 2} L${currentX + currentW - 12},${y + h / 2 - 2} L${currentX + currentW - 15.5},${y + h / 2 + 4} Z`} fill="#9fb5ca" opacity="0.9" />
          </g>
        );
      })}
      <Btn x={x + w - 8 - filterButtonW * scale} y={y + (h - 34) / 2} w={filterButtonW * scale} h={34} label="FILTERS" active tone="purple" size={12} onClick={onOpenFilter} />
    </Panel>
  );
}

export function Featured({
  selectedFeaturedTab,
  onSelectFeaturedTab,
  tableRows,
  tableScroll,
  onTableScroll,
  onOpenPlayers,
  onOpenFeaturedCard,
  onOpenFilter,
  onRefresh,
  onJoinRoom,
  onLeaveRoom,
  onSpectateRoom,
  busyRoomId,
  filters,
  mainB,
  controls,
  featuredCards,
  featuredScroll,
  onFeaturedScroll,
}: {
  selectedFeaturedTab: string;
  onSelectFeaturedTab: (tab: string) => void;
  tableRows: LobbyTableRow[];
  tableScroll: number;
  onTableScroll: (next: number) => void;
  onOpenPlayers: (row: LobbyTableRow) => void;
  onOpenFeaturedCard: (card: FeaturedCardData) => void;
  onOpenFilter: () => void;
  onRefresh: () => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onSpectateRoom: (roomId: string) => void;
  busyRoomId: string | null;
  filters?: LobbyRoomListFilterDraft;
  mainB: { x: number; w: number };
  controls: LobbyPageSvgControls;
  featuredCards: FeaturedCardData[];
  featuredScroll: number;
  onFeaturedScroll: (next: number) => void;
}) {
  const isAllTables = selectedFeaturedTab === 'ALL TABLES';
  const handleW = 24;
  const fx = mainB.x + 8 + handleW;
  const fy = controls.mainBody.featuredY;
  const fw = mainB.w - (8 + handleW) * 2;
  const fh = isAllTables ? controls.mainBody.allTablesH : controls.mainBody.featuredH;
  const headerH = 48;
  const innerX = fx + 14;
  const innerY = fy + headerH + 14;
  const innerW = fw - 28;
  const innerH = fh - headerH - 54;
  const rowH = 144;
  const rowGap = 8;
  const visibleRows = Math.max(1, Math.floor((innerH - 70) / (rowH + rowGap)));
  const maxScroll = Math.max(0, tableRows.length - visibleRows);
  const safeScroll = Math.max(0, Math.min(tableScroll, maxScroll));
  const cardGap = 14;
  const visibleFeaturedCount = 4;
  const cardW = (innerW - 32 - cardGap * 3) / 4;
  const cardH = Math.min(310, innerH - 34);
  const maxFeaturedScroll = Math.max(0, featuredCards.length - visibleFeaturedCount);
  const safeFeaturedScroll = Math.max(0, Math.min(featuredScroll, maxFeaturedScroll));
  const visibleFeaturedCards = featuredCards.slice(safeFeaturedScroll, safeFeaturedScroll + visibleFeaturedCount);
  const cardsTotalW = visibleFeaturedCards.length > 0 ? cardW * visibleFeaturedCards.length + cardGap * Math.max(0, visibleFeaturedCards.length - 1) : cardW * 4 + cardGap * 3;
  const cardsStartX = innerX + (innerW - cardsTotalW) / 2;
  const pageCount = Math.max(1, maxFeaturedScroll + 1);
  const handlePrevious = () => {
    if (isAllTables) onTableScroll(Math.max(0, safeScroll - 1));
    else onFeaturedScroll(Math.max(0, safeFeaturedScroll - 1));
  };
  const handleNext = () => {
    if (isAllTables) onTableScroll(Math.min(maxScroll, safeScroll + 1));
    else onFeaturedScroll(Math.min(maxFeaturedScroll, safeFeaturedScroll + 1));
  };
  return (
    <LobbyCarouselShell x={fx} y={fy} w={fw} h={fh} handleY={fy + 156} onPrevious={handlePrevious} onNext={handleNext}>
      <g filter="url(#lobbyFrameGlow)">
        <path d={roundedRectPath(fx, fy, fw, fh, 10)} fill="url(#lobbyFrameBlue)" stroke="#58bfff" strokeWidth="1.1" />
        <path d={roundedRectPath(fx + 4, fy + 4, fw - 8, fh - 8, 8)} fill="#050d19" stroke="#173653" strokeWidth="1" opacity="0.25" />
        <line x1={fx + 176} y1={fy + 41} x2={fx + fw - 12} y2={fy + 41} stroke="#4fb9e8" strokeWidth="1.4" opacity="0.65" />
        <FrameTab x={fx + 12} y={fy + 6} count={String(featuredCards.length)} label="FEATURED" active={selectedFeaturedTab === 'FEATURED'} onClick={() => onSelectFeaturedTab('FEATURED')} />
        <FrameTab x={fx + 152} y={fy + 6} count={String(tableRows.length)} label="ALL TABLES" active={selectedFeaturedTab === 'ALL TABLES'} onClick={() => onSelectFeaturedTab('ALL TABLES')} wide />
        <rect x={innerX} y={innerY} width={innerW} height={innerH} rx="6" fill="none" stroke="#31506c" strokeWidth="1" opacity="0.58" />
      </g>
      {isAllTables ? (
        <g onWheel={(event) => {
          event.preventDefault();
          onTableScroll(Math.max(0, Math.min(maxScroll, safeScroll + (event.deltaY > 0 ? 1 : -1))));
        }}>
          <Txt x={innerX + 16} y={innerY + 37} text="AVAILABLE TABLES" maxWidth={260} size={16} weight="950" />
          <Txt x={innerX + innerW - 220} y={innerY + 37} text={`Showing ${Math.min(tableRows.length, visibleRows)} of ${tableRows.length} tables`} maxWidth={180} size={12} opacity={0.78} />
          <Btn x={innerX + innerW - 48} y={innerY + 20} w={34} h={28} label="REF" size={9} onClick={onRefresh} />
          <FiltersBox x={innerX + 12} y={innerY + 56} w={innerW - 24} h={44} filters={filters} onOpenFilter={onOpenFilter} />
          <clipPath id="lobbyAllTablesRowsClip"><rect x={innerX + 10} y={innerY + 110} width={innerW - 20} height={innerH - 156} rx="8" /></clipPath>
          <g clipPath="url(#lobbyAllTablesRowsClip)">
            <g transform={`translate(0 ${-safeScroll * (rowH + rowGap)})`}>
              {tableRows.map((row, i) => (
                <AllTableRow
                  key={`${row.code}-${i}`}
                  row={row}
                  x={innerX + 12}
                  y={innerY + 112 + i * (rowH + rowGap)}
                  w={innerW - 38}
                  h={rowH}
                  onOpenPlayers={onOpenPlayers}
                  onJoinRoom={onJoinRoom}
                  onLeaveRoom={onLeaveRoom}
                  onSpectateRoom={onSpectateRoom}
                  busyRoomId={busyRoomId}
                />
              ))}
            </g>
          </g>
          {tableRows.length === 0 ? (
            <LobbyEmptyState x={innerX + 12} y={innerY + 118} w={innerW - 38} h={innerH - 168} title="NO OPEN TABLES" body="Create a table or refresh when lobby data is available." />
          ) : null}
          <rect x={innerX + innerW - 15} y={innerY + 112} width="5" height={innerH - 156} rx="3" fill="#06101d" stroke="#18344f" opacity="0.85" />
          <rect x={innerX + innerW - 15} y={innerY + 112 + (maxScroll === 0 ? 0 : safeScroll / maxScroll * Math.max(0, innerH - 198))} width="5" height={Math.max(36, (innerH - 156) / Math.max(tableRows.length, 1) * visibleRows)} rx="3" fill="#4fb9e8" opacity="0.85" />
        </g>
      ) : (
        <g>
          {visibleFeaturedCards.length > 0 ? visibleFeaturedCards.map((card, i) => (
            <FeaturedCard key={card.code} card={card} x={cardsStartX + i * (cardW + cardGap)} y={innerY + (innerH - cardH) / 2} w={cardW} h={cardH} onOpen={onOpenFeaturedCard} />
          )) : (
            <LobbyEmptyState x={innerX + 18} y={innerY + 34} w={innerW - 36} h={innerH - 68} title="NO FEATURED TABLES" body="Open tables will appear here after real lobby data is loaded." />
          )}
          {Array.from({ length: pageCount }, (_, i) => (
            <rect
              key={i}
              x={fx + fw / 2 - (pageCount * 16 - 6) / 2 + i * 16}
              y={fy + fh - 10}
              width="10"
              height="4"
              rx="2"
              fill={i === safeFeaturedScroll ? '#ffcc4e' : '#56a4c7'}
              opacity={i === safeFeaturedScroll ? 1 : 0.55}
            />
          ))}
        </g>
      )}
    </LobbyCarouselShell>
  );
}

export function LobbyEmptyState({ x, y, w, h, title, body }: { x: number; y: number; w: number; h: number; title: string; body: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#06111f" stroke="#203a55" opacity="0.78" />
      <CenterTxt x={x} y={y + h / 2 - 26} w={w} h={28} text={title} size={16} weight="950" fill="#d8eaff" />
      <CenterTxt x={x + w * 0.16} y={y + h / 2 + 4} w={w * 0.68} h={28} text={body} size={12} weight="650" fill="#8fa6bd" opacity={0.86} />
    </g>
  );
}

export function FrameTab({ x, y, count, label, active, onClick, wide = false }: { x: number; y: number; count: string; label: string; active: boolean; onClick: () => void; wide?: boolean }) {
  const labelW = wide ? 130 : 100;
  return (
    <g
      className={`lobby-ui-hit ${active ? 'is-active' : ''}`}
      onClick={onClick}
      onKeyDown={(event) => handleSvgButtonKey(event, onClick)}
      filter={active ? 'url(#lobbyCyanGlow)' : undefined}
      role="button"
      aria-label={label}
      tabIndex={0}
    >
      <path d={`M${x},${y + 38} V${y + 6} Q${x},${y} ${x + 6},${y} H${x + 34} Q${x + 40},${y} ${x + 40},${y + 6} V${y + 38} Z`} fill="url(#lobbyGold)" stroke="#ffec7a" strokeWidth="1" />
      <Txt x={x + 20} y={y + 24} text={count} maxWidth={24} size={13} weight="950" anchor="middle" />
      <path d={`M${x + 40},${y + 38} V${y + 7} Q${x + 40},${y} ${x + 47},${y} H${x + 40 + labelW - 7} Q${x + 40 + labelW},${y} ${x + 40 + labelW},${y + 7} V${y + 38} Z`} fill={active ? 'url(#lobbyFrameBlue)' : '#07152a'} stroke={active ? '#47caff' : '#254a6d'} strokeWidth="1" />
      <Txt x={x + 40 + labelW / 2} y={y + 25} text={label} maxWidth={labelW - 14} size={active ? 13 : 12} weight={active ? 950 : 700} anchor="middle" fill={active ? '#9ff6ff' : '#c7dcf3'} spacing={active ? 2 : 3} />
    </g>
  );
}

export function LobbyCarouselShell({
  x,
  w,
  handleY,
  onPrevious,
  onNext,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  handleY: number;
  onPrevious?: () => void;
  onNext?: () => void;
  children: ReactNode;
}) {
  return (
    <g>
      <SideHandle x={x - 24} y={handleY} side="left" onClick={onPrevious} />
      <SideHandle x={x + w} y={handleY} side="right" onClick={onNext} />
      {children}
    </g>
  );
}

export function ActiveNow({ mainB, controls, y: yOverride, items, activeFilter, onSelectFilter }: { mainB: { x: number; w: number }; controls: LobbyPageSvgControls; y?: number; items: LobbyActiveFilterItem[]; activeFilter: string | null; onSelectFilter: (filter: string | null) => void }) {
  const x = mainB.x + 20;
  const y = yOverride ?? controls.mainBody.activeY;
  const w = mainB.w - 40;
  const h = 108;
  const titleW = 108;
  const gap = 7;
  const allItem: LobbyActiveFilterItem = {
    presetKey: 'all',
    label: 'ALL',
    count: 'All Cards',
    color: '#58bfff',
    ai: false,
    live: false,
    create: false,
  };
  const displayItems = [allItem, ...items];
  const itemW = (w - 24 - titleW - gap * (displayItems.length - 1)) / displayItems.length;
  const startX = x + 12 + titleW;
  return (
    <Panel x={x} y={y} w={w} h={h} r={10} stroke="#1d3b55">
      <Txt x={x + 16} y={y + 32} text="ACTIVE" maxWidth={78} size={15} weight="950" />
      <Txt x={x + 16} y={y + 52} text="NOW" maxWidth={78} size={15} weight="950" />
      <Txt x={x + 16} y={y + 74} text="Live Tables" maxWidth={88} size={10} opacity={0.62} />
      <Txt x={x + 16} y={y + 91} text="● LIVE" maxWidth={75} size={10} fill="#ff4b58" weight="900" />
      {displayItems.map(({ presetKey, label, count, color, ai, live, create, imageUrl }, i) => {
        const itemX = startX + i * (itemW + gap);
        const itemY = y + 4;
        const itemH = h - 8;
        const itemKey = presetKey ?? label;
        const isAll = itemKey === 'all';
        const isActive = isAll ? activeFilter === null : activeFilter === itemKey;
        const clipId = `lobbyActiveImageClip-${presetKey ?? label}-${i}`;
        const iconR = Math.max(24, Math.min(itemW * 0.5 - 5, itemH * 0.5 - 5));
        const iconCx = itemX + itemW / 2;
        const iconCy = itemY + itemH / 2 - 2;
        return (
          <g key={label} className={`lobby-ui-hit ${isActive ? 'is-active' : ''}`} onClick={() => onSelectFilter(isAll || isActive ? null : itemKey)} filter={isActive ? 'url(#lobbyPurpleGlow)' : undefined}>
            <rect x={itemX} y={itemY} width={itemW} height={itemH} rx="2" fill={isActive ? '#0b1028' : '#06111f'} stroke={isActive ? '#7d49ff' : '#24425d'} strokeWidth={isActive ? '1.35' : '0.9'} opacity="0.96" />
            <circle cx={iconCx} cy={iconCy} r={iconR} fill="#071321" stroke={color} strokeWidth="1.2" filter={color === '#7d49ff' ? 'url(#lobbyPurpleGlow)' : 'url(#lobbyCyanGlow)'} />
            {isAll ? (
              <g stroke="#9ff6ff" strokeWidth="1.3" fill="none" filter="url(#lobbyCyanGlow)">
                <rect x={iconCx - 17} y={iconCy - 15} width="14" height="12" rx="2" />
                <rect x={iconCx + 3} y={iconCy - 15} width="14" height="12" rx="2" />
                <rect x={iconCx - 17} y={iconCy + 3} width="14" height="12" rx="2" />
                <rect x={iconCx + 3} y={iconCy + 3} width="14" height="12" rx="2" />
              </g>
            ) : imageUrl ? (
              <g>
                <clipPath id={clipId}><circle cx={iconCx} cy={iconCy} r={Math.max(4, iconR - 2)} /></clipPath>
                <image href={imageUrl} x={iconCx - iconR} y={iconCy - iconR} width={iconR * 2} height={iconR * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
                <circle cx={iconCx} cy={iconCy} r={iconR} fill="none" stroke={color} strokeWidth="1.2" />
              </g>
            ) : create ? <Icon x={itemX + itemW / 2 - 15} y={itemY + 31} type="createTable" color={color} /> : <Avatar cx={itemX + itemW / 2} cy={itemY + itemH / 2 - 2} r={30} bot={ai} ring={color} />}
            {live ? <CardBadge x={itemX + itemW - 39} y={itemY + 5} w={33} h={16} size={7.1} label="LIVE" stroke="#ff4f61" fill="#4b111d" textFill="#ff596b" /> : null}
            <rect x={itemX + 4} y={itemY + itemH - 29} width={itemW - 8} height={24} rx="2" fill="#020711" stroke="#2c4a63" strokeWidth="0.9" opacity="0.96" />
            <CenterTxt x={itemX + 4} y={itemY + itemH - 29} w={itemW - 8} h={24} text={isAll ? 'ALL CARDS' : `${label}: ${String(count).split(' ')[0]}`} size={10.8} weight="950" />
          </g>
        );
      })}
    </Panel>
  );
}

export function PlayerMiniCard({ x, y, w, h, viewer }: { x: number; y: number; w: number; h: number; viewer: LobbyUserSummary | null }) {
  const avatarX = x + 35;
  const avatarY = y + h / 2;
  const progressRatio = Math.max(0, Math.min(1, viewer?.xpRatio ?? 0));
  return (
    <g filter="url(#lobbySoftShadow)">
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#071426" stroke="#1d3653" strokeWidth="1" />
      <circle cx={avatarX} cy={avatarY} r="25" fill="#160b2c" stroke="#6d35ff" strokeWidth="1.2" filter="url(#lobbyPurpleGlow)" />
      <Avatar cx={avatarX} cy={avatarY} r={20} ring="#ff9d38" imageUrl={viewer?.avatarUrl} />
      <Txt x={x + 72} y={y + 25} text={viewer?.name ?? 'Signed out'} maxWidth={w - 110} size={15} weight="950" />
      <Txt x={x + 72} y={y + 45} text={viewer?.level ?? 'Sign in'} maxWidth={78} size={10.5} opacity={0.78} />
      <Txt x={x + w - 12} y={y + 45} text={viewer?.xp ?? '--'} maxWidth={82} size={8} anchor="end" opacity={0.68} />
      <rect x={x + 72} y={y + h - 18} width={w - 98} height="4" rx="3" fill="#26334c" />
      <rect x={x + 72} y={y + h - 18} width={(w - 98) * progressRatio} height="4" rx="3" fill="#54eca0" />
    </g>
  );
}

export function RightRail({
  controls,
  panel,
  selectedFriendsTab,
  onSelectFriendsTab,
  viewer,
  friends: friendItems,
  chatMessages,
  systemMessage,
  onNavigate,
  party,
  friendSearchDraft,
  lobbyChatDraft,
  onFriendSearchDraftChange,
  onLobbyChatDraftChange,
  onAddFriend,
  onInviteFriend,
  onCreateParty,
  onLeaveParty,
  onSendLobbyChat,
  onRefreshLobbyServices,
}: {
  controls: LobbyPageSvgControls;
  panel: LobbyPanelRect;
  selectedFriendsTab: string;
  onSelectFriendsTab: (tab: string) => void;
  viewer: LobbyUserSummary | null;
  friends: LobbyFriendItem[];
  chatMessages: LobbyChatMessageItem[];
  systemMessage: string | null;
  onNavigate?: (target: LobbyNavigationTarget) => void;
  party?: LobbyPartyStatus | null;
  friendSearchDraft?: string;
  lobbyChatDraft?: string;
  onFriendSearchDraftChange?: (value: string) => void;
  onLobbyChatDraftChange?: (value: string) => void;
  onAddFriend?: (friendId: string) => void;
  onInviteFriend?: (friendId: string) => void;
  onCreateParty?: () => void;
  onLeaveParty?: () => void;
  onSendLobbyChat?: (message: string) => void;
  onRefreshLobbyServices?: () => void;
}) {
  const rail = { ...controls.rightPanel, ...panel };
  const pad = 10;
  const innerX = rail.x + pad;
  const innerW = rail.w - pad * 2;
  const profile = { x: innerX, y: rail.y + rail.profileY, w: innerW, h: 82 };
  const friends = { x: innerX, y: rail.y + rail.friendsY, w: innerW, h: 372 };
  const chat = { x: innerX, y: rail.y + rail.chatY, w: innerW, h: rail.y + rail.h - (rail.y + rail.chatY) };
  const showingParty = selectedFriendsTab === 'PARTY';
  const friendDraft = friendSearchDraft ?? '';
  const chatDraft = lobbyChatDraft ?? '';
  return (
    <Panel x={rail.x} y={rail.y} w={rail.w} h={rail.h} r={{ tl: 0, tr: 12, br: 12, bl: 0 }} stroke={controls.colors.panelStroke} fill="url(#lobbySide)" strokeWidth={controls.layout.panelStrokeWidth}>
      <PlayerMiniCard x={profile.x} y={profile.y} w={profile.w} h={profile.h} viewer={viewer} />
      <Panel x={friends.x} y={friends.y} w={friends.w} h={friends.h} r={10} stroke="#193750" fill="rgba(4,10,18,0.18)">
        <FriendsTabs x={friends.x} y={friends.y} w={friends.w} activeTab={selectedFriendsTab} onlineCount={friendItems.length} onSelectTab={onSelectFriendsTab} />
        {showingParty ? (
          <g>
            <Txt x={friends.x + 20} y={friends.y + 91} text={party?.partyId ? 'ACTIVE PARTY' : 'NO ACTIVE PARTY'} maxWidth={friends.w - 40} size={13} weight="950" fill="#8ff6ff" />
            <rect x={friends.x + 20} y={friends.y + 106} width={friends.w - 40} height="132" rx="8" fill="#071426" stroke="#1d3550" />
            <Txt x={friends.x + 34} y={friends.y + 132} text={`Members ${party?.memberCount ?? 0}`} maxWidth={friends.w - 68} size={11} weight="850" />
            <Txt x={friends.x + 34} y={friends.y + 154} text={`Invites ${party?.inviteCount ?? 0}`} maxWidth={friends.w - 68} size={11} weight="850" />
            <Txt x={friends.x + 34} y={friends.y + 176} text={party?.partyId ? `Party ${party.partyId.slice(0, 12)}` : 'Create a party before inviting friends.'} maxWidth={friends.w - 68} size={10} fill="#9dc7d9" />
            {(party?.members ?? []).slice(0, 3).map((member, index) => (
              <Txt key={member.userId} x={friends.x + 34} y={friends.y + 204 + index * 18} text={member.displayName ?? member.userId} maxWidth={friends.w - 68} size={10} fill="#dcefff" />
            ))}
            <Btn x={friends.x + 20} y={friends.y + friends.h - 76} w={friends.w - 40} h={34} label={party?.partyId ? 'LEAVE PARTY' : 'CREATE PARTY'} size={11} tone={party?.partyId ? 'red' : 'purple'} active onClick={() => party?.partyId ? onLeaveParty?.() : onCreateParty?.()} disabled={party?.partyId ? !onLeaveParty : !onCreateParty} />
          </g>
        ) : (
          <g>
            <foreignObject x={friends.x + 18} y={friends.y + 70} width={friends.w - 36} height={42}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const friendId = friendDraft.trim();
                  if (!friendId) return;
                  onAddFriend?.(friendId);
                }}
                style={{ display: 'flex', height: '34px', gap: '6px' }}
              >
                <input
                  aria-label="Find or add friend"
                  value={friendDraft}
                  maxLength={80}
                  onChange={(event) => onFriendSearchDraftChange?.(event.currentTarget.value)}
                  placeholder="Friend ID"
                  style={{ flex: 1, minWidth: 0, border: '1px solid #244761', borderRadius: '8px', background: '#06121e', color: '#edf7ff', font: '700 11px Inter, sans-serif', padding: '0 9px', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={!onAddFriend}
                  style={{ width: '50px', border: '1px solid #20e6ff', borderRadius: '8px', background: '#0a2a3e', color: '#f5fdff', font: '850 10px Inter, sans-serif' }}
                >
                  ADD
                </button>
              </form>
            </foreignObject>
            {friendItems.length > 0 ? friendItems.slice(0, 4).map((friend, i) => (
              <Friend
                key={friend.userId ?? friend.name}
                x={friends.x + 22}
                y={friends.y + 126 + i * 48}
                w={friends.w - 44}
                name={friend.name}
                state={friend.state}
                avatarUrl={friend.avatarUrl}
                inviteState={friend.inviteState}
                onInvite={() => friend.userId && onInviteFriend?.(friend.userId)}
                inviteDisabled={!friend.userId || !onInviteFriend}
              />
            )) : (
              <LobbyEmptyState x={friends.x + 18} y={friends.y + 126} w={friends.w - 36} h={friends.h - 178} title="NO FRIENDS ONLINE" body="Add a friend by user ID or open the social hub." />
            )}
          </g>
        )}
        <Btn x={friends.x + 20} y={friends.y + friends.h - 38} w={friends.w - 40} h={34} label={showingParty ? 'VIEW ALL FRIENDS' : 'SOCIAL HUB'} size={11} onClick={() => onNavigate?.('social')} disabled={!onNavigate} />
      </Panel>
      <Panel x={chat.x} y={chat.y} w={chat.w} h={chat.h} r={10} stroke="#193750" fill="rgba(4,10,18,0.18)">
        <Txt x={chat.x + 14} y={chat.y + 36} text="LOBBY CHAT" maxWidth={140} size={15} weight="950" />
        <Btn x={chat.x + chat.w - 102} y={chat.y + 14} w={28} h={28} label="◎" size={12} onClick={() => onRefreshLobbyServices?.()} disabled={!onRefreshLobbyServices} />
        <Btn x={chat.x + chat.w - 64} y={chat.y + 14} w={34} h={28} label="⋯" size={13} onClick={() => onNavigate?.('social')} disabled={!onNavigate} />
        {chatMessages.length > 0 ? chatMessages.map(({ name, msg, ago }, i) => (
          <Chat key={`${name}-${i}`} x={chat.x + 14} y={chat.y + 58 + i * 54} w={chat.w - 28} name={name} msg={msg} ago={ago} avatarUrl={chatMessages[i]?.avatarUrl} />
        )) : (
          <LobbyEmptyState x={chat.x + 14} y={chat.y + 62} w={chat.w - 28} h={chat.h - 162} title="NO CHAT YET" body="Send the first lobby message." />
        )}
        {systemMessage ? (
          <>
            <Txt x={chat.x + 14} y={chat.y + chat.h - 92} text="System" maxWidth={80} size={12} weight="900" fill="#ffca45" />
            <rect x={chat.x + 14} y={chat.y + chat.h - 84} width={chat.w - 28} height="34" rx="6" fill="#0b1627" stroke="#172b43" />
            <Txt x={chat.x + 26} y={chat.y + chat.h - 62} text={systemMessage} maxWidth={chat.w - 50} size={10} opacity={0.82} />
          </>
        ) : null}
        <foreignObject x={chat.x + 14} y={chat.y + chat.h - 42} width={chat.w - 28} height={38}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const message = chatDraft.trim();
              if (!message) return;
              onSendLobbyChat?.(message);
            }}
            style={{ display: 'flex', height: '34px', gap: '6px' }}
          >
            <input
              aria-label="Lobby chat message"
              value={chatDraft}
              maxLength={180}
              onChange={(event) => onLobbyChatDraftChange?.(event.currentTarget.value)}
              placeholder="Type a message..."
              style={{ flex: 1, minWidth: 0, border: '1px solid #244761', borderRadius: '8px', background: '#06121e', color: '#edf7ff', font: '700 11px Inter, sans-serif', padding: '0 9px', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!onSendLobbyChat}
              style={{ width: '42px', border: '1px solid #6d35ff', borderRadius: '8px', background: '#17143c', color: '#f5fdff', font: '900 12px Inter, sans-serif' }}
            >
              ▶
            </button>
          </form>
        </foreignObject>
      </Panel>
    </Panel>
  );
}

export function FriendsTabs({ x, y, w, activeTab, onlineCount, onSelectTab }: { x: number; y: number; w: number; activeTab: string; onlineCount: number; onSelectTab: (tab: string) => void }) {
  const friendsW = 150;
  const partyW = w - friendsW;
  return (
    <g>
      <rect x={x} y={y} width={w} height="58" rx="9" fill="#071426" stroke="#1b3652" strokeWidth="1" />
      <g className="lobby-ui-hit" onClick={() => onSelectTab('FRIENDS')}>
        <path d={roundedRectPath(x, y, friendsW, 58, { tl: 9, tr: 0, br: 0, bl: 9 })} fill={activeTab === 'FRIENDS' ? 'url(#lobbyPurpleSoft)' : '#071426'} stroke={activeTab === 'FRIENDS' ? '#5f35e8' : '#1b3652'} strokeWidth="1" />
        <Icon x={x + 17} y={y + 17} type="people" color="#45ffb0" />
        <Txt x={x + 50} y={y + 24} text="FRIENDS" maxWidth={86} size={14} weight="950" />
        <Txt x={x + 50} y={y + 43} text={`${onlineCount} Online`} maxWidth={82} size={12} fill="#41e8c0" opacity={0.86} />
      </g>
      <g className="lobby-ui-hit" onClick={() => onSelectTab('PARTY')}>
        <path d={roundedRectPath(x + friendsW, y, partyW, 58, { tl: 0, tr: 9, br: 9, bl: 0 })} fill={activeTab === 'PARTY' ? 'url(#lobbyPurpleSoft)' : '#071426'} stroke={activeTab === 'PARTY' ? '#5f35e8' : '#1b3652'} strokeWidth="1" />
        <Icon x={x + friendsW + 28} y={y + 17} type="people" color="#8392b7" />
        <Txt x={x + friendsW + 58} y={y + 31} text="PARTY" maxWidth={partyW - 66} size={13} weight="850" fill="#b8c4d8" opacity={0.92} />
      </g>
    </g>
  );
}

export function Friend({
  x,
  y,
  w,
  name,
  state,
  avatarUrl,
  inviteState,
  onInvite,
  inviteDisabled,
}: {
  x: number;
  y: number;
  w: number;
  name: string;
  state: string;
  avatarUrl?: string | null;
  inviteState?: LobbyFriendItem['inviteState'];
  onInvite?: () => void;
  inviteDisabled?: boolean;
}) {
  const color = state === 'In Game' ? '#35ff92' : '#c88cff';
  const label = inviteState === 'inviting' ? '...' : inviteState === 'invited' ? 'SENT' : inviteState === 'failed' ? 'RETRY' : 'INVITE';
  return (
    <g>
      <circle cx={x + 8} cy={y + 18} r="4" fill="#38f28b" />
      <Avatar cx={x + 28} cy={y + 18} r={18} imageUrl={avatarUrl} />
      <Txt x={x + 56} y={y + 14} text={name} maxWidth={85} size={13} weight="850" />
      <Txt x={x + 56} y={y + 31} text={state} maxWidth={85} size={10} fill={color} opacity={0.82} />
      <Btn x={x + w - 66} y={y} w={66} h={32} label={label} active size={11} onClick={onInvite} disabled={inviteDisabled || inviteState === 'inviting'} />
    </g>
  );
}

export function Chat({ x, y, w, name, msg, ago, avatarUrl }: { x: number; y: number; w: number; name: string; msg: string; ago: string; avatarUrl?: string | null }) {
  return (
    <g>
      <Avatar cx={x + 16} cy={y + 18} r={16} imageUrl={avatarUrl} />
      <Txt x={x + 44} y={y + 12} text={name} maxWidth={80} size={12} weight="900" />
      <Txt x={x + w - 28} y={y + 12} text={ago} maxWidth={50} size={9} opacity={0.52} anchor="end" />
      <rect x={x + 44} y={y + 18} width={w - 70} height="34" rx="6" fill="#0b1627" stroke="#172b43" />
      <Txt x={x + 54} y={y + 40} text={msg} maxWidth={w - 92} size={10} opacity={0.82} />
    </g>
  );
}

export function FooterStatus({
  serverOpen,
  onToggleServer,
  mainB,
  controls,
  server,
  onSelectServer,
}: {
  serverOpen: boolean;
  onToggleServer: () => void;
  mainB: { x: number; w: number };
  controls: LobbyPageSvgControls;
  server: LobbyServerStatus | null;
  onSelectServer?: (regionId: string) => void;
}) {
  const y = controls.mainBody.footerY;
  const items = [
    [mainB.x + 20, 'Solana Secured'],
    [mainB.x + 190, 'Verified Tables'],
    [mainB.x + 364, 'Fair Play Protected'],
  ] as const;
  return (
    <g>
      <rect x={mainB.x} y={y} width={mainB.w} height="30" fill="#020813" opacity="0.72" />
      <line x1={mainB.x} y1={y} x2={mainB.x + mainB.w} y2={y} stroke="#18344d" opacity="0.72" />
      {items.map(([x, label]) => (
        <g key={label}>
          <path d={`M${x + 7} ${y + 8} L${x + 14} ${y + 11} V${y + 17} C${x + 14} ${y + 21} ${x + 10.5} ${y + 23.5} ${x + 7} ${y + 25} C${x + 3.5} ${y + 23.5} ${x} ${y + 21} ${x} ${y + 17} V${y + 11} Z`} fill="#35c982" />
          <Txt x={x + 24} y={y + 21} text={label} maxWidth={150} size={12} fill="#8d9bad" opacity={0.92} weight="560" />
        </g>
      ))}
      <g className="lobby-ui-hit" onClick={onToggleServer} onKeyDown={(event) => handleSvgButtonKey(event, onToggleServer)} role="button" aria-label={`Server: ${server?.active ?? 'Auto'}`} tabIndex={0}>
        <rect x={mainB.x + mainB.w - 218} y={y + 3} width="132" height="24" rx="6" fill={serverOpen ? '#071426' : 'transparent'} stroke={serverOpen ? '#1d3550' : 'transparent'} />
        <Txt x={mainB.x + mainB.w - 202} y={y + 21} text={`Server: ${server?.active ?? 'Auto'}`} maxWidth={104} size={12} fill="#8d9bad" opacity={0.9} />
        <Txt x={mainB.x + mainB.w - 42} y={y + 21} text={server?.ping ?? '--'} maxWidth={48} size={12} fill="#d3dbe7" opacity={0.92} />
      </g>
      {serverOpen ? (
        <g filter="url(#lobbyFrameGlow)">
          <rect x={mainB.x + mainB.w - 222} y={y - 116} width="188" height="108" rx="8" fill="#06101d" stroke="#24516f" />
          <Txt x={mainB.x + mainB.w - 208} y={y - 94} text="SELECT SERVER" maxWidth={130} size={11} weight="950" fill="#9ff6ff" />
          {(server?.options ?? []).map(({ name, ping, active, regionId }, i) => {
            const sy = y - 82 + i * 23;
            const targetRegion = regionId ?? name;
            return (
              <g
                key={name}
                className="lobby-ui-hit"
                onClick={() => onSelectServer?.(targetRegion)}
                onKeyDown={(event) => handleSvgButtonKey(event, () => onSelectServer?.(targetRegion))}
                role="button"
                aria-label={`Select server ${name}`}
                tabIndex={0}
              >
                <rect x={mainB.x + mainB.w - 212} y={sy} width="168" height="20" rx="4" fill={active ? 'url(#lobbyPurpleSoft)' : '#071426'} stroke={active ? '#6d35ff' : '#1d3550'} opacity="0.98" />
                <Txt x={mainB.x + mainB.w - 202} y={sy + 14} text={name} maxWidth={82} size={10} weight={active ? '900' : '650'} />
                <Txt x={mainB.x + mainB.w - 56} y={sy + 14} text={ping} maxWidth={38} size={10} anchor="end" fill={active ? '#54eca0' : '#8d9bad'} />
              </g>
            );
          })}
          {!server?.options.length ? <CenterTxt x={mainB.x + mainB.w - 212} y={y - 64} w={168} h={34} text="NO SERVER DATA" size={10} weight="850" fill="#8fa6bd" /> : null}
        </g>
      ) : null}
    </g>
  );
}
