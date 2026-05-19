import { schema } from '@ocentra/schema-domain/effect-builder';
import { GameHomeSchema } from '@/schemas/game-home-schema';
import { ComingSoonTeaserSchema } from '@/schemas/coming-soon-teaser-schema';
import { FeatureBannerItemSchema } from '@/schemas/feature-banner-item-schema';

export const ImageUrlsSchema = schema.record(schema.string(), schema.string());

const FeaturedShowcaseOverallControlsSchema = schema.object({
  viewWidth: schema.number(),
  canvasInsetX: schema.number(),
  parentBleedX: schema.number().optional().default(0),
  marginTop: schema.number().optional().default(0),
  marginBottom: schema.number().optional().default(0),
  narrowMarginTop: schema.number().optional().default(0),
  narrowMarginBottom: schema.number().optional().default(0),
  wideHeight: schema.number(),
  narrowHeight: schema.number(),
  stageY: schema.number(),
  stageWideH: schema.number(),
  stageNarrowH: schema.number(),
  stageRadius: schema.number(),
  edgeInset: schema.number(),
  narrowBreakpoint: schema.number().optional().default(780),
  debugBounds: schema.boolean().optional().default(false),
});

const FeaturedShowcaseArrowControlsSchema = schema.object({
  width: schema.number().optional().default(30),
  height: schema.number().optional().default(307),
  gap: schema.number(),
  radius: schema.number(),
});

const FeaturedShowcaseHeaderControlsSchema = schema.object({
  insetX: schema.number(),
  tabTop: schema.number(),
  minTabsH: schema.number(),
  tabMaxFont: schema.number(),
  tabMinFont: schema.number(),
  tabFirstBoost: schema.number(),
  tabCountW: schema.number(),
  activeLineH: schema.number(),
});

const FeaturedShowcaseBodyControlsSchema = schema.object({
  insetX: schema.number(),
  topGap: schema.number(),
  bottomGap: schema.number(),
  radius: schema.number(),
  splitRatio: schema.number(),
  narrowAHeightRatio: schema.number(),
  minAWidth: schema.number(),
  minBWidth: schema.number(),
  outlineWidth: schema.number(),
});

const FeaturedShowcaseSideAControlsSchema = schema.object({
  topBadgeInset: schema.number(),
  topBadgeY: schema.number(),
  bottomBadgeInset: schema.number(),
  bottomBadgeBottom: schema.number(),
  topBadgeH: schema.number(),
  bottomBadgeH: schema.number(),
  learnMoreW: schema.number(),
  learnMoreH: schema.number(),
  learnMoreRight: schema.number(),
  learnMoreBottom: schema.number(),
  mediaFit: schema.string().optional().default('cover'),
  mediaAnchorX: schema.number().optional().default(50),
  mediaAnchorY: schema.number().optional().default(50),
  mediaOffsetX: schema.number().optional().default(0),
  mediaOffsetY: schema.number().optional().default(0),
  mediaScale: schema.number().optional().default(1),
  cardGap: schema.number().optional().default(12),
  cardMinW: schema.number().optional().default(144),
  cardPad: schema.number().optional().default(12),
  cardRadius: schema.number().optional().default(8),
  cardImageRatio: schema.number().optional().default(0.58),
  cardCopyPad: schema.number().optional().default(10),
  cardTitleMaxFont: schema.number().optional().default(18),
  narrowCardTitleMaxFont: schema.number().optional().default(22),
  cardDescMaxFont: schema.number().optional().default(13),
  narrowCardDescMaxFont: schema.number().optional().default(15),
  cardButtonW: schema.number().optional().default(132),
  narrowCardButtonW: schema.number().optional().default(154),
  cardButtonH: schema.number().optional().default(38),
  narrowCardButtonH: schema.number().optional().default(44),
  cardButtonFont: schema.number().optional().default(12.5),
  narrowCardButtonFont: schema.number().optional().default(14),
  cardButtonArrowW: schema.number().optional().default(34),
  narrowCardButtonArrowW: schema.number().optional().default(38),
  cardButtonAlign: schema.string().optional().default('start'),
  cardButtonBottom: schema.number().optional().default(8),
});

const FeaturedShowcaseSideBControlsSchema = schema.object({
  outerPad: schema.number(),
  innerPad: schema.number(),
  gap: schema.number(),
  logoH: schema.number(),
  narrowLogoH: schema.number().optional().default(96),
  logoTaglineGap: schema.number().optional().default(0),
  narrowLogoTaglineGap: schema.number().optional().default(0),
  taglineH: schema.number(),
  narrowTaglineH: schema.number().optional().default(28),
  statusH: schema.number(),
  narrowStatusH: schema.number().optional().default(92),
  textPadX: schema.number(),
  logoMaxFont: schema.number(),
  narrowLogoMaxFont: schema.number().optional().default(52),
  taglineMaxFont: schema.number(),
  narrowTaglineMaxFont: schema.number().optional().default(16),
  descMaxFont: schema.number(),
  narrowDescMaxFont: schema.number().optional().default(26),
  descMinFont: schema.number(),
  narrowDescMinFont: schema.number().optional().default(17),
  statusLabelFont: schema.number().optional().default(13),
  narrowStatusLabelFont: schema.number().optional().default(16),
  statusValueFont: schema.number().optional().default(15),
  narrowStatusValueFont: schema.number().optional().default(18),
  montageRows: schema.number().optional().default(2),
  montageColumns: schema.number().optional().default(3),
  montageGap: schema.number().optional().default(5),
  montageH: schema.number().optional().default(190),
  montageImageRadius: schema.number().optional().default(7),
  montageImageFit: schema.string().optional().default('cover'),
  montageImageBlur: schema.number().optional().default(1),
  montageImageOutlineWidth: schema.number().optional().default(1),
  montageImageOutlineOpacity: schema.number().optional().default(0.38),
  montageSlideDuration: schema.number().optional().default(28),
  narrowMontageH: schema.number().optional().default(260),
  catalogPanelPadX: schema.number().optional().default(12),
  catalogPanelPadY: schema.number().optional().default(12),
  catalogCopyGap: schema.number().optional().default(8),
  catalogCopyOffsetY: schema.number().optional().default(0),
  catalogEyebrowFont: schema.number().optional().default(12),
  narrowCatalogEyebrowFont: schema.number().optional().default(15),
  catalogEyebrowGap: schema.number().optional().default(3),
  catalogTitleFont: schema.number().optional().default(34),
  narrowCatalogTitleFont: schema.number().optional().default(52),
  catalogTitleGap: schema.number().optional().default(5),
  catalogDescFont: schema.number().optional().default(15),
  narrowCatalogDescFont: schema.number().optional().default(18),
  catalogButtonW: schema.number().optional().default(170),
  narrowCatalogButtonW: schema.number().optional().default(210),
  catalogButtonH: schema.number().optional().default(44),
  narrowCatalogButtonH: schema.number().optional().default(52),
  catalogButtonFont: schema.number().optional().default(13),
  narrowCatalogButtonFont: schema.number().optional().default(15),
  catalogButtonArrowW: schema.number().optional().default(36),
  narrowCatalogButtonArrowW: schema.number().optional().default(42),
  catalogButtonAlign: schema.string().optional().default('start'),
});

const FeaturedShowcaseFooterControlsSchema = schema.object({
  height: schema.number(),
  maxVisible: schema.number(),
  inactiveW: schema.number(),
  activeMultiplier: schema.number(),
  pillH: schema.number(),
  minGap: schema.number(),
  trackInset: schema.number(),
  showLine: schema.boolean().optional().default(true),
  lineInset: schema.number().optional().default(0),
  lineWidth: schema.number().optional().default(2),
  lineOpacity: schema.number().optional().default(0.42),
});

const FeaturedShowcaseColorControlsSchema = schema.object({
  bodyStroke: schema.string(),
  stageStroke: schema.string(),
  arrowHover: schema.string(),
  tabHover: schema.string(),
  learnMoreStroke: schema.string(),
});

const FeaturedShowcaseControlGroupsSchema = schema.object({
  overall: FeaturedShowcaseOverallControlsSchema,
  arrows: FeaturedShowcaseArrowControlsSchema,
  header: FeaturedShowcaseHeaderControlsSchema,
  body: FeaturedShowcaseBodyControlsSchema,
  sideA: FeaturedShowcaseSideAControlsSchema,
  sideB: FeaturedShowcaseSideBControlsSchema,
  footer: FeaturedShowcaseFooterControlsSchema,
  colors: FeaturedShowcaseColorControlsSchema,
});

const FeaturedShowcaseControlVariantsSchema = schema.object({
  wide: FeaturedShowcaseControlGroupsSchema.optional(),
  narrow: FeaturedShowcaseControlGroupsSchema.optional(),
});

export const FeaturedShowcaseControlsSchema = schema.object({
  overall: FeaturedShowcaseOverallControlsSchema,
  arrows: FeaturedShowcaseArrowControlsSchema,
  header: FeaturedShowcaseHeaderControlsSchema,
  body: FeaturedShowcaseBodyControlsSchema,
  sideA: FeaturedShowcaseSideAControlsSchema,
  sideB: FeaturedShowcaseSideBControlsSchema,
  footer: FeaturedShowcaseFooterControlsSchema,
  colors: FeaturedShowcaseColorControlsSchema,
  variants: FeaturedShowcaseControlVariantsSchema.optional(),
});

const HomeShowcaseFrameOverallControlsSchema = schema.object({
  viewWidth: schema.number(),
  canvasInsetX: schema.number(),
  parentBleedX: schema.number().optional().default(0),
  marginTop: schema.number().optional().default(0),
  marginBottom: schema.number().optional().default(0),
  narrowMarginTop: schema.number().optional().default(10),
  narrowMarginBottom: schema.number().optional().default(18),
  wideHeight: schema.number(),
  narrowHeight: schema.number(),
  stageInsetX: schema.number().optional().default(0),
  stageY: schema.number(),
  stageWideH: schema.number(),
  stageNarrowH: schema.number(),
  stageRadius: schema.number(),
  narrowBreakpoint: schema.number().optional().default(780),
  debugBounds: schema.boolean().optional().default(false),
});

const HomeShowcaseFrameBodyControlsSchema = schema.object({
  insetX: schema.number(),
  topGap: schema.number(),
  bottomGap: schema.number(),
  radius: schema.number(),
  radiusTopLeft: schema.number().optional().default(10),
  radiusTopRight: schema.number().optional().default(10),
  radiusBottomRight: schema.number().optional().default(10),
  radiusBottomLeft: schema.number().optional().default(10),
  splitRatio: schema.number(),
  narrowAHeightRatio: schema.number(),
  minAWidth: schema.number(),
  minBWidth: schema.number(),
  outlineWidth: schema.number(),
});

const HomeShowcaseFrameSideAControlsSchema = schema.object({
  padX: schema.number(),
  padY: schema.number(),
  contentScale: schema.number().optional().default(1),
  contentOffsetX: schema.number().optional().default(0),
  contentOffsetY: schema.number().optional().default(0),
  contentZIndex: schema.number().optional().default(3),
  overflowVisible: schema.boolean().optional().default(true),
  glowOpacity: schema.number().optional().default(0.64),
  glowSize: schema.number().optional().default(138),
  glowBlur: schema.number().optional().default(18),
  glowOffsetX: schema.number().optional().default(0),
  glowOffsetY: schema.number().optional().default(0),
});

const HomeShowcaseFrameSideBControlsSchema = schema.object({
  padX: schema.number(),
  padY: schema.number(),
  contentScale: schema.number().optional().default(1),
  contentOffsetX: schema.number().optional().default(0),
  contentOffsetY: schema.number().optional().default(0),
  contentZIndex: schema.number().optional().default(2),
  overflowVisible: schema.boolean().optional().default(false),
});

const HomeShowcaseFrameStartupControlsSchema = schema.object({
  enabled: schema.boolean().optional().default(true),
  holdAfterReadyMs: schema.number().optional().default(1600),
  fadeMs: schema.number().optional().default(280),
  overlayOpacity: schema.number().optional().default(0),
  accentOpacity: schema.number().optional().default(0),
  panelScale: schema.number().optional().default(1),
  panelOffsetX: schema.number().optional().default(0),
  panelOffsetY: schema.number().optional().default(0),
  panelMaxWidth: schema.number().optional().default(224),
  radius: schema.number().optional().default(12),
});

const HomeShowcaseFrameCopyControlsSchema = schema.object({
  titleMaxFont: schema.number(),
  titleMinFont: schema.number(),
  bodyMaxFont: schema.number(),
  bodyMinFont: schema.number(),
  bodyLineHeight: schema.number(),
  gap: schema.number(),
  titleLetterSpacing: schema.number(),
  titleColor: schema.string(),
  bodyColor: schema.string(),
  titleGlowColor: schema.string(),
  textAlign: schema.string(),
  bodyColorMode: schema.string().optional().default('solid'),
  bodyAccentPalette: schema.string().optional().default('#ffffff,#8fd8ff,#ffe187,#9dffc2,#ff70c8,#b88cff,#70c4ff'),
});

const HomeShowcaseFrameFooterControlsSchema = schema.object({
  height: schema.number(),
  insetX: schema.number(),
  showLine: schema.boolean().optional().default(true),
  lineInsetX: schema.number().optional().default(0),
  lineWidth: schema.number().optional().default(2),
  lineOpacity: schema.number().optional().default(0.42),
});

const HomeShowcaseFrameColorControlsSchema = schema.object({
  bodyStroke: schema.string(),
  stageStroke: schema.string(),
  stageFill: schema.string(),
  sideBFill: schema.string(),
  debugStage: schema.string(),
  debugBody: schema.string(),
});

const HomeShowcaseFrameControlGroupsSchema = schema.object({
  overall: HomeShowcaseFrameOverallControlsSchema,
  body: HomeShowcaseFrameBodyControlsSchema,
  sideA: HomeShowcaseFrameSideAControlsSchema,
  sideB: HomeShowcaseFrameSideBControlsSchema,
  startup: HomeShowcaseFrameStartupControlsSchema.default({}),
  copy: HomeShowcaseFrameCopyControlsSchema,
  footer: HomeShowcaseFrameFooterControlsSchema,
  colors: HomeShowcaseFrameColorControlsSchema,
});

const HomeShowcaseFrameControlVariantsSchema = schema.object({
  wide: HomeShowcaseFrameControlGroupsSchema.optional(),
  narrow: HomeShowcaseFrameControlGroupsSchema.optional(),
});

export const HomeShowcaseFrameControlsSchema = schema.object({
  overall: HomeShowcaseFrameOverallControlsSchema,
  body: HomeShowcaseFrameBodyControlsSchema,
  sideA: HomeShowcaseFrameSideAControlsSchema,
  sideB: HomeShowcaseFrameSideBControlsSchema,
  startup: HomeShowcaseFrameStartupControlsSchema.default({}),
  copy: HomeShowcaseFrameCopyControlsSchema,
  footer: HomeShowcaseFrameFooterControlsSchema,
  colors: HomeShowcaseFrameColorControlsSchema,
  items: schema.array(FeatureBannerItemSchema).optional(),
  variants: HomeShowcaseFrameControlVariantsSchema.optional(),
});

export const HomepageLayoutControlsSchema = schema.object({
  contentBoundsOverlay: schema.boolean().optional().default(false),
});

export const HomePageGamesDocumentSchema = schema.object({
  featured: schema.array(GameHomeSchema),
  recommended: schema.array(GameHomeSchema).optional().default([]),
  comingSoon: schema.array(ComingSoonTeaserSchema),
  catalogMontageImages: schema.array(ComingSoonTeaserSchema).optional().default([]),
  availableNow: schema.array(GameHomeSchema),
  featureBannerItems: schema.array(FeatureBannerItemSchema).optional().default([]),
  featuredShowcaseControls: FeaturedShowcaseControlsSchema.optional(),
  aboutShowcaseControls: HomeShowcaseFrameControlsSchema.optional(),
  comingSoonShowcaseControls: FeaturedShowcaseControlsSchema.optional(),
  homepageLayoutControls: HomepageLayoutControlsSchema.optional(),
  imageUrls: ImageUrlsSchema.optional(),
});

export type FeaturedShowcaseControlsData = schema.infer<typeof FeaturedShowcaseControlsSchema>;
export type HomeShowcaseFrameControlsData = schema.infer<typeof HomeShowcaseFrameControlsSchema>;
export type HomepageLayoutControlsData = schema.infer<typeof HomepageLayoutControlsSchema>;
export type HomePageGamesDocument = schema.infer<typeof HomePageGamesDocumentSchema>;
