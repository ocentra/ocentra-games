import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import { getPlaceholderImageUrl, placeholderImageCount } from '@ocentra/app-assets/placeholders';
import type {
  CategoryWithSubs,
  GamesExplorerDetailSection,
  GamesExplorerGameDetail,
  GamesExplorerGame,
  GamesExplorerMetadata,
  PlayerModeFilter,
  QualityFilter,
  SortBy,
  ViewMode,
} from './types';
import { SECTIONS } from './types';
import {
  DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS,
  type GamesCatalogSvgLayoutControls,
} from './GamesCatalogSvgShowcaseControls';
import './GamesCatalogSvgShowcase.css';

const BASE_VIEW_W = 1800;
const MIN_VIEW_H = 900;
const CONTROL_BAR_H = 58;
const WHEEL_SCROLL_SPEED = 0.72;
const VIRTUAL_ROW_BUFFER = 2;
const DRAG_RAF_NONE = -1;
const LETTERS = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const QUALITY_OPTIONS: ReadonlyArray<{ value: QualityFilter; label: string }> = [
  { value: 'all', label: 'All Quality' },
  { value: 'available', label: 'Available' },
  { value: 'complete', label: 'Complete' },
  { value: 'partial', label: 'Partial' },
  { value: 'placeholder', label: 'Placeholder' },
];
const SORT_OPTIONS: ReadonlyArray<{ value: SortBy; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'completeness', label: 'Completeness' },
  { value: 'available', label: 'Available' },
];
const ICONS = {
  folder: '\u{1F4C1}',
  gamepad: '\u{1F3AE}',
  card: '\u{1F0CF}',
  players: '\u{1F465}',
  target: '\u{1F3AF}',
  clock: '\u23F1',
  bolt: '\u26A1',
  spade: '\u2660',
  rummy: '\u{1F3B4}',
  domino: '\u25AF',
  castle: '\u265C',
  fishing: '\u{1F3A3}',
  matching: '\u25A7',
  vying: '\u2694',
  patience: '\u2726',
  bank: '\u{1F3E6}',
  climbing: '\u{1F9D7}',
  slot: '\u{1F3B0}',
  chart: '\u{1F4C8}',
} as const;
const PLAYER_MODE_ICONS: Record<PlayerModeFilter, string> = {
  all: ICONS.gamepad,
  singleplayer: ICONS.card,
  multiplayer: ICONS.players,
};
const CATEGORY_ICON_OVERRIDES: Record<string, string> = {
  'trick-taking': ICONS.target,
  poker: ICONS.spade,
  rummy: ICONS.rummy,
  domino: ICONS.domino,
  shedding: ICONS.castle,
  fishing: ICONS.fishing,
  matching: ICONS.matching,
  vying: ICONS.vying,
  patience: ICONS.patience,
  banking: ICONS.bank,
  climbing: ICONS.climbing,
  gambling: ICONS.slot,
  war: ICONS.vying,
  accumulation: ICONS.chart,
};

type Layout = ReturnType<typeof makeLayout>;

export interface GamesCatalogSvgShowcaseProps {
  games: readonly GamesExplorerGame[];
  metadata?: GamesExplorerMetadata | null;
  categoryWithSubs?: readonly CategoryWithSubs[];
  playerModeCounts?: Record<PlayerModeFilter, number>;
  availableCount?: number;
  currentView?: ViewMode;
  onViewChange?: (value: ViewMode) => void;
  qualityFilter?: QualityFilter;
  onQualityChange?: (value: QualityFilter) => void;
  sortBy?: SortBy;
  onSortChange?: (value: SortBy) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  currentCategory?: string;
  onCategoryChange?: (value: string) => void;
  currentSubcategory?: string | null;
  onSubcategoryChange?: (value: string | null) => void;
  playerModeFilter?: PlayerModeFilter;
  onPlayerModeChange?: (value: PlayerModeFilter) => void;
  categoryExpanded?: ReadonlySet<string>;
  onCategoryExpandToggle?: (value: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  detail?: GamesExplorerGameDetail | null;
  detailLoading?: boolean;
  selectedGame?: GamesExplorerGame | null;
  initialDetailSection?: GamesExplorerDetailSection;
  onGameSelect?: (game: GamesExplorerGame) => void;
  onDetailClose?: () => void;
  onGameClick?: (game: GamesExplorerGame) => void;
  onRulesClick?: (game: GamesExplorerGame) => void;
  layoutControls?: Partial<GamesCatalogSvgLayoutControls>;
  minCardWidthPx?: number;
  maxCardWidthPx?: number;
  maxGridColumns?: number;
  cardHeight?: number;
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

function wrapText(value: string | undefined | null, maxChars: number, maxLines: number): string[] {
  if (!value || maxLines <= 0) return [];
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidateLine = currentLine ? `${currentLine} ${word}` : word;
    if (candidateLine.length <= maxChars) {
      currentLine = candidateLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word.length > maxChars ? word.slice(0, maxChars) : word;

    if (lines.length === maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1], maxChars);
  }

  return lines;
}

const DETAIL_SECTIONS: readonly GamesExplorerDetailSection[] = ['overview', 'history', 'setup', 'rules', 'strategy', 'variations'] as const;

const DETAIL_SECTION_LABELS: Record<GamesExplorerDetailSection, string> = {
  overview: 'Overview',
  history: 'History',
  setup: 'Setup',
  rules: 'Rules',
  strategy: 'Strategy',
  variations: 'Variations',
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function joinDetailLines(parts: Array<string | null | undefined>): string {
  return parts.map(part => cleanText(part)).filter(Boolean).join('\n');
}

function joinDetailParagraphs(parts: Array<string | null | undefined>): string {
  return parts.map(part => cleanText(part)).filter(Boolean).join('\n\n');
}

function stringifyDetailValue(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map(item => stringifyDetailValue(item))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value !== 'object') return String(value);
  const record = value as Record<string, unknown>;
  return Object.entries(record)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && entryValue !== '')
    .map(([key, entryValue]) => {
      const rendered = stringifyDetailValue(entryValue);
      return rendered ? `${key}: ${rendered}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function stringifyDetailListItem(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return stringifyDetailValue(value);
  const record = value as Record<string, unknown>;
  const name = cleanText(record.name) || cleanText(record.title) || cleanText(record.label);
  const description = cleanText(record.description) || cleanText(record.body) || cleanText(record.text) || cleanText(record.value);
  if (name && description) return `${name}: ${description}`;
  if (name) return name;
  if (description) return description;
  return stringifyDetailValue(value);
}

function renderDetailSection(game: GamesExplorerGame, detail: GamesExplorerGameDetail | null | undefined, section: GamesExplorerDetailSection): string {
  const source = detail ? (detail as Record<string, unknown>)[section] : null;

  if (typeof source === 'string') {
    return source.trim();
  }

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const sourceRecord = source as Record<string, unknown>;
    switch (section) {
      case 'overview':
        return joinDetailLines([
          cleanText(sourceRecord.description) || game.description,
          sourceRecord.type ? `Type: ${String(sourceRecord.type)}` : undefined,
          sourceRecord.origin ? `Origin: ${String(sourceRecord.origin)}` : game.origin ? `Origin: ${game.origin}` : undefined,
          sourceRecord.players ? `Players: ${String(sourceRecord.players)}` : game.players ? `Players: ${game.players}` : undefined,
          sourceRecord.deck ? `Deck: ${String(sourceRecord.deck)}` : game.deck ? `Deck: ${game.deck}` : undefined,
          sourceRecord.difficulty ? `Difficulty: ${String(sourceRecord.difficulty)}` : game.difficulty ? `Difficulty: ${game.difficulty}` : undefined,
          sourceRecord.duration ? `Duration: ${String(sourceRecord.duration)}` : game.duration ? `Duration: ${game.duration}` : undefined,
        ]);
      case 'history':
        return joinDetailLines([
          cleanText(sourceRecord.origins),
          Array.isArray(sourceRecord.timeline) ? sourceRecord.timeline.map(item => `- ${stringifyDetailListItem(item)}`).join('\n') : undefined,
          cleanText(sourceRecord.evolution),
          cleanText(sourceRecord.cultural),
        ]);
      case 'setup':
        return joinDetailLines([
          sourceRecord.players ? `Players: ${String(sourceRecord.players)}` : game.players ? `Players: ${game.players}` : undefined,
          sourceRecord.deck ? `Deck: ${String(sourceRecord.deck)}` : game.deck ? `Deck: ${game.deck}` : undefined,
          sourceRecord.equipment ? `Equipment: ${String(sourceRecord.equipment)}` : undefined,
          sourceRecord.dealing ? `Dealing: ${String(sourceRecord.dealing)}` : undefined,
        ]);
      case 'rules':
        return joinDetailLines([
          sourceRecord.objective ? `Objective: ${String(sourceRecord.objective)}` : undefined,
          sourceRecord.gameplay ? `Gameplay: ${String(sourceRecord.gameplay)}` : undefined,
          sourceRecord.scoring ? `Scoring: ${String(sourceRecord.scoring)}` : undefined,
          Array.isArray(sourceRecord.keyRules) ? sourceRecord.keyRules.map(item => `- ${stringifyDetailListItem(item)}`).join('\n') : undefined,
        ]);
      case 'strategy':
        return joinDetailParagraphs([
          sourceRecord.basic ? `Basic:\n${String(sourceRecord.basic)}` : undefined,
          sourceRecord.intermediate ? `Intermediate:\n${String(sourceRecord.intermediate)}` : undefined,
          sourceRecord.advanced ? `Advanced:\n${String(sourceRecord.advanced)}` : undefined,
          Array.isArray(sourceRecord.tips) ? sourceRecord.tips.map(item => `- ${stringifyDetailListItem(item)}`).join('\n') : undefined,
        ]);
      case 'variations':
        return Array.isArray(sourceRecord.list)
          ? sourceRecord.list.map(item => `- ${stringifyDetailListItem(item)}`).join('\n')
          : stringifyDetailValue(sourceRecord);
      default:
        return stringifyDetailValue(source);
    }
  }

  if (Array.isArray(source)) {
    return source.map(item => `- ${stringifyDetailListItem(item)}`).filter(Boolean).join('\n');
  }

  if (section === 'overview') {
    return joinDetailLines([
      game.description,
      game.origin ? `Origin: ${game.origin}` : undefined,
      game.players ? `Players: ${game.players}` : undefined,
      game.deck ? `Deck: ${game.deck}` : undefined,
      game.difficulty ? `Difficulty: ${game.difficulty}` : undefined,
      game.duration ? `Duration: ${game.duration}` : undefined,
    ]);
  }

  if (section === 'setup') {
    return joinDetailLines([
      game.players ? `Players: ${game.players}` : undefined,
      game.deck ? `Deck: ${game.deck}` : undefined,
    ]);
  }

  return '';
}

function wrapDetailText(value: string, maxChars: number, maxLines: number): string[] {
  if (!value || maxLines <= 0) return [];
  const lines: string[] = [];
  for (const paragraph of value.split(/\n+/)) {
    const nextLines = wrapText(paragraph, maxChars, maxLines - lines.length);
    lines.push(...nextLines);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

function compactPlayers(value: string | undefined): string {
  const compact = (value ?? '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\bactive\b/gi, '')
    .replace(/\bplayers?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return truncate(compact, 18);
}

function compactDeck(value: string | undefined): string {
  const compact = (value ?? '')
    .replace(/\bstandard\b/gi, '')
    .replace(/\bdeck\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cardsMatch = compact.match(/(\d+)\s*[- ]?cards?/i);
  if (cardsMatch) return `${cardsMatch[1]} cards`;
  return truncate(compact, 20);
}

function compactDuration(value: string | undefined): string {
  const compact = (value ?? '')
    .replace(/\bminutes?\b/gi, 'm')
    .replace(/\s+m\b/gi, 'm')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return truncate(compact, 14);
}

function compactDifficulty(value: string | undefined): string {
  const compact = (value ?? '').trim();
  if (/intermediate/i.test(compact)) return 'Mid';
  return truncate(compact, 16);
}

function categoryIcon(category: string): string {
  return CATEGORY_ICON_OVERRIDES[category.toLowerCase()] ?? ICONS.target;
}

function resolveGamesCatalogLayoutControls(
  controls?: Partial<GamesCatalogSvgLayoutControls>
): GamesCatalogSvgLayoutControls {
  return {
    ...DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS,
    ...(controls ?? {}),
  };
}

function makeLayout(viewW: number, viewH: number, controls: GamesCatalogSvgLayoutControls) {
  const safeW = Math.max(BASE_VIEW_W, viewW);
  const safeH = Math.max(MIN_VIEW_H, viewH);
  const outerInset = controls.outerInset;
  const pageX = outerInset;
  const pageY = outerInset;
  const pageW = safeW - outerInset * 2;
  const pageH = safeH - outerInset * 2;
  const topX = outerInset + controls.topBarInsetX;
  const topY = controls.showToolbar ? controls.topBarTopInset : outerInset;
  const topW = safeW - (outerInset + controls.topBarInsetX) * 2;
  const topH = controls.showToolbar ? controls.topBarHeight : 0;
  const bodyX = outerInset;
  const bodyY = controls.showToolbar ? topY + topH : outerInset;
  const bodyW = safeW - outerInset * 2;
  const bodyH = safeH - outerInset - bodyY;
  return { viewW: safeW, viewH: safeH, pageX, pageY, pageW, pageH, topX, topY, topW, topH, bodyX, bodyY, bodyW, bodyH };
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

function useNonPassiveWheel<TElement extends Element>(onWheel: (event: WheelEvent) => void) {
  const nodeRef = useRef<TElement | null>(null);
  const handlerRef = useRef(onWheel);

  useEffect(() => {
    handlerRef.current = onWheel;
  }, [onWheel]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return undefined;
    const listener: EventListener = (event) => {
      if (event instanceof WheelEvent) handlerRef.current(event);
    };
    node.addEventListener('wheel', listener, { passive: false });
    return () => node.removeEventListener('wheel', listener);
  }, []);

  return nodeRef;
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
  ariaLabel,
  children,
  className = '',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  onClick?: () => void;
  ariaLabel?: string;
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
      aria-label={onClick ? ariaLabel : undefined}
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

type ToolbarButtonIconKind = 'grid' | 'list';
type ToolbarGlyphKind = 'quality' | 'sort';

function ToolbarButtonGlyph({ kind, x, y, active }: { kind: ToolbarButtonIconKind; x: number; y: number; active: boolean }) {
  const stroke = active ? '#ffffff' : '#9ceeff';
  if (kind === 'grid') {
    const cell = 3.2;
    const gap = 2.2;
    const startX = x - cell - gap / 2;
    const startY = y - cell - gap / 2;
    return (
      <g fill="none" stroke={stroke} strokeWidth={1.35} strokeLinejoin="round" pointerEvents="none">
        {[0, 1].map(col => [0, 1].map(row => (
          <rect key={`${col}-${row}`} x={startX + col * (cell + gap)} y={startY + row * (cell + gap)} width={cell} height={cell} rx={0.5} />
        )))}
      </g>
    );
  }
  return (
    <g fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" pointerEvents="none">
      <path d={`M ${x - 6} ${y - 5} H ${x + 6}`} />
      <path d={`M ${x - 6} ${y} H ${x + 6}`} />
      <path d={`M ${x - 6} ${y + 5} H ${x + 6}`} />
    </g>
  );
}

function ToolbarGlyph({ kind, x, y }: { kind: ToolbarGlyphKind; x: number; y: number }) {
  if (kind === 'quality') {
    return (
      <g fill="none" stroke="#8fa5c0" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
        <path d={`M ${x} ${y - 9} V ${y + 7}`} />
        <path d={`M ${x - 9} ${y - 5} H ${x + 9}`} />
        <path d={`M ${x - 6} ${y - 5} L ${x - 10} ${y + 4} H ${x - 2} Z`} />
        <path d={`M ${x + 6} ${y - 5} L ${x + 2} ${y + 4} H ${x + 10} Z`} />
        <path d={`M ${x - 5} ${y + 9} H ${x + 5}`} />
      </g>
    );
  }
  return (
    <g fill="none" stroke="#8fa5c0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
      <path d={`M ${x - 4} ${y - 9} V ${y + 9}`} />
      <path d={`M ${x - 8} ${y - 5} L ${x - 4} ${y - 9} L ${x} ${y - 5}`} />
      <path d={`M ${x + 4} ${y - 9} V ${y + 9}`} />
      <path d={`M ${x} ${y + 5} L ${x + 4} ${y + 9} L ${x + 8} ${y + 5}`} />
    </g>
  );
}

function SidebarToggleGlyph({ x, y, collapsed }: { x: number; y: number; collapsed: boolean }) {
  if (collapsed) {
    return (
      <g fill="none" stroke="#d7fff7" strokeWidth={2.2} strokeLinecap="round" pointerEvents="none">
        <path d={`M ${x - 11} ${y - 9} H ${x + 11}`} />
        <path d={`M ${x - 11} ${y} H ${x + 11}`} />
        <path d={`M ${x - 11} ${y + 9} H ${x + 11}`} />
      </g>
    );
  }
  return (
    <g fill="none" stroke="#d7fff7" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
      <rect x={x - 13} y={y - 12} width={26} height={24} rx={3} />
      <path d={`M ${x - 4} ${y - 11} V ${y + 11}`} />
      <path d={`M ${x - 10} ${y - 6} H ${x - 7}`} />
      <path d={`M ${x - 10} ${y} H ${x - 7}`} />
      <path d={`M ${x - 10} ${y + 6} H ${x - 7}`} />
    </g>
  );
}

function CategoryExpanderGlyph({ x, y, expanded, hasChildren }: { x: number; y: number; expanded: boolean; hasChildren: boolean }) {
  if (!hasChildren) {
    return <circle cx={x} cy={y} r={2.2} fill="#5a7fac" opacity={0.5} pointerEvents="none" />;
  }
  const d = expanded
    ? `M ${x - 5} ${y - 2} L ${x + 5} ${y - 2} L ${x} ${y + 5} Z`
    : `M ${x - 3} ${y - 6} L ${x + 5} ${y} L ${x - 3} ${y + 6} Z`;
  return <path d={d} fill="#d7fff7" opacity={0.92} pointerEvents="none" />;
}

function Button({
  x,
  y,
  w,
  h,
  label,
  icon,
  active = false,
  onClick,
  controls,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  icon?: ToolbarButtonIconKind | string;
  active?: boolean;
  onClick?: () => void;
  controls?: GamesCatalogSvgLayoutControls;
}) {
  const resolvedControls = controls ?? DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS;
  const resolvedIcon = label === 'Grid' ? 'grid' : label === 'List' ? 'list' : icon;
  const iconKind = resolvedIcon === 'grid' || resolvedIcon === 'list' ? resolvedIcon : null;
  const textX = iconKind ? x + 30 : x + w / 2;
  const textAnchor = iconKind ? 'start' : 'middle';
  const labelWidth = iconKind ? w - 38 : w - 16;
  return (
    <Hit x={x} y={y} w={w} h={h} onClick={onClick} ariaLabel={label}>
      <rect
        className="games-catalog-svg-showcase__hit-surface"
        x={x}
        y={y}
        width={w}
        height={h}
        rx={11}
        fill={active ? 'url(#gcsg-button-active)' : resolvedControls.controlFillColor}
        fillOpacity={active ? 1 : resolvedControls.controlFillOpacity}
        stroke={active ? '#aeefff' : resolvedControls.controlStrokeColor}
        strokeWidth={active ? Math.max(1.9, resolvedControls.controlStrokeWidth) : resolvedControls.controlStrokeWidth}
        filter={active ? 'url(#gcsg-cyan-glow)' : undefined}
      />
      <rect x={x + 2} y={y + 2} width={w - 4} height={Math.max(5, h * 0.38)} rx={9} fill="#ffffff" opacity={active ? 0.13 : 0.05} />
      <g className="games-catalog-svg-showcase__hit-text">
        {iconKind ? <ToolbarButtonGlyph kind={iconKind} x={x + 16} y={y + h / 2 + 1} active={active} /> : null}
        <SvgText x={textX} y={y + h / 2 + 1} size={13.5} anchor={textAnchor} strong={active} color={active ? '#ffffff' : '#d5e9ff'}>
          {truncate(label, Math.max(3, Math.floor(labelWidth / 7.2)))}
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
  active = false,
  onClick,
  tone = 'blue',
  controls,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  active?: boolean;
  onClick?: () => void;
  tone?: 'blue' | 'gold' | 'green';
  controls?: GamesCatalogSvgLayoutControls;
}) {
  const resolvedControls = controls ?? DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS;
  const stroke = active ? '#ffffff' : tone === 'gold' ? '#b78017' : tone === 'green' ? '#1ed6a6' : resolvedControls.cardMetaStrokeColor;
  const fill = active ? 'url(#gcsg-button-active)' : tone === 'gold' ? '#251a08' : tone === 'green' ? '#061d18' : resolvedControls.cardMetaFillColor;
  const color = tone === 'gold' ? '#ffd36d' : active ? '#ffffff' : tone === 'green' ? '#d7fff7' : '#bde7ff';
  return (
    <Hit x={x} y={y} w={w} h={30} onClick={onClick} ariaLabel={label}>
      <rect className="games-catalog-svg-showcase__hit-surface" x={x} y={y} width={w} height={30} rx={8} fill={fill} fillOpacity={tone === 'blue' ? resolvedControls.cardMetaFillOpacity : 1} stroke={stroke} strokeWidth={active ? 1.7 : 1} />
      <SvgText x={x + w / 2} y={y + 16} size={11} anchor="middle" color={color} strong={active || tone === 'gold'}>
        {truncate(label, Math.max(8, Math.floor(w / 7.2)))}
      </SvgText>
    </Hit>
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

function Defs({
  idPrefix,
  controls,
}: {
  idPrefix: string;
  controls: GamesCatalogSvgLayoutControls;
}) {
  return (
    <defs>
      <radialGradient id="gcsg-bg-radial" cx="55%" cy="48%" r="72%">
        <stop offset="0%" stopColor="#07355d" stopOpacity="0.28" />
        <stop offset="45%" stopColor="#041c36" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#02060f" stopOpacity="1" />
      </radialGradient>
      <linearGradient id="gcsg-panel-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#061a31" stopOpacity="0.3" />
        <stop offset="55%" stopColor="#061a31" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#061a31" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="gcsg-top-fill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#071b34" stopOpacity="0.56" />
        <stop offset="52%" stopColor="#071b34" stopOpacity="0.56" />
        <stop offset="100%" stopColor="#071b34" stopOpacity="0.56" />
      </linearGradient>
      <linearGradient id="gcsg-card-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#071426" stopOpacity="0.9" />
        <stop offset="55%" stopColor="#071426" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#071426" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="gcsg-card-edge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={controls.cardEdgeStartColor} />
        <stop offset="45%" stopColor={controls.cardEdgeMiddleColor} />
        <stop offset="100%" stopColor={controls.cardEdgeEndColor} />
      </linearGradient>
      <linearGradient id="gcsg-button-active" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={controls.activeControlStartColor} />
        <stop offset="100%" stopColor={controls.activeControlEndColor} />
      </linearGradient>
      <filter id="gcsg-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.62" />
      </filter>
      <filter id="gcsg-cyan-glow" x="-35%" y="-35%" width="170%" height="170%">
        <feDropShadow dx="0" dy="0" stdDeviation={controls.controlGlowBlur} floodColor={controls.controlGlowColor} floodOpacity={controls.controlGlowOpacity} />
        <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#168dff" floodOpacity="0.25" />
      </filter>
      <filter id="gcsg-card-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation={controls.cardGlowBlur} floodColor={controls.cardGlowColor} floodOpacity={controls.cardGlowOpacity} />
        <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#000" floodOpacity="0.65" />
      </filter>
      <clipPath id={`${idPrefix}-sidebarClip`}>
        <rect x="0" y="0" width="1" height="1" />
      </clipPath>
    </defs>
  );
}

function BackdropBlurRect({
  x,
  y,
  w,
  h,
  rx,
  blur,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  blur: number;
}) {
  if (blur <= 0) return null;
  return (
    <foreignObject x={x} y={y} width={w} height={h} pointerEvents="none">
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: `${rx}px`,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
        }}
      />
    </foreignObject>
  );
}

function getTopBarPositions(layout: Layout, controls: GamesCatalogSvgLayoutControls) {
  const x = layout.topX;
  const y = layout.topY;
  const toolbarH = Math.max(24, Math.min(Math.max(24, layout.topH), controls.toolbarButtonHeight));
  const toolbarY = y + Math.max(0, (layout.topH - toolbarH) / 2);
  const toggleX = x + 18;
  let cursorX = toggleX + 64;
  const searchX = cursorX;
  if (controls.showSearch) cursorX += controls.searchWidth + 18;
  const gridX = cursorX;
  const listX = gridX + 92;
  const alphabetX = listX + 108;
  if (controls.showViewButtons) cursorX = alphabetX + 106;
  const qualityGlyphX = cursorX + 14;
  const qualityX = cursorX + 34;
  if (controls.showQualityFilter) cursorX = qualityX + 176;
  const sortGlyphX = cursorX + 14;
  const sortX = cursorX + 34;
  const statsGap = 10;
  const statW = controls.statsBoxWidth;
  const statsStartX = x + layout.topW - (statW * 3 + statsGap * 2) - 20;
  return {
    toolbarH,
    toolbarY,
    toggleX,
    searchX,
    gridX,
    listX,
    alphabetX,
    qualityGlyphX,
    qualityX,
    sortGlyphX,
    sortX,
    statsGap,
    statW,
    statsStartX,
  };
}

function TopBar({
  layout,
  controls,
  view,
  setView,
  qualityFilter,
  sortBy,
  qualityOpen,
  sortOpen,
  onQualityToggle,
  onSortToggle,
  searchQuery,
  onSearchChange,
  metadata,
  availableCount,
  categoryCount,
  isSidebarCollapsed,
  onToggleSidebar,
}: {
  layout: Layout;
  controls: GamesCatalogSvgLayoutControls;
  view: ViewMode;
  setView: (value: ViewMode) => void;
  qualityFilter: QualityFilter;
  sortBy: SortBy;
  qualityOpen: boolean;
  sortOpen: boolean;
  onQualityToggle: () => void;
  onSortToggle: () => void;
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
  const positions = getTopBarPositions(layout, controls);
  const totalGames = metadata?.totalGames ?? 0;
  const qualityLabel = QUALITY_OPTIONS.find(option => option.value === qualityFilter)?.label ?? 'All Quality';
  const sortLabel = SORT_OPTIONS.find(option => option.value === sortBy)?.label ?? 'Name';
  const handleSearchClick = () => {
    if (!onSearchChange) return;
    const next = window.prompt('Search games', searchQuery);
    if (next != null) onSearchChange(next);
  };
  return (
    <g id="games-catalog-svg-top-bar">
      <BackdropBlurRect x={x} y={y} w={w} h={layout.topH} rx={18} blur={controls.topBarBackdropBlur} />
      <path d={`M ${x + 18} ${y} H ${x + w - 18} Q ${x + w} ${y} ${x + w} ${y + 18} V ${y + layout.topH} H ${x} V ${y + 18} Q ${x} ${y} ${x + 18} ${y} Z`} fill={controls.topBarFillColor} fillOpacity={controls.topBarFillOpacity} stroke={controls.topBarStrokeColor} strokeWidth={controls.topBarStrokeWidth} />
      <Hit
        x={positions.toggleX}
        y={positions.toolbarY}
        w={52}
        h={positions.toolbarH}
        onClick={onToggleSidebar}
        ariaLabel={isSidebarCollapsed ? 'Show catalog sidebar' : 'Hide catalog sidebar'}
      >
        <rect className="games-catalog-svg-showcase__hit-surface" x={positions.toggleX} y={positions.toolbarY} width={52} height={positions.toolbarH} rx={12} fill={controls.controlFillColor} fillOpacity={controls.controlFillOpacity} stroke={controls.controlStrokeColor} strokeWidth={controls.controlStrokeWidth} />
        <SidebarToggleGlyph x={positions.toggleX + 26} y={positions.toolbarY + positions.toolbarH / 2} collapsed={isSidebarCollapsed} />
      </Hit>
      {controls.showSearch ? (
        <Hit x={positions.searchX} y={positions.toolbarY} w={controls.searchWidth} h={positions.toolbarH} onClick={handleSearchClick} ariaLabel="Search games">
          <rect className="games-catalog-svg-showcase__hit-surface" x={positions.searchX} y={positions.toolbarY} width={controls.searchWidth} height={positions.toolbarH} rx={12} fill={controls.controlFillColor} fillOpacity={controls.controlFillOpacity} stroke={controls.controlStrokeColor} strokeWidth={controls.controlStrokeWidth} />
          <circle cx={positions.searchX + 22} cy={positions.toolbarY + positions.toolbarH / 2} r={5} fill="#27d7ff" opacity={0.65} />
          <SvgText x={positions.searchX + 40} y={positions.toolbarY + positions.toolbarH / 2 + 1} size={13} color={searchQuery ? '#d5e9ff' : '#8fa5c0'}>
            {truncate(searchQuery || 'Search games...', Math.max(12, Math.floor((controls.searchWidth - 74) / 8)))}
          </SvgText>
          <g fill="none" stroke="#7bd6ff" strokeWidth={1.5} strokeLinecap="round" pointerEvents="none">
            <circle cx={positions.searchX + controls.searchWidth - 24} cy={positions.toolbarY + positions.toolbarH / 2} r={4.2} />
            <path d={`M ${positions.searchX + controls.searchWidth - 21} ${positions.toolbarY + positions.toolbarH / 2 + 3} L ${positions.searchX + controls.searchWidth - 17} ${positions.toolbarY + positions.toolbarH / 2 + 7}`} />
          </g>
        </Hit>
      ) : null}
      {controls.showViewButtons ? (
        <>
          <Button x={positions.gridX} y={positions.toolbarY} w={84} h={positions.toolbarH} label="Grid" icon="grid" active={view === 'grid'} onClick={() => setView('grid')} controls={controls} />
          <Button x={positions.listX} y={positions.toolbarY} w={82} h={positions.toolbarH} label="List" icon="list" active={view === 'list'} onClick={() => setView('list')} controls={controls} />
          <Button x={positions.alphabetX} y={positions.toolbarY} w={78} h={positions.toolbarH} label="A-Z" active={view === 'alphabet'} onClick={() => setView('alphabet')} controls={controls} />
        </>
      ) : null}
      {controls.showQualityFilter ? (
        <>
          <line x1={positions.qualityGlyphX - 18} y1={positions.toolbarY + 6} x2={positions.qualityGlyphX - 18} y2={positions.toolbarY + positions.toolbarH - 6} stroke="#516986" strokeWidth={1} opacity={0.58} />
          <ToolbarGlyph kind="quality" x={positions.qualityGlyphX} y={positions.toolbarY + positions.toolbarH / 2} />
          <Button x={positions.qualityX} y={positions.toolbarY} w={148} h={positions.toolbarH} label={`${qualityLabel} \u25BE`} active={qualityOpen} onClick={onQualityToggle} controls={controls} />
        </>
      ) : null}
      {controls.showSortFilter ? (
        <>
          <line x1={positions.sortGlyphX - 18} y1={positions.toolbarY + 6} x2={positions.sortGlyphX - 18} y2={positions.toolbarY + positions.toolbarH - 6} stroke="#516986" strokeWidth={1} opacity={0.58} />
          <ToolbarGlyph kind="sort" x={positions.sortGlyphX} y={positions.toolbarY + positions.toolbarH / 2} />
          <Button x={positions.sortX} y={positions.toolbarY} w={124} h={positions.toolbarH} label={`${sortLabel} \u25BE`} active={sortOpen} onClick={onSortToggle} controls={controls} />
        </>
      ) : null}
      {controls.showStats ? (
        <>
          <StatBox x={positions.statsStartX} y={positions.toolbarY - 1} w={positions.statW} label="GAMES" value={totalGames.toLocaleString()} />
          <StatBox x={positions.statsStartX + positions.statW + positions.statsGap} y={positions.toolbarY - 1} w={positions.statW} label="AVAILABLE" value={availableCount.toLocaleString()} />
          <StatBox x={positions.statsStartX + (positions.statW + positions.statsGap) * 2} y={positions.toolbarY - 1} w={positions.statW} label="GROUPS" value={categoryCount.toLocaleString()} />
        </>
      ) : null}
    </g>
  );
}

function TopDropdownOverlays({
  layout,
  controls,
  qualityFilter,
  sortBy,
  qualityOpen,
  sortOpen,
  onQualityChange,
  onSortChange,
}: {
  layout: Layout;
  controls: GamesCatalogSvgLayoutControls;
  qualityFilter: QualityFilter;
  sortBy: SortBy;
  qualityOpen: boolean;
  sortOpen: boolean;
  onQualityChange: (value: QualityFilter) => void;
  onSortChange: (value: SortBy) => void;
}) {
  const y = layout.topY;
  const positions = getTopBarPositions(layout, controls);
  const qualityX = positions.qualityX;
  const sortX = positions.sortX;
  return (
    <g id="games-catalog-svg-top-dropdowns" filter="url(#gcsg-soft-shadow)">
      {controls.showQualityFilter && qualityOpen ? (
        <g>
          <rect x={qualityX} y={y + 62} width={154} height={QUALITY_OPTIONS.length * 31 + 12} rx={12} fill="#050a18" stroke="#aeefff" strokeWidth={1.3} />
          {QUALITY_OPTIONS.map((option, index) => (
            <Hit key={option.value} x={qualityX + 6} y={y + 69 + index * 31} w={142} h={26} onClick={() => onQualityChange(option.value)} ariaLabel={`Filter quality: ${option.label}`}>
              <rect className="games-catalog-svg-showcase__hit-surface" x={qualityX + 6} y={y + 69 + index * 31} width={142} height={26} rx={7} fill={qualityFilter === option.value ? 'url(#gcsg-button-active)' : 'transparent'} stroke={qualityFilter === option.value ? '#ffffff' : '#4d6d9a'} strokeWidth={qualityFilter === option.value ? 1.2 : 0.6} />
              <SvgText x={qualityX + 18} y={y + 83 + index * 31} size={11} strong={qualityFilter === option.value}>
                {option.label}
              </SvgText>
            </Hit>
          ))}
        </g>
      ) : null}
      {controls.showSortFilter && sortOpen ? (
        <g>
          <rect x={sortX} y={y + 62} width={136} height={SORT_OPTIONS.length * 31 + 12} rx={12} fill="#050a18" stroke="#aeefff" strokeWidth={1.3} />
          {SORT_OPTIONS.map((option, index) => (
            <Hit key={option.value} x={sortX + 6} y={y + 69 + index * 31} w={124} h={26} onClick={() => onSortChange(option.value)} ariaLabel={`Sort games by ${option.label}`}>
              <rect className="games-catalog-svg-showcase__hit-surface" x={sortX + 6} y={y + 69 + index * 31} width={124} height={26} rx={7} fill={sortBy === option.value ? 'url(#gcsg-button-active)' : 'transparent'} stroke={sortBy === option.value ? '#ffffff' : '#4d6d9a'} strokeWidth={sortBy === option.value ? 1.2 : 0.6} />
              <SvgText x={sortX + 18} y={y + 83 + index * 31} size={11} strong={sortBy === option.value}>
                {option.label}
              </SvgText>
            </Hit>
          ))}
        </g>
      ) : null}
    </g>
  );
}

function Sidebar({
  layout,
  controls,
  sidebarW,
  categoryWithSubs,
  currentCategory,
  onCategoryChange,
  currentSubcategory,
  onSubcategoryChange,
  playerModeFilter,
  onPlayerModeChange,
  playerModeCounts,
  categoryExpanded,
  onCategoryExpandToggle,
  scrollY,
  setScrollY,
}: {
  layout: Layout;
  controls: GamesCatalogSvgLayoutControls;
  sidebarW: number;
  categoryWithSubs: readonly CategoryWithSubs[];
  currentCategory: string;
  onCategoryChange?: (value: string) => void;
  currentSubcategory?: string | null;
  onSubcategoryChange?: (value: string | null) => void;
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
  const headerH = controls.sidebarHeaderHeight;
  const modeTop = y + headerH + 14;
  const modeCount = controls.showPlayerModes ? 3 : 0;
  const dividerY = modeTop + modeCount * controls.playerModeRowHeight + 10;
  const listTop = dividerY + 26;
  const viewportH = Math.max(1, layout.bodyH - (listTop - y) - 18);
  const displayCategories = categoryWithSubs.filter(category => category.category !== 'all');
  const rows = controls.showCategoryList ? displayCategories.flatMap(category => {
    const rowsForCategory: Array<{ type: 'category' | 'subcategory'; category: CategoryWithSubs; sub?: readonly [string, number] }> = [
      { type: 'category', category },
    ];
    if (category.category !== 'all' && categoryExpanded.has(category.category)) {
      for (const sub of category.subList) rowsForCategory.push({ type: 'subcategory', category, sub });
    }
    return rowsForCategory;
  }) : [];
  const contentH = rows.reduce((sum, row) => sum + (row.type === 'category' ? controls.categoryRowHeight : controls.subcategoryRowHeight), 0);
  const positionedRows = rows.reduce<{
    items: Array<{
      row: (typeof rows)[number];
      y: number;
    }>;
    nextY: number;
  }>(
    (accumulator, row) => ({
      items: [...accumulator.items, { row, y: accumulator.nextY }],
      nextY: accumulator.nextY + (row.type === 'category' ? controls.categoryRowHeight : controls.subcategoryRowHeight),
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
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    scrollTo(clampedScrollY + event.deltaY * WHEEL_SCROLL_SPEED);
  };
  const wheelRef = useNonPassiveWheel<SVGGElement>(handleWheel);
  const modes: Array<{ key: PlayerModeFilter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: playerModeCounts.all },
    { key: 'singleplayer', label: 'Single Player', count: playerModeCounts.singleplayer },
    { key: 'multiplayer', label: 'Multiplayer', count: playerModeCounts.multiplayer },
  ];
  return (
    <g id="games-catalog-svg-sidebar" ref={wheelRef}>
      <BackdropBlurRect x={x} y={y} w={sidebarW} h={layout.bodyH} rx={16} blur={controls.sidebarBackdropBlur} />
      <path d={`M ${x + 16} ${y} H ${x + sidebarW} V ${y + layout.bodyH} H ${x + 16} Q ${x} ${y + layout.bodyH} ${x} ${y + layout.bodyH - 16} V ${y + 16} Q ${x} ${y} ${x + 16} ${y} Z`} fill={controls.sidebarFillColor} fillOpacity={controls.sidebarFillOpacity} stroke={controls.sidebarStrokeColor} strokeWidth={controls.sidebarStrokeWidth} />
      <rect x={x + 1} y={y + 1} width={sidebarW - 2} height={headerH} fill={controls.sidebarHeaderFillColor} fillOpacity={controls.sidebarHeaderFillOpacity} />
      <SvgText x={x + 24} y={y + 29} size={15} strong color="#ffffff">
        {`${ICONS.folder} CATEGORIES`}
      </SvgText>
      <line x1={x + 18} y1={y + headerH} x2={x + sidebarW - 18} y2={y + headerH} stroke={controls.sidebarDividerColor} strokeWidth={1} opacity={0.46} />
      {controls.showPlayerModes ? modes.map((row, index) => {
        const rowY = modeTop + index * controls.playerModeRowHeight;
        const active = playerModeFilter === row.key;
        return (
          <Hit key={row.key} x={x + 20} y={rowY} w={sidebarW - 40} h={44} onClick={() => onPlayerModeChange?.(row.key)} ariaLabel={`Filter player mode: ${row.label}`}>
            <rect className="games-catalog-svg-showcase__hit-surface" x={x + 20} y={rowY} width={sidebarW - 40} height={44} rx={22} fill={active ? controls.sidebarRowActiveFillColor : controls.sidebarRowFillColor} fillOpacity={active ? controls.sidebarRowActiveFillOpacity : controls.sidebarRowFillOpacity} stroke={active ? '#9ceeff' : '#345b89'} strokeWidth={active ? 1.7 : 1} />
            <SvgText x={x + 46} y={rowY + 23} size={13.5} anchor="middle" color="#bde7ff">
              {PLAYER_MODE_ICONS[row.key]}
            </SvgText>
            <SvgText x={x + 76} y={rowY + 23} size={14} strong={active} color={active ? '#ffffff' : '#b7c8df'}>
              {row.label}
            </SvgText>
            <SvgText x={x + sidebarW - 42} y={rowY + 23} size={10.5} anchor="middle" color={active ? '#e9f8ff' : '#8ea2bd'}>
              {row.count.toLocaleString()}
            </SvgText>
          </Hit>
        );
      }) : null}
      {controls.showCategoryList ? <line x1={x + 20} y1={dividerY} x2={x + sidebarW - 20} y2={dividerY} stroke={controls.sidebarDividerColor} strokeWidth={1} opacity={0.55} /> : null}
      {controls.showCategoryList ? <g clipPath={`url(#gcsg-sidebar-window)`}>
        <g transform={`translate(0 ${-clampedScrollY})`}>
          {positionedRows.map(({ row, y: rowY }) => {
            if (row.type === 'category') {
              const active = currentCategory === row.category.category;
              const hasChildren = row.category.subList.length > 0;
              const expanded = categoryExpanded.has(row.category.category);
              const label = row.category.category === 'all' ? 'All' : row.category.category;
              return (
                <Hit key={`cat-${row.category.category}`} x={x} y={rowY} w={sidebarW - 34} h={38} ariaLabel={`Filter category: ${label}`} onClick={() => {
                  onCategoryChange?.(row.category.category);
                  if (hasChildren) onCategoryExpandToggle?.(row.category.category);
                }}>
                  <path className="games-catalog-svg-showcase__hit-surface" d={`M ${x} ${rowY} H ${x + sidebarW - 53} Q ${x + sidebarW - 34} ${rowY} ${x + sidebarW - 34} ${rowY + 19} Q ${x + sidebarW - 34} ${rowY + 38} ${x + sidebarW - 53} ${rowY + 38} H ${x} Z`} fill={active ? controls.sidebarRowActiveFillColor : controls.sidebarRowFillColor} fillOpacity={active ? controls.sidebarRowActiveFillOpacity : controls.sidebarRowFillOpacity} stroke={active ? '#9ceeff' : '#345b89'} strokeWidth={active ? 1.7 : 1} />
                  <CategoryExpanderGlyph x={x + 26} y={rowY + 20} expanded={expanded} hasChildren={hasChildren} />
                  <SvgText x={x + 54} y={rowY + 20} size={14.5} color="#d7fff7">
                    {categoryIcon(row.category.category)}
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
            const active = currentSubcategory === sub[0];
            return (
              <Hit
                key={`sub-${row.category.category}-${sub[0]}`}
                x={x + 38}
                y={rowY}
                w={sidebarW - 76}
                h={28}
                ariaLabel={`Filter subcategory: ${sub[0]}`}
                onClick={() => {
                  if (onSubcategoryChange) {
                    onSubcategoryChange(sub[0]);
                    return;
                  }
                  onCategoryChange?.(sub[0]);
                }}
              >
                <path className="games-catalog-svg-showcase__hit-surface" d={`M ${x + 38} ${rowY + 2} H ${x + sidebarW - 50} Q ${x + sidebarW - 38} ${rowY + 2} ${x + sidebarW - 38} ${rowY + 14} Q ${x + sidebarW - 38} ${rowY + 26} ${x + sidebarW - 50} ${rowY + 26} H ${x + 38} Z`} fill={active ? controls.sidebarRowActiveFillColor : controls.sidebarRowFillColor} fillOpacity={active ? controls.sidebarRowActiveFillOpacity : controls.sidebarRowFillOpacity} stroke={active ? '#9ceeff' : '#284a72'} strokeWidth={active ? 1.35 : 0.7} opacity={active ? 1 : 0.66} />
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
      </g> : null}
      {controls.showCategoryList ? (
        <>
          <path d={`M ${x + sidebarW - 10} ${trackY} V ${trackY + trackH}`} stroke="#7ddcff" strokeWidth={1} opacity={0.28} />
          <rect x={x + sidebarW - 13} y={thumbY} width={6} height={thumbH} rx={3} fill={maxScroll > 0 ? '#26c6ff' : 'none'} stroke="#9ceeff" strokeWidth={1} opacity={maxScroll > 0 ? 0.75 : 0.35} />
        </>
      ) : null}
    </g>
  );
}

function SidebarResizeHandle({
  layout,
  panelX,
  isDragging,
  onMouseDown,
}: {
  layout: Layout;
  panelX: number;
  isDragging: boolean;
  onMouseDown: (event: ReactMouseEvent<SVGGElement>) => void;
}) {
  const scrubberY = layout.bodyY;
  const scrubberH = 52;
  const scrubberW = 28;
  const scrubberX = panelX - scrubberW / 2;
  const bottomCorner = 9;
  return (
    <g
      id="games-catalog-svg-sidebar-resize"
      onMouseDown={onMouseDown}
      className={isDragging ? 'games-catalog-svg-showcase__resize is-dragging' : 'games-catalog-svg-showcase__resize'}
      role="separator"
      aria-label="Resize catalog sidebar"
      aria-orientation="vertical"
      aria-valuenow={Math.round(panelX)}
      aria-valuetext={`Sidebar width ${Math.round(panelX - layout.bodyX)}`}
      tabIndex={0}
    >
      <rect x={scrubberX - 8} y={scrubberY} width={scrubberW + 16} height={scrubberH} fill="transparent" pointerEvents="all" />
      <path d={`M ${panelX} ${scrubberY} V ${scrubberY + scrubberH}`} stroke="#7ddcff" strokeWidth={isDragging ? 3.2 : 2.1} opacity={isDragging ? 0.95 : 0.72} strokeLinecap="round" />
      <path
        className="games-catalog-svg-showcase__resize-surface"
        d={`M ${scrubberX} ${scrubberY} H ${scrubberX + scrubberW} V ${scrubberY + scrubberH - bottomCorner} Q ${scrubberX + scrubberW} ${scrubberY + scrubberH} ${scrubberX + scrubberW - bottomCorner} ${scrubberY + scrubberH} H ${scrubberX + bottomCorner} Q ${scrubberX} ${scrubberY + scrubberH} ${scrubberX} ${scrubberY + scrubberH - bottomCorner} Z`}
        fill="#071026"
        stroke="#7ddcff"
        strokeWidth={isDragging ? 2.4 : 1.65}
        opacity={0.98}
        filter="url(#gcsg-cyan-glow)"
      />
      <path d={`M ${scrubberX + 6} ${scrubberY + 4} H ${scrubberX + scrubberW - 6}`} stroke="#d7fff7" strokeWidth={1.2} opacity={0.72} strokeLinecap="round" />
      <path d={`M ${panelX} ${scrubberY + 12} V ${scrubberY + scrubberH - 10}`} stroke="#aeefff" strokeWidth={1.25} opacity={0.55} strokeLinecap="round" />
    </g>
  );
}

function GameCardSvg({
  x,
  y,
  w,
  h,
  controls,
  game,
  index,
  selected,
  onClick,
  idPrefix,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  controls: GamesCatalogSvgLayoutControls;
  game: GamesExplorerGame;
  index: number;
  selected: boolean;
  onClick: () => void;
  idPrefix: string;
}) {
  const pad = controls.cardPadding;
  const bannerH = controls.showCardImages ? Math.max(80, Math.min(h * 0.52, controls.cardImageHeight)) : 0;
  const imgSrc = getPlaceholderImageUrl(stableIndex(game.slug || game.name || String(index)));
  const bannerX = x + pad;
  const bannerY = y + pad;
  const bannerW = w - pad * 2;
  const bodyX = x + 24;
  const bodyTop = y + pad + bannerH + (controls.showCardImages ? 30 : 36);
  const category = game.subcategory ? `${game.category} / ${game.subcategory}` : game.category;
  const titleMax = Math.max(16, Math.floor((w - 56) / 10));
  const descMax = Math.max(24, Math.floor((w - 48) / 7.4));
  const compactPlayerText = compactPlayers(game.players);
  const compactDeckText = compactDeck(game.deck);
  const compactDurationText = compactDuration(game.duration);
  const compactDifficultyText = compactDifficulty(game.difficulty);
  const imageLabel = `${game.name} catalog preview artwork`;
  const metaItems = [
    compactPlayerText ? { key: 'players', label: `${ICONS.players} ${compactPlayerText}` } : null,
    compactDeckText ? { key: 'deck', label: `${ICONS.card} ${compactDeckText}` } : null,
    compactDurationText ? { key: 'duration', label: `${ICONS.clock} ${compactDurationText}` } : null,
    compactDifficultyText ? { key: 'difficulty', label: `${ICONS.bolt} ${compactDifficultyText}` } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));
  const metaCols = w >= 520 ? 4 : w >= 270 ? 2 : 1;
  const metaGap = controls.cardMetaGap;
  const metaBoxW = w - 48;
  const metaPillW = (metaBoxW - metaGap * (metaCols - 1)) / metaCols;
  const metaPillH = controls.cardMetaPillHeight;
  const metaRowGap = 10;
  const metaRows = Math.max(1, Math.ceil(metaItems.length / metaCols));
  const metaGroupH = metaRows * metaPillH + Math.max(0, metaRows - 1) * metaRowGap;
  const metaTop = y + h - metaGroupH - 18;
  const descriptionLineHeight = Math.max(18, controls.cardDescriptionFont + 8);
  const descriptionStartY = bodyTop + 34;
  const descriptionBottomY = controls.showCardMeta ? metaTop - 26 : y + h - 24;
  const descriptionMaxLines = Math.max(1, Math.floor((descriptionBottomY - descriptionStartY) / descriptionLineHeight) + 1);
  const descriptionLines = wrapText(game.description, descMax, Math.min(6, descriptionMaxLines));
  const status = game.source === 'asset' ? 'AVAILABLE' : 'COMING SOON';
  const statusTone = game.source === 'asset' ? 'green' : 'gold';
  const clipId = `${idPrefix}-card-img-${index}`;
  const topClampW = Math.min(190, w * 0.58);
  const topClampH = controls.cardTopClampHeight;
  const topClampX = x + (w - topClampW) / 2;
  const topClampY = y - topClampH;

  return (
    <Hit x={x} y={y} w={w} h={h} onClick={onClick} className="games-catalog-svg-showcase__card" ariaLabel={`Select ${game.name}`}>
      <g className="games-catalog-svg-showcase__card-lift">
        <BackdropBlurRect x={x} y={y} w={w} h={h} rx={controls.cardRadius} blur={controls.cardBackdropBlur} />
        <rect x={x} y={y} width={w} height={h} rx={controls.cardRadius} fill={controls.cardOuterFillColor} fillOpacity={0.82} stroke={selected ? controls.cardStrokeColor : 'url(#gcsg-card-edge)'} strokeWidth={selected ? Math.max(2.2, controls.cardStrokeWidth) : controls.cardStrokeWidth} filter="url(#gcsg-card-glow)" />
        <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={Math.max(0, controls.cardRadius - 2)} fill={controls.cardFillColor} fillOpacity={controls.cardFillOpacity} />
        <rect className="games-catalog-svg-showcase__card-ring" x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={Math.max(0, controls.cardRadius - 4)} fill="none" stroke={controls.cardRingColor} strokeWidth={controls.cardRingStrokeWidth} opacity={selected ? 0.95 : controls.cardRingOpacity} />
        {controls.showCardImages ? (
          <>
            <clipPath id={clipId}>
              <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} rx={14} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
              <image className="games-catalog-svg-showcase__card-image" href={imgSrc} x={bannerX} y={bannerY - 18} width={bannerW} height={bannerH + 36} preserveAspectRatio="xMidYMid slice" opacity={0.92} role="img" aria-label={imageLabel}>
                <title>{imageLabel}</title>
              </image>
              <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} fill={controls.cardImageOverlayColor} opacity={controls.cardImageOverlayOpacity} />
              <path d={`M ${bannerX} ${bannerY + bannerH - 52} C ${bannerX + bannerW * 0.25} ${bannerY + bannerH - 96} ${bannerX + bannerW * 0.44} ${bannerY + bannerH - 8} ${bannerX + bannerW} ${bannerY + bannerH - 62} V ${bannerY + bannerH + 10} H ${bannerX} Z`} fill={controls.cardImageOverlayColor} opacity={controls.cardImageCurveOpacity} />
            </g>
            <rect x={bannerX} y={bannerY} width={bannerW} height={bannerH} rx={14} fill="none" stroke="#5c83b0" strokeWidth={1} opacity={0.82} />
          </>
        ) : null}
        {controls.showCardCategoryBadge ? (
          <>
            <rect x={bannerX} y={bannerY} width={bannerW} height={34} rx={0} fill={controls.cardCategoryBadgeFillColor} opacity={controls.cardCategoryBadgeOpacity} stroke={controls.cardCategoryBadgeStrokeColor} strokeWidth={1} />
            <SvgText x={bannerX + 14} y={bannerY + 18} size={12} strong color={controls.cardTextColor}>
              {truncate(`${categoryIcon(game.category)} ${category}`, Math.max(18, Math.floor((bannerW - 28) / 7.2)))}
            </SvgText>
          </>
        ) : null}
        {controls.showCardStatusBadge ? <Pill x={x + 22} y={bannerY + Math.max(0, bannerH - 36)} w={status === 'AVAILABLE' ? 112 : 140} label={status} tone={statusTone} controls={controls} /> : null}
        <g className="games-catalog-svg-showcase__card-title">
          <SvgText x={bodyX} y={bodyTop} size={controls.cardTitleFont} strong color={controls.cardTextColor}>
            {truncate(game.name, titleMax)}
          </SvgText>
          {descriptionLines.map((line, lineIndex) => (
            <SvgText
              key={`${game.slug}-description-${lineIndex}`}
              x={bodyX}
              y={descriptionStartY + lineIndex * descriptionLineHeight}
              size={controls.cardDescriptionFont}
              color={controls.cardDescriptionColor}
            >
              {line}
            </SvgText>
          ))}
        </g>
        {controls.showCardMeta ? <g>
          {metaItems.map((item, metaIndex) => {
            const metaCol = metaIndex % metaCols;
            const metaRow = Math.floor(metaIndex / metaCols);
            const px = bodyX + metaCol * (metaPillW + metaGap);
            const py = metaTop + metaRow * (metaPillH + metaRowGap);
            return <Pill key={item.key} x={px} y={py} w={metaPillW} label={item.label} controls={controls} />;
          })}
        </g> : null}
        {controls.showCardTopClamp && topClampH > 0 ? <g pointerEvents="none" filter="url(#gcsg-cyan-glow)">
          <path
            d={`M ${topClampX} ${topClampY + topClampH} V ${topClampY + 7} Q ${topClampX} ${topClampY} ${topClampX + 9} ${topClampY} H ${topClampX + topClampW - 9} Q ${topClampX + topClampW} ${topClampY} ${topClampX + topClampW} ${topClampY + 7} V ${topClampY + topClampH} Z`}
            fill="url(#gcsg-card-edge)"
            fillOpacity={controls.cardTopClampFillOpacity}
            stroke={controls.cardTopClampStrokeColor}
            strokeWidth={controls.cardTopClampStrokeWidth}
            strokeLinejoin="round"
          />
          <path d={`M ${topClampX + 10} ${topClampY + 2.4} H ${topClampX + topClampW - 10}`} stroke="#d7fff7" strokeWidth={1.35} strokeLinecap="round" opacity={0.9} />
        </g> : null}
        {controls.showDebugBounds && controls.showCardBounds ? (
          <rect x={x} y={y} width={w} height={h} fill={controls.debugCardBoundsColor} fillOpacity={controls.debugBoundsFillOpacity} stroke={controls.debugCardBoundsColor} strokeWidth={controls.debugBoundsStrokeWidth} strokeDasharray="10 6" pointerEvents="none" />
        ) : null}
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
    previous.h === next.h &&
    previous.index === next.index &&
    previous.selected === next.selected &&
    previous.controls === next.controls &&
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
          <Hit key={`${game.slug}-${index}`} x={x} y={rowY} w={w} h={44} onClick={() => setSelectedGame(game)} ariaLabel={`Select ${game.name}`}>
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
  controls,
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
  minCardWidthPx,
  maxCardWidthPx,
  maxGridColumns,
  cardHeight,
}: {
  layout: Layout;
  controls: GamesCatalogSvgLayoutControls;
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
  minCardWidthPx: number;
  maxCardWidthPx: number;
  maxGridColumns: number;
  cardHeight: number;
}) {
  const x = panelX;
  const y = areaY;
  const w = panelW;
  const pad = controls.gamesAreaPadding;
  const cardTopClearance = controls.cardTopClearance;
  const gap = controls.cardGap;
  const showList = mode === 'list';
  const scale = viewportPixelW / Math.max(1, layout.viewW);
  const panelPixelW = w * scale;
  const padPx = pad * scale;
  const gapPx = gap * scale;
  const minCardPx = Math.max(180, minCardWidthPx);
  const maxCardPx = Math.max(minCardPx, maxCardWidthPx);
  const maxCols = Math.max(1, Math.floor(maxGridColumns));
  const rawCols = Math.floor((panelPixelW - padPx * 2 + gapPx) / (minCardPx + gapPx));
  const cols = Math.max(1, Math.min(maxCols, rawCols));
  const availableCardPx = (panelPixelW - padPx * 2 - gapPx * (cols - 1)) / cols;
  const cardPx = Math.min(maxCardPx, Math.max(minCardPx, availableCardPx));
  const cardW = cardPx / Math.max(0.001, scale);
  const gridUsedW = cardW * cols + gap * (cols - 1);
  const gridX = x + Math.max(pad, (w - gridUsedW) / 2);
  const cardH = Math.max(420, Math.min(760, cardHeight));
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
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    scrollTo(clampedScrollY + event.deltaY * WHEEL_SCROLL_SPEED);
  };
  const wheelRef = useNonPassiveWheel<SVGGElement>(handleWheel);
  const gridStartRow = Math.max(0, Math.floor((clampedScrollY - pad - cardTopClearance) / (cardH + gap)) - VIRTUAL_ROW_BUFFER);
  const gridEndRow = Math.min(gridRows - 1, Math.ceil((clampedScrollY + viewportH - pad - cardTopClearance) / (cardH + gap)) + VIRTUAL_ROW_BUFFER);
  const gridStartIndex = gridStartRow * cols;
  const gridEndIndexExclusive = Math.min(games.length, (gridEndRow + 1) * cols);
  const listStartRow = Math.max(0, Math.floor((clampedScrollY - pad - listHeaderH) / listRowH) - VIRTUAL_ROW_BUFFER);
  const listEndRow = Math.min(games.length - 1, Math.ceil((clampedScrollY + viewportH - pad - listHeaderH) / listRowH) + VIRTUAL_ROW_BUFFER);

  return (
    <g id="games-catalog-svg-games-area" ref={wheelRef}>
      <BackdropBlurRect x={x} y={y} w={w} h={areaH} rx={16} blur={controls.gamesAreaBackdropBlur} />
      <path d={`M ${x} ${y} H ${x + w - 16} Q ${x + w} ${y} ${x + w} ${y + 16} V ${y + areaH - 16} Q ${x + w} ${y + areaH} ${x + w - 16} ${y + areaH} H ${x} V ${y} Z`} fill={controls.gamesAreaFillColor} fillOpacity={controls.gamesAreaFillOpacity} stroke={controls.gamesAreaStrokeColor} strokeWidth={controls.gamesAreaStrokeWidth} />
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
                    h={cardH}
                    controls={controls}
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
  controls,
  game,
  detail,
  detailLoading = false,
  initialSection = 'overview',
  close,
  openGame,
  openRules,
}: {
  layout: Layout;
  controls: GamesCatalogSvgLayoutControls;
  game: GamesExplorerGame | null;
  detail?: GamesExplorerGameDetail | null;
  detailLoading?: boolean;
  initialSection?: GamesExplorerDetailSection;
  close: () => void;
  openGame?: (game: GamesExplorerGame) => void;
  openRules?: (game: GamesExplorerGame) => void;
}) {
  const [detailSectionState, setDetailSectionState] = useState<{
    slug?: string;
    routeSection?: GamesExplorerDetailSection;
    section: GamesExplorerDetailSection;
  }>({ section: initialSection });
  const activeDetailSection = detailSectionState.slug === game?.slug && detailSectionState.routeSection === initialSection
    ? detailSectionState.section
    : initialSection;

  if (!game) return null;
  const panelW = Math.min(controls.detailPanelWidth, layout.viewW - 96);
  const panelH = Math.min(controls.detailPanelHeight, layout.viewH - 100);
  const x = (layout.viewW - panelW) / 2;
  const y = Math.max(48, (layout.viewH - panelH) / 2);
  const headerH = 178;
  const bodyY = y + headerH;
  const category = game.subcategory ? `${game.category} / ${game.subcategory}` : game.category;
  const completeness = detail?.completeness ?? game.completeness ?? {};
  const filledSections = SECTIONS.filter(section => completeness[section]).length;
  const pct = game.completenessPercent ?? (Object.keys(completeness).length > 0 ? Math.round((filledSections / SECTIONS.length) * 100) : 0);
  const hasGamePageAction = Boolean(openGame) && Boolean(game.slug);
  const hasRulesAction = Boolean(openRules) && Boolean(game.slug);
  const bodyCardX = x + 42;
  const bodyCardY = bodyY + 34;
  const bodyCardW = panelW - 460;
  const bodyCardH = Math.max(230, panelH - headerH - 76);
  const sideCardX = x + panelW - 376;
  const sideCardY = bodyCardY;
  const sideCardW = 314;
  const sideCardH = 230;
  const sectionText = detailLoading ? '' : renderDetailSection(game, detail, activeDetailSection);
  const sectionFallback = activeDetailSection === 'overview'
    ? 'No overview is available for this catalog entry yet.'
    : `No ${DETAIL_SECTION_LABELS[activeDetailSection].toLowerCase()} content has been authored yet.`;
  const sectionLines = wrapDetailText(sectionText || sectionFallback, Math.max(48, Math.floor((bodyCardW - 48) / 7.2)), Math.max(6, Math.floor((bodyCardH - 78) / 22)));
  const openGamePage = () => {
    setDetailSectionState({ slug: game.slug, routeSection: initialSection, section: 'overview' });
    openGame?.(game);
  };
  const openRulesPage = () => {
    setDetailSectionState({ slug: game.slug, routeSection: initialSection, section: 'rules' });
    openRules?.(game);
  };

  return (
    <g id="games-catalog-svg-detail-overlay">
      <rect x={0} y={0} width={layout.viewW} height={layout.viewH} fill={controls.detailOverlayColor} opacity={controls.detailOverlayOpacity} />
      <BackdropBlurRect x={x} y={y} w={panelW} h={panelH} rx={28} blur={controls.detailBackdropBlur} />
      <rect x={x} y={y} width={panelW} height={panelH} rx={28} fill={controls.detailPanelFillColor} fillOpacity={controls.detailPanelFillOpacity} stroke={controls.detailPanelStrokeColor} strokeWidth={controls.detailPanelStrokeWidth} />
      <rect x={x + 2} y={y + 2} width={panelW - 4} height={panelH - 4} rx={26} fill="#020712" opacity={0.42} />
      <path d={`M ${x + 1} ${y + 28} Q ${x + 1} ${y + 1} ${x + 28} ${y + 1} H ${x + panelW - 28} Q ${x + panelW - 1} ${y + 1} ${x + panelW - 1} ${y + 28} V ${bodyY} H ${x + 1} Z`} fill={controls.detailHeaderFillColor} fillOpacity={controls.detailHeaderFillOpacity} />
      <line x1={x + 24} y1={bodyY} x2={x + panelW - 24} y2={bodyY} stroke="#1ea7ff" strokeWidth={1.2} opacity={0.4} />
      <SvgText x={x + 42} y={y + 46} size={30} strong color="#ffffff">
        {truncate(game.name, 46)}
      </SvgText>
      <Pill x={x + 42} y={y + 82} w={game.source === 'asset' ? 116 : 146} label={game.source === 'asset' ? 'AVAILABLE' : 'COMING SOON'} tone={game.source === 'asset' ? 'green' : 'gold'} controls={controls} />
      <SvgText x={x + 210} y={y + 98} size={14} color="#b9d5ff">
        {truncate(category, 62)}
      </SvgText>
      <Hit x={x + panelW - 78} y={y + 28} w={52} h={52} onClick={close} ariaLabel="Close game details">
        <circle className="games-catalog-svg-showcase__hit-surface" cx={x + panelW - 52} cy={y + 54} r={27} fill="#071026" stroke="#55749e" strokeWidth={1.3} />
        <SvgText x={x + panelW - 52} y={y + 55} size={22} anchor="middle" color="#bde7ff">x</SvgText>
      </Hit>
      <g id="games-catalog-svg-detail-tabs">
        {DETAIL_SECTIONS.map((section, index) => {
          const label = DETAIL_SECTION_LABELS[section];
          const bx = x + 42 + index * 132;
          const by = y + 122;
          const active = activeDetailSection === section;
          return (
            <Hit key={section} x={bx} y={by} w={118} h={42} onClick={() => setDetailSectionState({ slug: game.slug, routeSection: initialSection, section })} ariaLabel={`Show ${label} details`}>
              <rect className="games-catalog-svg-showcase__hit-surface" x={bx} y={by} width={118} height={42} rx={21} fill={active ? 'url(#gcsg-button-active)' : controls.controlFillColor} stroke={active ? '#aeefff' : '#00d6a6'} strokeWidth={active ? 1.7 : controls.controlStrokeWidth} opacity={active ? 0.96 : controls.controlFillOpacity} filter={active ? 'url(#gcsg-cyan-glow)' : undefined} />
              <SvgText x={bx + 59} y={by + 22} size={12} anchor="middle" strong={active} color={active ? '#ffffff' : '#c9e9ff'}>{label}</SvgText>
            </Hit>
          );
        })}
      </g>
      <g id="games-catalog-svg-detail-body">
        <rect x={x + 1} y={bodyY + 1} width={panelW - 2} height={panelH - headerH - 2} fill="#020712" opacity={0.38} />
        <rect x={bodyCardX} y={bodyCardY} width={bodyCardW} height={bodyCardH} rx={16} fill={controls.detailCardFillColor} fillOpacity={controls.detailCardFillOpacity} stroke={controls.detailCardStrokeColor} strokeWidth={1.1} opacity={0.92} />
        <SvgText x={bodyCardX + 24} y={bodyCardY + 34} size={14} strong color="#e9f8ff">
          {DETAIL_SECTION_LABELS[activeDetailSection].toUpperCase()}
        </SvgText>
        {detailLoading ? (
          <SvgText x={bodyCardX + 24} y={bodyCardY + 78} size={14} color="#bdcbe0">
            Loading details...
          </SvgText>
        ) : (
          sectionLines.map((line, index) => (
            <SvgText key={`${activeDetailSection}-${index}`} x={bodyCardX + 24} y={bodyCardY + 72 + index * 22} size={13.5} color="#bdcbe0">
              {line}
            </SvgText>
          ))
        )}
        {controls.showDetailReadiness ? (
          <>
            <rect x={sideCardX} y={sideCardY} width={sideCardW} height={sideCardH} rx={16} fill={controls.detailCardFillColor} fillOpacity={controls.detailCardFillOpacity} stroke={controls.detailCardStrokeColor} strokeWidth={1.1} opacity={0.92} />
            {game.source === 'asset' ? (
              <>
                <SvgText x={sideCardX + 22} y={sideCardY + 34} size={14} strong color="#e9f8ff">READINESS</SvgText>
                {SECTIONS.map((section, index) => (
                  <circle key={section} cx={sideCardX + 22 + index * 24} cy={sideCardY + 72} r={7} fill={completeness[section] ? '#1ed6a6' : 'none'} stroke="#1ed6a6" strokeWidth={1} opacity={completeness[section] ? 1 : 0.45} />
                ))}
                <SvgText x={sideCardX + sideCardW - 54} y={sideCardY + 73} size={13} color="#c9e9ff">{pct}%</SvgText>
                <rect x={sideCardX + 22} y={sideCardY + 102} width={260} height={8} rx={4} fill="#061124" stroke="#345b89" strokeWidth={1} />
                <rect x={sideCardX + 22} y={sideCardY + 102} width={260 * Math.max(0, Math.min(100, pct)) / 100} height={8} rx={4} fill="#1ed6a6" opacity={0.86} />
                {controls.showDetailActions && hasGamePageAction ? <Button x={sideCardX + 22} y={sideCardY + 134} w={260} h={36} label="Game Page" active onClick={openGamePage} controls={controls} /> : null}
                {controls.showDetailActions && hasRulesAction ? <Button x={sideCardX + 22} y={sideCardY + 180} w={260} h={36} label="Rules Page" onClick={openRulesPage} controls={controls} /> : null}
              </>
            ) : (
              <>
                <SvgText x={sideCardX + 22} y={sideCardY + 34} size={14} strong color="#e9f8ff">STATUS</SvgText>
                <Pill x={sideCardX + 22} y={sideCardY + 58} w={146} label="COMING SOON" tone="gold" controls={controls} />
                <SvgText x={sideCardX + 22} y={sideCardY + 116} size={13} color="#bdcbe0">
                  Detail text is loaded from the catalog JSON.
                </SvgText>
                <SvgText x={sideCardX + 22} y={sideCardY + 142} size={13} color="#8295b0">
                  A playable page appears here after migration.
                </SvgText>
                {controls.showDetailActions && hasGamePageAction ? <Button x={sideCardX + 22} y={sideCardY + 154} w={260} h={34} label="Game Page" active onClick={openGamePage} controls={controls} /> : null}
                {controls.showDetailActions && hasRulesAction ? <Button x={sideCardX + 22} y={sideCardY + 196} w={260} h={34} label="Rules Page" onClick={openRulesPage} controls={controls} /> : null}
              </>
            )}
          </>
        ) : null}
      </g>
      {controls.showDebugBounds && controls.showDetailBounds ? (
        <rect x={x} y={y} width={panelW} height={panelH} fill={controls.debugPageBoundsColor} fillOpacity={controls.debugBoundsFillOpacity} stroke={controls.debugPageBoundsColor} strokeWidth={controls.debugBoundsStrokeWidth} strokeDasharray="12 8" pointerEvents="none" />
      ) : null}
    </g>
  );
}

function DebugBounds({
  controls,
  layout,
  topBarVisible,
  sidebarVisible,
  sidebarW,
  panelX,
  panelW,
  gamesY,
  gamesH,
}: {
  controls: GamesCatalogSvgLayoutControls;
  layout: Layout;
  topBarVisible: boolean;
  sidebarVisible: boolean;
  sidebarW: number;
  panelX: number;
  panelW: number;
  gamesY: number;
  gamesH: number;
}) {
  return (
    <g id="games-catalog-svg-debug-bounds" pointerEvents="none">
      {controls.showPageBounds ? <rect x={layout.pageX} y={layout.pageY} width={layout.pageW} height={layout.pageH} fill="none" stroke={controls.debugPageBoundsColor} strokeWidth={controls.debugBoundsStrokeWidth} strokeDasharray="12 8" /> : null}
      {topBarVisible && controls.showHeaderBounds ? <rect x={layout.topX} y={layout.topY} width={layout.topW} height={layout.topH} fill={controls.debugHeaderBoundsColor} fillOpacity={controls.debugBoundsFillOpacity} stroke={controls.debugHeaderBoundsColor} strokeWidth={controls.debugBoundsStrokeWidth} /> : null}
      {sidebarVisible && controls.showSidebarBounds ? <rect x={layout.bodyX} y={layout.bodyY} width={sidebarW} height={layout.bodyH} fill={controls.debugSidebarBoundsColor} fillOpacity={controls.debugBoundsFillOpacity} stroke={controls.debugSidebarBoundsColor} strokeWidth={controls.debugBoundsStrokeWidth} /> : null}
      {controls.showGamesAreaBounds ? <rect x={panelX} y={gamesY} width={panelW} height={gamesH} fill={controls.debugGamesBoundsColor} fillOpacity={controls.debugBoundsFillOpacity} stroke={controls.debugGamesBoundsColor} strokeWidth={controls.debugBoundsStrokeWidth} /> : null}
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
  qualityFilter = 'all',
  onQualityChange,
  sortBy = 'name',
  onSortChange,
  searchQuery = '',
  onSearchChange,
  currentCategory = 'all',
  onCategoryChange,
  currentSubcategory = null,
  onSubcategoryChange,
  playerModeFilter = 'all',
  onPlayerModeChange,
  categoryExpanded = new Set<string>(),
  onCategoryExpandToggle,
  isSidebarCollapsed = false,
  onToggleSidebar,
  detail,
  detailLoading = false,
  initialDetailSection = 'overview',
  selectedGame: controlledSelectedGame,
  onGameSelect,
  onDetailClose,
  onGameClick,
  onRulesClick,
  layoutControls,
  minCardWidthPx,
  maxCardWidthPx,
  maxGridColumns,
  cardHeight,
}: GamesCatalogSvgShowcaseProps) {
  const idPrefix = useId().replace(/:/g, '');
  const { ref, size } = useViewportSize();
  const [internalSelectedGame, setInternalSelectedGame] = useState<GamesExplorerGame | null>(null);
  const [gridScrollY, setGridScrollY] = useState(0);
  const [sidebarScrollY, setSidebarScrollY] = useState(0);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState('All');
  const resolvedControls = useMemo(() => resolveGamesCatalogLayoutControls({
    ...layoutControls,
    ...(minCardWidthPx !== undefined ? { minCardWidthPx } : {}),
    ...(maxCardWidthPx !== undefined ? { maxCardWidthPx } : {}),
    ...(maxGridColumns !== undefined ? { maxGridColumns } : {}),
    ...(cardHeight !== undefined ? { cardHeight } : {}),
  }), [cardHeight, layoutControls, maxCardWidthPx, maxGridColumns, minCardWidthPx]);
  const [sidebarW, setSidebarW] = useState(resolvedControls.defaultSidebarWidth);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const dragRafRef = useRef<number>(DRAG_RAF_NONE);
  const pendingSidebarWRef = useRef(resolvedControls.defaultSidebarWidth);
  const dynamicViewH = Math.max(MIN_VIEW_H, Math.round(BASE_VIEW_W * (size.height / Math.max(1, size.width))));
  const dynamicViewW = Math.max(BASE_VIEW_W, Math.round(dynamicViewH * (size.width / Math.max(1, size.height))));
  const layout = useMemo(() => makeLayout(dynamicViewW, dynamicViewH, resolvedControls), [dynamicViewH, dynamicViewW, resolvedControls]);
  const viewScale = size.width / Math.max(1, layout.viewW);
  const readableSidebarPx = size.width < 760 ? 165 : size.width < 980 ? 190 : 230;
  const readableSidebarW = readableSidebarPx / Math.max(0.001, viewScale);
  const clampedSidebarW = Math.max(
    resolvedControls.minSidebarWidth,
    Math.min(resolvedControls.maxSidebarWidth, sidebarW)
  );
  const autoSidebarW = Math.min(resolvedControls.maxSidebarWidth, Math.max(clampedSidebarW, readableSidebarW));
  const maxSidebarForPage = layout.bodyW * (size.width < 760 ? 0.46 : 0.38);
  const effectiveSidebarW = isSidebarCollapsed || !resolvedControls.showSidebar ? 0 : Math.min(autoSidebarW, maxSidebarForPage);
  const panelX = layout.bodyX + effectiveSidebarW;
  const panelW = layout.bodyW - effectiveSidebarW;
  const showAlphabetBar = currentView === 'alphabet';
  const gamesY = showAlphabetBar ? layout.bodyY + CONTROL_BAR_H : layout.bodyY;
  const gamesH = layout.bodyH - (showAlphabetBar ? CONTROL_BAR_H : 0);
  const displayedGames = useMemo(() => {
    if (currentView !== 'alphabet' || activeLetter === 'All') return games;
    return games.filter(game => game.name.trim().toUpperCase().startsWith(activeLetter));
  }, [activeLetter, currentView, games]);
  const resolvedCategories = categoryWithSubs?.length ? categoryWithSubs : buildFallbackCategories(games);
  const resolvedPlayerCounts = playerModeCounts ?? buildFallbackPlayerCounts(games);
  const resolvedAvailableCount = availableCount ?? games.filter(game => game.source === 'asset').length;
  const resolvedMetadata = metadata ?? { totalGames: games.length };
  const categoryCount = resolvedCategories.filter(item => item.category !== 'all').length;
  const selectedGame = controlledSelectedGame === undefined ? internalSelectedGame : controlledSelectedGame;

  useEffect(() => {
    if (!isSidebarDragging) return undefined;

    const flushSidebarWidth = () => {
      dragRafRef.current = DRAG_RAF_NONE;
      setSidebarW(pendingSidebarWRef.current);
    };

    const handleMove = (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const svgX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * layout.viewW;
      pendingSidebarWRef.current = Math.min(
        resolvedControls.maxSidebarWidth,
        Math.max(resolvedControls.minSidebarWidth, Math.round(svgX - layout.bodyX))
      );
      if (dragRafRef.current === DRAG_RAF_NONE) {
        dragRafRef.current = window.requestAnimationFrame(flushSidebarWidth);
      }
    };

    const handleUp = () => {
      setIsSidebarDragging(false);
      if (dragRafRef.current !== DRAG_RAF_NONE) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = DRAG_RAF_NONE;
      }
      setSidebarW(pendingSidebarWRef.current);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (dragRafRef.current !== DRAG_RAF_NONE) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = DRAG_RAF_NONE;
      }
    };
  }, [isSidebarDragging, layout.bodyX, layout.viewW, ref, resolvedControls.maxSidebarWidth, resolvedControls.minSidebarWidth]);

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
  const handleSubcategoryChange = (value: string | null) => {
    onSubcategoryChange?.(value);
    setGridScrollY(0);
  };
  const handlePlayerModeChange = (value: PlayerModeFilter) => {
    onPlayerModeChange?.(value);
    setGridScrollY(0);
  };
  const handleQualityChange = (value: QualityFilter) => {
    onQualityChange?.(value);
    setQualityOpen(false);
    setGridScrollY(0);
  };
  const handleSortChange = (value: SortBy) => {
    onSortChange?.(value);
    setSortOpen(false);
    setGridScrollY(0);
  };
  const handleLetterChange = (value: string) => {
    setActiveLetter(value);
    setGridScrollY(0);
  };
  const handleSelectedGame = (game: GamesExplorerGame) => {
    if (controlledSelectedGame === undefined) {
      setInternalSelectedGame(game);
    }
    onGameSelect?.(game);
  };
  const handleCloseDetail = () => {
    if (controlledSelectedGame === undefined) {
      setInternalSelectedGame(null);
    }
    onDetailClose?.();
  };
  const handleSidebarResizeStart = (event: ReactMouseEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pendingSidebarWRef.current = Math.max(resolvedControls.minSidebarWidth, effectiveSidebarW || sidebarW);
    setIsSidebarDragging(true);
  };

  return (
    <div ref={ref} className="games-catalog-svg-showcase">
      <svg viewBox={`0 0 ${layout.viewW} ${layout.viewH}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Card games catalog SVG preview">
        <Defs idPrefix={idPrefix} controls={resolvedControls} />
        <clipPath id="gcsg-sidebar-window">
          <rect
            x={layout.bodyX + 1}
            y={layout.bodyY + resolvedControls.sidebarHeaderHeight + (resolvedControls.showPlayerModes ? resolvedControls.playerModeRowHeight * 3 + 50 : 34)}
            width={Math.max(1, effectiveSidebarW - 3)}
            height={layout.bodyH - (resolvedControls.sidebarHeaderHeight + (resolvedControls.showPlayerModes ? resolvedControls.playerModeRowHeight * 3 + 68 : 52))}
          />
        </clipPath>
        <clipPath id={`${idPrefix}-gamesClip`}>
          <rect x={panelX + 2} y={gamesY + 2} width={panelW - 4} height={gamesH - 4} />
        </clipPath>
        {resolvedControls.showToolbar ? (
          <TopBar
            layout={layout}
            controls={resolvedControls}
            view={currentView}
            setView={setView}
            qualityFilter={qualityFilter}
            sortBy={sortBy}
            qualityOpen={qualityOpen}
            sortOpen={sortOpen}
            onQualityToggle={() => {
              setQualityOpen(value => !value);
              setSortOpen(false);
            }}
            onSortToggle={() => {
              setSortOpen(value => !value);
              setQualityOpen(false);
            }}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            metadata={resolvedMetadata}
            availableCount={resolvedAvailableCount}
            categoryCount={categoryCount}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={onToggleSidebar}
          />
        ) : null}
        {!isSidebarCollapsed && resolvedControls.showSidebar ? (
          <Sidebar
            layout={layout}
            controls={resolvedControls}
            sidebarW={effectiveSidebarW}
            categoryWithSubs={resolvedCategories}
            currentCategory={currentCategory}
            onCategoryChange={handleCategoryChange}
            currentSubcategory={currentSubcategory}
            onSubcategoryChange={handleSubcategoryChange}
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
    <g id="games-catalog-svg-alphabet-bar">
      <BackdropBlurRect x={panelX} y={layout.bodyY} w={panelW} h={CONTROL_BAR_H} rx={16} blur={resolvedControls.gamesAreaBackdropBlur} />
      <path d={`M ${panelX} ${layout.bodyY} H ${panelX + panelW - 16} Q ${panelX + panelW} ${layout.bodyY} ${panelX + panelW} ${layout.bodyY + 16} V ${layout.bodyY + CONTROL_BAR_H} H ${panelX} Z`} fill={resolvedControls.gamesAreaFillColor} fillOpacity={resolvedControls.gamesAreaFillOpacity} stroke={resolvedControls.gamesAreaStrokeColor} strokeWidth={resolvedControls.gamesAreaStrokeWidth} />
            <SvgText x={panelX + 18} y={layout.bodyY + 29} size={14} strong color="#ffffff">Alphabet</SvgText>
            {LETTERS.map((letter, index) => {
              const startX = panelX + 100;
              const endX = panelX + panelW - 204;
              const availableW = Math.max(120, endX - startX);
              const pillW = Math.max(30, Math.min(42, (availableW - 6 * (LETTERS.length - 1)) / LETTERS.length));
              const gap = LETTERS.length > 1 ? (availableW - pillW * LETTERS.length) / (LETTERS.length - 1) : 0;
              return (
                <Pill
                  key={letter}
                  x={startX + index * (pillW + gap)}
                  y={layout.bodyY + 14}
                  w={pillW}
                  label={letter}
                  active={activeLetter === letter}
                  onClick={() => handleLetterChange(letter)}
                  controls={resolvedControls}
                />
              );
            })}
          </g>
        ) : null}
        <GamesArea
          layout={layout}
          controls={resolvedControls}
          panelX={panelX}
          panelW={panelW}
          areaY={gamesY}
          areaH={gamesH}
          mode={currentView === 'alphabet' ? 'grid' : currentView}
          games={displayedGames}
          selectedGame={selectedGame}
          setSelectedGame={handleSelectedGame}
          scrollY={gridScrollY}
          setScrollY={setGridScrollY}
          viewportPixelW={size.width}
          idPrefix={idPrefix}
          minCardWidthPx={resolvedControls.minCardWidthPx}
          maxCardWidthPx={resolvedControls.maxCardWidthPx}
          maxGridColumns={resolvedControls.maxGridColumns}
          cardHeight={resolvedControls.cardHeight}
        />
        {!isSidebarCollapsed && resolvedControls.showSidebar ? (
          <SidebarResizeHandle
            layout={layout}
            panelX={panelX}
            isDragging={isSidebarDragging}
            onMouseDown={handleSidebarResizeStart}
          />
        ) : null}
        <TopDropdownOverlays
          layout={layout}
          controls={resolvedControls}
          qualityFilter={qualityFilter}
          sortBy={sortBy}
          qualityOpen={qualityOpen}
          sortOpen={sortOpen}
          onQualityChange={handleQualityChange}
          onSortChange={handleSortChange}
        />
        {resolvedControls.showDebugBounds ? (
          <DebugBounds
            controls={resolvedControls}
            layout={layout}
            topBarVisible={resolvedControls.showToolbar}
            sidebarVisible={!isSidebarCollapsed && resolvedControls.showSidebar}
            sidebarW={effectiveSidebarW}
            panelX={panelX}
            panelW={panelW}
            gamesY={gamesY}
            gamesH={gamesH}
          />
        ) : null}
        {resolvedControls.enableDetailOverlay ? (
          <DetailOverlay
            layout={layout}
            controls={resolvedControls}
            game={selectedGame}
            detail={detail}
            detailLoading={detailLoading}
            initialSection={initialDetailSection}
            close={handleCloseDetail}
            openGame={onGameClick}
            openRules={onRulesClick}
          />
        ) : null}
      </svg>
    </div>
  );
}
