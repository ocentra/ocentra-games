import { lazy, Suspense, useCallback, useMemo, useState, type CSSProperties } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeatureBannerItem as HomepageFeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import { HomeShowcaseFrame } from '../HomeShowcaseFrame/HomeShowcaseFrame';
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  type HomeShowcaseFrameControls,
  type HomeShowcasePreviewLayoutMode,
} from '../HomeShowcaseFrame/HomeShowcaseFrame.types';
import './FeatureBannerSection.css';

type FeatureBannerSectionProps = {
  featureBannerItems?: HomepageFeatureBannerItem[];
  resolveImageUrl?: (hash: ImageHash) => string | null;
  controls?: HomeShowcaseFrameControls;
  allowDebugBounds?: boolean;
  previewLayoutMode?: HomeShowcasePreviewLayoutMode;
};

const RubikBannerCube = lazy(() => import('./RubikBannerCube').then((m) => ({ default: m.RubikBannerCube })));

function parseAccentPalette(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function FeatureBannerSection({
  featureBannerItems = [],
  resolveImageUrl,
  controls,
  allowDebugBounds = false,
  previewLayoutMode = 'auto',
}: FeatureBannerSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cubeReady, setCubeReady] = useState(false);
  const activeFeatureBannerItems =
    Array.isArray(controls?.items) && controls.items.length > 0
      ? controls.items
      : featureBannerItems;
  const slides = useMemo(
    () =>
      activeFeatureBannerItems.map((item) => ({
        title: item.title,
        description: item.description,
        image: isImageHash(item.imageHash)
          ? (resolveImageUrl?.(item.imageHash as ImageHash) ?? undefined)
          : undefined,
      })),
    [activeFeatureBannerItems, resolveImageUrl]
  );

  const goToSlide = useCallback((newSlide: number) => {
    if (newSlide === currentSlide) return;
    setCurrentSlide(newSlide);
  }, [currentSlide]);

  const handleIdleComplete = useCallback(() => {
    if (slides.length > 1) {
      const nextSlide = (currentSlide + 1) % slides.length;
      goToSlide(nextSlide);
    }
  }, [currentSlide, slides.length, goToSlide]);

  if (slides.length === 0) {
    return null;
  }

  const currentItem = slides[currentSlide] ?? slides[0];
  const withImages = slides
    .map((item, index) => ({ image: item.image, originalIndex: index }))
    .filter((item): item is { image: string; originalIndex: number } => Boolean(item.image));
  const imageSources = withImages.map((item) => item.image);
  const targetIndex = Math.max(0, withImages.findIndex((item) => item.originalIndex === currentSlide));
  const copyControls = {
    ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy,
    ...controls?.copy,
  };
  const cubeRenderScale = Math.max(
    1,
    Math.min(4, controls?.sideA?.contentScale ?? DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA.contentScale),
  );
  const sideAControls = {
    ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA,
    ...controls?.sideA,
  };
  const copyTextAlign =
    copyControls.textAlign === 'center' || copyControls.textAlign === 'right'
      ? copyControls.textAlign
      : 'left';
  const bodyAccentPalette = parseAccentPalette(copyControls.bodyAccentPalette);
  const bodyLineColor =
    copyControls.bodyColorMode === 'palette' && bodyAccentPalette.length > 0
      ? bodyAccentPalette[currentSlide % bodyAccentPalette.length]
      : copyControls.bodyColor;
  const titleFitDivisor = Math.max(7, currentItem.title.length * 0.64);
  const bodyLongestWord = currentItem.description
    .split(/\s+/)
    .reduce((longest, word) => Math.max(longest, word.length), 1);
  const bodyWordFitDivisor = Math.max(8, bodyLongestWord * 0.54);
  const copyStyle = {
    '--feature-banner-title-max-font': `${copyControls.titleMaxFont / 16}rem`,
    '--feature-banner-title-min-font': `${copyControls.titleMinFont / 16}rem`,
    '--feature-banner-title-fit-font': `${100 / titleFitDivisor}cqw`,
    '--feature-banner-body-max-font': `${copyControls.bodyMaxFont / 16}rem`,
    '--feature-banner-body-min-font': `${copyControls.bodyMinFont / 16}rem`,
    '--feature-banner-body-word-fit-font': `${100 / bodyWordFitDivisor}cqw`,
    '--feature-banner-body-line-height': copyControls.bodyLineHeight,
    '--feature-banner-copy-gap': `${copyControls.gap / 16}rem`,
    '--feature-banner-title-letter-spacing': `${copyControls.titleLetterSpacing}em`,
    '--feature-banner-title-color': copyControls.titleColor,
    '--feature-banner-body-color': bodyLineColor,
    '--feature-banner-title-glow-color': copyControls.titleGlowColor,
    '--feature-banner-text-align': copyTextAlign,
    '--feature-banner-align-items': copyTextAlign === 'center' ? 'center' : copyTextAlign === 'right' ? 'flex-end' : 'flex-start',
    '--feature-banner-cube-glow-opacity': sideAControls.glowOpacity,
    '--feature-banner-cube-glow-size': `${sideAControls.glowSize}%`,
    '--feature-banner-cube-glow-blur': `${sideAControls.glowBlur}px`,
    '--feature-banner-cube-glow-offset-x': `${sideAControls.glowOffsetX}px`,
    '--feature-banner-cube-glow-offset-y': `${sideAControls.glowOffsetY}px`,
  } as CSSProperties;

  return (
    <HomeShowcaseFrame
      className="feature-banner-showcase"
      controls={controls}
      style={copyStyle}
      allowDebugBounds={allowDebugBounds}
      previewLayoutMode={previewLayoutMode}
      sideA={() => (
        <div className={`feature-banner-showcase__cube-panel ${cubeReady ? 'feature-banner-showcase__cube-panel--ready' : ''}`}>
          {imageSources.length > 0 ? (
            <Suspense fallback={null}>
              <RubikBannerCube
                images={imageSources}
                targetIndex={targetIndex}
                renderScale={cubeRenderScale}
                onIdleComplete={handleIdleComplete}
                onReadyChange={setCubeReady}
              />
            </Suspense>
          ) : (
            <div className="feature-banner-showcase__empty-cube" />
          )}
        </div>
      )}
      sideB={() => (
        <div className="feature-banner-showcase__copy-panel">
          <h3 className="feature-banner-showcase__title">{currentItem.title}</h3>
          <p className="feature-banner-showcase__description">{currentItem.description}</p>
        </div>
      )}
      footer={slides.length > 1 ? () => (
        <div className="feature-banner-showcase__indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`feature-banner-showcase__indicator ${index === currentSlide ? 'feature-banner-showcase__indicator--active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      ) : undefined}
    />
  );
}
