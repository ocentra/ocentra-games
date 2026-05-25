import { ShopPageMainCarouselFrame } from './ShopPageMainCarouselFrame';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  type FeaturedShowcaseControls,
  type FeaturedShowcaseMediaSlot,
  type ShopMainCarouselCardItem,
} from './ShopPageMainCarouselFrame.types';

type MainBottomProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  profileLabel?: string;
  count?: number;
  cards?: ShopMainCarouselCardItem[];
  onCardAction?: (card: ShopMainCarouselCardItem) => void;
  rightActionLabel?: string;
  onRightAction?: () => void;
  showHeaderCount?: boolean;
  showNavigation?: boolean;
  navigationPageCount?: number;
  navigationPageIndex?: number;
  onNavigationPageChange?: (pageIndex: number) => void;
};

type MainBottomCardProfile = {
  width: number;
  gap: number;
  pad: number;
  titleMaxFont: number;
};

function mainBottomCardProfile(label: string): MainBottomCardProfile {
  if (label === 'Elite') return { width: 430, gap: 10, pad: 7, titleMaxFont: 13 };
  return {
    width: DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA.cardMinW,
    gap: DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA.cardGap,
    pad: DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA.cardPad,
    titleMaxFont: DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA.cardTitleMaxFont,
  };
}

function createMainBottomControls(frameW: number, frameH: number, label: string): FeaturedShowcaseControls {
  const stageY = 4;
  const stageH = Math.max(1, frameH - stageY * 2);
  const cardProfile = mainBottomCardProfile(label);
  return {
    ...DEFAULT_FEATURED_SHOWCASE_CONTROLS,
    overall: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.overall,
      viewWidth: Math.max(1, frameW),
      wideHeight: Math.max(1, frameH),
      stageY,
      stageWideH: stageH,
      stageRadius: 8,
      canvasInsetX: 0,
      parentBleedX: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    arrows: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.arrows,
      width: 22,
      height: Math.max(28, Math.min(Math.max(28, stageH - 16), frameH * 0.48)),
      gap: -1,
      radius: 7,
    },
    header: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.header,
      insetX: 16,
      tabTop: 7,
      minTabsH: 38,
      tabMaxFont: 17,
      tabMinFont: 11,
      tabFirstBoost: 5,
      tabCountW: 40,
      activeLineH: 2,
    },
    body: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.body,
      insetX: 16,
      topGap: 7,
      bottomGap: 5,
      radius: 6,
      minAWidth: 160,
      outlineWidth: 1.1,
    },
    sideA: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA,
      cardGap: cardProfile.gap,
      cardMinW: cardProfile.width,
      cardPad: cardProfile.pad,
      cardRadius: 5,
      cardCopyPad: 8,
      cardTitleMaxFont: cardProfile.titleMaxFont,
    },
    footer: {
      ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.footer,
      height: 16,
      inactiveW: 10,
      activeMultiplier: 1.8,
      pillH: 5,
      minGap: 4,
      trackInset: 18,
      lineWidth: 1.4,
      lineOpacity: 0.34,
    },
  };
}

function renderMainBottomGlass({ x, y, width, height }: FeaturedShowcaseMediaSlot) {
  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          background: 'rgba(4,18,30,.22)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />
    </foreignObject>
  );
}

export function MainBottom({
  x,
  y,
  w,
  h,
  label,
  profileLabel,
  count = 0,
  cards,
  onCardAction,
  rightActionLabel,
  onRightAction,
  showHeaderCount = true,
  showNavigation = true,
  navigationPageCount,
  navigationPageIndex,
  onNavigationPageChange,
}: MainBottomProps) {
  if (w <= 0 || h <= 0) return null;
  const controls = createMainBottomControls(w, h, profileLabel ?? label);
  const resolvedCards = cards ?? [];
  const featured = resolvedCards.length > 0 ? [] : Array.from({ length: Math.max(0, Math.round(count)) }, (_, index) => ({
    gameId: `${label.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    guid: `${label.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    name: label,
    enabled: true,
    tags: [],
    tagline: label,
    shortDescription: label,
    description: label,
    featuredTopBadges: [],
    featuredBottomBadges: [],
  }));

  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <ShopPageMainCarouselFrame
          featured={featured}
          recommended={[]}
          isLoading={false}
          controls={controls}
          previewLayoutMode="wide"
          renderMedia={renderMainBottomGlass}
          featuredLabel={label}
          cards={resolvedCards}
          onCardAction={onCardAction}
          showBadges={false}
          showLearnMore={false}
          showHeaderCount={showHeaderCount}
          rightActionLabel={rightActionLabel}
          onRightAction={onRightAction}
          showNavigation={showNavigation}
          navigationPageCount={navigationPageCount}
          navigationPageIndex={navigationPageIndex}
          onNavigationPageChange={onNavigationPageChange}
          style={{ width: '100%' }}
        />
      </div>
    </foreignObject>
  );
}
