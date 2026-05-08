import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react';
import { getPlaceholderImageUrl, placeholderImageCount } from '@ocentra/app-assets/placeholders';
import type {
  CategoryWithSubs,
  GamesExplorerGame,
  GamesExplorerMetadata,
  PlayerModeFilter,
  ViewMode,
} from './types';
import { CATEGORY_ICONS, SECTIONS } from './types';
import './GamesCatalogSvgShowcase.css';

const BASE_VIEW_W = 1800;
const MIN_VIEW_H = 900;
const OUTER = 18;
const TOP_TAB_INSET_X = 28;
const TOP_TAB_TOP_INSET = 16;
const TOP_BAR_H = 74;
const DEFAULT_SIDEBAR_W = 292;
const CONTROL_BAR_H = 58;
const WHEEL_SCROLL_SPEED = 0.72;
const VIRTUAL_ROW_BUFFER = 2;

type Layout = ReturnType<typeof makeLayout>;

export interface GamesCatalogSvgShowcaseProps {
  games: readonly GamesExplorerGame[];
  metadata?: GamesExplorerMetadata | null;
  categoryWithSubs?: readonly CategoryWithSubs[];
  playerModeCounts?: Record<PlayerModeFilter, number>;
  availableCount?: number;
  currentView?: ViewMode;
  onViewChange?: (value: ViewMode) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  currentCategory?: string;
  onCategoryChange?: (value: string) => void;
  playerModeFilter?: PlayerModeFilter;
  onPlayerModeChange?: (value: PlayerModeFilter) => void;
  categoryExpanded?: ReadonlySet<string>;
  onCategoryExpandToggle?: (value: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onGameClick?: (game: GamesExplorerGame) => void;
}

type SvgTextProps = {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  strong?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  color?: string;
  opacity?: number;
};

function stableIndex(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash % placeholderImageCount;
}

function truncate(value: string | undefined | null, max: number): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}...` : value;
}

function makeLayout(viewH: number) {
  const safeH = Math.max(MIN_VIEW_H, viewH);
  const pageX = OUTER;
  const pageY = OUTER;
  const pageW = BASE_VIEW_W - OUTER * 2;
  const pageH = safeH - OUTER * 2;
  const topX = OUTER + TOP_TAB_INSET_X;
  const topY = TOP_TAB_TOP_INSET;
  const topW = BASE_VIEW_W - (OUTER + TOP_TAB_INSET_X) * 2;
  const topH = TOP_BAR_H;
  const bodyX = OUTER;
  const bodyY = topY + topH;
  const bodyW = BASE_VIEW_W - OUTER * 2;
  const bodyH = safeH - OUTER - bodyY;
  return { viewW: BASE_VIEW_W, viewH: safeH, pageX, pageY, pageW, pageH, topX, topY, topW, topH, bodyX, bodyY, bodyW, bodyH };
}

function useViewportSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: BASE_VIEW_W, height: MIN_VIEW_H });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const nextSize = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      };
      setSize(previous =>
        previous.width === nextSize.width && previous.height === nextSize.height
          ? previous
          : nextSize
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function SvgText({
  x,
  y,
  children,
  size = 13,
  strong = false,
  anchor = 'start',
  color,
  opacity = 1,
}: SvgTextProps) {
  return (
    <text
      x={x}
      y={y}
      fill={color ?? (strong ? '#ffffff' : '#b8cae7')}
      opacity={opacity}
      fontSize={size}
      fontFamily="Inter, ui-sans-serif, system-ui, Segoe UI, Arial"
      fontWeight={strong ? 800 : 500}
      textAnchor={anchor}
      dominantBaseline="middle"
      pointerEvents="none"
      letterSpacing="0"
    >
      {children}
    </text>
  );
}

function Hit({
  x,
  y,
  w,
  h,
  onClick,
  children,
  className = '',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const interactiveClass = onClick
    ? `games-catalog-svg-showcase__hit ${className}`.trim()
    : className || undefined;
  return (
    <g
      onClick={onClick}
      className={interactiveClass}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={event => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {onClick ? <rect x={x} y={y} width={w} height={h} fill="transparent" pointerEvents="all" /> : null}
      {children}
    </g>
  );
}

function Button({
  x,
  y,
  w,
  h,
  label,
  active = false,
  onClick,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Hit x={x} y={y} w={w} h={h} onClick={onClick}>
      <rect
        className="games-catalog-svg-showcase__hit-surface"
        x={x}
        y={y}
        width={w}
        height={h}
        rx={11}
        fill={active ? 'url(#gcsg-button-active)' : '#071026'}
        stroke={active ? '#aeefff' : '#55749e'}
        strokeWidth={active ? 1.9 : 1.1}
        filter={active ? 'url(#gcsg-cyan-glow)' : undefined}
      />
      <rect x={x + 2} y={y + 2} width={w - 4} height={Math.max(5, h * 0.38)} rx={9} fill="#ffffff" opacity={active ? 0.13 : 0.05} />
      <g className="games-catalog-svg-showcase__hit-text">
        <SvgText x={x + w / 2} y={y + h / 2 + 1} size={13.5} anchor="middle" strong={active} color={active ? '#ffffff' : '#d5e9ff'}>
          {label}
        </SvgText>
      </g>
    </Hit>
  );
}

function Pill({
  x,
  y,
  w,
  label,
  tone = 'blue',
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  tone?: 'blue' | 'gold' | 'green';
}) {
  const stroke = tone === 'gold' ? '#b78017' : tone === 'green' ? '#1ed6a6' : '#55749e';
  const fill = tone === 'gold' ? '#251a08' : tone === 'green' ? '#061d18' : '#071026';
  const color = tone === 'gold' ? '#ffd36d' : tone === 'green' ? '#d7fff7' : '#bde7ff';
  return (
    <g>
      <rect x={x} y={y} width={w} height={30} rx={8} fill={fill} stroke={stroke} strokeWidth={1} />
      <SvgText x={x + w / 2} y={y + 16} size={11} anchor="middle" color={color} strong={tone === 'gold'}>
        {truncate(label, Math.max(8, Math.floor(w / 7.2)))}
      </SvgText>
    </g>
  );
}

function StatBox({ x, y, w, label, value }: { x: number; y: number; w: number; label: string; value: string }) {
  return (
    <g filter="url(#gcsg-soft-shadow)">
      <rect x={x} y={y} width={w} height={40} rx={11} fill="#061021" stroke="#2b83ff" strokeWidth={1.1} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={13} rx={8} fill="#ffffff" opacity={0.08} />
      <SvgText x={x + w / 2} y={y + 14} size={15} anchor="middle" strong color="#7bd6ff">
        {value}
      </SvgText>
      <SvgText x={x + w / 2} y={y + 30} size={8.5} anchor="middle" color="#8aa0bd">
        {label}
      </SvgText>
    </g>
  );
}

function Defs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      <radialGradient id="gcsg-bg-radial" cx="55%" cy="48%" r="72%">
        <stop offset="0%" stopColor="#07355d" stopOpacity="0.28" />
        <stop offset="45%" stopColor="#041c36" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#02060f" stopOpacity="1" />
      </radialGradient>
      <linearGradient id="gcsg-panel-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#164f92" stopOpacity="0.42" />
        <stop offset="48%" stopColor="#082346" stopOpacity="0.34" />
        <stop offset="100%" stopColor="#050914" stopOpacity="0.72" />
      </linearGradient>
      <linearGradient id="gcsg-top-fill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0b3767" stopOpacity="0.58" />
        <stop offset="44%" stopColor="#07182f" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#101538" stopOpacity="0.58" />
      </linearGradient>
      <linearGradient id="gcsg-card-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#12335d" stopOpacity="0.58" />
        <stop offset="55%" stopColor="#07111f" stopOpacity="0.72" />
        <stop offset="100%" stopColor="#040812" stopOpacity="0.88" />
      </linearGradient>
      <linearGradient id="gcsg-card-edge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#19ffd1" />
        <stop offset="45%" stopColor="#2d8dff" />
        <stop offset="100%" stopColor="#805cff" />
      </linearGradient>
      <linearGradient id="gcsg-button-active" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2b79ff" />
        <stop offset="100%" stopColor="#633bff" />
      </linearGradient>
      <pattern id="gcsg-grid-pattern" width="88" height="88" patternUnits="userSpaceOnUse">
        <path d="M0 44 H88 M44 0 V88" stroke="#1aa9ff" strokeOpacity="0.08" strokeWidth="1" />
        <path d="M12 12 H32 V32 H56 V12 H76 M12 76 H38 V58 H76" fill="none" stroke="#3cffec" strokeOpacity="0.08" strokeWidth="1" />
      </pattern>
      <filter id="gcsg-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.62" />
      </filter>
      <filter id="gcsg-cyan-glow" x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00e7ff" floodOpacity="0.56" />
        <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#168dff" floodOpacity="0.25" />
      </filter>
      <filter id="gcsg-card-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00ffc6" floodOpacity="0.38" />
        <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#000" floodOpacity="0.65" />
      </filter>
      <clipPath id={`${idPrefix}-sidebarClip`}>
        <rect x="0" y="0" width="1" height="1" />
      </clipPath>
    </defs>
  );
}

function TopBar({
  layout,
  view,
  setView,
  searchQuery,
  onSearchChange,
  metadata,
  availableCount,
  categoryCount,
  isSidebarCollapsed,
  onToggleSidebar,
}: {
  layout: Layout;
  view: ViewMode;
  setView: (value: ViewMode) => void;
  searchQuery: string;
  onSearchChange?: (value: string) => void;
  metadata?: GamesExplorerMetadata | null;
  availableCount: number;
  categoryCount: number;
  isSidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
}) {
  const x = layout.topX;
  const y = layout.topY;
  const w = layout.topW;
  const totalGames = metadata?.totalGames ?? 0;
  const handleSearchClick = () => {
    if (!onSearchChange) return;
    const next = window.prompt('Search games', searchQuery);
    if (next != null) onSearchChange(next);
  };
  return (
    <g id="games-catalog-svg-top-bar" filter="url(#gcsg-soft-shadow)">
      <path d={`M ${x + 18} ${y} H ${x + w - 18} Q ${x + w} ${y} ${x + w} ${y + 18} V ${y + layout.topH} H ${x} V ${y + 18} Q ${x} ${y} ${x + 18} ${y} Z`} fill="url(#gcsg-top-fill)" stroke="#1ea7ff" strokeWidth={1.15} opacity={0.92} />
      <Hit x={x + 18} y={y + 14} w={52} h={46} onClick={onToggleSidebar}>
        <rect className="games-catalog-svg-showcase__hit-surface" x={x + 18} y={y + 14} width={52} height={46} rx={12} fill="#071026" stroke="#55749e" strokeWidth={1.2} />
        <SvgText x={x + 44} y={y + 38} size={20} anchor="middle" color="#d7fff7">
          {isSidebarCollapsed ? '>>' : '[]'}
        </SvgText>
      </Hit>
      <Hit x={x + 82} y={y + 18} w={320} h={38} onClick={handleSearchClick}>
        <rect className="games-catalog-svg-showcase__hit-surface" x={x + 82} y={y + 18} width={320} height={38} rx={12} fill="#050a18" stroke="#4d6d9a" strokeWidth={1.1} />
        <circle cx={x + 104} cy={y + 37} r={5} fill="#27d7ff" opacity={0.65} />
        <SvgText x={x + 122} y={y + 38} size={13} color={searchQuery ? '#d5e9ff' : '#8fa5c0'}>
          {truncate(searchQuery || 'Search games...', 32)}
        </SvgText>
      </Hit>
      <Button x={x + 420} y={y + 18} w={84} h={38} label="Grid" active={view === 'grid'} onClick={() => setView('grid')} />
      <Button x={x + 512} y={y + 18} w={82} h={38} label="List" active={view === 'list'} onClick={() => setView('list')} />
      <Button x={x + 604} y={y + 18} w={82} h={38} label="A-Z" active={view === 'alphabet'} onClick={() => setView('alphabet')} />
      <StatBox x={x + w - 338} y={y + 17} w={96} label="GAMES" value={totalGames.toLocaleString()} />
      <StatBox x={x + w - 230} y={y + 17} w={96} label="READY" value={availableCount.toLocaleString()} />
      <StatBox x={x + w - 122} y={y + 17} w={102} label="GROUPS" value={categoryCount.toLocaleString()} />
    </g>
  );
}

function Sidebar({
  layout,
  sidebarW,
  categoryWithSubs,
  currentCategory,
  onCategoryChange,
  playerModeFilter,
  onPlayerModeChange,
  playerModeCounts,
  categoryExpanded,
  onCategoryExpandToggle,
  scrollY,
  setScrollY,
}: {
  layout: Layout;
  sidebarW: number;
  categoryWithSubs: readonly CategoryWithSubs[];
  currentCategory: string;
  onCategoryChange?: (value: string) => void;
  playerModeFilter: PlayerModeFilter;
  onPlayerModeChange?: (value: PlayerModeFilter) => void;
  playerModeCounts: Record<PlayerModeFilter, number>;
  categoryExpanded: ReadonlySet<string>;
  onCategoryExpandToggle?: (value: string) => void;
  scrollY: number;
  setScrollY: (value: number) => void;
}) {
  const x = layout.bodyX;
  const y = layout.bodyY;
  const headerH = 52;
  const modeTop = y + headerH + 14;
  const dividerY = modeTop + 3 * 56 + 10;
  const listTop = dividerY + 26;
  const viewportH = Math.max(1, layout.bodyH - (listTop - y) - 18);
  const rows = categoryWithSubs.flatMap(category => {
    const rowsForCategory: Array<{ type: 'category' | 'subcategory'; category: CategoryWithSubs; sub?: readonly [string, number] }> = [
      { type: 'category', category },
    ];
    if (category.category !== 'all' && categoryExpanded.has(category.category)) {
      for (const sub of category.subList) rowsForCategory.push({ type: 'subcategory', category, sub });
    }
    return rowsForCategory;
  });
  const contentH = rows.reduce((sum, row) => sum + (row.type === 'category' ? 50 : 30), 0);
  const positionedRows = rows.reduce<{
    items: Array<{
      row: (typeof rows)[number];
      y: number;
    }>;
    nextY: number;
  }>(
    (accumulator, row) => ({
      items: [...accumulator.items, { row, y: accumulator.nextY }],
      nextY: accumulator.nextY + (row.type === 'category' ? 50 : 30),
    }),
    { items: [], nextY: listTop }
  ).items;
  const maxScroll = Math.max(0, contentH - viewportH + 8);
  const clampedScrollY = Math.min(maxScroll, Math.max(0, scrollY));
  const trackY = listTop + 4;
  const trackH = Math.max(1, y + layout.bodyH - trackY - 38);
  const thumbH = Math.max(34, trackH * Math.min(1, viewportH / Math.max(viewportH, contentH)));
  const thumbY = trackY + (maxScroll <= 0 ? 0 : (trackH - thumbH) * (clampedScrollY / maxScroll));
  const scrollTo = (next: number) => setScrollY(Math.min(maxScroll, Math.max(0, next)));
  const handleWheel = (event: ReactWheelEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    scrollTo(clampedScrollY + event.deltaY * WHEEL_SCROLL_SPEED);
  };
  const modes: Array<{ key: PlayerModeFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: playerModeCounts.all },
    { key: 'singleplayer', label: 'Single Player', count: playerModeCounts.singleplayer },
    { key: 'multiplayer', label: 'Multiplayer', count: playerModeCounts.multiplayer },
  ];
  return (
    <g id="games-catalog-svg-sidebar" onWheel={handleWheel} filter="url(#gcsg-soft-shadow)">
      <path d={`M ${x + 16} ${y} H ${x + sidebarW} V ${y + layout.bodyH} H ${x + 16} Q ${x} ${y + layout.bodyH} ${x} ${y + layout.bodyH - 16} V ${y + 16} Q ${x} ${y} ${x + 16} ${y} Z`} fill="url(#gcsg-panel-fill)" stroke="#1ea7ff" strokeWidth={1.2} opacity={0.82} />
      <rect x={x + 1} y={y + 1} width={sidebarW - 2} height={headerH} fill="#081b35" opacity={0.82} />
      <SvgText x={x + 24} y={y + 29} size={15} strong color="#ffffff">
        CATEGORIES
      </SvgText>
      <line x1={x + 18} y1={y + headerH} x2={x + sidebarW - 18} y2={y + headerH} stroke="#6fa8df" strokeWidth={1} opacity={0.46} />
      {modes.map((row, index) => {
        const rowY = modeTop + index * 56;
        const active = playerModeFilter === row.key;
        return (
          <Hit key={row.key} x={x + 20} y={rowY} w={sidebarW - 40} h={44} onClick={() => onPlayerModeChange?.(row.key)}>
            <rect className="games-catalog-svg-showcase__hit-surface" x={x + 20} y={rowY} width={sidebarW - 40} height={44} rx={22} fill={active ? 'url(#gcsg-button-active)' : '#020711'} stroke={active ? '#9ceeff' : '#345b89'} strokeWidth={active ? 1.7 : 1} />
            <SvgText x={x + 46} y={rowY + 23} size={13.5} anchor="middle" color="#bde7ff">
              {row.key === 'all' ? '*' : row.key === 'singleplayer' ? '1P' : 'MP'}
            </SvgText>
            <SvgText x={x + 76} y={rowY + 23} size={14} strong={active} color={active ? '#ffffff' : '#b7c8df'}>
              {row.label}
            </SvgText>
            <SvgText x={x + sidebarW - 42} y={rowY + 23} size={10.5} anchor="middle" color={active ? '#e9f8ff' : '#8ea2bd'}>
              {row.count.toLocaleString()}
            </SvgText>
          </Hit>
        );
      })}
      <line x1={x + 20} y1={dividerY} x2={x + sidebarW - 20} y2={dividerY} stroke="#5a7fac" strokeWidth={1} opacity={0.55} />
      <g clipPath={`url(#gcsg-sidebar-window)`}>
        <g transform={`translate(0 ${-clampedScrollY})`}>
          {positionedRows.map(({ row, y: rowY }) => {
            if (row.type === 'category') {
              const active = currentCategory === row.category.category;
              const hasChildren = row.category.subList.length > 0;
              const expanded = categoryExpanded.has(row.category.category);
              const label = row.category.category === 'all' ? 'All' : row.category.category;
              return (
                <Hit key={`cat-${row.category.category}`} x={x} y={rowY} w={sidebarW - 34} h={38} onClick={() => {
                  onCategoryChange?.(row.category.category);
                  if (hasChildren) onCategoryExpandToggle?.(row.category.category);
                }}>
                  <path className="games-catalog-svg-showcase__hit-surface" d={`M ${x} ${rowY} H ${x + sidebarW - 53} Q ${x + sidebarW - 34} ${rowY} ${x + sidebarW - 34} ${rowY + 19} Q ${x + sidebarW - 34} ${rowY + 38} ${x + sidebarW - 53} ${rowY + 38} H ${x} Z`} fill={active ? 'url(#gcsg-button-active)' : '#061124'} stroke={active ? '#9ceeff' : '#345b89'} strokeWidth={active ? 1.7 : 1} />
                  <SvgText x={x + 26} y={rowY + 20} size={11} anchor="middle" color="#d7fff7">
                    {hasChildren ? (expanded ? 'v' : '>') : '-'}
                  </SvgText>
                  <SvgText x={x + 54} y={rowY + 20} size={14.5} color="#d7fff7">
                    {CATEGORY_ICONS[row.category.category] ?? '#'}
                  </SvgText>
                  <SvgText x={x + 82} y={rowY + 20} size={14} strong={active} color={active ? '#ffffff' : '#c5d4e9'}>
                    {truncate(label, 18)}
                  </SvgText>
                  <SvgText x={x + sidebarW - 62} y={rowY + 20} size={10.5} anchor="middle" color="#b9d5ff">
                    {row.category.total.toLocaleString()}
                  </SvgText>
                </Hit>
              );
            }
            const sub = row.sub ?? ['', 0];
            const active = currentCategory === sub[0];
            return (
              <Hit key={`sub-${row.category.category}-${sub[0]}`} x={x + 38} y={rowY} w={sidebarW - 76} h={28} onClick={() => onCategoryChange?.(sub[0])}>
                <path className="games-catalog-svg-showcase__hit-surface" d={`M ${x + 38} ${rowY + 2} H ${x + sidebarW - 50} Q ${x + sidebarW - 38} ${rowY + 2} ${x + sidebarW - 38} ${rowY + 14} Q ${x + sidebarW - 38} ${rowY + 26} ${x + sidebarW - 50} ${rowY + 26} H ${x + 38} Z`} fill={active ? 'url(#gcsg-button-active)' : '#061124'} stroke={active ? '#9ceeff' : '#284a72'} strokeWidth={active ? 1.35 : 0.7} opacity={active ? 1 : 0.66} />
                <SvgText x={x + 56} y={rowY + 15} size={12.2} strong={active} color={active ? '#ffffff' : '#aebdd1'}>
                  {truncate(sub[0], 22)}
                </SvgText>
                <SvgText x={x + sidebarW - 60} y={rowY + 15} size={9.2} anchor="middle" color="#b9d5ff">
                  {sub[1].toLocaleString()}
                </SvgText>
              </Hit>
            );
          })}
        </g>
      </g>
      <path d={`M ${x + sidebarW - 10} ${trackY} V ${trackY + trackH}`} stroke="#7ddcff" strokeWidth={1} opacity={0.28} />
      <rect x={x + sidebarW - 13} y={thumbY} width={6} height={thumbH} rx={3} fill={maxScroll > 0 ? '#26c6ff' : 'none'} stroke="#9ceeff" strokeWidth={1} opacity={maxScroll > 0 ? 0.75 : 0.35} />
    </g>
  );
}

function GameCardSvg({
  x,
  y,
  w,
  game,
  index,
  selected,
  onClick,
  idPrefix,
}: {
  x: number;
  y: number;
  w: number;
  game: GamesExplorerGame;
  index: number;
  selected: boolean;
  onClick: () => void;
  idPrefix: string;
}) {
  const h = 590;
  const pad = 14;
  const bannerH = 226;
  const imgSrc = getPlaceholderImageUrl(stableIndex(game.slug || game.name || String(index)));
  const bannerX = x + pad;
  const bannerY = y + pad;
  const bannerW = w - pad * 2;
  const bodyX = x + 24;
  const bodyTop = y + pad + bannerH + 30;
  const category = game.subcategory ? `${game.category} / ${game.subcategory}` : game.category;
  const titleMax = Math.max(16, Math.floor((w - 56) / 10));
  const descMax = Math.max(24, Math.floor((w - 48) / 7.4));
  const metaItems = [
    game.players ? `Players ${game.players}` : '',
    game.deck ? `Deck ${game.deck}` : '',
    game.duration ? `Time ${game.duration}` : '',
    game.difficulty ? `Level ${game.difficulty}` : '',
  ].filter(Boolean);
  const metaCols = w >= 520 ? 4 : w >= 270 ? 2 : 1;
  const metaGap = 10;
  const metaBoxW = w - 48;
  const metaPillW = (metaBoxW - metaGap * (metaCols - 1)) / metaCols;
  const metaPillH = 30;
  const metaRowGap = 10;
  const metaRows = Math.max(1, Math.ceil(metaItems.length / metaCols));
  const metaGroupH = metaRows * metaPillH + Math.max(0, metaRows - 1) * metaRowGap;
  const metaTop = y + h - metaGroupH - 18;
  const status = game.source === 'asset' ? 'AVAILABLE' : 'COMING SOON';
  const statusTone = game.source === 'asset' ? 'green' : 'gold';
  const completeness = game.completeness ?? {};
  const filledSections = SECTIONS.filter(section => completeness[section]).length;
  const pct = game.completenessPercent ?? (Object.keys(completeness).length > 0 ? Math.round((filledSections / SECTIONS.length) * 100) : 0);
  const clipId = `${idPrefix}-card-img-${index}`;

  return (
    <Hit x={x} y={y} w={w} h={h} onClick={onClick} className="games-catalog-svg-showcase__card">
      <g className="games-catalog-svg-showcase__card-lift">
        <rect x={x} y={y} width={w} height={h} rx={18} fill="#071122" stroke={selected ? '#ffffff' : 'url(#gcsg-card-edge)'} strokeWidth={selected ? 2.2 : 1.25} filter="url(#gcsg-card-glow)" />
        <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={16} fill="url(#gcsg-card-fill)" opacity={0.82} />
        <rect className="games-catalog-svg-showcase__card-ring" x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={14} fill="none" stroke="#23ffd1" strokeWidth={1.1} opacity={selected ? 0.95 : 0.28} />
        <clipPath id={clipId}>
          <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} rx={14} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <image className="games-catalog-svg-showcase__card-image" href={imgSrc} x={bannerX} y={bannerY - 18} width={bannerW} height={bannerH + 36} preserveAspectRatio="xMidYMid slice" opacity={0.92} />
          <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} fill="#020711" opacity={0.32} />
          <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} fill="url(#gcsg-grid-pattern)" opacity={0.18} />
          <path d={`M ${bannerX} ${bannerY + bannerH - 52} C ${bannerX + bannerW * 0.25} ${bannerY + bannerH - 96} ${bannerX + bannerW * 0.44} ${bannerY + bannerH - 8} ${bannerX + bannerW} ${bannerY + bannerH - 62} V ${bannerY + bannerH + 10} H ${bannerX} Z`} fill="#020711" opacity="0.68" />
        </g>
        <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} rx={14} fill="none" stroke="#5c83b0" strokeWidth={1} opacity={0.82} />
        <rect x={bannerX} y={bannerY} width={bannerW} height={34} rx={0} fill="#071026" opacity={0.92} stroke="#2a3954" strokeWidth={1} />
        <SvgText x={bannerX + 14} y={bannerY + 18} size={12} strong color="#ffffff">
          {truncate(category, Math.max(18, Math.floor((bannerW - 28) / 7.2)))}
        </SvgText>
        <Pill x={x + 22} y={bannerY + bannerH - 36} w={status === 'AVAILABLE' ? 112 : 140} label={status} tone={statusTone} />
        <g className="games-catalog-svg-showcase__card-title">
          <SvgText x={bodyX} y={bodyTop} size={18} strong color="#ffffff">
            {truncate(game.name, titleMax)}
          </SvgText>
          <SvgText x={bodyX} y={bodyTop + 34} size={13.5} color="#bdd0e7">
            {truncate(game.description, descMax)}
          </SvgText>
          <SvgText x={bodyX} y={bodyTop + 56} size={13.5} color="#bdd0e7">
            {game.description && game.description.length > descMax ? truncate(game.description.slice(descMax).trim(), descMax) : ''}
          </SvgText>
        </g>
        <g>
          {Object.keys(completeness).length > 0 ? (
            <>
              {SECTIONS.map((section, dotIndex) => (
                <circle key={section} cx={bodyX + dotIndex * 22} cy={y + h - metaGroupH - 74} r={6} fill={completeness[section] ? '#1ed6a6' : 'none'} stroke="#1ed6a6" strokeWidth={1} opacity={completeness[section] ? 1 : 0.45} />
              ))}
              <SvgText x={bodyX + 190} y={y + h - metaGroupH - 73} size={11.5} color="#8ea2bd">
                {filledSections}/{SECTIONS.length} sections
              </SvgText>
              <rect x={bodyX} y={y + h - metaGroupH - 44} width={w - 72} height={8} rx={4} fill="#061124" stroke="#345b89" strokeWidth={1} />
              <rect x={bodyX} y={y + h - metaGroupH - 44} width={(w - 72) * Math.max(0, Math.min(100, pct)) / 100} height={8} rx={4} fill="#1ed6a6" opacity={0.86} />
              <SvgText x={x + w - 36} y={y + h - metaGroupH - 40} size={11} anchor="end" color="#c9e9ff">
                {pct}%
              </SvgText>
            </>
          ) : null}
          {metaItems.map((label, metaIndex) => {
            const metaCol = metaIndex % metaCols;
            const metaRow = Math.floor(metaIndex / metaCols);
            const px = bodyX + metaCol * (metaPillW + metaGap);
            const py = metaTop + metaRow * (metaPillH + metaRowGap);
            return <Pill key={label} x={px} y={py} w={metaPillW} label={label} />;
          })}
        </g>
      </g>
    </Hit>
  );
}

const MemoGameCardSvg = memo(
  GameCardSvg,
  (previous, next) =>
    previous.x === next.x &&
    previous.y === next.y &&
    previous.w === next.w &&
    previous.index === next.index &&
    previous.selected === next.selected &&
    previous.game === next.game
);

function GameListSvg({
  x,
  y,
  w,
  games,
  selectedGame,
  setSelectedGame,
  startRow,
  endRow,
}: {
  x: number;
  y: number;
  w: number;
  games: readonly GamesExplorerGame[];
  selectedGame: GamesExplorerGame | null;
  setSelectedGame: (value: GamesExplorerGame) => void;
  startRow: number;
  endRow: number;
}) {
  return (
    <g id="games-catalog-svg-list-mode">
      <rect x={x} y={y} width={w} height={44} rx={10} fill="#08152a" stroke="#4d6d9a" strokeWidth={1} />
      <SvgText x={x + 18} y={y + 23} strong>Name</SvgText>
      <SvgText x={x + w - 350} y={y + 23}>Category</SvgText>
      <SvgText x={x + w - 190} y={y + 23}>Players</SvgText>
      <SvgText x={x + w - 100} y={y + 23}>Status</SvgText>
      {Array.from({ length: Math.max(0, endRow - startRow + 1) }, (_, offset) => {
        const index = startRow + offset;
        const game = games[index];
        if (!game) return null;
        const rowY = y + 54 + index * 54;
        const selected = selectedGame?.slug === game.slug;
        return (
          <Hit key={`${game.slug}-${index}`} x={x} y={rowY} w={w} h={44} onClick={() => setSelectedGame(game)}>
            <rect className="games-catalog-svg-showcase__hit-surface" x={x} y={rowY} width={w} height={44} rx={10} fill={selected ? 'url(#gcsg-button-active)' : '#061124'} stroke={selected ? '#fff' : '#345b89'} strokeWidth={selected ? 1.8 : 1} />
            <SvgText x={x + 18} y={rowY + 23} strong={selected}>{truncate(game.name, 54)}</SvgText>
            <SvgText x={x + w - 350} y={rowY + 23}>{truncate(game.subcategory ? `${game.category} / ${game.subcategory}` : game.category, 28)}</SvgText>
            <SvgText x={x + w - 190} y={rowY + 23}>{truncate(game.players, 14)}</SvgText>
            <SvgText x={x + w - 100} y={rowY + 23} color={game.source === 'asset' ? '#1ed6a6' : '#ffd36d'}>
              {game.source === 'asset' ? 'Available' : 'Coming'}
            </SvgText>
          </Hit>
        );
      })}
    </g>
  );
}

function GamesArea({
  layout,
  panelX,
  panelW,
  areaY,
  areaH,
  mode,
  games,
  selectedGame,
  setSelectedGame,
  scrollY,
  setScrollY,
  viewportPixelW,
  idPrefix,
}: {
  layout: Layout;
  panelX: number;
  panelW: number;
  areaY: number;
  areaH: number;
  mode: ViewMode;
  games: readonly GamesExplorerGame[];
  selectedGame: GamesExplorerGame | null;
  setSelectedGame: (value: GamesExplorerGame) => void;
  scrollY: number;
  setScrollY: (value: number) => void;
  viewportPixelW: number;
  idPrefix: string;
}) {
  const x = panelX;
  const y = areaY;
  const w = panelW;
  const pad = 20;
  const cardTopClearance = 28;
  const gap = 44;
  const showList = mode === 'list';
  const scale = viewportPixelW / Math.max(1, layout.viewW);
  const panelPixelW = w * scale;
  const padPx = pad * scale;
  const gapPx = gap * scale;
  const minCardPx = 250;
  const maxCardPx = 340;
  const rawCols = Math.floor((panelPixelW - padPx * 2 + gapPx) / (minCardPx + gapPx));
  const cols = Math.max(1, Math.min(4, rawCols));
  const availableCardPx = (panelPixelW - padPx * 2 - gapPx * (cols - 1)) / cols;
  const cardPx = Math.min(maxCardPx, Math.max(minCardPx, availableCardPx));
  const cardW = cardPx / Math.max(0.001, scale);
  const gridUsedW = cardW * cols + gap * (cols - 1);
  const gridX = x + Math.max(pad, (w - gridUsedW) / 2);
  const cardH = 590;
  const listHeaderH = 44;
  const listRowH = 54;
  const listContentH = pad + listHeaderH + listRowH * games.length + pad;
  const gridRows = Math.ceil(games.length / cols);
  const gridContentH = pad + cardTopClearance + gridRows * cardH + Math.max(0, gridRows - 1) * gap + pad;
  const contentH = showList ? listContentH : gridContentH;
  const viewportH = Math.max(1, areaH - 4);
  const maxScroll = Math.max(0, contentH - viewportH);
  const clampedScrollY = Math.min(maxScroll, Math.max(0, scrollY));
  const visibleRatio = Math.min(1, viewportH / Math.max(viewportH, contentH));
  const trackY = y + 20;
  const trackH = Math.max(1, areaH - 48);
  const thumbH = Math.max(34, trackH * visibleRatio);
  const thumbY = trackY + (maxScroll <= 0 ? 0 : (trackH - thumbH) * (clampedScrollY / maxScroll));
  const scrollTo = (next: number) => setScrollY(Math.min(maxScroll, Math.max(0, next)));
  const handleWheel = (event: ReactWheelEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    scrollTo(clampedScrollY + event.deltaY * WHEEL_SCROLL_SPEED);
  };
  const gridStartRow = Math.max(0, Math.floor((clampedScrollY - pad - cardTopClearance) / (cardH + gap)) - VIRTUAL_ROW_BUFFER);
  const gridEndRow = Math.min(gridRows - 1, Math.ceil((clampedScrollY + viewportH - pad - cardTopClearance) / (cardH + gap)) + VIRTUAL_ROW_BUFFER);
  const gridStartIndex = gridStartRow * cols;
  const gridEndIndexExclusive = Math.min(games.length, (gridEndRow + 1) * cols);
  const listStartRow = Math.max(0, Math.floor((clampedScrollY - pad - listHeaderH) / listRowH) - VIRTUAL_ROW_BUFFER);
  const listEndRow = Math.min(games.length - 1, Math.ceil((clampedScrollY + viewportH - pad - listHeaderH) / listRowH) + VIRTUAL_ROW_BUFFER);

  return (
    <g id="games-catalog-svg-games-area" onWheel={handleWheel} filter="url(#gcsg-soft-shadow)">
      <path d={`M ${x} ${y} H ${x + w - 16} Q ${x + w} ${y} ${x + w} ${y + 16} V ${y + areaH - 16} Q ${x + w} ${y + areaH} ${x + w - 16} ${y + areaH} H ${x} V ${y} Z`} fill="url(#gcsg-panel-fill)" stroke="#1ea7ff" strokeWidth={1.2} opacity={0.76} />
      <rect x={x + 1} y={y + 1} width={w - 2} height={areaH - 2} fill="transparent" />
      {games.length === 0 ? (
        <SvgText x={x + w / 2} y={y + areaH / 2} size={18} anchor="middle" color="#b8cae7">
          No games match the current filters.
        </SvgText>
      ) : (
        <g clipPath={`url(#${idPrefix}-gamesClip)`}>
          <g transform={`translate(0 ${-clampedScrollY})`}>
            {showList ? (
              <GameListSvg x={x + pad} y={y + pad} w={w - pad * 2} games={games} selectedGame={selectedGame} setSelectedGame={setSelectedGame} startRow={listStartRow} endRow={listEndRow} />
            ) : (
              Array.from({ length: Math.max(0, gridEndIndexExclusive - gridStartIndex) }, (_, offset) => {
                const index = gridStartIndex + offset;
                const game = games[index];
                if (!game) return null;
                const col = index % cols;
                const row = Math.floor(index / cols);
                const cardX = gridX + col * (cardW + gap);
                const cardY = y + pad + cardTopClearance + row * (cardH + gap);
                return (
                  <MemoGameCardSvg
                    key={`${game.slug}-${index}`}
                    x={cardX}
                    y={cardY}
                    w={cardW}
                    game={game}
                    index={index}
                    selected={selectedGame?.slug === game.slug}
                    onClick={() => setSelectedGame(game)}
                    idPrefix={idPrefix}
                  />
                );
              })
            )}
          </g>
        </g>
      )}
      <path d={`M ${x + w - 10} ${trackY} V ${trackY + trackH}`} stroke="#7ddcff" strokeWidth={1} opacity={0.28} />
      <rect x={x + w - 13} y={thumbY} width={6} height={thumbH} rx={3} fill={maxScroll > 0 ? '#26c6ff' : 'none'} stroke="#9ceeff" strokeWidth={1} opacity={maxScroll > 0 ? 0.75 : 0.35} />
    </g>
  );
}

function DetailOverlay({
  layout,
  game,
  close,
  openGame,
}: {
  layout: Layout;
  game: GamesExplorerGame | null;
  close: () => void;
  openGame?: (game: GamesExplorerGame) => void;
}) {
  if (!game) return null;
  const panelW = 1320;
  const panelH = Math.min(790, layout.viewH - 100);
  const x = (BASE_VIEW_W - panelW) / 2;
  const y = Math.max(48, (layout.viewH - panelH) / 2);
  const headerH = 218;
  const bodyY = y + headerH;
  const category = game.subcategory ? `${game.category} / ${game.subcategory}` : game.category;
  const completeness = game.completeness ?? {};
  const filledSections = SECTIONS.filter(section => completeness[section]).length;
  const pct = game.completenessPercent ?? (Object.keys(completeness).length > 0 ? Math.round((filledSections / SECTIONS.length) * 100) : 0);
  const hasOpenAction = Boolean(openGame) && game.source === 'asset';

  return (
    <g id="games-catalog-svg-detail-overlay" filter="url(#gcsg-soft-shadow)">
      <rect x={0} y={0} width={layout.viewW} height={layout.viewH} fill="#000" opacity={0.58} />
      <rect x={0} y={0} width={layout.viewW} height={layout.viewH} fill="url(#gcsg-grid-pattern)" opacity={0.1} />
      <rect x={x} y={y} width={panelW} height={panelH} rx={28} fill="url(#gcsg-panel-fill)" stroke="url(#gcsg-card-edge)" strokeWidth={1.7} />
      <rect x={x + 2} y={y + 2} width={panelW - 4} height={panelH - 4} rx={26} fill="#020712" opacity={0.42} />
      <path d={`M ${x + 1} ${y + 28} Q ${x + 1} ${y + 1} ${x + 28} ${y + 1} H ${x + panelW - 28} Q ${x + panelW - 1} ${y + 1} ${x + panelW - 1} ${y + 28} V ${bodyY} H ${x + 1} Z`} fill="url(#gcsg-top-fill)" opacity={0.72} />
      <line x1={x + 24} y1={bodyY} x2={x + panelW - 24} y2={bodyY} stroke="#1ea7ff" strokeWidth={1.2} opacity={0.4} />
      <SvgText x={x + 42} y={y + 46} size={30} strong color="#ffffff">
        {truncate(game.name, 46)}
      </SvgText>
      <Pill x={x + 42} y={y + 82} w={game.source === 'asset' ? 116 : 146} label={game.source === 'asset' ? 'AVAILABLE' : 'COMING SOON'} tone={game.source === 'asset' ? 'green' : 'gold'} />
      <SvgText x={x + 210} y={y + 98} size={14} color="#b9d5ff">
        {truncate(category, 62)}
      </SvgText>
      <SvgText x={x + 42} y={y + 138} size={13} color="#9fb1c8">
        {game.deck ? `Deck: ${game.deck}` : 'Deck data not supplied'}{game.players ? `  /  Players: ${game.players}` : ''}{game.duration ? `  /  Time: ${game.duration}` : ''}
      </SvgText>
      <Hit x={x + panelW - 78} y={y + 28} w={52} h={52} onClick={close}>
        <circle className="games-catalog-svg-showcase__hit-surface" cx={x + panelW - 52} cy={y + 54} r={27} fill="#071026" stroke="#55749e" strokeWidth={1.3} />
        <SvgText x={x + panelW - 52} y={y + 55} size={22} anchor="middle" color="#bde7ff">x</SvgText>
      </Hit>
      <g id="games-catalog-svg-detail-tabs">
        {['Overview', 'History', 'Setup', 'Rules', 'Strategy', 'Variations'].map((label, index) => {
          const bx = x + 42 + index * 132;
          const active = index === 0;
          return (
            <Hit key={label} x={bx} y={y + 162} w={118} h={42}>
              <rect className="games-catalog-svg-showcase__hit-surface" x={bx} y={y + 162} width={118} height={42} rx={21} fill={active ? 'url(#gcsg-button-active)' : '#071026'} stroke={active ? '#aeefff' : '#00d6a6'} strokeWidth={active ? 1.7 : 1.1} opacity={active ? 0.96 : 0.75} filter={active ? 'url(#gcsg-cyan-glow)' : undefined} />
              <SvgText x={bx + 59} y={y + 184} size={12} anchor="middle" strong={active} color={active ? '#ffffff' : '#c9e9ff'}>{label}</SvgText>
            </Hit>
          );
        })}
      </g>
      <g id="games-catalog-svg-detail-body">
        <rect x={x + 1} y={bodyY + 1} width={panelW - 2} height={panelH - headerH - 2} fill="#020712" opacity={0.38} />
        <rect x={x + 42} y={bodyY + 34} width={panelW - 460} height={230} rx={16} fill="url(#gcsg-card-fill)" stroke="#345b89" strokeWidth={1.1} opacity={0.92} />
        <SvgText x={x + 66} y={bodyY + 68} size={14} strong color="#e9f8ff">OVERVIEW</SvgText>
        <SvgText x={x + 66} y={bodyY + 110} size={14} color="#bdcbe0">{truncate(game.description || 'No overview is available for this catalog entry yet.', 126)}</SvgText>
        <SvgText x={x + 66} y={bodyY + 146} size={14} color="#9fb1c8">Category: {truncate(category, 80)}</SvgText>
        <SvgText x={x + 66} y={bodyY + 176} size={14} color="#9fb1c8">Difficulty: {game.difficulty || 'Not specified'}</SvgText>
        <SvgText x={x + 66} y={bodyY + 206} size={14} color="#9fb1c8">Source: {game.source === 'asset' ? 'authored game asset' : 'catalog index entry'}</SvgText>
        <rect x={x + panelW - 376} y={bodyY + 34} width={314} height={230} rx={16} fill="url(#gcsg-card-fill)" stroke="#345b89" strokeWidth={1.1} opacity={0.92} />
        <SvgText x={x + panelW - 354} y={bodyY + 68} size={14} strong color="#e9f8ff">READINESS</SvgText>
        {SECTIONS.map((section, index) => (
          <circle key={section} cx={x + panelW - 354 + index * 24} cy={bodyY + 106} r={7} fill={completeness[section] ? '#1ed6a6' : 'none'} stroke="#1ed6a6" strokeWidth={1} opacity={completeness[section] ? 1 : 0.45} />
        ))}
        <SvgText x={x + panelW - 122} y={bodyY + 107} size={13} color="#c9e9ff">{pct}%</SvgText>
        <rect x={x + panelW - 354} y={bodyY + 136} width={260} height={8} rx={4} fill="#061124" stroke="#345b89" strokeWidth={1} />
        <rect x={x + panelW - 354} y={bodyY + 136} width={260 * Math.max(0, Math.min(100, pct)) / 100} height={8} rx={4} fill="#1ed6a6" opacity={0.86} />
        {hasOpenAction ? <Button x={x + panelW - 354} y={bodyY + 178} w={260} h={42} label="Open Asset" active onClick={() => openGame?.(game)} /> : null}
      </g>
    </g>
  );
}

function buildFallbackCategories(games: readonly GamesExplorerGame[]): CategoryWithSubs[] {
  const byCategory = new Map<string, Map<string, number>>();
  for (const game of games) {
    const category = game.category || 'Unknown';
    const subcategory = game.subcategory || '';
    const subMap = byCategory.get(category) ?? new Map<string, number>();
    if (subcategory) subMap.set(subcategory, (subMap.get(subcategory) ?? 0) + 1);
    byCategory.set(category, subMap);
  }
  return [
    { category: 'all', total: games.length, subList: [] },
    ...Array.from(byCategory.entries())
      .map(([category, subMap]) => ({
        category,
        total: games.filter(game => game.category === category).length,
        subList: Array.from(subMap.entries()).sort((a, b) => b[1] - a[1]) as Array<readonly [string, number]>,
      }))
      .sort((a, b) => b.total - a.total),
  ];
}

function buildFallbackPlayerCounts(games: readonly GamesExplorerGame[]): Record<PlayerModeFilter, number> {
  return {
    all: games.length,
    singleplayer: games.filter(game => game.player_mode === 'singleplayer').length,
    multiplayer: games.filter(game => game.player_mode === 'multiplayer').length,
  };
}

export function GamesCatalogSvgShowcase({
  games,
  metadata,
  categoryWithSubs,
  playerModeCounts,
  availableCount,
  currentView = 'grid',
  onViewChange,
  searchQuery = '',
  onSearchChange,
  currentCategory = 'all',
  onCategoryChange,
  playerModeFilter = 'all',
  onPlayerModeChange,
  categoryExpanded = new Set<string>(),
  onCategoryExpandToggle,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onGameClick,
}: GamesCatalogSvgShowcaseProps) {
  const idPrefix = useId().replace(/:/g, '');
  const { ref, size } = useViewportSize();
  const [selectedGame, setSelectedGame] = useState<GamesExplorerGame | null>(null);
  const [gridScrollY, setGridScrollY] = useState(0);
  const [sidebarScrollY, setSidebarScrollY] = useState(0);
  const dynamicViewH = Math.max(MIN_VIEW_H, Math.round(BASE_VIEW_W * (size.height / Math.max(1, size.width))));
  const layout = useMemo(() => makeLayout(dynamicViewH), [dynamicViewH]);
  const sidebarW = isSidebarCollapsed ? 0 : DEFAULT_SIDEBAR_W;
  const panelX = layout.bodyX + sidebarW;
  const panelW = layout.bodyW - sidebarW;
  const showAlphabetBar = currentView === 'alphabet';
  const gamesY = showAlphabetBar ? layout.bodyY + CONTROL_BAR_H : layout.bodyY;
  const gamesH = layout.bodyH - (showAlphabetBar ? CONTROL_BAR_H : 0);
  const resolvedCategories = categoryWithSubs?.length ? categoryWithSubs : buildFallbackCategories(games);
  const resolvedPlayerCounts = playerModeCounts ?? buildFallbackPlayerCounts(games);
  const resolvedAvailableCount = availableCount ?? games.filter(game => game.source === 'asset').length;
  const resolvedMetadata = metadata ?? { totalGames: games.length };
  const categoryCount = resolvedCategories.filter(item => item.category !== 'all').length;

  const setView = (value: ViewMode) => {
    onViewChange?.(value);
    setGridScrollY(0);
  };
  const handleSearchChange = (value: string) => {
    onSearchChange?.(value);
    setGridScrollY(0);
  };
  const handleCategoryChange = (value: string) => {
    onCategoryChange?.(value);
    setGridScrollY(0);
  };
  const handlePlayerModeChange = (value: PlayerModeFilter) => {
    onPlayerModeChange?.(value);
    setGridScrollY(0);
  };
  const handleSelectedGame = (game: GamesExplorerGame) => {
    setSelectedGame(game);
  };

  return (
    <div ref={ref} className="games-catalog-svg-showcase">
      <svg viewBox={`0 0 ${layout.viewW} ${layout.viewH}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Card games catalog SVG preview">
        <Defs idPrefix={idPrefix} />
        <clipPath id="gcsg-sidebar-window">
          <rect x={layout.bodyX + 1} y={layout.bodyY + 270} width={Math.max(1, DEFAULT_SIDEBAR_W - 3)} height={layout.bodyH - 288} />
        </clipPath>
        <clipPath id={`${idPrefix}-gamesClip`}>
          <rect x={panelX + 2} y={gamesY + 2} width={panelW - 4} height={gamesH - 4} />
        </clipPath>
        <rect x={0} y={0} width={layout.viewW} height={layout.viewH} fill="#00040b" />
        <rect x={0} y={0} width={layout.viewW} height={layout.viewH} fill="url(#gcsg-bg-radial)" />
        <rect x={0} y={0} width={layout.viewW} height={layout.viewH} fill="url(#gcsg-grid-pattern)" opacity={0.36} />
        <rect x={layout.pageX} y={layout.pageY} width={layout.pageW} height={layout.pageH} rx={18} fill="none" stroke="#00ffd0" strokeWidth={1.2} opacity={0.62} />
        <TopBar
          layout={layout}
          view={currentView}
          setView={setView}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          metadata={resolvedMetadata}
          availableCount={resolvedAvailableCount}
          categoryCount={categoryCount}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
        />
        {!isSidebarCollapsed ? (
          <Sidebar
            layout={layout}
            sidebarW={DEFAULT_SIDEBAR_W}
            categoryWithSubs={resolvedCategories}
            currentCategory={currentCategory}
            onCategoryChange={handleCategoryChange}
            playerModeFilter={playerModeFilter}
            onPlayerModeChange={handlePlayerModeChange}
            playerModeCounts={resolvedPlayerCounts}
            categoryExpanded={categoryExpanded}
            onCategoryExpandToggle={onCategoryExpandToggle}
            scrollY={sidebarScrollY}
            setScrollY={setSidebarScrollY}
          />
        ) : null}
        {showAlphabetBar ? (
          <g id="games-catalog-svg-alphabet-bar" filter="url(#gcsg-soft-shadow)">
            <path d={`M ${panelX} ${layout.bodyY} H ${panelX + panelW - 16} Q ${panelX + panelW} ${layout.bodyY} ${panelX + panelW} ${layout.bodyY + 16} V ${layout.bodyY + CONTROL_BAR_H} H ${panelX} Z`} fill="url(#gcsg-panel-fill)" stroke="#1ea7ff" strokeWidth={1.2} />
            <SvgText x={panelX + 18} y={layout.bodyY + 29} size={14} strong color="#ffffff">Alphabet</SvgText>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, 20).map((letter, index) => (
              <Pill key={letter} x={panelX + 104 + index * 44} y={layout.bodyY + 14} w={34} label={letter} />
            ))}
          </g>
        ) : null}
        <GamesArea
          layout={layout}
          panelX={panelX}
          panelW={panelW}
          areaY={gamesY}
          areaH={gamesH}
          mode={currentView === 'alphabet' ? 'grid' : currentView}
          games={games}
          selectedGame={selectedGame}
          setSelectedGame={handleSelectedGame}
          scrollY={gridScrollY}
          setScrollY={setGridScrollY}
          viewportPixelW={size.width}
          idPrefix={idPrefix}
        />
        <DetailOverlay
          layout={layout}
          game={selectedGame}
          close={() => setSelectedGame(null)}
          openGame={onGameClick}
        />
      </svg>
    </div>
  );
}
