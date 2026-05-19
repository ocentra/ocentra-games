import { schema } from '@ocentra/schema-domain/effect-builder';

export const ShopPageTabSchema = schema.enum(['Treasury', 'Elite', 'Vault', 'Play Access', 'Events']);
export type ShopPageTab = schema.infer<typeof ShopPageTabSchema>;

export const ShopPageToneSchema = schema.enum(['cyan', 'gold', 'violet', 'green', 'orange', 'silver', 'danger']);
export type ShopTone = schema.infer<typeof ShopPageToneSchema>;

export const ShopPageIconSchema = schema.enum(['coins', 'crown', 'chest', 'cards', 'trophy', 'crate', 'shield', 'link', 'lock', 'cart']);
export type ShopIcon = schema.infer<typeof ShopPageIconSchema>;

export const ShopRightTabIdSchema = schema.enum(['account', 'wallet', 'pass', 'events', 'recent']);
export type ShopRightTabId = schema.infer<typeof ShopRightTabIdSchema>;

export const ShopSideItemSchema = schema.object({
  key: ShopPageTabSchema,
  title: schema.string().min(1),
  subtitle: schema.string(),
  icon: ShopPageIconSchema,
  tone: ShopPageToneSchema,
  imageUrl: schema.string(),
}).strict();
export type ShopSideItem = schema.infer<typeof ShopSideItemSchema>;

export const ShopStaticItemSchema = schema.object({
  title: schema.string().min(1),
  subtitle: schema.string(),
  tone: ShopPageToneSchema,
  icon: ShopPageIconSchema,
  badge: schema.string().optional(),
  imageUrl: schema.string(),
  price: schema.string().optional(),
  benefits: schema.array(schema.string()).optional(),
}).strict();
export type ShopStaticItem = schema.infer<typeof ShopStaticItemSchema>;

export const ShopSectionSchema = schema.object({
  title: schema.string().min(1),
  subtitle: schema.string(),
  footerTitle: schema.string(),
  footerItems: schema.array(schema.string()),
  categories: schema.array(ShopStaticItemSchema).optional(),
  featured: schema.array(ShopStaticItemSchema).optional(),
}).strict();
export type ShopSection = schema.infer<typeof ShopSectionSchema>;

export const ShopVaultShowcaseGroupSchema = schema.object({
  key: schema.string().min(1),
  title: schema.string().min(1),
  subtitle: schema.string(),
  tone: ShopPageToneSchema,
  icon: ShopPageIconSchema,
  badge: schema.string().optional(),
  heroImageUrl: schema.string(),
  items: schema.array(ShopStaticItemSchema),
}).strict();
export type ShopVaultShowcaseGroup = schema.infer<typeof ShopVaultShowcaseGroupSchema>;

export const ShopPreviewRowSchema = schema.object({
  title: schema.string().min(1),
  tab: schema.union([ShopPageTabSchema, schema.literal('Earn Free AC')]),
  subtitle: schema.string(),
  items: schema.array(schema.string()),
  accent: schema.string(),
  imageUrls: schema.array(schema.string()),
}).strict();
export type ShopPreviewRow = schema.infer<typeof ShopPreviewRowSchema>;

export const ShopQuestSchema = schema.object({
  key: schema.string().min(1),
  group: schema.string(),
  title: schema.string().min(1),
  reward: schema.string(),
  cadence: schema.string(),
  tone: ShopPageToneSchema,
  icon: ShopPageIconSchema,
  action: schema.string(),
  imageUrl: schema.string(),
  description: schema.string(),
  details: schema.array(schema.string()),
}).strict();
export type ShopQuest = schema.infer<typeof ShopQuestSchema>;

export const ShopRightTabSchema = schema.object({
  id: ShopRightTabIdSchema,
  title: schema.string().min(1),
  accent: schema.string(),
}).strict();
export type ShopRightTab = schema.infer<typeof ShopRightTabSchema>;

const ShopHeaderBadgeSchema = schema.object({
  title: schema.string(),
  sub: schema.string(),
  icon: ShopPageIconSchema,
  tone: ShopPageToneSchema,
}).strict();

const ShopFooterItemSchema = schema.object({
  title: schema.string(),
  sub: schema.string(),
  icon: ShopPageIconSchema,
  tone: ShopPageToneSchema,
}).strict();

const ShopActionCopySchema = schema.object({
  comingSoon: schema.string(),
  purchase: schema.string(),
  topUp: schema.string(),
  select: schema.string(),
  view: schema.string(),
  open: schema.string(),
  claimFree: schema.string(),
  freeBadge: schema.string(),
  buyDigital: schema.string(),
  openVaultGroup: schema.string(),
  working: schema.string(),
  details: schema.string(),
  backToShop: schema.string(),
  backToPrefix: schema.string(),
  vaultEntryCountSuffix: schema.string(),
  selectVaultGroup: schema.string(),
}).strict();

const ShopPaymentProviderCopySchema = schema.object({
  provider: schema.enum(['stripe', 'paypal', 'solana']),
  label: schema.string(),
  detail: schema.string(),
}).strict();

const ShopPaymentCopySchema = schema.object({
  titlePrefix: schema.string(),
  defaultDescription: schema.string(),
  idleMessage: schema.string(),
  providerOptions: schema.array(ShopPaymentProviderCopySchema),
  starting: schema.string(),
  working: schema.string(),
  select: schema.string(),
  cancel: schema.string(),
  signInRequired: schema.string(),
  successAccepted: schema.string(),
  providerNotConfigured: schema.string(),
  checkoutFailed: schema.string(),
}).strict();

const ShopDeckPreviewCopySchema = schema.object({
  title: schema.string(),
  backToVault: schema.string(),
  digitalDeck: schema.string(),
  purchaseOptionsSuffix: schema.string(),
  printableDigital: schema.string(),
  includedStarterDeck: schema.string(),
  tableReadyDigitalDeck: schema.string(),
  printableExportIncluded: schema.string(),
  cardArtworkIncluded: schema.string(),
  noDeckData: schema.string(),
  cardBackAlt: schema.string(),
  cardBackLabel: schema.string(),
  missingImage: schema.string(),
  priceUnavailable: schema.string(),
  previousCardImage: schema.string(),
  nextCardImage: schema.string(),
  closeCardDetail: schema.string(),
  expand: schema.string(),
}).strict();

const ShopStatusCopySchema = schema.object({
  loadingMarketplace: schema.string(),
  clearError: schema.string(),
  unknownValue: schema.string(),
}).strict();

const ShopUiCopySchema = schema.object({
  header: schema.object({
    title: schema.string(),
    subtitle: schema.string(),
    badges: schema.array(ShopHeaderBadgeSchema),
    balanceTitle: schema.string(),
    balanceUnit: schema.string(),
    balanceSub: schema.string(),
  }).strict(),
  passCard: schema.object({
    compactSummary: schema.string(),
    summary: schema.string(),
    compactBenefits: schema.array(schema.string()),
    benefits: schema.array(schema.string()),
    lifetimeButton: schema.string(),
    selectButton: schema.string(),
  }).strict(),
  earnPanel: schema.object({
    title: schema.string(),
    description: schema.string(),
    buttonLabel: schema.string(),
  }).strict(),
  earnRewards: schema.object({
    title: schema.string(),
    subtitle: schema.string(),
    backLabel: schema.string(),
    closeLabel: schema.string(),
    detailLabel: schema.string(),
    shareTitlePrefix: schema.string(),
    inviteTitle: schema.string(),
    completeTitlePrefix: schema.string(),
    shareHelper: schema.string(),
    inviteHelper: schema.string(),
    defaultHelper: schema.string(),
    shareFields: schema.array(schema.string()),
    inviteFields: schema.array(schema.string()),
    defaultFields: schema.array(schema.string()),
    shareChips: schema.array(schema.string()),
    inviteChips: schema.array(schema.string()),
    defaultChips: schema.array(schema.string()),
    shareMessage: schema.string(),
    inviteLink: schema.string(),
    defaultChecklist: schema.string(),
    shareProof: schema.string(),
    inviteStatus: schema.string(),
    defaultStatus: schema.string(),
    verificationStatus: schema.string(),
    shareTargetStatus: schema.string(),
    progressStatus: schema.string(),
    rewardSuffix: schema.string(),
    openShare: schema.string(),
    copyInvite: schema.string(),
    start: schema.string(),
    checkVerify: schema.string(),
    verifySpin: schema.string(),
  }).strict(),
  rightPanel: schema.object({
    walletTitle: schema.string(),
    passTitle: schema.string(),
    eventsTitle: schema.string(),
    recentTitle: schema.string(),
    accountTitle: schema.string(),
    passName: schema.string(),
    managePass: schema.string(),
    viewProfile: schema.string(),
    profileName: schema.string(),
    profileElo: schema.string(),
    emailUnavailable: schema.string(),
    guestProfile: schema.string(),
    initialsUnavailable: schema.string(),
    ratingUnavailable: schema.string(),
    gamesUnavailable: schema.string(),
    winRateUnavailable: schema.string(),
    eloPrefix: schema.string(),
    gamesSuffix: schema.string(),
    winRateSuffix: schema.string(),
    moreLabel: schema.string(),
    openEliteShop: schema.string(),
  }).strict(),
  actions: ShopActionCopySchema,
  payment: ShopPaymentCopySchema,
  deckPreview: ShopDeckPreviewCopySchema,
  status: ShopStatusCopySchema,
  footer: schema.array(ShopFooterItemSchema),
}).strict();

const ShopTupleRowSchema = schema.array(schema.string()).min(2).max(3);
const ShopRightDetailRowSchema = schema.object({
  label: schema.string(),
  value: schema.string(),
  detail: schema.string(),
}).strict();

export const ShopArenaCreditsInfoDetailSchema = schema.object({
  title: schema.string(),
  subtitle: schema.string(),
  cta: schema.string(),
  bullets: schema.array(schema.string()),
}).strict();
export type ShopArenaCreditsInfoDetail = schema.infer<typeof ShopArenaCreditsInfoDetailSchema>;

export const ShopEliteBenefitsInfoDetailSchema = schema.object({
  title: schema.string(),
  subtitle: schema.string(),
  cta: schema.string(),
  tiers: schema.array(schema.object({
    key: schema.string(),
    title: schema.string(),
    price: schema.string(),
    tone: ShopPageToneSchema,
  }).strict()),
  rows: schema.array(schema.object({
    label: schema.string(),
    values: schema.array(schema.string()),
  }).strict()),
}).strict();
export type ShopEliteBenefitsInfoDetail = schema.infer<typeof ShopEliteBenefitsInfoDetailSchema>;

export const ShopPageContentDataSchema = schema.object({
  headerStats: schema.array(schema.object({
    label: schema.string(),
    value: schema.string(),
  }).strict()),
  sideItems: schema.array(ShopSideItemSchema),
  sections: schema.object({
    Treasury: ShopSectionSchema,
    Elite: ShopSectionSchema,
    Vault: ShopSectionSchema,
    'Play Access': ShopSectionSchema,
    Events: ShopSectionSchema,
  }).strict(),
  vaultShowcaseGroups: schema.array(ShopVaultShowcaseGroupSchema),
  creditPacks: schema.array(ShopStaticItemSchema),
  passes: schema.array(ShopStaticItemSchema),
  previews: schema.array(ShopPreviewRowSchema),
  quests: schema.array(ShopQuestSchema),
  rightTabs: schema.array(ShopRightTabSchema),
  rightRows: schema.object({
    wallet: schema.array(ShopTupleRowSchema),
    events: schema.array(ShopTupleRowSchema),
    recent: schema.array(ShopTupleRowSchema),
  }).strict(),
  rightDetails: schema.object({
    account: schema.array(ShopRightDetailRowSchema),
    wallet: schema.array(ShopRightDetailRowSchema),
    pass: schema.array(ShopRightDetailRowSchema),
    events: schema.array(ShopRightDetailRowSchema),
    recent: schema.array(ShopRightDetailRowSchema),
  }).strict(),
  uiCopy: ShopUiCopySchema,
  infoDetails: schema.object({
    arenaCredits: ShopArenaCreditsInfoDetailSchema,
    eliteBenefits: ShopEliteBenefitsInfoDetailSchema,
  }).strict(),
}).strict();
export type ShopPageContentData = schema.infer<typeof ShopPageContentDataSchema>;

export const PartialShopPageContentDataSchema = ShopPageContentDataSchema.partial();
export type PartialShopPageContentData = schema.infer<typeof PartialShopPageContentDataSchema>;
