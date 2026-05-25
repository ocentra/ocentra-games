import { ShopPageMainCarouselFrame } from './ShopPageMainCarouselFrame';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  type FeaturedShowcaseControls,
  type FeaturedShowcaseMediaSlot,
  type ShopMainCarouselCardItem,
} from './ShopPageMainCarouselFrame.types';

type MainTopProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  profileLabel?: string;
  cards?: ShopMainCarouselCardItem[];
  onCardAction?: (card: ShopMainCarouselCardItem) => void;
  rightActionLabel?: string;
  onRightAction?: () => void;
  showHeaderCount?: boolean;
};

type MainTopCardProfile = {
  width: number;
  gap: number;
  pad: number;
  titleMaxFont: number;
};

function mainTopCardProfile(label: string): MainTopCardProfile {
  if (label === 'Treasury') return { width: 220, gap: 10, pad: 7, titleMaxFont: 13 };
  if (label === 'Elite') return { width: 430, gap: 10, pad: 7, titleMaxFont: 13 };
  if (label === 'Vault') return { width: 250, gap: 10, pad: 7, titleMaxFont: 13 };
  if (label === 'Play Access') return { width: 250, gap: 10, pad: 7, titleMaxFont: 13 };
  if (label === 'Events') return { width: 250, gap: 10, pad: 7, titleMaxFont: 13 };
  return { width: 176, gap: 10, pad: 7, titleMaxFont: 13 };
}

function createMainTopControls(frameW: number, frameH: number, label: string): FeaturedShowcaseControls {
  const stageY = 4;
  const stageH = Math.max(1, frameH - stageY * 2);
  const cardProfile = mainTopCardProfile(label);
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
      cardButtonW: 92,
      cardButtonH: 22,
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

function renderMainTopGlass({ x, y, width, height }: FeaturedShowcaseMediaSlot) {
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

export function MainTop({ x, y, w, h, label, profileLabel, cards, onCardAction, rightActionLabel, onRightAction, showHeaderCount = true }: MainTopProps) {
  if (w <= 0 || h <= 0) return null;
  const controls = createMainTopControls(w, h, profileLabel ?? label);

  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <ShopPageMainCarouselFrame
          featured={[]}
          recommended={[]}
          isLoading={false}
          controls={controls}
          previewLayoutMode="wide"
          renderMedia={renderMainTopGlass}
          featuredLabel={label}
          cards={cards ?? []}
          onCardAction={onCardAction}
          showBadges={false}
          showLearnMore={false}
          showHeaderCount={showHeaderCount}
          rightActionLabel={rightActionLabel}
          onRightAction={onRightAction}
          style={{ width: '100%' }}
        />
      </div>
    </foreignObject>
  );
}
