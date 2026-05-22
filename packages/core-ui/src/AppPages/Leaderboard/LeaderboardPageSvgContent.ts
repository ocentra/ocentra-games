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
    { label: 'CATEGORY LEADERS', detail: 'Overall by category', icon: 'grid', tabId: 'perGame' },
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
      primary: 'Live ladder',
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
      primary: 'Season 12',
      secondary: 'Events and bracket routes',
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
  topGames: [
    { id: 'three-card-brag', rank: 1, name: 'Three Card Brag', matches: '894K', growth: '+18.2%', tone: 'gold', category: 'Vying', subcategory: 'Comparing / Three-card', gameType: 1, routePath: '/games/three-card-brag/leaderboard' },
    { id: 'spades', rank: 2, name: 'Spades', matches: '612K', growth: '+11.3%', tone: 'cyan', category: 'Trick-taking', subcategory: 'Point-trick / Bidding', gameType: 3, routePath: '/games/spades/leaderboard' },
    { id: 'poker', rank: 3, name: 'Poker', matches: '538K', growth: '+9.7%', tone: 'red', category: 'Poker', subcategory: 'Vying / Betting', gameType: 4, routePath: '/games/poker/leaderboard' },
    { id: 'rummy', rank: 4, name: 'Rummy', matches: '456K', growth: '+7.8%', tone: 'purple', category: 'Rummy', subcategory: 'Matching / Sets and runs', gameType: 5, routePath: '/games/rummy/leaderboard' },
    { id: 'blackjack', rank: 5, name: 'Blackjack', matches: '312K', growth: '+5.4%', tone: 'muted', category: 'Banking', subcategory: 'Casino / Hand total', gameType: 6, routePath: '/games/blackjack/leaderboard' },
  ],
  quickGames: [
    { id: 'three-card-brag', name: 'THREE CARD BRAG', detail: 'Vying ladder', icon: 'crown', tone: 'gold', category: 'Vying', subcategory: 'Comparing / Three-card', gameType: 1, routePath: '/games/three-card-brag/leaderboard' },
    { id: 'spades', name: 'SPADES', detail: 'Trick-taking ladder', icon: 'shield', tone: 'purple', category: 'Trick-taking', subcategory: 'Point-trick / Bidding', gameType: 3, routePath: '/games/spades/leaderboard' },
    { id: 'poker', name: 'POKER', detail: 'Poker ladder', icon: 'circle', tone: 'red', category: 'Poker', subcategory: 'Vying / Betting', gameType: 4, routePath: '/games/poker/leaderboard' },
    { id: 'rummy', name: 'RUMMY', detail: 'Rummy ladder', icon: 'swords', tone: 'cyan', category: 'Rummy', subcategory: 'Matching / Sets and runs', gameType: 5, routePath: '/games/rummy/leaderboard' },
    { id: 'blackjack', name: 'BLACKJACK', detail: 'Banking ladder', icon: 'shield', tone: 'muted', category: 'Banking', subcategory: 'Casino / Hand total', gameType: 6, routePath: '/games/blackjack/leaderboard' },
    { id: 'teen-patti', name: 'TEEN PATTI', detail: 'Vying ladder', icon: 'circle', tone: 'red', category: 'Vying', subcategory: 'Comparing / Three-card', gameType: 7, routePath: '/games/teen-patti/leaderboard' },
  ],
  fallbackRows: [
    { user_id: 'AceMaster99', rank: 1, score: 4928, wins: 1784, losses: 884, bestGame: 'Three Card Brag', trend: '+4', tone: 'gold' },
    { user_id: 'RoyalFlush21', rank: 2, score: 3640, wins: 1460, losses: 781, bestGame: 'Claim', trend: '+2', tone: 'cyan' },
    { user_id: 'BluffKing', rank: 3, score: 3215, wins: 1321, losses: 812, bestGame: 'Spades', trend: '+1', tone: 'red' },
    { user_id: 'CardSharp', rank: 4, score: 2980, wins: 1128, losses: 714, bestGame: 'Spades', trend: '+2', tone: 'purple' },
    { user_id: 'PokerFace', rank: 5, score: 2865, wins: 1021, losses: 654, bestGame: 'Poker', trend: '+1', tone: 'red' },
    { user_id: 'NeonDealer', rank: 6, score: 2754, wins: 1287, losses: 816, bestGame: 'Blackjack', trend: '-1', tone: 'cyan' },
    { user_id: 'HighRoller', rank: 7, score: 2645, wins: 905, losses: 627, bestGame: 'Rummy', trend: '+3', tone: 'gold' },
    { user_id: 'LadyLuck', rank: 8, score: 2523, wins: 812, losses: 499, bestGame: 'Teen Patti', trend: '-', tone: 'purple' },
    { user_id: 'TripleCrown', rank: 9, score: 2487, wins: 789, losses: 487, bestGame: '3 Card Brag', trend: '-2', tone: 'red' },
    { user_id: 'SilentPlayer', rank: 10, score: 2401, wins: 672, losses: 426, bestGame: 'Call Break', trend: '+1', tone: 'cyan' },
    { user_id: 'TableRunner', rank: 11, score: 2328, wins: 644, losses: 401, bestGame: 'Claim', trend: '+3', tone: 'cyan' },
    { user_id: 'CutMaster', rank: 12, score: 2290, wins: 620, losses: 438, bestGame: 'Three Card Brag', trend: '-', tone: 'gold' },
  ],
  aiBenchmarkRows: [
    { user_id: 'ocentra-claim-strategist', rank: 1, score: 9812, wins: 1824, losses: 192, bestGame: 'Claim', trend: '+6', tone: 'red' },
    { user_id: 'brag-ev-maximizer', rank: 2, score: 9644, wins: 1702, losses: 238, bestGame: 'Three Card Brag', trend: '+2', tone: 'gold' },
    { user_id: 'spades-partner-net', rank: 3, score: 9381, wins: 1618, losses: 287, bestGame: 'Spades', trend: '+1', tone: 'purple' },
    { user_id: 'rummy-memory-agent', rank: 4, score: 9188, wins: 1490, losses: 311, bestGame: 'Rummy', trend: '-', tone: 'cyan' },
    { user_id: 'poker-range-solver', rank: 5, score: 9034, wins: 1422, losses: 330, bestGame: 'Poker', trend: '-1', tone: 'red' },
    { user_id: 'baseline-random-policy', rank: 6, score: 6412, wins: 812, losses: 901, bestGame: 'Mixed', trend: '-', tone: 'muted' },
  ],
  distributionLabels: ['DIAMOND 15.2%', 'PLATINUM 26.1%', 'GOLD 28.7%', 'SILVER 17.1%'],
  season: {
    label: 'SEASON 12',
    title: 'LEGENDS RISE',
    dateRange: 'MAY 01 - JUN 01, 2026',
    actionLabel: 'SEASON REWARDS',
    detailTitle: 'SEASON 12 REWARDS',
    detailSubtitle: 'Reward track, prize pool, tournament calendar',
    stats: [
      { label: 'ENDS IN', value: '12D 04H' },
      { label: 'PRIZE POOL', value: '2.35M' },
      { label: 'CLAIMED', value: '68%' },
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
    topGamesTitle: 'TOP GAMES THIS SEASON',
    distributionTitle: 'GLOBAL RATING DISTRIBUTION',
    distributionCenterLabel: 'TOTAL PLAYERS',
    feedTitle: 'LIVE LEADERBOARD FEED',
    liveLabel: 'LIVE',
    viewAllLabel: 'VIEW ALL',
    refreshLabel: 'REFRESH',
    queueLabel: 'QUEUE',
    showLabel: 'SHOW',
    pageLabel: 'PAGE',
    selectedPlayerLabel: 'SELECTED PLAYER',
    detailSnapshotTitle: 'PERFORMANCE SNAPSHOT',
    detailSnapshotLines: [
      'Recent ranked matches, season milestones, reward eligibility, and leaderboard movement are grouped here for review.',
      'Avatar, crest, badge, and season media positions are reserved for official leaderboard artwork.',
    ],
    loadingTitle: 'LOADING LEADERBOARD',
    loadingBody: 'Refreshing ranked standings.',
    errorTitle: 'LEADERBOARD UNAVAILABLE',
  },
  modes: {
    leaderboard: {
      defaultTab: 'overall',
      selectedGameId: 'three-card-brag',
      title: 'Leaderboard',
      routeLabel: '/leaderboard',
      rowSource: 'api',
    },
    gameLeaderboard: {
      defaultTab: 'perGame',
      selectedGameId: 'three-card-brag',
      title: 'Game Leaderboard',
      routeLabel: '/games/:gameId/leaderboard',
      rowSource: 'api',
    },
    aiBenchmarkLeaderboard: {
      defaultTab: 'aiBenchmarks',
      selectedGameId: 'ai-benchmarks',
      title: 'AI Benchmark Leaderboard',
      routeLabel: '/leaderboard/ai-benchmarks',
      rowSource: 'aiBenchmarkRows',
    },
  },
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function cloneContent(): LeaderboardPageContentData {
  return JSON.parse(JSON.stringify(DEFAULT_LEADERBOARD_PAGE_CONTENT)) as LeaderboardPageContentData;
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
  const merged = mergeKnownValue(cloneContent(), content);
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
