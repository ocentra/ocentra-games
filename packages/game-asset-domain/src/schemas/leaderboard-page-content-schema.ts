import { schema } from '@ocentra/schema-domain/effect-builder';

export const LeaderboardPageToneSchema = schema.enum(['cyan', 'gold', 'purple', 'red', 'muted']);
export type LeaderboardTone = schema.infer<typeof LeaderboardPageToneSchema>;

export const LeaderboardTabIdSchema = schema.enum(['overall', 'perGame', 'aiBenchmarks', 'tournaments', 'friends']);
export type LeaderboardTabId = schema.infer<typeof LeaderboardTabIdSchema>;

export const LeaderboardPageModeSchema = schema.enum(['leaderboard', 'gameLeaderboard', 'aiBenchmarkLeaderboard']);
export type LeaderboardPageMode = schema.infer<typeof LeaderboardPageModeSchema>;

export const LeaderboardIconNameSchema = schema.enum([
  'activity',
  'bot',
  'calendar',
  'circle',
  'coins',
  'crown',
  'gamepad',
  'gift',
  'grid',
  'home',
  'medal',
  'shield',
  'swords',
  'trophy',
  'users',
]);
export type LeaderboardIconName = schema.infer<typeof LeaderboardIconNameSchema>;

const LeaderboardTabSchema = schema.object({
  id: LeaderboardTabIdSchema,
  label: schema.string().min(1),
  title: schema.string().min(1),
}).strict();
export type LeaderboardTab = schema.infer<typeof LeaderboardTabSchema>;

const LeaderboardNavItemSchema = schema.object({
  label: schema.string().min(1),
  detail: schema.string(),
  icon: LeaderboardIconNameSchema,
  tabId: LeaderboardTabIdSchema,
  tone: LeaderboardPageToneSchema.optional(),
}).strict();
export type LeaderboardNavItem = schema.infer<typeof LeaderboardNavItemSchema>;

const LeaderboardTabDetailSchema = schema.object({
  eyebrow: schema.string(),
  title: schema.string().min(1),
  summary: schema.string(),
  primary: schema.string(),
  secondary: schema.string(),
  action: schema.string(),
  tone: LeaderboardPageToneSchema,
}).strict();
export type LeaderboardTabDetail = schema.infer<typeof LeaderboardTabDetailSchema>;

const LeaderboardGameOptionSchema = schema.object({
  id: schema.string().min(1),
  rank: schema.number(),
  name: schema.string().min(1),
  matches: schema.string(),
  growth: schema.string(),
  tone: LeaderboardPageToneSchema,
  category: schema.string().optional(),
  subcategory: schema.string().nullable().optional(),
  gameType: schema.number().optional(),
  routePath: schema.string().optional(),
}).strict();
export type LeaderboardGameOption = schema.infer<typeof LeaderboardGameOptionSchema>;

const LeaderboardQuickGameSchema = schema.object({
  id: schema.string().min(1),
  name: schema.string().min(1),
  detail: schema.string(),
  icon: LeaderboardIconNameSchema,
  tone: LeaderboardPageToneSchema,
  category: schema.string().optional(),
  subcategory: schema.string().nullable().optional(),
  gameType: schema.number().optional(),
  routePath: schema.string().optional(),
}).strict();
export type LeaderboardQuickGame = schema.infer<typeof LeaderboardQuickGameSchema>;

const LeaderboardRowSchema = schema.object({
  user_id: schema.string().min(1),
  rank: schema.number(),
  score: schema.number(),
  wins: schema.number().optional(),
  losses: schema.number().optional(),
  bestGame: schema.string().optional(),
  trend: schema.string().optional(),
  tone: LeaderboardPageToneSchema.optional(),
}).strict();
export type LeaderboardContentRow = schema.infer<typeof LeaderboardRowSchema>;

const LeaderboardSeasonStatSchema = schema.object({
  label: schema.string(),
  value: schema.string(),
}).strict();

const LeaderboardSeasonSchema = schema.object({
  label: schema.string(),
  title: schema.string(),
  dateRange: schema.string(),
  actionLabel: schema.string(),
  detailTitle: schema.string(),
  detailSubtitle: schema.string(),
  stats: schema.array(LeaderboardSeasonStatSchema),
}).strict();
export type LeaderboardSeason = schema.infer<typeof LeaderboardSeasonSchema>;

const LeaderboardModeContentSchema = schema.object({
  defaultTab: LeaderboardTabIdSchema,
  selectedGameId: schema.string().optional(),
  title: schema.string(),
  routeLabel: schema.string(),
  rowSource: schema.enum(['api', 'fallbackRows', 'aiBenchmarkRows']),
}).strict();
export type LeaderboardModeContent = schema.infer<typeof LeaderboardModeContentSchema>;

const LeaderboardMetricLabelsSchema = schema.object({
  totalPlayers: schema.string(),
  totalGames: schema.string(),
  rankedWins: schema.string(),
  nearbyPlayers: schema.string(),
  season: schema.string(),
  updated: schema.string(),
}).strict();

const LeaderboardUiCopySchema = schema.object({
  hubTitle: schema.string(),
  topGamesTitle: schema.string(),
  distributionTitle: schema.string(),
  distributionCenterLabel: schema.string(),
  feedTitle: schema.string(),
  liveLabel: schema.string(),
  viewAllLabel: schema.string(),
  refreshLabel: schema.string(),
  queueLabel: schema.string(),
  showLabel: schema.string(),
  pageLabel: schema.string(),
  selectedPlayerLabel: schema.string(),
  detailSnapshotTitle: schema.string(),
  detailSnapshotLines: schema.array(schema.string()),
  loadingTitle: schema.string(),
  loadingBody: schema.string(),
  errorTitle: schema.string(),
}).strict();

export const LeaderboardPageContentDataSchema = schema.object({
  tabs: schema.array(LeaderboardTabSchema),
  navItems: schema.array(LeaderboardNavItemSchema),
  tabDetails: schema.object({
    overall: LeaderboardTabDetailSchema,
    perGame: LeaderboardTabDetailSchema,
    aiBenchmarks: LeaderboardTabDetailSchema,
    tournaments: LeaderboardTabDetailSchema,
    friends: LeaderboardTabDetailSchema,
  }).strict(),
  topGames: schema.array(LeaderboardGameOptionSchema),
  quickGames: schema.array(LeaderboardQuickGameSchema),
  fallbackRows: schema.array(LeaderboardRowSchema),
  aiBenchmarkRows: schema.array(LeaderboardRowSchema),
  distributionLabels: schema.array(schema.string()),
  season: LeaderboardSeasonSchema,
  metricLabels: LeaderboardMetricLabelsSchema,
  uiCopy: LeaderboardUiCopySchema,
  modes: schema.object({
    leaderboard: LeaderboardModeContentSchema,
    gameLeaderboard: LeaderboardModeContentSchema,
    aiBenchmarkLeaderboard: LeaderboardModeContentSchema,
  }).strict(),
}).strict();
export type LeaderboardPageContentData = schema.infer<typeof LeaderboardPageContentDataSchema>;

export const PartialLeaderboardPageContentDataSchema = LeaderboardPageContentDataSchema.partial();
export type PartialLeaderboardPageContentData = schema.infer<typeof PartialLeaderboardPageContentDataSchema>;
