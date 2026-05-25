import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { CSSProperties, ReactNode } from 'react';
import type { ShopIcon, ShopTone } from './ShopPageSvgData';

export type FeaturedShowcaseControlTab =
  | 'overall'
  | 'header'
  | 'body'
  | 'sideA'
  | 'sideB'
  | 'footer';

export type FeaturedShowcaseMediaFit = 'cover' | 'contain' | 'stretch';
export type FeaturedShowcaseButtonAlign = 'start' | 'center' | 'end';
export type FeaturedShowcaseControlVariant = 'wide' | 'narrow';
export type FeaturedShowcaseControlGroupOverrides<T> = {
  [G in keyof T]?: Partial<T[G]>;
};
export type FeaturedShowcaseResponsiveVariants<T> = Partial<Record<
  FeaturedShowcaseControlVariant,
  T
>>;

export type FeaturedShowcaseControlGroups = {
  overall: {
    viewWidth: number;
    canvasInsetX: number;
    parentBleedX: number;
    marginTop: number;
    marginBottom: number;
    narrowMarginTop: number;
    narrowMarginBottom: number;
    wideHeight: number;
    narrowHeight: number;
    stageY: number;
    stageWideH: number;
    stageNarrowH: number;
    stageRadius: number;
    edgeInset: number;
    narrowBreakpoint: number;
    debugBounds: boolean;
  };
  arrows: {
    width: number;
    height: number;
    gap: number;
    radius: number;
  };
  header: {
    insetX: number;
    tabTop: number;
    minTabsH: number;
    tabMaxFont: number;
    tabMinFont: number;
    tabFirstBoost: number;
    tabCountW: number;
    activeLineH: number;
  };
  body: {
    insetX: number;
    topGap: number;
    bottomGap: number;
    radius: number;
    splitRatio: number;
    narrowAHeightRatio: number;
    minAWidth: number;
    minBWidth: number;
    outlineWidth: number;
  };
  sideA: {
    topBadgeInset: number;
    topBadgeY: number;
    bottomBadgeInset: number;
    bottomBadgeBottom: number;
    topBadgeH: number;
    bottomBadgeH: number;
    learnMoreW: number;
    learnMoreH: number;
    learnMoreRight: number;
    learnMoreBottom: number;
    mediaFit: FeaturedShowcaseMediaFit;
    mediaAnchorX: number;
    mediaAnchorY: number;
    mediaOffsetX: number;
    mediaOffsetY: number;
    mediaScale: number;
    cardGap: number;
    cardMinW: number;
    cardPad: number;
    cardRadius: number;
    cardImageRatio: number;
    cardCopyPad: number;
    cardTitleMaxFont: number;
    narrowCardTitleMaxFont: number;
    cardDescMaxFont: number;
    narrowCardDescMaxFont: number;
    cardButtonW: number;
    narrowCardButtonW: number;
    cardButtonH: number;
    narrowCardButtonH: number;
    cardButtonFont: number;
    narrowCardButtonFont: number;
    cardButtonArrowW: number;
    narrowCardButtonArrowW: number;
    cardButtonAlign: FeaturedShowcaseButtonAlign;
    cardButtonBottom: number;
  };
  sideB: {
    outerPad: number;
    innerPad: number;
    gap: number;
    logoH: number;
    narrowLogoH: number;
    logoTaglineGap: number;
    narrowLogoTaglineGap: number;
    taglineH: number;
    narrowTaglineH: number;
    statusH: number;
    narrowStatusH: number;
    textPadX: number;
    logoMaxFont: number;
    narrowLogoMaxFont: number;
    taglineMaxFont: number;
    narrowTaglineMaxFont: number;
    descMaxFont: number;
    narrowDescMaxFont: number;
    descMinFont: number;
    narrowDescMinFont: number;
    statusLabelFont: number;
    narrowStatusLabelFont: number;
    statusValueFont: number;
    narrowStatusValueFont: number;
    montageRows: number;
    montageColumns: number;
    montageGap: number;
    montageH: number;
    montageImageRadius: number;
    montageImageFit: FeaturedShowcaseMediaFit;
    montageImageBlur: number;
    montageImageOutlineWidth: number;
    montageImageOutlineOpacity: number;
    montageSlideDuration: number;
    narrowMontageH: number;
    catalogPanelPadX: number;
    catalogPanelPadY: number;
    catalogCopyGap: number;
    catalogCopyOffsetY: number;
    catalogEyebrowFont: number;
    narrowCatalogEyebrowFont: number;
    catalogEyebrowGap: number;
    catalogTitleFont: number;
    narrowCatalogTitleFont: number;
    catalogTitleGap: number;
    catalogDescFont: number;
    narrowCatalogDescFont: number;
    catalogButtonW: number;
    narrowCatalogButtonW: number;
    catalogButtonH: number;
    narrowCatalogButtonH: number;
    catalogButtonFont: number;
    narrowCatalogButtonFont: number;
    catalogButtonArrowW: number;
    narrowCatalogButtonArrowW: number;
    catalogButtonAlign: FeaturedShowcaseButtonAlign;
  };
  footer: {
    height: number;
    maxVisible: number;
    inactiveW: number;
    activeMultiplier: number;
    pillH: number;
    minGap: number;
    trackInset: number;
    showLine: boolean;
    lineInset: number;
    lineWidth: number;
    lineOpacity: number;
  };
  colors: {
    bodyStroke: string;
    stageStroke: string;
    arrowHover: string;
    tabHover: string;
    learnMoreStroke: string;
  };
};

export type FeaturedShowcaseControls = FeaturedShowcaseControlGroups & {
  variants?: FeaturedShowcaseResponsiveVariants<FeaturedShowcaseControlGroups>;
};

export type FeaturedShowcaseNumberControlGroup = Exclude<keyof FeaturedShowcaseControlGroups, 'colors'>;

export type FeaturedShowcaseMediaSlot = {
  game: FeaturedGameItem;
  clipPathId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  activeImageIndex: number;
  prevImageIndex: number | null;
  isNarrow: boolean;
  mediaFit: FeaturedShowcaseMediaFit;
  mediaAnchorX: number;
  mediaAnchorY: number;
  mediaOffsetX: number;
  mediaOffsetY: number;
  mediaScale: number;
};

export type FeaturedShowcaseSideBSlot = {
  game: FeaturedGameItem;
  x: number;
  y: number;
  width: number;
  height: number;
  isNarrow: boolean;
};

export type FeaturedGameShowcasePreviewLayoutMode = 'auto' | 'wide' | 'narrow';

export type ShopMainCarouselCardItem = {
  key: string;
  title: string;
  subtitle: string;
  bodyLines?: string[] | undefined;
  layout?: 'image' | 'split' | undefined;
  imageFit?: 'contain' | 'cover' | 'fill' | undefined;
  imageAnchor?: 'top' | 'center' | 'bottom' | undefined;
  badgePlacement?: 'body' | 'header' | undefined;
  tone: ShopTone;
  icon: ShopIcon;
  badge?: string | undefined;
  imageUrl?: string | undefined;
  price?: string | undefined;
  actionLabel?: string | undefined;
  loading?: boolean;
  disabled?: boolean;
};

export type FeaturedGameShowcaseProps = {
  featured: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  isLoading?: boolean;
  controls?: FeaturedShowcaseControls;
  onLearnMore?: (gameIdentifier: string) => void;
  resolveImageUrl?: (hash: ImageHash) => string | null;
  renderMedia?: (slot: FeaturedShowcaseMediaSlot) => ReactNode;
  renderSideB?: (slot: FeaturedShowcaseSideBSlot) => ReactNode;
  allowDebugBounds?: boolean;
  previewLayoutMode?: FeaturedGameShowcasePreviewLayoutMode;
  className?: string;
  style?: CSSProperties;
  featuredLabel?: string;
  recommendedLabel?: string;
  cards?: ShopMainCarouselCardItem[];
  onCardAction?: (card: ShopMainCarouselCardItem) => void;
  showBadges?: boolean;
  showLearnMore?: boolean;
  showHeaderCount?: boolean;
  rightActionLabel?: string;
  onRightAction?: () => void;
  showNavigation?: boolean;
  navigationPageCount?: number;
  navigationPageIndex?: number;
  onNavigationPageChange?: (pageIndex: number) => void;
};

export const DEFAULT_FEATURED_SHOWCASE_CONTROLS: FeaturedShowcaseControls = {
  overall: {
    viewWidth: 1505,
    canvasInsetX: 0,
    parentBleedX: 0,
    marginTop: 0,
    marginBottom: 0,
    narrowMarginTop: 0,
    narrowMarginBottom: 0,
    wideHeight: 532,
    narrowHeight: 860,
    stageY: 10,
    stageWideH: 513,
    stageNarrowH: 660,
    stageRadius: 18,
    edgeInset: 0,
    narrowBreakpoint: 780,
    debugBounds: false,
  },
  arrows: {
    width: 30,
    height: 307,
    gap: -2,
    radius: 14,
  },
  header: {
    insetX: 22,
    tabTop: 12,
    minTabsH: 58,
    tabMaxFont: 24,
    tabMinFont: 16,
    tabFirstBoost: 8,
    tabCountW: 54,
    activeLineH: 3,
  },
  body: {
    insetX: 22,
    topGap: 16,
    bottomGap: 16,
    radius: 10,
    splitRatio: 0.69,
    narrowAHeightRatio: 0.58,
    minAWidth: 390,
    minBWidth: 230,
    outlineWidth: 1.4,
  },
  sideA: {
    topBadgeInset: 18,
    topBadgeY: 18,
    bottomBadgeInset: 18,
    bottomBadgeBottom: 46,
    topBadgeH: 28,
    bottomBadgeH: 30,
    learnMoreW: 154,
    learnMoreH: 48,
    learnMoreRight: 18,
    learnMoreBottom: 18,
    mediaFit: 'cover',
    mediaAnchorX: 50,
    mediaAnchorY: 50,
    mediaOffsetX: 0,
    mediaOffsetY: 0,
    mediaScale: 1,
    cardGap: 12,
    cardMinW: 144,
    cardPad: 12,
    cardRadius: 8,
    cardImageRatio: 0.58,
    cardCopyPad: 10,
    cardTitleMaxFont: 18,
    narrowCardTitleMaxFont: 22,
    cardDescMaxFont: 13,
    narrowCardDescMaxFont: 15,
    cardButtonW: 132,
    narrowCardButtonW: 154,
    cardButtonH: 38,
    narrowCardButtonH: 44,
    cardButtonFont: 12.5,
    narrowCardButtonFont: 14,
    cardButtonArrowW: 34,
    narrowCardButtonArrowW: 38,
    cardButtonAlign: 'start',
    cardButtonBottom: 8,
  },
  sideB: {
    outerPad: 4,
    innerPad: 2,
    gap: 0,
    logoH: 85,
    narrowLogoH: 96,
    logoTaglineGap: 0,
    narrowLogoTaglineGap: 0,
    taglineH: 20,
    narrowTaglineH: 28,
    statusH: 75,
    narrowStatusH: 92,
    textPadX: 10,
    logoMaxFont: 38,
    narrowLogoMaxFont: 52,
    taglineMaxFont: 12,
    narrowTaglineMaxFont: 16,
    descMaxFont: 20,
    narrowDescMaxFont: 26,
    descMinFont: 15,
    narrowDescMinFont: 17,
    statusLabelFont: 13,
    narrowStatusLabelFont: 16,
    statusValueFont: 15,
    narrowStatusValueFont: 18,
    montageRows: 2,
    montageColumns: 3,
    montageGap: 5,
    montageH: 190,
    montageImageRadius: 7,
    montageImageFit: 'cover',
    montageImageBlur: 1,
    montageImageOutlineWidth: 1,
    montageImageOutlineOpacity: 0.38,
    montageSlideDuration: 28,
    narrowMontageH: 260,
    catalogPanelPadX: 12,
    catalogPanelPadY: 12,
    catalogCopyGap: 8,
    catalogCopyOffsetY: 0,
    catalogEyebrowFont: 12,
    narrowCatalogEyebrowFont: 15,
    catalogEyebrowGap: 3,
    catalogTitleFont: 34,
    narrowCatalogTitleFont: 52,
    catalogTitleGap: 5,
    catalogDescFont: 15,
    narrowCatalogDescFont: 18,
    catalogButtonW: 170,
    narrowCatalogButtonW: 210,
    catalogButtonH: 44,
    narrowCatalogButtonH: 52,
    catalogButtonFont: 13,
    narrowCatalogButtonFont: 15,
    catalogButtonArrowW: 36,
    narrowCatalogButtonArrowW: 42,
    catalogButtonAlign: 'start',
  },
  footer: {
    height: 26,
    maxVisible: 31,
    inactiveW: 16,
    activeMultiplier: 2,
    pillH: 8,
    minGap: 5,
    trackInset: 24,
    showLine: true,
    lineInset: 0,
    lineWidth: 2,
    lineOpacity: 0.42,
  },
  colors: {
    bodyStroke: '#64d8ff',
    stageStroke: '#5fc9ff',
    arrowHover: '#47f29a',
    tabHover: '#47f29a',
    learnMoreStroke: '#64d8ff',
  },
};

type FeaturedShowcasePrimitiveGroup = Record<string, number | boolean | string>;

type FeaturedShowcaseVariantGroups = FeaturedShowcaseResponsiveVariants<FeaturedShowcaseControlGroups>;

function serializePrimitiveControlGroup<T extends FeaturedShowcasePrimitiveGroup>(
  defaults: T,
  value: T,
): T {
  const next: FeaturedShowcasePrimitiveGroup = { ...defaults };
  const record = value as FeaturedShowcasePrimitiveGroup;

  for (const key of Object.keys(defaults)) {
    const defaultValue = defaults[key];
    const incoming = record[key];
    if (
      typeof defaultValue === 'number' &&
      typeof incoming === 'number' &&
      Number.isFinite(incoming)
    ) {
      next[key] = incoming;
    } else if (
      typeof defaultValue === 'boolean' &&
      typeof incoming === 'boolean'
    ) {
      next[key] = incoming;
    } else if (
      typeof defaultValue === 'string' &&
      typeof incoming === 'string'
    ) {
      next[key] = incoming;
    }
  }

  return next as T;
}

function normalizeFeaturedShowcaseMediaFit(value: string): FeaturedShowcaseMediaFit {
  return value === 'contain' || value === 'stretch' ? value : 'cover';
}

function normalizeFeaturedShowcaseButtonAlign(value: string): FeaturedShowcaseButtonAlign {
  return value === 'center' || value === 'end' ? value : 'start';
}

function serializeFeaturedShowcaseControlGroups(
  controls: FeaturedShowcaseControlGroups,
): FeaturedShowcaseControlGroups {
  return {
    overall: serializePrimitiveControlGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.overall,
      controls.overall,
    ),
    arrows: serializePrimitiveControlGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.arrows,
      controls.arrows,
    ),
    header: serializePrimitiveControlGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.header,
      controls.header,
    ),
    body: serializePrimitiveControlGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.body,
      controls.body,
    ),
    sideA: {
      ...serializePrimitiveControlGroup(
        DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA,
        controls.sideA,
      ),
      mediaFit: normalizeFeaturedShowcaseMediaFit(controls.sideA.mediaFit),
      cardButtonAlign: normalizeFeaturedShowcaseButtonAlign(controls.sideA.cardButtonAlign),
    },
    sideB: {
      ...serializePrimitiveControlGroup(
        DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideB,
        controls.sideB,
      ),
      montageImageFit: normalizeFeaturedShowcaseMediaFit(controls.sideB.montageImageFit),
      catalogButtonAlign: normalizeFeaturedShowcaseButtonAlign(controls.sideB.catalogButtonAlign),
    },
    footer: serializePrimitiveControlGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.footer,
      controls.footer,
    ),
    colors: serializePrimitiveControlGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.colors,
      controls.colors,
    ),
  };
}

function mergeFeaturedShowcaseControlGroups(
  base: FeaturedShowcaseControlGroups,
  overrides?: FeaturedShowcaseControlGroupOverrides<FeaturedShowcaseControlGroups>,
): FeaturedShowcaseControlGroups {
  if (!overrides) return base;
  return {
    overall: { ...base.overall, ...overrides.overall },
    arrows: { ...base.arrows, ...overrides.arrows },
    header: { ...base.header, ...overrides.header },
    body: { ...base.body, ...overrides.body },
    sideA: { ...base.sideA, ...overrides.sideA },
    sideB: { ...base.sideB, ...overrides.sideB },
    footer: { ...base.footer, ...overrides.footer },
    colors: { ...base.colors, ...overrides.colors },
  };
}

function serializeFeaturedShowcaseVariants(
  base: FeaturedShowcaseControlGroups,
  variants?: FeaturedShowcaseVariantGroups,
): FeaturedShowcaseVariantGroups {
  return {
    wide: serializeFeaturedShowcaseControlGroups(
      mergeFeaturedShowcaseControlGroups(base, variants?.wide),
    ),
    narrow: serializeFeaturedShowcaseControlGroups(
      mergeFeaturedShowcaseControlGroups(base, variants?.narrow),
    ),
  };
}

export function serializeFeaturedShowcaseControls(
  controls: FeaturedShowcaseControls,
): FeaturedShowcaseControls {
  const base = serializeFeaturedShowcaseControlGroups(controls);
  return {
    ...base,
    variants: serializeFeaturedShowcaseVariants(base, controls.variants),
  };
}

export function resolveFeaturedShowcaseControlsForVariant(
  controls: FeaturedShowcaseControls,
  variant: FeaturedShowcaseControlVariant,
): FeaturedShowcaseControlGroups {
  const base = serializeFeaturedShowcaseControlGroups(controls);
  return serializeFeaturedShowcaseControlGroups(
    mergeFeaturedShowcaseControlGroups(base, controls.variants?.[variant]),
  );
}
