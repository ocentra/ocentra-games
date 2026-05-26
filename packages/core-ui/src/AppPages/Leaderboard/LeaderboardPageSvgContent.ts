import {
  LeaderboardPageContentDataSchema,
  type LeaderboardContentRow,
  type LeaderboardGameOption,
  type LeaderboardIconName,
  type LeaderboardModeContent,
  type LeaderboardNavItem,
  type LeaderboardPageContentData,
  type LeaderboardPageMode,
  type LeaderboardQuickGame,
  type LeaderboardSeason,
  type LeaderboardTab,
  type LeaderboardTabDetail,
  type LeaderboardTabId,
  type LeaderboardTone,
  type PartialLeaderboardPageContentData,
} from '@ocentra/game-asset-domain/schemas/leaderboard-page-content-schema';

export type {
  LeaderboardContentRow,
  LeaderboardGameOption,
  LeaderboardIconName,
  LeaderboardModeContent,
  LeaderboardNavItem,
  LeaderboardPageContentData,
  LeaderboardPageMode,
  LeaderboardQuickGame,
  LeaderboardSeason,
  LeaderboardTab,
  LeaderboardTabDetail,
  LeaderboardTabId,
  LeaderboardTone,
  PartialLeaderboardPageContentData,
};

export const LEADERBOARD_GAME_ACTIVITY_UNAVAILABLE_LABEL = 'ACTIVITY UNAVAILABLE';

export const DEFAULT_LEADERBOARD_PAGE_CONTENT: LeaderboardPageContentData = {
  tabs: [
    { id: 'overall', label: 'OVERALL PLAYERS', title: 'GLOBAL PLAYER RANKING' },
    { id: 'perGame', label: 'PER GAME', title: 'PER-GAME LEADERBOARD' },
    { id: 'aiBenchmarks', label: 'AI OVERALL', title: 'AI MODEL STANDINGS' },
    { id: 'tournaments', label: 'TOURNAMENTS', title: 'TOURNAMENT LEADERS' },
    { id: 'friends', label: 'FRIENDS', title: 'FRIEND CIRCLE LADDER' },
  ],
  navItems: [
    { label: 'OVERVIEW', detail: 'Ranked play snapshot', icon: 'home', tabId: 'overall' },
    { label: 'OVERALL PLAYERS', detail: 'All-game player ladder', icon: 'shield', tabId: 'overall' },
    { label: 'GAME LEADERS', detail: 'Selected game players', icon: 'gamepad', tabId: 'perGame' },
    { label: 'CATEGORY LEADERS', detail: 'Category and subcategory ladders', icon: 'grid', tabId: 'perGame' },
    { label: 'AI OVERALL', detail: 'All-game model ladder', icon: 'bot', tabId: 'aiBenchmarks' },
    { label: 'AI BY GAME', detail: 'Per-game models', icon: 'activity', tabId: 'aiBenchmarks' },
    { label: 'AI BY CATEGORY', detail: 'Category model ladder', icon: 'bot', tabId: 'aiBenchmarks' },
    { label: 'TOURNAMENT LEADERS', detail: 'Events and brackets', icon: 'trophy', tabId: 'tournaments' },
    { label: 'FRIENDS', detail: 'Friend-circle rank', icon: 'users', tabId: 'friends' },
  ],
  tabDetails: {
    overall: {
      eyebrow: 'Global leaderboard',
      title: 'Overall ranking',
      summary: 'All ranked players across supported card games.',
      primary: 'Overall ladder',
      secondary: 'Ranked score, wins, and movement',
      action: 'Open profile',
      tone: 'cyan',
    },
    perGame: {
      eyebrow: 'Game drilldown',
      title: 'Per-game ranking',
      summary: 'Game tiles and quick access cards load the board for the selected game type.',
      primary: 'Game scope',
      secondary: 'Per-game rows and nearby context',
      action: 'Open game',
      tone: 'purple',
    },
    aiBenchmarks: {
      eyebrow: 'AI benchmark',
      title: 'Model standings',
      summary: 'AI-vs-AI benchmark rows track model score, run volume, and game coverage.',
      primary: 'Benchmark set',
      secondary: 'Provider and model scores',
      action: 'Open model',
      tone: 'red',
    },
    tournaments: {
      eyebrow: 'Tournament track',
      title: 'Season brackets',
      summary: 'Live events, bracket progress, prize paths, and registration status.',
      primary: 'Events',
      secondary: 'Published events and bracket routes',
      action: 'Open events',
      tone: 'gold',
    },
    friends: {
      eyebrow: 'Social rank',
      title: 'Friends ladder',
      summary: 'Friend, guild, and creator standings with nearby player context.',
      primary: 'Social scope',
      secondary: 'Friends and guild movement',
      action: 'Open social',
      tone: 'cyan',
    },
  },
  topGames: [],
  quickGames: [],
  fallbackRows: [],
  aiBenchmarkRows: [],
  distributionLabels: [],
  season: {
    label: 'CURRENT',
    title: 'NO ACTIVE SEASON',
    dateRange: 'SCHEDULE PENDING',
    actionLabel: 'TOURNAMENTS',
    detailTitle: 'NO ACTIVE SEASON',
    detailSubtitle: 'Rewards pending.',
    stats: [
      { label: 'STATUS', value: 'UNPUBLISHED' },
      { label: 'PRIZE POOL', value: 'NOT PUBLISHED' },
      { label: 'CLAIMED', value: 'N/A' },
    ],
  },
  metricLabels: {
    totalPlayers: 'TOTAL PLAYERS',
    totalGames: 'TOTAL GAMES',
    rankedWins: 'RANKED WINS',
    nearbyPlayers: 'NEARBY PLAYERS',
    season: 'SEASON',
    updated: 'UPDATED',
  },
  uiCopy: {
    hubTitle: 'LEADERBOARD HUB',
    topGamesTitle: 'MOST PLAYED GAMES',
    distributionTitle: 'GLOBAL RATING DISTRIBUTION',
    distributionCenterLabel: 'RANKED ROWS',
    feedTitle: 'RECENT RANK MOVEMENT',
    liveLabel: 'LIVE',
    viewAllLabel: 'VIEW ALL',
    refreshLabel: 'REFRESH',
    queueLabel: 'QUEUE',
    showLabel: 'SHOW',
    pageLabel: 'PAGE',
    selectedPlayerLabel: 'TRACKED ENTRY',
    detailSnapshotTitle: 'PERFORMANCE SNAPSHOT',
    detailSnapshotLines: [
      'Recent ranked matches, overtakes, new leaders, tournament placements, and AI benchmark deltas are grouped here for review.',
      'Avatar, crest, badge, and season media positions are reserved for official leaderboard artwork.',
    ],
    loadingTitle: 'LOADING LEADERBOARD',
    loadingBody: 'Refreshing ranked standings.',
    errorTitle: 'LEADERBOARD UNAVAILABLE',
  },
  modes: {
    leaderboard: {
      defaultTab: 'overall',
      selectedGameId: '',
      title: 'Leaderboard',
      routeLabel: '/leaderboard',
      rowSource: 'api',
    },
    gameLeaderboard: {
      defaultTab: 'perGame',
      selectedGameId: '',
      title: 'Game Leaderboard',
      routeLabel: '/leaderboard',
      rowSource: 'api',
    },
    aiBenchmarkLeaderboard: {
      defaultTab: 'aiBenchmarks',
      selectedGameId: 'ai-benchmarks',
      title: 'AI Benchmark Leaderboard',
      routeLabel: '/leaderboard',
      rowSource: 'api',
    },
  },
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function cloneContent(content: LeaderboardPageContentData): LeaderboardPageContentData {
  return JSON.parse(JSON.stringify(content)) as LeaderboardPageContentData;
}

function mergeKnownValue<T>(fallback: T, source: unknown): T {
  if (Array.isArray(fallback)) {
    return Array.isArray(source) ? source as T : fallback;
  }
  if (fallback && typeof fallback === 'object') {
    const fallbackRecord = fallback as JsonRecord;
    const sourceRecord = asRecord(source);
    const merged: JsonRecord = { ...fallbackRecord };
    for (const [key, value] of Object.entries(fallbackRecord)) {
      merged[key] = mergeKnownValue(value, sourceRecord[key]);
    }
    return merged as T;
  }
  return typeof source === typeof fallback ? source as T : fallback;
}

export function normalizeLeaderboardPageContent(
  content?: PartialLeaderboardPageContentData | null,
): LeaderboardPageContentData {
  const merged = mergeKnownValue(cloneContent(DEFAULT_LEADERBOARD_PAGE_CONTENT), content);
  return LeaderboardPageContentDataSchema.parse(merged);
}

export function parseLeaderboardPageContent(content: unknown): LeaderboardPageContentData {
  return LeaderboardPageContentDataSchema.parse(content);
}

function normalizeId(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

export function resolveLeaderboardPageGameType(
  content: PartialLeaderboardPageContentData | LeaderboardPageContentData | null | undefined,
  pageMode: LeaderboardPageMode,
  gameId?: string,
): number | undefined {
  const normalizedContent = normalizeLeaderboardPageContent(content);
  const routeId = normalizeId(gameId);
  const modeGameId = normalizeId(normalizedContent.modes[pageMode].selectedGameId);
  const candidates = [...normalizedContent.topGames, ...normalizedContent.quickGames];
  const selected = candidates.find(game => normalizeId(game.id) === routeId)
    ?? candidates.find(game => normalizeId(game.id) === modeGameId)
    ?? candidates.find(game => typeof game.gameType === 'number');
  return typeof selected?.gameType === 'number' ? selected.gameType : undefined;
}
