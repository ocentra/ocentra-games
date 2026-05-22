import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type WheelEvent } from "react";
import { createGoldenFrameVariantConfig, GoldenFrameForeignObjectArtSvg } from "./GoldenFrameForeignObject";

interface IconProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

type IconComponent = (props: IconProps) => ReactElement;

function IconSvg({
  x = 0,
  y = 0,
  width = 24,
  height = 24,
  color = "currentColor",
  strokeWidth = 2,
  children,
}: IconProps & { children: ReactNode }) {
  return <svg x={x} y={y} width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>;
}

const Activity = (props: IconProps) => <IconSvg {...props}><path d="M 3 12 H 7 L 10 4 L 14 20 L 17 12 H 21" /></IconSvg>;
const Bot = (props: IconProps) => <IconSvg {...props}><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M 12 8 V 4" /><circle cx="9" cy="13" r="1.2" /><circle cx="15" cy="13" r="1.2" /><path d="M 9 17 H 15" /></IconSvg>;
const CalendarDays = (props: IconProps) => <IconSvg {...props}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M 8 3 V 7 M 16 3 V 7 M 4 10 H 20 M 8 14 H 9 M 12 14 H 13 M 16 14 H 17 M 8 17 H 9 M 12 17 H 13" /></IconSvg>;
const ChevronLeft = (props: IconProps) => <IconSvg {...props}><path d="M 15 5 L 8 12 L 15 19" /></IconSvg>;
const ChevronRight = (props: IconProps) => <IconSvg {...props}><path d="M 9 5 L 16 12 L 9 19" /></IconSvg>;
const CircleDot = (props: IconProps) => <IconSvg {...props}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" fill={props.color ?? "currentColor"} stroke="none" /></IconSvg>;
const Coins = (props: IconProps) => <IconSvg {...props}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M 5 6 V 12 C 5 13.7 8.1 15 12 15 C 15.9 15 19 13.7 19 12 V 6" /><path d="M 5 12 V 18 C 5 19.7 8.1 21 12 21 C 15.9 21 19 19.7 19 18 V 12" /></IconSvg>;
const Crown = (props: IconProps) => <IconSvg {...props}><path d="M 4 18 H 20 L 18 8 L 14 12 L 12 5 L 10 12 L 6 8 Z" /><path d="M 7 21 H 17" /></IconSvg>;
const Gamepad2 = (props: IconProps) => <IconSvg {...props}><path d="M 7 9 H 17 C 20 9 22 12 21 16 L 20.5 18 C 20 20 18 20.5 16.5 18.8 L 14.8 17 H 9.2 L 7.5 18.8 C 6 20.5 4 20 3.5 18 L 3 16 C 2 12 4 9 7 9 Z" /><path d="M 8 12 V 16 M 6 14 H 10" /><circle cx="16" cy="13" r="1" /><circle cx="18" cy="16" r="1" /></IconSvg>;
const Gift = (props: IconProps) => <IconSvg {...props}><rect x="4" y="10" width="16" height="10" rx="1" /><path d="M 4 14 H 20 M 12 10 V 20 M 12 10 C 9 8 8 6 9.5 5 C 11 4 12 7 12 10 Z M 12 10 C 15 8 16 6 14.5 5 C 13 4 12 7 12 10 Z" /></IconSvg>;
const Grid3X3 = (props: IconProps) => <IconSvg {...props}><path d="M 4 4 H 9 V 9 H 4 Z M 15 4 H 20 V 9 H 15 Z M 4 15 H 9 V 20 H 4 Z M 15 15 H 20 V 20 H 15 Z M 10 10 H 14 V 14 H 10 Z" /></IconSvg>;
const Home = (props: IconProps) => <IconSvg {...props}><path d="M 4 11 L 12 4 L 20 11" /><path d="M 6 10 V 20 H 18 V 10" /><path d="M 10 20 V 14 H 14 V 20" /></IconSvg>;
const Medal = (props: IconProps) => <IconSvg {...props}><circle cx="12" cy="14" r="5" /><path d="M 8 3 L 12 9 L 16 3 M 9 3 H 15" /><path d="M 12 12 L 13 14 L 15 14.3 L 13.5 15.8 L 13.8 18 L 12 17 L 10.2 18 L 10.5 15.8 L 9 14.3 L 11 14 Z" /></IconSvg>;
const Shield = (props: IconProps) => <IconSvg {...props}><path d="M 12 3 L 19 6 V 11 C 19 16 16 19.5 12 21 C 8 19.5 5 16 5 11 V 6 Z" /></IconSvg>;
const Swords = (props: IconProps) => <IconSvg {...props}><path d="M 5 19 L 19 5 M 14 5 H 19 V 10 M 4 14 L 10 20 M 6 20 L 10 16" /><path d="M 19 19 L 5 5 M 10 5 H 5 V 10 M 20 14 L 14 20 M 18 20 L 14 16" /></IconSvg>;
const Trophy = (props: IconProps) => <IconSvg {...props}><path d="M 8 4 H 16 V 10 C 16 13 14 15 12 15 C 10 15 8 13 8 10 Z" /><path d="M 8 6 H 4 V 8 C 4 10.5 6 12 8 12 M 16 6 H 20 V 8 C 20 10.5 18 12 16 12 M 12 15 V 20 M 8 20 H 16" /></IconSvg>;
const Users = (props: IconProps) => <IconSvg {...props}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M 3 20 C 3.8 16.5 5.8 14.5 9 14.5 C 12.2 14.5 14.2 16.5 15 20" /><path d="M 14.5 15 C 17.5 15.2 19.5 16.8 21 20" /></IconSvg>;

type Tone = "cyan" | "gold" | "purple" | "red" | "muted";
type LeaderboardTabId = "overall" | "perGame" | "aiBenchmarks" | "tournaments" | "friends";
type LeaderboardDetailMode = "player" | "game" | "season";

interface Metric {
  label: string;
  value: string;
  icon: IconComponent;
  tone: Tone;
}

interface NavItem {
  label: string;
  detail: string;
  icon: IconComponent;
  tabId: LeaderboardTabId;
}

interface PlayerRow {
  id: string;
  rank: number;
  player: string;
  rating: string;
  games: string;
  wins: string;
  winRate: string;
  bestGame: string;
  trend: string;
  tone: Tone;
}

interface TopGame {
  id: string;
  rank: number;
  name: string;
  matches: string;
  growth: string;
  tone: Tone;
}

interface FeedItem {
  id: string;
  player: string;
  action: string;
  time: string;
  tone: Tone;
}

interface QuickGame {
  id: string;
  name: string;
  detail: string;
  icon: IconComponent;
  tone: Tone;
}

interface GameRow {
  rank: number;
  player: string;
  rating: string;
  wins: string;
  losses: string;
  winRate: string;
  streak: string;
  tier: string;
  movement: string;
  tone: Tone;
}

const metrics: Metric[] = [
  { label: "TOTAL PLAYERS", value: "2.48M", icon: Users, tone: "cyan" },
  { label: "TOTAL GAMES", value: "28", icon: Gamepad2, tone: "muted" },
  { label: "RANKED MATCHES", value: "18.72M", icon: Swords, tone: "gold" },
  { label: "ACTIVE TODAY", value: "154K", icon: Activity, tone: "cyan" },
  { label: "SEASON ENDS IN", value: "12D : 04H : 32M", icon: Crown, tone: "gold" },
  { label: "GLOBAL PRIZE POOL", value: "2.35M", icon: Coins, tone: "gold" },
];

const navItems: NavItem[] = [
  { label: "OVERVIEW", detail: "Command center", icon: Home, tabId: "overall" },
  { label: "OVERALL PLAYERS", detail: "Ranked by Global Rating", icon: Shield, tabId: "overall" },
  { label: "PER GAME", detail: "Top Games Overview", icon: Gamepad2, tabId: "perGame" },
  { label: "AI BENCHMARKS", detail: "AI vs AI Rankings", icon: Bot, tabId: "aiBenchmarks" },
  { label: "TOURNAMENTS", detail: "Live & Completed", icon: Trophy, tabId: "tournaments" },
  { label: "FRIENDS", detail: "Your Friends Ranking", icon: Users, tabId: "friends" },
  { label: "GUILDS", detail: "Guilds & Clans", icon: Shield, tabId: "friends" },
  { label: "CREATORS", detail: "Top Content Creators", icon: Medal, tabId: "overall" },
];

const playerRows: PlayerRow[] = [
  { id: "cardsharp", rank: 4, player: "CardSharp", rating: "2,980", games: "1,842", wins: "1,128", winRate: "61.2%", bestGame: "Spades", trend: "+2", tone: "purple" },
  { id: "pokerface", rank: 5, player: "PokerFace", rating: "2,865", games: "1,675", wins: "1,021", winRate: "60.9%", bestGame: "Poker", trend: "+1", tone: "red" },
  { id: "neondealer", rank: 6, player: "NeonDealer", rating: "2,754", games: "2,103", wins: "1,287", winRate: "61.1%", bestGame: "Blackjack", trend: "-1", tone: "cyan" },
  { id: "highroller", rank: 7, player: "HighRoller", rating: "2,645", games: "1,532", wins: "905", winRate: "59.1%", bestGame: "Rummy", trend: "+3", tone: "gold" },
  { id: "ladyluck", rank: 8, player: "LadyLuck", rating: "2,523", games: "1,311", wins: "812", winRate: "61.9%", bestGame: "Teen Patti", trend: "-", tone: "purple" },
  { id: "triplecrown", rank: 9, player: "TripleCrown", rating: "2,487", games: "1,276", wins: "789", winRate: "61.8%", bestGame: "3 Card Brag", trend: "-2", tone: "red" },
  { id: "silentplayer", rank: 10, player: "SilentPlayer", rating: "2,401", games: "1,098", wins: "672", winRate: "61.2%", bestGame: "Call Break", trend: "+1", tone: "cyan" },
];

const topGames: TopGame[] = [
  { id: "three-card-brag", rank: 1, name: "Three Card Brag", matches: "894K", growth: "+18.2%", tone: "gold" },
  { id: "spades", rank: 2, name: "Spades", matches: "612K", growth: "+11.3%", tone: "cyan" },
  { id: "poker", rank: 3, name: "Poker", matches: "538K", growth: "+9.7%", tone: "red" },
  { id: "rummy", rank: 4, name: "Rummy", matches: "456K", growth: "+7.8%", tone: "purple" },
  { id: "blackjack", rank: 5, name: "Blackjack", matches: "312K", growth: "+5.4%", tone: "cyan" },
];

const feedItems: FeedItem[] = [
  { id: "feed-ace", player: "AceMaster99", action: "hit 5,000 Rating", time: "2m ago", tone: "gold" },
  { id: "feed-neon", player: "NeonDealer", action: "won Brag Tourney", time: "5m ago", tone: "cyan" },
  { id: "feed-royal", player: "RoyalFlush21", action: "climbed to #2", time: "7m ago", tone: "purple" },
  { id: "feed-poker", player: "PokerFace", action: "reached Platinum I", time: "9m ago", tone: "red" },
];

const quickGames: QuickGame[] = [
  { id: "quick-access", name: "QUICK ACCESS", detail: "Open any leaderboard", icon: Trophy, tone: "gold" },
  { id: "three-card-brag", name: "THREE CARD BRAG", detail: "View Leaderboard", icon: Crown, tone: "gold" },
  { id: "spades", name: "SPADES", detail: "View Leaderboard", icon: Shield, tone: "purple" },
  { id: "poker", name: "POKER", detail: "View Leaderboard", icon: CircleDot, tone: "red" },
  { id: "rummy", name: "RUMMY", detail: "View Leaderboard", icon: Swords, tone: "cyan" },
  { id: "blackjack", name: "BLACKJACK", detail: "View Leaderboard", icon: Medal, tone: "muted" },
  { id: "teen-patti", name: "TEEN PATTI", detail: "View Leaderboard", icon: Crown, tone: "red" },
  { id: "all-games", name: "ALL GAMES", detail: "Explore All", icon: Grid3X3, tone: "cyan" },
];

const gameRows: GameRow[] = [
  { rank: 4, player: "NeonRider", rating: "2,890", wins: "215", losses: "132", winRate: "61.9%", streak: "5", tier: "DIAMOND III", movement: "+3", tone: "cyan" },
  { rank: 5, player: "CardSharp", rating: "2,712", wins: "198", losses: "128", winRate: "60.8%", streak: "4", tier: "DIAMOND IV", movement: "-1", tone: "purple" },
  { rank: 6, player: "PokerFace", rating: "2,650", wins: "184", losses: "110", winRate: "62.6%", streak: "6", tier: "DIAMOND IV", movement: "+2", tone: "red" },
  { rank: 7, player: "SilentDealer", rating: "2,564", wins: "175", losses: "97", winRate: "64.3%", streak: "9", tier: "DIAMOND IV", movement: "+4", tone: "cyan" },
  { rank: 8, player: "HighRoller", rating: "2,498", wins: "168", losses: "106", winRate: "61.3%", streak: "3", tier: "PLATINUM I", movement: "-", tone: "gold" },
  { rank: 9, player: "LadyLuck", rating: "2,389", wins: "156", losses: "103", winRate: "60.2%", streak: "4", tier: "PLATINUM I", movement: "-2", tone: "purple" },
  { rank: 10, player: "TripleCrown", rating: "2,318", wins: "142", losses: "92", winRate: "60.7%", streak: "2", tier: "PLATINUM II", movement: "+1", tone: "red" },
];

const toneColor: Record<Tone, string> = {
  cyan: "#42e8ff",
  gold: "#f6c34a",
  purple: "#9b5cff",
  red: "#ff5d72",
  muted: "#c7d7ee",
};

const GLOBAL_GRID = (() => {
  const canvasW = 1536;
  const canvasH = 864;
  const outerPad = 24;
  const gap = 14;
  const leftW = 208;
  const rightW = 318;
  const leftX = outerPad;
  const mainX = leftX + leftW + gap;
  const rightX = canvasW - outerPad - rightW;
  const mainW = rightX - mainX - gap;
  const topY = 28;
  const headerH = 66;
  const tabsY = 110;
  const tabsH = 39;
  const mainY = 158;
  const bottomY = 784;
  const bottomH = 76;
  const mainH = bottomY - gap - mainY;
  return {
    canvasW,
    canvasH,
    outerPad,
    gap,
    leftX,
    leftW,
    mainX,
    mainW,
    rightX,
    rightW,
    topY,
    headerH,
    tabsY,
    tabsH,
    mainY,
    mainH,
    bottomY,
    bottomH,
  };
})();

interface LeaderboardTab {
  id: LeaderboardTabId;
  label: string;
  title: string;
}

interface LeaderboardTabDetail {
  eyebrow: string;
  summary: string;
  primary: string;
  secondary: string;
  action: string;
  tone: Tone;
}

const globalTabs: LeaderboardTab[] = [
  { id: "overall", label: "OVERALL PLAYERS", title: "RANKED BY GLOBAL RATING" },
  { id: "perGame", label: "PER GAME", title: "PER-GAME LEADERBOARD ACCESS" },
  { id: "aiBenchmarks", label: "AI BENCHMARKS", title: "AI BENCHMARK STANDINGS" },
  { id: "tournaments", label: "TOURNAMENTS", title: "TOURNAMENT PERFORMANCE" },
  { id: "friends", label: "FRIENDS", title: "FRIENDS RANKING" },
];

const tabDetails: Record<LeaderboardTabId, LeaderboardTabDetail> = {
  overall: {
    eyebrow: "Global ladder",
    summary: "Unified rating across every ranked table, refreshed as matches settle.",
    primary: "2.48M tracked players",
    secondary: "100 rows per page",
    action: "Inspect selected player",
    tone: "cyan",
  },
  perGame: {
    eyebrow: "Game drilldown",
    summary: "Game tiles and right-rail picks shift the board toward a single game surface.",
    primary: "28 leaderboards",
    secondary: "Top games pinned",
    action: "Open game board",
    tone: "gold",
  },
  aiBenchmarks: {
    eyebrow: "AI comparison",
    summary: "Benchmark rows separate model ranking from human player standings.",
    primary: "64 ranked agents",
    secondary: "7 benchmark suites",
    action: "Review AI detail",
    tone: "purple",
  },
  tournaments: {
    eyebrow: "Events",
    summary: "Tournament rank, season points, brackets, and prize pools live in this view.",
    primary: "12 live events",
    secondary: "3 finals today",
    action: "View event ladder",
    tone: "red",
  },
  friends: {
    eyebrow: "Social lens",
    summary: "Friend, guild, and creator filters keep the same board shape with scoped data.",
    primary: "84 friends ranked",
    secondary: "5 guild changes",
    action: "Compare friends",
    tone: "cyan",
  },
};

function cutRectPath(x: number, y: number, w: number, h: number, cut = 13) {
  return [
    `M ${x + cut} ${y}`,
    `H ${x + w - cut}`,
    `L ${x + w} ${y + cut}`,
    `V ${y + h - cut}`,
    `L ${x + w - cut} ${y + h}`,
    `H ${x + cut}`,
    `L ${x} ${y + h - cut}`,
    `V ${y + cut}`,
    "Z",
  ].join(" ");
}

function hexPath(cx: number, cy: number, radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function TechPanel({
  x,
  y,
  w,
  h,
  tone = "cyan",
  selected = false,
  disabled = false,
  className,
  onClick,
  ariaLabel,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: Tone;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor[tone];
  const interactive = Boolean(onClick) && !disabled;
  const active = selected || hovered;
  const hoverFill = tone === "gold" ? "rgba(246, 195, 74, 0.14)" : `${color}20`;
  const fill = selected ? "url(#panelSelected)" : hovered ? hoverFill : tone === "gold" ? "url(#goldPanel)" : "url(#panelFill)";
  const classes = [className, interactive ? "interactive-panel" : undefined, disabled ? "is-disabled" : undefined].filter(Boolean).join(" ");
  const handleClick = (event: MouseEvent<SVGGElement>) => {
    if (!interactive) return;
    event.stopPropagation();
    onClick?.();
  };
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (!interactive || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };
  return <g
    className={classes || undefined}
    onClick={handleClick}
    onKeyDown={handleKeyDown}
    onMouseEnter={() => interactive && setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    role={interactive ? "button" : undefined}
    tabIndex={interactive ? 0 : undefined}
    aria-label={ariaLabel}
    aria-disabled={disabled || undefined}
  >
    {hovered && !selected && <path d={cutRectPath(x - 4, y - 4, w + 8, h + 8, 15)} fill="none" stroke={color} strokeWidth={2.4} opacity={0.28} filter={`url(#${tone === "gold" ? "goldGlow" : "cyanGlow"})`} />}
    <path d={cutRectPath(x, y, w, h, active ? 16 : 12)} fill={fill} stroke={color} strokeWidth={active ? 1.7 : 1} opacity={disabled ? 0.48 : 0.97} />
    <path d={cutRectPath(x + 5, y + 5, w - 10, h - 10, 10)} fill="none" stroke={color} strokeWidth={0.7} opacity={active ? 0.55 : 0.28} />
    <path d={`M ${x + 18} ${y + 1} H ${x + Math.min(w * 0.48, w - 36)}`} stroke="#e7faff" strokeWidth={1.1} opacity={active ? 0.65 : 0.28} />
    <path d={`M ${x + w - Math.min(w * 0.34, w - 30)} ${y + h - 1} H ${x + w - 18}`} stroke={color} strokeWidth={1.2} opacity={active ? 0.55 : 0.24} />
    {selected && <path d={cutRectPath(x, y, w, h, 16)} fill="none" stroke={color} strokeWidth={5} opacity={0.18} filter={`url(#${tone === "gold" ? "goldGlow" : "cyanGlow"})`} />}
    {children}
  </g>;
}

function SurfaceButton({
  x,
  y,
  w,
  h,
  label,
  tone = "cyan",
  active = false,
  disabled = false,
  arrow = false,
  onClick,
  ariaLabel,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: Tone;
  active?: boolean;
  disabled?: boolean;
  arrow?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  const color = toneColor[tone];
  const arrowW = arrow ? Math.min(27, Math.max(18, h + 2)) : 0;
  return <TechPanel x={x} y={y} w={w} h={h} tone={tone} selected={active} disabled={disabled} onClick={onClick} ariaLabel={ariaLabel ?? label}>
    <text x={x + (w - arrowW) / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={Math.min(13, h * 0.42)} fontWeight={950} fill={disabled ? "#8aa2b6" : "#ffffff"}>{label}</text>
    {arrow && <>
      <line x1={x + w - arrowW} y1={y + 4} x2={x + w - arrowW} y2={y + h - 4} stroke={active ? "#ffffff" : color} strokeWidth={0.9} opacity={0.72} />
      <ChevronRight x={x + w - arrowW + 5} y={y + h / 2 - 7} width={14} height={14} color={disabled ? "#8aa2b6" : "#ffffff"} />
    </>}
  </TechPanel>;
}

function IconBadge({
  x,
  y,
  icon: Icon,
  tone = "cyan",
  size = 38,
  rank,
}: {
  x: number;
  y: number;
  icon: IconComponent;
  tone?: Tone;
  size?: number;
  rank?: number;
}) {
  const color = toneColor[tone];
  return <g>
    <path d={hexPath(x + size / 2, y + size / 2, size / 2)} fill="#071a2a" stroke={color} strokeWidth={1.4} filter={`url(#${tone === "gold" ? "goldGlow" : "cyanGlow"})`} />
    {rank ? <text x={x + size / 2} y={y + size / 2 + 7} textAnchor="middle" fontSize={18} fontWeight={900} fill={color}>{rank}</text> : <Icon x={x + 9} y={y + 9} width={size - 18} height={size - 18} color={color} strokeWidth={2.2} />}
  </g>;
}

function ArtworkSlot({
  x,
  y,
  w,
  h,
  label,
  tone = "cyan",
  compact = false,
  shape = "rect",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone?: Tone;
  compact?: boolean;
  shape?: "rect" | "circle" | "hex";
}) {
  const color = toneColor[tone];
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const text = compact ? "IMG" : label;
  const fontSize = compact ? Math.min(10, Math.max(7, w * 0.2)) : Math.min(11, Math.max(8, w * 0.08));
  const outline = shape === "circle"
    ? <circle cx={centerX} cy={centerY} r={Math.min(w, h) / 2 - 1} fill="#071625" stroke={color} strokeWidth={1.1} strokeDasharray="4 3" opacity={0.92} />
    : shape === "hex"
      ? <path d={hexPath(centerX, centerY, Math.min(w, h) / 2 - 1)} fill="#071625" stroke={color} strokeWidth={1.1} strokeDasharray="4 3" opacity={0.92} />
      : <rect x={x} y={y} width={w} height={h} rx={4} fill="#071625" stroke={color} strokeWidth={1.1} strokeDasharray="4 3" opacity={0.92} />;
  return <g className="artwork-slot">
    {outline}
    <line x1={x + Math.min(8, w * 0.18)} y1={y + Math.min(8, h * 0.18)} x2={x + w - Math.min(8, w * 0.18)} y2={y + h - Math.min(8, h * 0.18)} stroke={color} strokeOpacity={0.45} strokeWidth={0.8} />
    <line x1={x + w - Math.min(8, w * 0.18)} y1={y + Math.min(8, h * 0.18)} x2={x + Math.min(8, w * 0.18)} y2={y + h - Math.min(8, h * 0.18)} stroke={color} strokeOpacity={0.45} strokeWidth={0.8} />
    <text x={centerX} y={centerY + fontSize * 0.34} textAnchor="middle" fontSize={fontSize} fontWeight={950} fill={color}>{text}</text>
  </g>;
}

function PlayerAvatarSlot({ cx, cy, r, tone = "cyan" }: { cx: number; cy: number; r: number; tone?: Tone }) {
  return <ArtworkSlot x={cx - r} y={cy - r} w={r * 2} h={r * 2} label="AVATAR" tone={tone} compact={r < 20} shape="circle" />;
}

function GameArtSlot({ x, y, size, tone = "cyan", label = "GAME ART" }: { x: number; y: number; size: number; tone?: Tone; label?: string }) {
  return <ArtworkSlot x={x} y={y} w={size} h={size} label={label} tone={tone} compact={size < 44} shape="hex" />;
}

function MetricCard({ metric, x, y, w }: { metric: Metric; x: number; y: number; w: number }) {
  const color = toneColor[metric.tone];
  const Icon = metric.icon;
  const valueFontSize = metric.value.length > 9 ? 16 : 21;
  return <TechPanel x={x} y={y} w={w} h={GLOBAL_GRID.headerH} tone={metric.tone}>
    <Icon x={x + 24} y={y + 21} width={25} height={25} color={color} strokeWidth={2.3} />
    <text x={x + 66} y={y + 29} fontSize={10} fontWeight={800} fill="#a8bed4">{metric.label}</text>
    <text x={x + 66} y={y + 53} fontSize={valueFontSize} fontWeight={900} fill={metric.tone === "gold" ? "#ffde78" : "#effaff"}>{metric.value}</text>
  </TechPanel>;
}

function NavPanel({
  activeTab,
  onTabChange,
}: {
  activeTab: LeaderboardTabId;
  onTabChange: (tab: LeaderboardTabId) => void;
}) {
  const { leftX, leftW, topY, bottomY, gap } = GLOBAL_GRID;
  const navH = 500;
  const seasonY = topY + navH + gap;
  const seasonH = bottomY - gap - seasonY;
  return <g>
    <TechPanel x={leftX} y={topY} w={leftW} h={navH} tone="cyan">
      <text x={leftX + 34} y={topY + 31} fontSize={15} fontWeight={900} fill="#ffffff">LEADERBOARD HUB</text>
      {navItems.map((item, index) => <NavRow key={item.label} item={item} active={item.tabId === activeTab} x={leftX} w={leftW} y={topY + 50 + index * 52} onSelect={() => onTabChange(item.tabId)} />)}
    </TechPanel>
    <TechPanel x={leftX} y={seasonY} w={leftW} h={seasonH} tone="cyan">
      <text x={leftX + leftW / 2} y={seasonY + 30} textAnchor="middle" fontSize={15} fontWeight={900} fill="#ffffff">SEASON 12</text>
      <text x={leftX + leftW / 2} y={seasonY + 53} textAnchor="middle" fontSize={15} fontWeight={900} fill="#ffffff">LEGENDS RISE</text>
      <text x={leftX + leftW / 2} y={seasonY + 80} textAnchor="middle" fontSize={10} fontWeight={800} fill="#c6d6ea">MAY 01 - JUN 01, 2026</text>
      <ArtworkSlot x={leftX + 66} y={seasonY + 98} w={76} h={66} label="SEASON EMBLEM" tone="cyan" shape="hex" />
      <text x={leftX + leftW / 2} y={seasonY + 170} textAnchor="middle" fontSize={10} fontWeight={800} fill="#8ec6dd">GLOBAL SEASON HUB</text>
      <TechPanel x={leftX + 18} y={seasonY + seasonH - 48} w={leftW - 36} h={32} tone="purple" selected className="interactive-panel" onClick={() => onTabChange("tournaments")} ariaLabel="Open season rewards">
        <Gift x={leftX + 32} y={seasonY + seasonH - 39} width={14} height={14} color="#d9ecff" />
        <text x={leftX + 62} y={seasonY + seasonH - 27} fontSize={10} fontWeight={900} fill="#ffffff">SEASON REWARDS</text>
        <ChevronRight x={leftX + leftW - 42} y={seasonY + seasonH - 39} width={14} height={14} color="#ffffff" />
      </TechPanel>
    </TechPanel>
  </g>;
}

function NavRow({ item, active, x, w, y, onSelect }: { item: NavItem; active: boolean; x: number; w: number; y: number; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = active ? "#ffffff" : "#d8eaff";
  const Icon = item.icon;
  const rowX = x + 16;
  const rowW = w - 32;
  const lit = active || hovered;
  const handleSelect = (event?: MouseEvent<SVGGElement>) => {
    event?.stopPropagation();
    onSelect();
  };
  return <g className="interactive-row" onClick={handleSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onKeyDown={(event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  }} role="button" tabIndex={0} aria-label={`Open ${item.label}`}>
    {hovered && !active && <path d={cutRectPath(rowX - 3, y - 3, rowW + 6, 48, 10)} fill="none" stroke="#76e7ff" strokeWidth={1.4} opacity={0.3} filter="url(#cyanGlow)" />}
    {active && <path d={cutRectPath(rowX - 3, y - 3, rowW + 6, 48, 10)} fill="none" stroke="#76e7ff" strokeWidth={1.8} opacity={0.28} filter="url(#cyanGlow)" />}
    {lit && <path d={cutRectPath(rowX, y, rowW, 42, 8)} fill={active ? "url(#navActive)" : "rgba(66, 232, 255, 0.12)"} stroke="#76e7ff" strokeWidth={active ? 1.1 : 0.8} />}
    {!lit && <path d={cutRectPath(rowX, y, rowW, 42, 8)} fill="transparent" stroke="transparent" />}
    <Icon x={x + 26} y={y + 11} width={20} height={20} color={lit ? "#ffffff" : "#67e8f9"} strokeWidth={2.2} />
    <text x={x + 60} y={y + 18} fontSize={12.5} fontWeight={900} fill={color}>{item.label}</text>
    <text x={x + 60} y={y + 35} fontSize={9.5} fontWeight={600} fill="#8da8bf">{item.detail}</text>
    {lit && <ChevronRight x={x + w - 36} y={y + 12} width={16} height={16} color="#ffffff" />}
  </g>;
}

function AvatarRing({ cx, cy, r, tone = "cyan" }: { cx: number; cy: number; r: number; tone?: Tone }) {
  const color = toneColor[tone];
  return <g>
    <circle cx={cx} cy={cy} r={r} fill="#091827" stroke={color} strokeWidth={2.2} filter={`url(#${tone === "gold" ? "goldGlow" : "cyanGlow"})`} />
    <circle cx={cx} cy={cy} r={r - 8} fill="url(#avatarFill)" stroke="#ccefff" strokeWidth={0.8} opacity={0.95} />
    <path d={`M ${cx - r * 0.28} ${cy + r * 0.1} Q ${cx} ${cy - r * 0.28} ${cx + r * 0.28} ${cy + r * 0.1} L ${cx + r * 0.18} ${cy + r * 0.48} H ${cx - r * 0.18} Z`} fill="#101827" stroke={color} strokeWidth={1} />
    <circle cx={cx - r * 0.12} cy={cy - r * 0.03} r={2.2} fill={color} />
    <circle cx={cx + r * 0.12} cy={cy - r * 0.03} r={2.2} fill={color} />
  </g>;
}

function GoldenPodiumEmbed({
  x,
  y,
  w,
  h,
  rank,
  name,
  statName,
  statValue,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rank: string;
  name: string;
  statName: string;
  statValue: string;
  tone: "gold" | "silver" | "bronze" | "blue" | "red";
}) {
  const cfg = createGoldenFrameVariantConfig({ rank, name, statName, statValue, tone });
  const slotTone: Tone = tone === "gold" ? "gold" : tone === "bronze" || tone === "red" ? "red" : tone === "blue" ? "cyan" : "muted";
  return <g>
    <foreignObject x={x} y={y} width={w} height={h}>
      <div className="gold-card-embed">
        <GoldenFrameForeignObjectArtSvg cfg={cfg} className="gold-card-embed-svg" backgroundFill="none" />
      </div>
    </foreignObject>
    <PlayerAvatarSlot cx={x + w * 0.5} cy={y + h * 0.37} r={Math.min(w, h) * 0.13} tone={slotTone} />
  </g>;
}

function ModeDetailBanner({
  x,
  y,
  w,
  detail,
  onAction,
}: {
  x: number;
  y: number;
  w: number;
  detail: LeaderboardTabDetail;
  onAction: () => void;
}) {
  const color = toneColor[detail.tone];
  return <g>
    <path d={cutRectPath(x, y, w, 37, 9)} fill="rgba(6, 20, 34, 0.76)" stroke={color} strokeWidth={0.8} strokeOpacity={0.62} />
    <text x={x + 16} y={y + 15} fontSize={9} fontWeight={950} fill={color}>{detail.eyebrow.toUpperCase()}</text>
    <text x={x + 16} y={y + 30} fontSize={10.5} fontWeight={750} fill="#d8eaff">{detail.summary}</text>
    <text x={x + w - 276} y={y + 16} fontSize={10} fontWeight={900} fill="#ffffff">{detail.primary}</text>
    <text x={x + w - 276} y={y + 31} fontSize={9.5} fontWeight={750} fill="#9fb8cf">{detail.secondary}</text>
    <SurfaceButton x={x + w - 130} y={y + 6} w={114} h={25} tone={detail.tone} active label={detail.action.toUpperCase()} arrow onClick={onAction} ariaLabel={detail.action} />
  </g>;
}

function MainBoard({
  activeTab,
  selectedPlayerId,
  selectedPlayer,
  selectedGameName,
  page,
  rowsPerPage,
  detailMode,
  onTabChange,
  onPlayerSelect,
  onPageChange,
  onRowsPerPageChange,
  onDetailOpen,
  onDetailClose,
}: {
  activeTab: LeaderboardTabId;
  selectedPlayerId: string;
  selectedPlayer: PlayerRow;
  selectedGameName: string;
  page: number;
  rowsPerPage: number;
  detailMode: LeaderboardDetailMode | null;
  onTabChange: (tab: LeaderboardTabId) => void;
  onPlayerSelect: (playerId: string) => void;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: () => void;
  onDetailOpen: (mode: LeaderboardDetailMode) => void;
  onDetailClose: () => void;
}) {
  const { mainH, mainW, mainX, mainY, rightW, rightX, tabsH, tabsY, topY } = GLOBAL_GRID;
  const activeTabConfig = globalTabs.find((tab) => tab.id === activeTab) ?? globalTabs[0];
  const detail = tabDetails[activeTab];
  const headerW = rightX + rightW - mainX;
  const metricGap = 8;
  const metricW = (headerW - metricGap * (metrics.length - 1)) / metrics.length;
  const tabGap = 4;
  const tabW = (mainW - tabGap * (globalTabs.length - 1)) / globalTabs.length;
  const panelPad = 14;
  const podiumGap = 18;
  const sideW = 276;
  const centerW = 320;
  const groupW = sideW * 2 + centerW + podiumGap * 2;
  const groupX = mainX + (mainW - groupW) / 2;
  const tableX = mainX + panelPad;
  const tableY = mainY + 246;
  const tableW = mainW - panelPad * 2;
  return <g>
    <g>
      {metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} x={mainX + index * (metricW + metricGap)} y={topY} w={metricW} />)}
    </g>
    <g>
      {globalTabs.map((tab, index) => <TechPanel key={tab.id} x={mainX + index * (tabW + tabGap)} y={tabsY} w={tabW} h={tabsH} tone={tab.id === activeTab ? "purple" : "cyan"} selected={tab.id === activeTab} className="interactive-panel" onClick={() => onTabChange(tab.id)} ariaLabel={`Open ${tab.label}`}>
        <text x={mainX + index * (tabW + tabGap) + tabW / 2} y={tabsY + 24} textAnchor="middle" fontSize={12.5} fontWeight={900} fill="#ffffff">{tab.label}</text>
      </TechPanel>)}
    </g>
    <TechPanel x={mainX} y={mainY} w={mainW} h={mainH} tone="cyan">
      <text x={mainX + 18} y={mainY + 30} fontSize={13} fontWeight={900} fill="#ffffff">{activeTabConfig.title}</text>
      <circle cx={mainX + 302} cy={mainY + 25} r={8} fill="#071625" stroke="#5edfff" strokeWidth={1} />
      <text x={mainX + 302} y={mainY + 29} textAnchor="middle" fontSize={10} fontWeight={900} fill="#8beeff">i</text>
      <TechPanel x={mainX + mainW - 170} y={mainY + 14} w={150} h={30} tone="purple" onClick={() => onDetailOpen("season")} ariaLabel="Open season detail">
        <CalendarDays x={mainX + mainW - 156} y={mainY + 21} width={14} height={14} color="#ffffff" />
        <text x={mainX + mainW - 118} y={mainY + 33} fontSize={12} fontWeight={900} fill="#ffffff">SEASON 12</text>
        <ChevronRight x={mainX + mainW - 43} y={mainY + 20} width={16} height={16} color="#ffffff" />
      </TechPanel>
      <ModeDetailBanner x={mainX + 18} y={mainY + 50} w={mainW - 36} detail={detail} onAction={() => onDetailOpen(activeTab === "perGame" ? "game" : activeTab === "tournaments" ? "season" : "player")} />
      <GoldenPodiumEmbed x={groupX} y={mainY + 104} w={sideW} h={134} rank="2" name="RoyalFlush21" statName="Global" statValue="3,640" tone="silver" />
      <GoldenPodiumEmbed x={groupX + sideW + podiumGap} y={mainY + 82} w={centerW} h={156} rank="1" name="AceMaster99" statName="Global" statValue="4,928" tone="gold" />
      <GoldenPodiumEmbed x={groupX + sideW + podiumGap + centerW + podiumGap} y={mainY + 104} w={sideW} h={134} rank="3" name="BluffKing" statName="Global" statValue="3,215" tone="bronze" />
      <LeaderboardTable x={tableX} y={tableY} w={tableW} selectedPlayerId={selectedPlayerId} onPlayerSelect={onPlayerSelect} />
      <Pagination x={mainX} y={mainY + mainH - 43} w={mainW} page={page} rowsPerPage={rowsPerPage} onPageChange={onPageChange} onRowsPerPageChange={onRowsPerPageChange} />
      {detailMode && <LeaderboardDetailOverlay x={mainX + 18} y={mainY + 50} w={mainW - 36} h={mainH - 100} mode={detailMode} activeTab={activeTab} detail={detail} selectedPlayer={selectedPlayer} selectedGameName={selectedGameName} onTabChange={onTabChange} onClose={onDetailClose} />}
    </TechPanel>
  </g>;
}

function LeaderboardDetailOverlay({
  x,
  y,
  w,
  h,
  mode,
  activeTab,
  detail,
  selectedPlayer,
  selectedGameName,
  onTabChange,
  onClose,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  mode: LeaderboardDetailMode;
  activeTab: LeaderboardTabId;
  detail: LeaderboardTabDetail;
  selectedPlayer: PlayerRow;
  selectedGameName: string;
  onTabChange: (tab: LeaderboardTabId) => void;
  onClose: () => void;
}) {
  const tone = mode === "season" ? "gold" : mode === "game" ? "purple" : selectedPlayer.tone;
  const color = toneColor[tone];
  const title = mode === "season" ? "SEASON 12 REWARDS" : mode === "game" ? `${selectedGameName.toUpperCase()} DRILLDOWN` : `${selectedPlayer.player.toUpperCase()} PROFILE`;
  const subtitle = mode === "season" ? "Reward track, prize pool, tournament calendar" : mode === "game" ? `Per-game ranking from ${detail.eyebrow}` : `${detail.eyebrow} / ${selectedGameName}`;
  const stats = mode === "season"
    ? [
      ["ENDS IN", "12D 04H"],
      ["PRIZE POOL", "2.35M"],
      ["CLAIMED", "68%"],
    ]
    : mode === "game"
      ? [
        ["MATCHES", topGames.find((game) => game.name === selectedGameName)?.matches ?? "456K"],
        ["GROWTH", topGames.find((game) => game.name === selectedGameName)?.growth ?? "+7.8%"],
        ["LEADERS", "100"],
      ]
      : [
        ["RATING", selectedPlayer.rating],
        ["WIN RATE", selectedPlayer.winRate],
        ["TREND", selectedPlayer.trend],
      ];
  const primaryTab: LeaderboardTabId = mode === "season" ? "tournaments" : mode === "game" ? "perGame" : activeTab;
  const primaryLabel = mode === "season" ? "OPEN EVENTS" : mode === "game" ? "OPEN GAME" : "KEEP SELECTED";
  return <g role="dialog" aria-label={title}>
    <path d={cutRectPath(x - 8, y - 8, w + 16, h + 16, 18)} fill="rgba(1, 5, 12, 0.72)" stroke={color} strokeWidth={1.2} opacity={0.98} />
    <path d={cutRectPath(x, y, w, h, 16)} fill="rgba(5, 17, 30, 0.97)" stroke={color} strokeWidth={1.4} filter={`url(#${tone === "gold" ? "goldGlow" : "cyanGlow"})`} />
    <ArtworkSlot x={x + 22} y={y + 24} w={92} h={82} label={mode === "season" ? "SEASON ART" : mode === "game" ? "GAME ART" : "PLAYER AVATAR"} tone={tone} shape={mode === "player" ? "circle" : "hex"} />
    <text x={x + 136} y={y + 39} fontSize={22} fontWeight={950} fill="#ffffff">{title}</text>
    <text x={x + 136} y={y + 64} fontSize={12} fontWeight={800} fill="#a9c3da">{subtitle}</text>
    <text x={x + 136} y={y + 91} fontSize={11} fontWeight={900} fill={color}>{detail.primary}</text>
    <text x={x + 136} y={y + 112} fontSize={10.5} fontWeight={760} fill="#d8eaff">{detail.summary}</text>
    <SurfaceButton x={x + w - 208} y={y + 26} w={126} h={30} tone={tone} active label={primaryLabel} arrow onClick={() => {
      onTabChange(primaryTab);
      onClose();
    }} ariaLabel={primaryLabel} />
    <SurfaceButton x={x + w - 68} y={y + 26} w={44} h={30} tone="muted" label="X" onClick={onClose} ariaLabel="Close leaderboard detail" />
    {stats.map(([label, value], index) => {
      const cardW = (w - 62) / 3;
      const cardX = x + 22 + index * (cardW + 9);
      return <TechPanel key={label} x={cardX} y={y + 136} w={cardW} h={72} tone={index === 1 ? tone : "cyan"}>
        <text x={cardX + 18} y={y + 162} fontSize={10} fontWeight={900} fill="#9fb8cf">{label}</text>
        <text x={cardX + 18} y={y + 190} fontSize={22} fontWeight={950} fill="#ffffff">{value}</text>
      </TechPanel>;
    })}
    <path d={cutRectPath(x + 22, y + 230, w - 44, h - 256, 12)} fill="rgba(7, 22, 37, 0.72)" stroke={color} strokeWidth={0.8} strokeOpacity={0.72} />
    <text x={x + 44} y={y + 266} fontSize={12} fontWeight={950} fill="#ffffff">PERFORMANCE SNAPSHOT</text>
    <text x={x + 44} y={y + 291} fontSize={11} fontWeight={760} fill="#b9d2e7">Recent ranked matches, season milestones, reward eligibility, and leaderboard movement are grouped here for review.</text>
    <text x={x + 44} y={y + 318} fontSize={11} fontWeight={760} fill="#b9d2e7">Avatar, crest, badge, and season media positions are reserved for official leaderboard artwork.</text>
  </g>;
}

function LeaderboardTable({
  x,
  y,
  w,
  selectedPlayerId,
  onPlayerSelect,
}: {
  x: number;
  y: number;
  w: number;
  selectedPlayerId: string;
  onPlayerSelect: (playerId: string) => void;
}) {
  const columns = [
    { label: "RANK", x: x + 22 },
    { label: "PLAYER", x: x + 112 },
    { label: "GLOBAL RATING", x: x + 250 },
    { label: "GAMES PLAYED", x: x + 380 },
    { label: "WINS", x: x + 500 },
    { label: "WIN RATE", x: x + 590 },
    { label: "BEST GAME", x: x + 682 },
    { label: "BADGES", x: x + 800 },
    { label: "TREND", x: x + w - 48 },
  ];
  return <g>
    <path d={cutRectPath(x, y, w, 38, 9)} fill="#061626" stroke="#1a7ca7" strokeWidth={0.9} />
    {columns.map((column) => <text key={column.label} x={column.x} y={y + 24} fontSize={10} fontWeight={900} fill="#bcd3e7">{column.label}</text>)}
    {playerRows.map((row, index) => <TableRow key={row.rank} row={row} x={x} y={y + 42 + index * 39} w={w} selected={row.id === selectedPlayerId} onSelect={() => onPlayerSelect(row.id)} />)}
  </g>;
}

function TableRow({ row, x, y, w, selected, onSelect }: { row: PlayerRow; x: number; y: number; w: number; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor[row.tone];
  const isUp = row.trend.startsWith("+");
  const isDown = row.trend.startsWith("-");
  const lit = selected || hovered;
  return <g className="interactive-row" onClick={(event) => {
    event.stopPropagation();
    onSelect();
  }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onKeyDown={(event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  }} role="button" tabIndex={0} aria-label={`Select ${row.player}`}>
    {hovered && !selected && <rect x={x - 3} y={y - 3} width={w + 6} height={41} rx={6} fill="none" stroke={color} strokeWidth={1.3} opacity={0.25} filter="url(#cyanGlow)" />}
    <rect x={x} y={y} width={w} height={35} rx={4} fill={selected ? "rgba(38, 49, 132, 0.8)" : hovered ? `${color}18` : row.rank % 2 === 0 ? "#071a2b" : "#051422"} stroke={lit ? toneColor[row.tone] : "#123f62"} strokeWidth={lit ? 1.2 : 0.7} />
    <text x={x + 31} y={y + 23} textAnchor="middle" fontSize={13} fontWeight={850} fill="#ffffff">{row.rank}</text>
    <PlayerAvatarSlot cx={x + 94} cy={y + 17.5} r={15} tone={row.tone} />
    <text x={x + 122} y={y + 23} fontSize={13} fontWeight={800} fill="#ffffff">{row.player}</text>
    <text x={x + 260} y={y + 23} fontSize={13} fontWeight={850} fill="#ffffff">{row.rating}</text>
    <CircleDot x={x + 320} y={y + 12} width={10} height={10} color={color} strokeWidth={2.3} />
    <text x={x + 402} y={y + 23} fontSize={13} fontWeight={750} fill="#e5f7ff">{row.games}</text>
    <text x={x + 518} y={y + 23} fontSize={13} fontWeight={750} fill="#e5f7ff">{row.wins}</text>
    <text x={x + 602} y={y + 23} fontSize={13} fontWeight={750} fill="#e5f7ff">{row.winRate}</text>
    <GameGlyph x={x + 690} y={y + 9} tone={row.tone} />
    <text x={x + 716} y={y + 23} fontSize={12} fontWeight={750} fill="#ffffff">{row.bestGame}</text>
    <BadgeSet x={x + 818} y={y + 14} tone={row.tone} />
    <text x={x + w - 23} y={y + 23} textAnchor="middle" fontSize={13} fontWeight={900} fill={isUp ? "#57ff9a" : isDown ? "#ff4c60" : "#e8f4ff"}>{row.trend}</text>
  </g>;
}

function GameGlyph({ x, y, tone }: { x: number; y: number; tone: Tone }) {
  return <GameArtSlot x={x - 2} y={y - 2} size={28} tone={tone} />;
}

function BadgeSet({ x, y, tone }: { x: number; y: number; tone: Tone }) {
  return <g>
    {[0, 1, 2].map((index) => <ArtworkSlot key={`badge-${index}`} x={x - 8 + index * 21} y={y - 8} w={16} h={16} label="BADGE ART" tone={tone} compact shape="hex" />)}
  </g>;
}

function Pagination({
  x,
  y,
  w,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: {
  x: number;
  y: number;
  w: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: () => void;
}) {
  const centerX = x + w / 2;
  const firstX = centerX - 194;
  const maxPage = 100;
  const visiblePages = page <= 3
    ? [1, 2, 3, 4, 5]
    : page >= maxPage - 2
      ? [96, 97, 98, 99, 100]
      : [page - 2, page - 1, page, page + 1, page + 2];
  return <g>
    <TechPanel x={firstX} y={y} w={34} h={30} tone="cyan" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} ariaLabel="Previous leaderboard page">
      <ChevronLeft x={firstX + 8} y={y + 6} width={18} height={18} color="#dff8ff" />
    </TechPanel>
    {visiblePages.map((slotPage, index) => <TechPanel key={slotPage} x={firstX + 54 + index * 42} y={y} w={34} h={30} tone={slotPage === page ? "purple" : "cyan"} selected={slotPage === page} onClick={() => onPageChange(slotPage)} ariaLabel={`Open leaderboard page ${slotPage}`}>
      <text x={firstX + 71 + index * 42} y={y + 21} textAnchor="middle" fontSize={slotPage >= 100 ? 10.5 : 13} fontWeight={900} fill="#ffffff">{slotPage}</text>
    </TechPanel>)}
    <TechPanel x={firstX + 278} y={y} w={34} h={30} tone="cyan" disabled={page >= maxPage} onClick={() => onPageChange(Math.min(maxPage, page + 1))} ariaLabel="Next leaderboard page">
      <ChevronRight x={firstX + 286} y={y + 6} width={18} height={18} color="#dff8ff" />
    </TechPanel>
    <text x={firstX + 336} y={y + 20} fontSize={11} fontWeight={850} fill="#8da9bf">PAGE {page}</text>
    <text x={x + w - 130} y={y + 20} fontSize={12} fontWeight={800} fill="#d7efff">SHOW</text>
    <TechPanel x={x + w - 80} y={y - 1} w={58} h={32} tone="cyan" onClick={onRowsPerPageChange} ariaLabel="Change rows shown">
      <text x={x + w - 57} y={y + 20} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff">{rowsPerPage}</text>
      <ChevronRight x={x + w - 41} y={y + 6} width={14} height={14} color="#ffffff" />
    </TechPanel>
  </g>;
}

function RightRail({
  activeTab,
  selectedPlayer,
  selectedGameId,
  onTabChange,
  onGameSelect,
  onDetailOpen,
}: {
  activeTab: LeaderboardTabId;
  selectedPlayer: PlayerRow;
  selectedGameId: string;
  onTabChange: (tab: LeaderboardTabId) => void;
  onGameSelect: (gameId: string) => void;
  onDetailOpen: (mode: LeaderboardDetailMode) => void;
}) {
  const { gap, mainH, mainY, rightW, rightX } = GLOBAL_GRID;
  const selectedGame = topGames.find((game) => game.id === selectedGameId);
  const selectedQuickGame = quickGames.find((game) => game.id === selectedGameId) ?? quickGames[0];
  const detail = tabDetails[activeTab];
  const topH = 194;
  const distributionH = 210;
  const distributionY = mainY + topH + gap;
  const feedY = distributionY + distributionH + gap;
  const feedH = mainY + mainH - feedY;
  return <g>
    <TechPanel x={rightX} y={mainY} w={rightW} h={topH} tone="cyan">
      <text x={rightX + 26} y={mainY + 31} fontSize={15} fontWeight={900} fill="#ffffff">TOP GAMES THIS SEASON</text>
      <SurfaceButton x={rightX + rightW - 92} y={mainY + 17} w={70} h={24} tone="purple" label="VIEW ALL" arrow onClick={() => {
        onTabChange("perGame");
        onDetailOpen("game");
      }} ariaLabel="Open all game leaderboards" />
      {topGames.map((game, index) => <TopGameRow key={game.name} game={game} x={rightX} y={mainY + 54 + index * 27} w={rightW} selected={game.id === selectedGameId} onSelect={() => onGameSelect(game.id)} />)}
    </TechPanel>
    <TechPanel x={rightX} y={distributionY} w={rightW} h={distributionH} tone="cyan">
      <text x={rightX + 26} y={distributionY + 31} fontSize={15} fontWeight={900} fill="#ffffff">GLOBAL RATING DISTRIBUTION</text>
      <DistributionChart x={rightX + 86} y={distributionY + 108} />
      <DistributionLegend x={rightX + 168} y={distributionY + 62} w={rightW - 188} />
    </TechPanel>
    <TechPanel x={rightX} y={feedY} w={rightW} h={feedH} tone="cyan">
      <text x={rightX + 26} y={feedY + 31} fontSize={15} fontWeight={900} fill="#ffffff">LIVE LEADERBOARD FEED</text>
      <rect x={rightX + rightW - 66} y={feedY + 18} width={45} height={18} rx={9} fill="#0d3c23" stroke="#40ff8b" strokeWidth={0.8} />
      <circle cx={rightX + rightW - 54} cy={feedY + 27} r={3} fill="#40ff8b" />
      <text x={rightX + rightW - 38} y={feedY + 31} fontSize={10} fontWeight={900} fill="#40ff8b">LIVE</text>
      {feedItems.slice(0, 2).map((item, index) => <FeedRow key={`${item.player}-${item.time}`} item={item} x={rightX} y={feedY + 58 + index * 27} w={rightW} />)}
      <SelectionSummary x={rightX + 22} y={feedY + 116} w={rightW - 44} player={selectedPlayer} selectedGame={selectedGame?.name ?? selectedQuickGame.name} detail={detail} onOpen={() => onDetailOpen("player")} />
    </TechPanel>
  </g>;
}

function TopGameRow({ game, x, y, w, selected, onSelect }: { game: TopGame; x: number; y: number; w: number; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const lit = selected || hovered;
  return <g className="interactive-row" onClick={(event) => {
    event.stopPropagation();
    onSelect();
  }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onKeyDown={(event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  }} role="button" tabIndex={0} aria-label={`Select ${game.name}`}>
    {hovered && !selected && <rect x={x + 14} y={y - 23} width={w - 28} height={30} rx={5} fill="none" stroke={toneColor[game.tone]} strokeWidth={1.3} opacity={0.26} filter="url(#cyanGlow)" />}
    {lit && <rect x={x + 17} y={y - 20} width={w - 34} height={24} rx={4} fill={selected ? "rgba(123, 92, 255, 0.18)" : `${toneColor[game.tone]}18`} stroke={toneColor[game.tone]} strokeWidth={selected ? 0.8 : 0.7} />}
    <IconBadge x={x + 24} y={y - 16} icon={Trophy} tone={game.tone} size={24} rank={game.rank} />
    <GameGlyph x={x + 58} y={y - 15} tone={game.tone} />
    <text x={x + 86} y={y + 4} fontSize={12} fontWeight={850} fill="#ffffff">{game.name}</text>
    <text x={x + w - 92} y={y + 4} textAnchor="end" fontSize={12} fontWeight={850} fill="#ffffff">{game.matches}</text>
    <text x={x + w - 22} y={y + 4} textAnchor="end" fontSize={12} fontWeight={900} fill="#42ff83">{game.growth}</text>
    <path d={`M ${x + 26} ${y + 14} H ${x + w - 24}`} stroke="#123855" strokeWidth={0.6} />
    <path d={`M ${x + w - 76} ${y + 1} l 5 -6 l 5 6`} fill="none" stroke="#42ff83" strokeWidth={1.4} strokeLinecap="round" />
  </g>;
}

function SelectionSummary({ x, y, w, player, selectedGame, detail, onOpen }: { x: number; y: number; w: number; player: PlayerRow; selectedGame: string; detail: LeaderboardTabDetail; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = toneColor[player.tone];
  return <g className="interactive-panel" role="button" tabIndex={0} aria-label={`Open ${player.player} detail`} onClick={(event) => {
    event.stopPropagation();
    onOpen();
  }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onKeyDown={(event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    onOpen();
  }}>
    {hovered && <rect x={x - 4} y={y - 4} width={w + 8} height={66} rx={7} fill="none" stroke={color} strokeWidth={1.5} opacity={0.28} filter="url(#cyanGlow)" />}
    <rect x={x} y={y} width={w} height={58} rx={5} fill={hovered ? `${color}18` : "rgba(7, 22, 37, 0.9)"} stroke={color} strokeWidth={hovered ? 1.2 : 0.8} strokeOpacity={0.72} />
    <PlayerAvatarSlot cx={x + 21} cy={y + 19} r={13} tone={player.tone} />
    <text x={x + 44} y={y + 15} fontSize={9.5} fontWeight={900} fill="#8ddff2">SELECTED PLAYER</text>
    <text x={x + 44} y={y + 31} fontSize={12} fontWeight={950} fill="#ffffff">{player.player}</text>
    <text x={x + w - 14} y={y + 31} textAnchor="end" fontSize={12} fontWeight={950} fill={color}>{player.rating}</text>
    <text x={x + 44} y={y + 48} fontSize={9.5} fontWeight={800} fill="#9fb8cf">{detail.eyebrow} / {selectedGame}</text>
    <ChevronRight x={x + w - 28} y={y + 40} width={13} height={13} color={toneColor[detail.tone]} />
  </g>;
}

function DistributionChart({ x, y }: { x: number; y: number }) {
  const centerX = x;
  const centerY = y;
  const segments = [
    { start: -140, end: -74, color: "#ff5d72" },
    { start: -72, end: -26, color: "#9b5cff" },
    { start: -24, end: 42, color: "#42e8ff" },
    { start: 44, end: 126, color: "#4ed77c" },
    { start: 128, end: 218, color: "#f6c34a" },
  ];
  return <g>
    {segments.map((segment) => <DonutSegment key={`${segment.start}-${segment.end}`} cx={centerX} cy={centerY} rOuter={62} rInner={40} start={segment.start} end={segment.end} color={segment.color} />)}
    <circle cx={centerX} cy={centerY} r={37} fill="#061626" stroke="#7eeeff" strokeWidth={0.9} />
    <text x={centerX} y={centerY - 8} textAnchor="middle" fontSize={9} fontWeight={900} fill="#a9bed5">TOTAL PLAYERS</text>
    <text x={centerX} y={centerY + 18} textAnchor="middle" fontSize={21} fontWeight={950} fill="#ffffff">2.48M</text>
  </g>;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function DonutSegment({
  cx,
  cy,
  rOuter,
  rInner,
  start,
  end,
  color,
}: {
  cx: number;
  cy: number;
  rOuter: number;
  rInner: number;
  start: number;
  end: number;
  color: string;
}) {
  const outerStart = polar(cx, cy, rOuter, end);
  const outerEnd = polar(cx, cy, rOuter, start);
  const innerStart = polar(cx, cy, rInner, start);
  const innerEnd = polar(cx, cy, rInner, end);
  const largeArc = end - start <= 180 ? 0 : 1;
  const d = [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
  return <path d={d} fill={color} opacity={0.88} stroke="#07121f" strokeWidth={1} />;
}

function DistributionLegend({ x, y, w }: { x: number; y: number; w: number }) {
  const rows = [
    ["LEGEND", "0.1%", "#ff8d43"],
    ["GRANDMASTER", "0.6%", "#ff5d72"],
    ["MASTER", "3.8%", "#9b5cff"],
    ["DIAMOND", "15.2%", "#42e8ff"],
    ["PLATINUM", "26.1%", "#4ed77c"],
    ["GOLD", "28.7%", "#f6c34a"],
    ["SILVER", "17.1%", "#c7d7ee"],
    ["BRONZE", "8.4%", "#c68665"],
  ];
  return <g>
    {rows.map(([label, value, color], index) => <g key={label}>
      <rect x={x} y={y + index * 16} width={8} height={8} fill={color} />
      <text x={x + 16} y={y + 8 + index * 16} fontSize={9.5} fontWeight={850} fill="#d7eaff">{label}</text>
      <text x={x + w} y={y + 8 + index * 16} textAnchor="end" fontSize={9.5} fontWeight={850} fill="#ffffff">{value}</text>
    </g>)}
  </g>;
}

function FeedRow({ item, x, y, w }: { item: FeedItem; x: number; y: number; w: number }) {
  const color = toneColor[item.tone];
  return <g>
    <PlayerAvatarSlot cx={x + 30} cy={y + 3} r={12} tone={item.tone} />
    <text x={x + 56} y={y} fontSize={11} fontWeight={850} fill="#ffffff">{item.player}</text>
    <text x={x + 142} y={y} fontSize={10.5} fontWeight={750} fill="#9db4ca">{item.action}</text>
    <text x={x + w - 24} y={y} textAnchor="end" fontSize={10} fontWeight={750} fill="#8da3b8">{item.time}</text>
    <path d={`M ${x + 56} ${y + 12} H ${x + w - 24}`} stroke={color} strokeWidth={0.65} opacity={0.3} />
  </g>;
}

function QuickAccessRail({
  selectedGameId,
  onGameSelect,
}: {
  selectedGameId: string;
  onGameSelect: (gameId: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const { bottomH, bottomY, canvasW, outerPad } = GLOBAL_GRID;
  const railButtonW = 34;
  const gap = 12;
  const cardW = (canvasW - outerPad * 2 - railButtonW * 2 - gap * (quickGames.length + 1)) / quickGames.length;
  const shiftRail = (direction: number) => {
    setOffset((current) => (current + direction + quickGames.length) % quickGames.length);
  };
  const handleWheel = (event: WheelEvent<SVGGElement>) => {
    event.preventDefault();
    const direction = event.deltaY + event.deltaX > 0 ? 1 : -1;
    shiftRail(direction);
  };
  const handleMouseDown = (event: MouseEvent<SVGGElement>) => {
    setDragStartX(event.clientX);
  };
  const handleMouseMove = (event: MouseEvent<SVGGElement>) => {
    if (dragStartX === null) return;
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) < 44) return;
    shiftRail(delta < 0 ? 1 : -1);
    setDragStartX(event.clientX);
  };
  const orderedGames = quickGames.map((_, index) => quickGames[(index + offset) % quickGames.length]);
  return <g>
    <SurfaceButton x={outerPad} y={bottomY + 22} w={railButtonW} h={32} tone="cyan" label="" onClick={() => shiftRail(-1)} ariaLabel="Previous quick leaderboard" />
    <ChevronLeft x={outerPad + 8} y={bottomY + 29} width={18} height={18} color="#dff8ff" />
    <g onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setDragStartX(null)} onMouseLeave={() => setDragStartX(null)}>
      {orderedGames.map((game, index) => {
        const x = outerPad + railButtonW + gap + index * (cardW + gap);
      return <QuickAccessCard key={game.name} game={game} x={x} y={bottomY} w={cardW} h={bottomH} selected={game.id === selectedGameId} onSelect={() => onGameSelect(game.id)} />;
      })}
    </g>
    <SurfaceButton x={canvasW - outerPad - railButtonW} y={bottomY + 22} w={railButtonW} h={32} tone="cyan" label="" onClick={() => shiftRail(1)} ariaLabel="Next quick leaderboard" />
    <ChevronRight x={canvasW - outerPad - railButtonW + 8} y={bottomY + 29} width={18} height={18} color="#dff8ff" />
  </g>;
}

function QuickAccessCard({ game, x, y, w, h, selected, onSelect }: { game: QuickGame; x: number; y: number; w: number; h: number; selected: boolean; onSelect: () => void }) {
  const titleSize = game.name.length > 13 ? 10.6 : game.name.length > 11 ? 11.5 : 14;
  return <TechPanel x={x} y={y} w={w} h={h} tone={game.tone} selected={selected} className="interactive-panel" onClick={onSelect} ariaLabel={`Open ${game.name}`}>
    <GameArtSlot x={x + 18} y={y + 18} size={40} tone={game.tone} label={game.id === "quick-access" ? "HUB ART" : "GAME ART"} />
    <text x={x + 66} y={y + 34} fontSize={titleSize} fontWeight={950} fill="#ffffff">{game.name}</text>
    <text x={x + 66} y={y + 56} fontSize={9.5} fontWeight={700} fill="#b5cde3">{game.detail}</text>
    {game.name === "ALL GAMES" && <ChevronRight x={x + w - 31} y={y + 29} width={20} height={20} color="#42e8ff" />}
  </TechPanel>;
}

function Background() {
  return <g>
    <rect x={0} y={0} width={1536} height={864} fill="#030712" />
    <rect x={0} y={0} width={1536} height={864} fill="url(#bgRadial)" />
  </g>;
}

function Defs() {
  return <defs>
    <filter id="cyanGlow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation={3.5} result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="goldGlow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation={4.2} result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="softBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation={44} />
    </filter>
    <linearGradient id="panelFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#09243a" stopOpacity={0.92} />
      <stop offset="58%" stopColor="#061521" stopOpacity={0.95} />
      <stop offset="100%" stopColor="#030911" stopOpacity={0.98} />
    </linearGradient>
    <linearGradient id="panelSelected" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#273184" stopOpacity={0.95} />
      <stop offset="52%" stopColor="#0b1c3e" stopOpacity={0.96} />
      <stop offset="100%" stopColor="#061525" stopOpacity={0.98} />
    </linearGradient>
    <linearGradient id="goldPanel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#5b3d0b" stopOpacity={0.96} />
      <stop offset="58%" stopColor="#231808" stopOpacity={0.97} />
      <stop offset="100%" stopColor="#0b0c12" stopOpacity={0.98} />
    </linearGradient>
    <linearGradient id="headerFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#0a2238" />
      <stop offset="48%" stopColor="#061120" />
      <stop offset="100%" stopColor="#0d2742" />
    </linearGradient>
    <linearGradient id="navActive" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#7b5cff" />
      <stop offset="45%" stopColor="#132c63" />
      <stop offset="100%" stopColor="#08324c" />
    </linearGradient>
    <linearGradient id="avatarFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#142a47" />
      <stop offset="50%" stopColor="#080f1c" />
      <stop offset="100%" stopColor="#14092c" />
    </linearGradient>
    <radialGradient id="bgRadial" cx="50%" cy="18%" r="80%">
      <stop offset="0%" stopColor="#082b47" stopOpacity={0.65} />
      <stop offset="50%" stopColor="#051121" stopOpacity={0.62} />
      <stop offset="100%" stopColor="#02050b" stopOpacity={1} />
    </radialGradient>
  </defs>;
}

export function OcentraGlobalLeaderboardMock() {
  const [activeTab, setActiveTab] = useState<LeaderboardTabId>("overall");
  const [selectedPlayerId, setSelectedPlayerId] = useState(playerRows[0].id);
  const [selectedGameId, setSelectedGameId] = useState(topGames[0].id);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailMode, setDetailMode] = useState<LeaderboardDetailMode | null>(null);
  const selectedPlayer = useMemo(
    () => playerRows.find((player) => player.id === selectedPlayerId) ?? playerRows[0],
    [selectedPlayerId],
  );
  const selectedGameName = useMemo(
    () => topGames.find((game) => game.id === selectedGameId)?.name ?? quickGames.find((game) => game.id === selectedGameId)?.name ?? quickGames[0].name,
    [selectedGameId],
  );
  const changeTab = (tab: LeaderboardTabId) => {
    setActiveTab(tab);
    setDetailMode(null);
    setPage(1);
  };
  const selectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setDetailMode(null);
  };
  const selectGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveTab("perGame");
    setDetailMode(null);
    setPage(1);
  };
  const cycleRowsPerPage = () => {
    setRowsPerPage((current) => current === 10 ? 25 : current === 25 ? 50 : 10);
  };

  return <div className="leaderboard-page svg-route">
    <div className="preview-stage">
      <svg className="leaderboard-svg" viewBox="0 0 1536 864" role="img" aria-label="Ocentra global leaderboard dashboard mock">
        <Defs />
        <Background />
        <NavPanel activeTab={activeTab} onTabChange={changeTab} />
        <MainBoard activeTab={activeTab} selectedPlayerId={selectedPlayerId} selectedPlayer={selectedPlayer} selectedGameName={selectedGameName} page={page} rowsPerPage={rowsPerPage} detailMode={detailMode} onTabChange={changeTab} onPlayerSelect={selectPlayer} onPageChange={setPage} onRowsPerPageChange={cycleRowsPerPage} onDetailOpen={setDetailMode} onDetailClose={() => setDetailMode(null)} />
        <RightRail activeTab={activeTab} selectedPlayer={selectedPlayer} selectedGameId={selectedGameId} onTabChange={changeTab} onGameSelect={selectGame} onDetailOpen={setDetailMode} />
        <QuickAccessRail selectedGameId={selectedGameId} onGameSelect={selectGame} />
      </svg>
    </div>
  </div>;
}

function CardFan({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const card = (dx: number, dy: number, angle: number, label: string) => <g transform={`translate(${x + dx * scale} ${y + dy * scale}) rotate(${angle}) scale(${scale})`}>
    <rect x={-22} y={-34} width={44} height={68} rx={5} fill="#f3f7ff" stroke="#152339" strokeWidth={1.2} />
    <text x={-13} y={-13} fontSize={15} fontWeight={950} fill="#061426">{label}</text>
    <path d="M 0 7 C 9 15 9 24 0 31 C -9 24 -9 15 0 7 Z" fill="#0a1220" />
  </g>;
  return <g>
    {card(-34, 8, -17, "J")}
    {card(-10, -2, -7, "Q")}
    {card(14, -4, 8, "A")}
    {card(38, 8, 20, "K")}
    <path d={hexPath(x + 4 * scale, y + 38 * scale, 35 * scale)} fill="#101623" stroke="#f6c34a" strokeWidth={2} filter="url(#goldGlow)" />
    <path d={`M ${x + 4 * scale} ${y + 19 * scale} C ${x + 23 * scale} ${y + 35 * scale} ${x + 23 * scale} ${y + 54 * scale} ${x + 4 * scale} ${y + 68 * scale} C ${x - 15 * scale} ${y + 54 * scale} ${x - 15 * scale} ${y + 35 * scale} ${x + 4 * scale} ${y + 19 * scale} Z`} fill="#f6c34a" />
  </g>;
}

function GameHeader() {
  return <g>
    <path d="M 292 30 H 1244 L 1284 86 L 1244 198 H 292 L 252 86 Z" fill="url(#headerFill)" stroke="#8eefff" strokeWidth={1.2} />
    <path d="M 330 44 H 575 M 958 44 H 1206 M 410 190 H 1128" stroke="#7cecff" strokeWidth={1.1} opacity={0.45} />
    <text x={768} y={45} textAnchor="middle" fontSize={15} fontWeight={900} fill="#b5edff">OCENTRA GAMES</text>
    <CardFan x={394} y={95} scale={0.95} />
    <text x={768} y={125} textAnchor="middle" fontSize={57} fontWeight={950} fill="#ffffff" stroke="#08111f" strokeWidth={2.4} paintOrder="stroke fill">THREE CARD BRAG</text>
    <text x={768} y={167} textAnchor="middle" fontSize={27} fontWeight={950} fill="#ffd86a">RANKED SEASON</text>
    <TechPanel x={1057} y={58} w={198} h={103} tone="cyan">
      <Crown x={1080} y={78} width={28} height={28} color="#ffd86a" />
      <text x={1120} y={100} fontSize={20} fontWeight={950} fill="#ffffff">SEASON 12</text>
      <text x={1156} y={130} textAnchor="middle" fontSize={12} fontWeight={800} fill="#c6d6ea">ENDS IN</text>
      <text x={1156} y={154} textAnchor="middle" fontSize={18} fontWeight={950} fill="#4cf5ff">12D : 04H : 32M</text>
    </TechPanel>
    <GameFilterBar />
  </g>;
}

function GameFilterBar() {
  const filters = [
    ["GAME MODE", "RANKED"],
    ["TIME FILTER", "SEASON"],
    ["REGION", "GLOBAL"],
  ];
  return <g>
    {filters.map(([label, value], index) => {
      const x = 414 + index * 230;
      return <g key={label}>
        <text x={x} y={221} fontSize={11} fontWeight={800} fill="#a9bdd4">{label}</text>
        <TechPanel x={x + 78} y={200} w={132} h={30} tone="cyan">
          <text x={x + 92} y={220} fontSize={12} fontWeight={900} fill="#ffffff">{value}</text>
          <ChevronRight x={x + 184} y={207} width={14} height={14} color="#d8f8ff" />
        </TechPanel>
      </g>;
    })}
    <TechPanel x={1084} y={200} w={36} h={30} tone="cyan">
      <Activity x={1093} y={207} width={18} height={18} color="#d8f8ff" />
    </TechPanel>
  </g>;
}

function GameStandingRail() {
  return <g>
    <TechPanel x={31} y={183} w={252} h={464} tone="cyan">
      <text x={103} y={218} fontSize={15} fontWeight={900} fill="#ffffff">YOUR STANDING</text>
      <AvatarRing cx={157} cy={304} r={55} tone="cyan" />
      <text x={157} y={382} textAnchor="middle" fontSize={26} fontWeight={950} fill="#ffd55f">#78</text>
      <Shield x={58} y={423} width={31} height={31} color="#47eaff" strokeWidth={2.2} />
      <text x={99} y={424} fontSize={10} fontWeight={900} fill="#a9bdd4">RATING</text>
      <text x={99} y={452} fontSize={22} fontWeight={950} fill="#dffbff">2,456</text>
      <text x={60} y={486} fontSize={10} fontWeight={900} fill="#a9bdd4">WIN RATE</text>
      <text x={60} y={515} fontSize={24} fontWeight={950} fill="#46f7ff">61.3%</text>
      <text x={194} y={486} fontSize={10} fontWeight={900} fill="#a9bdd4">WIN STREAK</text>
      <text x={194} y={515} fontSize={24} fontWeight={950} fill="#ffb949">7</text>
      <Medal x={82} y={542} width={36} height={36} color="#6aeaff" />
      <text x={125} y={566} fontSize={14} fontWeight={950} fill="#62f7ff">DIAMOND III</text>
      <text x={58} y={594} fontSize={11} fontWeight={900} fill="#c8d9e9">PROGRESS TO DIAMOND II</text>
      <rect x={58} y={610} width={164} height={14} rx={3} fill="#0e2233" stroke="#235a77" />
      <rect x={58} y={610} width={103} height={14} rx={3} fill="#38e9ff" />
      <text x={236} y={623} fontSize={13} fontWeight={900} fill="#ffffff">62%</text>
      <text x={102} y={641} fontSize={10} fontWeight={800} fill="#c8d9e9">NEXT RANK AT 2,600</text>
    </TechPanel>
    <TechPanel x={31} y={664} w={252} h={118} tone="cyan">
      <text x={100} y={691} fontSize={13} fontWeight={900} fill="#ffffff">NEARBY PLAYERS</text>
      {[
        ["#76", "AceMaster99", "2,512", "+"],
        ["#77", "NeonRider", "2,489", "-"],
        ["#78", "You", "2,456", "+"],
      ].map((row, index) => <g key={row.join("-")}>
        <rect x={44} y={703 + index * 25} width={226} height={22} rx={5} fill={row[1] === "You" ? "#0b3360" : "transparent"} stroke={row[1] === "You" ? "#4eefff" : "transparent"} />
        <text x={58} y={718 + index * 25} fontSize={12} fontWeight={850} fill="#ffffff">{row[0]}</text>
        <text x={100} y={718 + index * 25} fontSize={12} fontWeight={850} fill="#ffffff">{row[1]}</text>
        <text x={218} y={718 + index * 25} textAnchor="end" fontSize={12} fontWeight={850} fill="#baf6ff">{row[2]}</text>
        <text x={258} y={718 + index * 25} textAnchor="middle" fontSize={12} fontWeight={950} fill={row[3] === "+" ? "#58ff9a" : "#ff5065"}>{row[3]}</text>
      </g>)}
    </TechPanel>
  </g>;
}

function GameCenterBoard() {
  return <g>
    <TechPanel x={310} y={254} w={908} h={518} tone="cyan">
      <GoldenPodiumEmbed x={333} y={278} w={265} h={130} rank="2" name="RoyalFlush21" statName="Rating" statValue="3,245" tone="silver" />
      <GoldenPodiumEmbed x={612} y={255} w={320} h={153} rank="1" name="AceMaster99" statName="Rating" statValue="3,780" tone="gold" />
      <GoldenPodiumEmbed x={945} y={278} w={245} h={130} rank="3" name="BluffKing" statName="Rating" statValue="3,012" tone="bronze" />
      <GameLeaderboardTable />
      <GamePagination />
    </TechPanel>
  </g>;
}

function GameLeaderboardTable() {
  const columns = [
    ["RANK", 344],
    ["PLAYER", 438],
    ["RATING", 628],
    ["WINS", 738],
    ["LOSSES", 823],
    ["WIN RATE", 925],
    ["STREAK", 1010],
    ["TIER", 1064],
    ["MOV.", 1170],
  ];
  return <g>
    <path d={cutRectPath(323, 426, 876, 42, 9)} fill="#061626" stroke="#1a7ca7" strokeWidth={0.9} />
    {columns.map(([label, x]) => <text key={label} x={Number(x)} y={453} fontSize={10.5} fontWeight={900} fill="#bcd3e7">{label}</text>)}
    {gameRows.map((row, index) => <GameTableRow key={row.rank} row={row} y={469 + index * 40} />)}
  </g>;
}

function GameTableRow({ row, y }: { row: GameRow; y: number }) {
  const isUp = row.movement.startsWith("+");
  const isDown = row.movement.startsWith("-");
  return <g>
    <rect x={323} y={y} width={876} height={36} rx={4} fill={row.rank % 2 === 0 ? "#071a2b" : "#051422"} stroke="#123f62" strokeWidth={0.8} />
    <text x={357} y={y + 24} textAnchor="middle" fontSize={14} fontWeight={850} fill="#ffffff">{row.rank}</text>
    <AvatarRing cx={418} cy={y + 18} r={17} tone={row.tone} />
    <text x={446} y={y + 24} fontSize={14} fontWeight={850} fill="#ffffff">{row.player}</text>
    <text x={632} y={y + 24} fontSize={14} fontWeight={850} fill="#ffffff">{row.rating}</text>
    <text x={742} y={y + 24} fontSize={14} fontWeight={760} fill="#e5f7ff">{row.wins}</text>
    <text x={827} y={y + 24} fontSize={14} fontWeight={760} fill="#e5f7ff">{row.losses}</text>
    <text x={928} y={y + 24} fontSize={14} fontWeight={760} fill="#e5f7ff">{row.winRate}</text>
    <text x={1014} y={y + 24} fontSize={14} fontWeight={760} fill="#e5f7ff">{row.streak}</text>
    <text x={1064} y={y + 24} fontSize={12} fontWeight={850} fill="#bff5ff">{row.tier}</text>
    <text x={1175} y={y + 24} textAnchor="middle" fontSize={14} fontWeight={950} fill={isUp ? "#58ff9a" : isDown ? "#ff5065" : "#ffffff"}>{row.movement}</text>
  </g>;
}

function GamePagination() {
  return <g>
    <TechPanel x={524} y={744} w={36} h={30} tone="cyan"><ChevronLeft x={533} y={750} width={18} height={18} color="#dff8ff" /></TechPanel>
    {[1, 2, 3, 4, 5].map((page, index) => <TechPanel key={page} x={575 + index * 50} y={744} w={40} h={30} tone={page === 1 ? "purple" : "cyan"} selected={page === 1}>
      <text x={595 + index * 50} y={765} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff">{page}</text>
    </TechPanel>)}
    <text x={835} y={764} textAnchor="middle" fontSize={15} fontWeight={900} fill="#8da9bf">...</text>
    <TechPanel x={874} y={744} w={42} h={30} tone="cyan"><text x={895} y={765} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff">10</text></TechPanel>
    <TechPanel x={930} y={744} w={36} h={30} tone="cyan"><ChevronRight x={939} y={750} width={18} height={18} color="#dff8ff" /></TechPanel>
    <text x={1046} y={764} fontSize={12} fontWeight={800} fill="#d7efff">SHOW</text>
    <TechPanel x={1098} y={743} w={58} h={32} tone="cyan"><text x={1121} y={764} textAnchor="middle" fontSize={13} fontWeight={900} fill="#ffffff">10</text></TechPanel>
  </g>;
}

function GameRightRail() {
  return <g>
    <TechPanel x={1232} y={184} w={270} h={190} tone="gold">
      <text x={1292} y={217} fontSize={15} fontWeight={950} fill="#ffdc69">SEASON CHAMPIONS</text>
      {[
        ["1", "AceMaster99", "3,780", "gold"],
        ["2", "RoyalFlush21", "3,245", "cyan"],
        ["3", "BluffKing", "3,012", "red"],
      ].map(([rank, name, rating, tone], index) => <g key={name}>
        <IconBadge x={1253} y={236 + index * 48} icon={Trophy} tone={tone as Tone} size={31} rank={Number(rank)} />
        <AvatarRing cx={1307} cy={251 + index * 48} r={17} tone={tone as Tone} />
        <text x={1333} y={257 + index * 48} fontSize={13} fontWeight={850} fill="#ffffff">{name}</text>
        <text x={1468} y={257 + index * 48} textAnchor="end" fontSize={13} fontWeight={950} fill="#ffdc69">{rating}</text>
      </g>)}
    </TechPanel>
    <TechPanel x={1232} y={388} w={270} h={168} tone="purple">
      <text x={1290} y={421} fontSize={15} fontWeight={950} fill="#ffffff">AI RIVAL OF THE WEEK</text>
      <AvatarRing cx={1294} cy={482} r={42} tone="purple" />
      <text x={1352} y={478} fontSize={12} fontWeight={950} fill="#ffffff">OCENTRA-AI v4</text>
      <rect x={1444} y={465} width={38} height={16} rx={5} fill="#1f0b43" stroke="#9b5cff" strokeWidth={0.8} />
      <text x={1463} y={477} textAnchor="middle" fontSize={8.5} fontWeight={900} fill="#ffffff">ELITE</text>
      <text x={1352} y={505} fontSize={10} fontWeight={800} fill="#a9bdd4">RATING</text>
      <text x={1418} y={505} fontSize={10} fontWeight={800} fill="#a9bdd4">WIN RATE</text>
      <text x={1352} y={529} fontSize={18} fontWeight={950} fill="#ffd86a">2,890</text>
      <text x={1420} y={529} fontSize={18} fontWeight={950} fill="#52f5ff">68.4%</text>
    </TechPanel>
    <TechPanel x={1232} y={570} w={270} h={202} tone="cyan">
      <text x={1290} y={603} fontSize={15} fontWeight={950} fill="#ffdc69">GAME STATS</text>
      {[
        ["TOTAL PLAYERS", "24,682", Users, "purple"],
        ["TOTAL MATCHES", "1.28M", Trophy, "purple"],
        ["ACTIVE PLAYERS", "7,891", Users, "purple"],
        ["HIGHEST STREAK", "23", Activity, "gold"],
        ["AVG MATCH TIME", "04:32", CalendarDays, "cyan"],
        ["AVG WIN RATE", "58.7%", Shield, "cyan"],
      ].map(([label, value, Icon, tone], index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 1260 + col * 124;
        const y = 632 + row * 45;
        const TypedIcon = Icon as IconComponent;
        return <g key={String(label)}>
          <TypedIcon x={x} y={y - 12} width={24} height={24} color={toneColor[tone as Tone]} strokeWidth={2.1} />
          <text x={x + 30} y={y - 2} fontSize={8.8} fontWeight={900} fill="#a9bdd4">{label as string}</text>
          <text x={x + 30} y={y + 21} fontSize={17} fontWeight={950} fill={tone === "gold" ? "#ffd86a" : "#52f5ff"}>{value as string}</text>
        </g>;
      })}
    </TechPanel>
  </g>;
}

function GameBottomTabs() {
  const tabs = [
    ["PLAYERS", Users, "cyan"],
    ["FRIENDS", Users, "muted"],
    ["AI MODELS", Bot, "muted"],
    ["WEEKLY", CalendarDays, "muted"],
    ["SEASON", Trophy, "muted"],
  ];
  return <g>
    {tabs.map(([label, Icon, tone], index) => {
      const x = 33 + index * 214;
      const TypedIcon = Icon as IconComponent;
      return <TechPanel key={label as string} x={x} y={789} w={205} h={64} tone={tone as Tone} selected={index === 0}>
        <TypedIcon x={x + 42} y={yForTabIcon()} width={29} height={29} color={toneColor[tone as Tone]} strokeWidth={2.2} />
        <text x={x + 92} y={827} fontSize={18} fontWeight={950} fill="#e8f9ff">{label as string}</text>
      </TechPanel>;
    })}
    <TechPanel x={1108} y={789} w={395} h={64} tone="purple" selected>
      <CardFan x={1161} y={808} scale={0.36} />
      <text x={1210} y={818} fontSize={18} fontWeight={950} fill="#ffffff">JOIN RANKED TABLE</text>
      <text x={1210} y={840} fontSize={12} fontWeight={800} fill="#d9d4ff">Compete - Climb - Conquer</text>
      <ChevronRight x={1460} y={808} width={31} height={31} color="#ffffff" strokeWidth={2.4} />
    </TechPanel>
  </g>;
}

function yForTabIcon() {
  return 806;
}

export function OcentraGameLeaderboardMock() {
  return <div className="leaderboard-page svg-route">
    <div className="preview-stage">
      <svg className="leaderboard-svg" viewBox="0 0 1536 864" role="img" aria-label="Ocentra Three Card Brag game leaderboard mock">
        <Defs />
        <Background />
        <GameHeader />
        <GameStandingRail />
        <GameCenterBoard />
        <GameRightRail />
        <GameBottomTabs />
      </svg>
    </div>
  </div>;
}
