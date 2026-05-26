import { schema } from '@ocentra/schema-domain/effect-builder';

export const PlayerHubSectionIdSchema = schema.enum([
  'overview',
  'matches',
  'learning',
  'ai',
  'competition',
  'inventory',
  'rewards',
  'account',
]);
export type PlayerHubSectionId = schema.infer<typeof PlayerHubSectionIdSchema>;

export const PlayerHubRightDetailIdSchema = schema.enum([
  'account',
  'settings',
  'balances',
  'learning',
  'competition',
  'recent',
  'ai',
]);
export type PlayerHubRightDetailId = schema.infer<typeof PlayerHubRightDetailIdSchema>;

export const PlayerHubMetricKeySchema = schema.enum([
  'gp',
  'ac',
  'ownedItems',
  'gamesPlayed',
  'winRate',
  'profileLevel',
]);
export type PlayerHubMetricKey = schema.infer<typeof PlayerHubMetricKeySchema>;

export const PlayerHubToneSchema = schema.enum([
  'cyan',
  'gold',
  'violet',
  'green',
  'orange',
  'silver',
  'danger',
]);
export type PlayerHubTone = schema.infer<typeof PlayerHubToneSchema>;

export const PlayerHubIconSchema = schema.enum([
  'coins',
  'crown',
  'chest',
  'cards',
  'trophy',
  'crate',
  'shield',
  'link',
  'lock',
  'cart',
]);
export type PlayerHubIcon = schema.infer<typeof PlayerHubIconSchema>;

export const PlayerHubMetricSchema = schema.object({
  key: PlayerHubMetricKeySchema,
  label: schema.string().min(1),
  fallbackValue: schema.string(),
}).strict();
export type PlayerHubMetric = schema.infer<typeof PlayerHubMetricSchema>;

export const PlayerHubNavItemSchema = schema.object({
  id: PlayerHubSectionIdSchema,
  title: schema.string().min(1),
  subtitle: schema.string(),
  icon: PlayerHubIconSchema,
  tone: PlayerHubToneSchema,
  imageUrl: schema.string(),
}).strict();
export type PlayerHubNavItem = schema.infer<typeof PlayerHubNavItemSchema>;

export const PlayerHubCardSchema = schema.object({
  id: schema.string().min(1),
  title: schema.string().min(1),
  subtitle: schema.string(),
  tone: PlayerHubToneSchema,
  icon: PlayerHubIconSchema,
  imageUrl: schema.string(),
  targetDetail: PlayerHubRightDetailIdSchema,
  badge: schema.string().optional(),
  cta: schema.string().optional(),
  bullets: schema.array(schema.string()).optional(),
}).strict();
export type PlayerHubCard = schema.infer<typeof PlayerHubCardSchema>;

export const PlayerHubSectionSchema = schema.object({
  title: schema.string().min(1),
  subtitle: schema.string(),
  footerTitle: schema.string(),
  footerItems: schema.array(schema.string()),
  summaryCards: schema.array(PlayerHubCardSchema),
  detailCards: schema.array(PlayerHubCardSchema),
}).strict();
export type PlayerHubSection = schema.infer<typeof PlayerHubSectionSchema>;

export const PlayerHubPreviewRowSchema = schema.object({
  title: schema.string().min(1),
  sectionId: PlayerHubSectionIdSchema,
  subtitle: schema.string(),
  items: schema.array(schema.string()),
  accent: schema.string(),
  imageUrls: schema.array(schema.string()),
}).strict();
export type PlayerHubPreviewRow = schema.infer<typeof PlayerHubPreviewRowSchema>;

export const PlayerHubRightTabSchema = schema.object({
  id: PlayerHubRightDetailIdSchema,
  title: schema.string().min(1),
  accent: schema.string(),
}).strict();
export type PlayerHubRightTab = schema.infer<typeof PlayerHubRightTabSchema>;

export const PlayerHubRightSummaryRowSchema = schema.array(schema.string()).min(2).max(3);
export type PlayerHubRightSummaryRow = schema.infer<typeof PlayerHubRightSummaryRowSchema>;

export const PlayerHubRightDetailRowSchema = schema.object({
  label: schema.string().min(1),
  value: schema.string(),
  detail: schema.string(),
}).strict();
export type PlayerHubRightDetailRow = schema.infer<typeof PlayerHubRightDetailRowSchema>;

export const PlayerHubFooterItemSchema = schema.object({
  title: schema.string(),
  sub: schema.string(),
  icon: PlayerHubIconSchema,
  tone: PlayerHubToneSchema,
}).strict();
export type PlayerHubFooterItem = schema.infer<typeof PlayerHubFooterItemSchema>;

export const PlayerHubHeaderBadgeSchema = schema.object({
  title: schema.string(),
  sub: schema.string(),
  icon: PlayerHubIconSchema,
  tone: PlayerHubToneSchema,
}).strict();
export type PlayerHubHeaderBadge = schema.infer<typeof PlayerHubHeaderBadgeSchema>;

export const PlayerHubActionCopySchema = schema.object({
  comingSoon: schema.string(),
  open: schema.string(),
  view: schema.string(),
  details: schema.string(),
  working: schema.string(),
  backToHub: schema.string(),
  backToPrefix: schema.string(),
  openGroup: schema.string(),
  claim: schema.string(),
}).strict();
export type PlayerHubActionCopy = schema.infer<typeof PlayerHubActionCopySchema>;

export const PlayerHubRightPanelCopySchema = schema.object({
  balancesTitle: schema.string(),
  learningTitle: schema.string(),
  competitionTitle: schema.string(),
  recentTitle: schema.string(),
  accountTitle: schema.string(),
  learningName: schema.string(),
  manageLearning: schema.string(),
  viewAccount: schema.string(),
  profileName: schema.string(),
  profileLevel: schema.string(),
  emailUnavailable: schema.string(),
  guestProfile: schema.string(),
  initialsUnavailable: schema.string(),
  ratingUnavailable: schema.string(),
  gamesUnavailable: schema.string(),
  winRateUnavailable: schema.string(),
  levelPrefix: schema.string(),
  gamesSuffix: schema.string(),
  winRateSuffix: schema.string(),
  moreLabel: schema.string(),
  openLearning: schema.string(),
}).strict();
export type PlayerHubRightPanelCopy = schema.infer<typeof PlayerHubRightPanelCopySchema>;

export const PlayerHubStatusCopySchema = schema.object({
  loadingHub: schema.string(),
  retry: schema.string(),
  unknownValue: schema.string(),
}).strict();
export type PlayerHubStatusCopy = schema.infer<typeof PlayerHubStatusCopySchema>;

export const PlayerHubDetailViewCopySchema = schema.object({
  accountTitle: schema.string(),
  accountSubtitle: schema.string(),
  accountCta: schema.string(),
  accountBullets: schema.array(schema.string()),
  learningTitle: schema.string(),
  learningSubtitle: schema.string(),
  learningCta: schema.string(),
  learningTiers: schema.array(schema.object({
    key: schema.string().min(1),
    title: schema.string().min(1),
    value: schema.string(),
    tone: PlayerHubToneSchema,
  }).strict()),
  learningRows: schema.array(schema.object({
    label: schema.string(),
    values: schema.array(schema.string()),
  }).strict()),
}).strict();
export type PlayerHubDetailViewCopy = schema.infer<typeof PlayerHubDetailViewCopySchema>;

export const PlayerHubItemPreviewCopySchema = schema.object({
  title: schema.string(),
  backToInventory: schema.string(),
  itemType: schema.string(),
  itemOptionsSuffix: schema.string(),
  noItemData: schema.string(),
  missingImage: schema.string(),
  priceUnavailable: schema.string(),
  previousImage: schema.string(),
  nextImage: schema.string(),
  closeDetail: schema.string(),
  expand: schema.string(),
}).strict();
export type PlayerHubItemPreviewCopy = schema.infer<typeof PlayerHubItemPreviewCopySchema>;

export const PlayerHubRewardCopySchema = schema.object({
  title: schema.string(),
  subtitle: schema.string(),
  backLabel: schema.string(),
  closeLabel: schema.string(),
  detailLabel: schema.string(),
  helper: schema.string(),
  fields: schema.array(schema.string()),
  chips: schema.array(schema.string()),
  status: schema.string(),
  open: schema.string(),
  copy: schema.string(),
  start: schema.string(),
  check: schema.string(),
}).strict();
export type PlayerHubRewardCopy = schema.infer<typeof PlayerHubRewardCopySchema>;

export const PlayerHubUiCopySchema = schema.object({
  header: schema.object({
    title: schema.string(),
    subtitle: schema.string(),
    badges: schema.array(PlayerHubHeaderBadgeSchema),
    balanceTitle: schema.string(),
    balanceUnit: schema.string(),
    balanceSub: schema.string(),
  }).strict(),
  rightPanel: PlayerHubRightPanelCopySchema,
  actions: PlayerHubActionCopySchema,
  status: PlayerHubStatusCopySchema,
  detailView: PlayerHubDetailViewCopySchema,
  itemPreview: PlayerHubItemPreviewCopySchema,
  rewards: PlayerHubRewardCopySchema,
  footer: schema.array(PlayerHubFooterItemSchema),
}).strict();
export type PlayerHubUiCopy = schema.infer<typeof PlayerHubUiCopySchema>;

export const PlayerHubPageContentDataSchema = schema.object({
  headerMetrics: schema.array(PlayerHubMetricSchema),
  navigation: schema.array(PlayerHubNavItemSchema),
  sections: schema.object({
    overview: PlayerHubSectionSchema,
    matches: PlayerHubSectionSchema,
    learning: PlayerHubSectionSchema,
    ai: PlayerHubSectionSchema,
    competition: PlayerHubSectionSchema,
    inventory: PlayerHubSectionSchema,
    rewards: PlayerHubSectionSchema,
    account: PlayerHubSectionSchema,
  }).strict(),
  inventoryGroups: schema.array(schema.object({
    key: schema.string().min(1),
    title: schema.string().min(1),
    subtitle: schema.string(),
    tone: PlayerHubToneSchema,
    icon: PlayerHubIconSchema,
    badge: schema.string().optional(),
    heroImageUrl: schema.string(),
    items: schema.array(PlayerHubCardSchema),
  }).strict()),
  previews: schema.array(PlayerHubPreviewRowSchema),
  rewardActions: schema.array(schema.object({
    key: schema.string().min(1),
    group: schema.string(),
    title: schema.string().min(1),
    reward: schema.string(),
    cadence: schema.string(),
    tone: PlayerHubToneSchema,
    icon: PlayerHubIconSchema,
    action: schema.string(),
    imageUrl: schema.string(),
    description: schema.string(),
    details: schema.array(schema.string()),
  }).strict()),
  rightTabs: schema.array(PlayerHubRightTabSchema),
  rightRows: schema.object({
    balances: schema.array(PlayerHubRightSummaryRowSchema),
    competition: schema.array(PlayerHubRightSummaryRowSchema),
    recent: schema.array(PlayerHubRightSummaryRowSchema),
  }).strict(),
  rightDetails: schema.object({
    account: schema.array(PlayerHubRightDetailRowSchema),
    settings: schema.array(PlayerHubRightDetailRowSchema),
    balances: schema.array(PlayerHubRightDetailRowSchema),
    learning: schema.array(PlayerHubRightDetailRowSchema),
    competition: schema.array(PlayerHubRightDetailRowSchema),
    recent: schema.array(PlayerHubRightDetailRowSchema),
    ai: schema.array(PlayerHubRightDetailRowSchema),
  }).strict(),
  uiCopy: PlayerHubUiCopySchema,
}).strict();
export type PlayerHubPageContentData = schema.infer<typeof PlayerHubPageContentDataSchema>;

export const PartialPlayerHubPageContentDataSchema = PlayerHubPageContentDataSchema.partial();
export type PartialPlayerHubPageContentData = schema.infer<typeof PartialPlayerHubPageContentDataSchema>;
