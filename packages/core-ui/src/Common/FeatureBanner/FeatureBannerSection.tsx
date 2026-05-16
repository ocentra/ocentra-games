import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { FeatureBannerItem as HomepageFeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import {
  DailyRewardSpinDialog,
  DailyRewardSpinPanel,
  type DailyRewardSpinStatus,
} from '../Rewards/DailyRewardSpinPanel';
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
  dailyRewardStatus?: DailyRewardSpinStatus | null;
  onDailyRewardSpin?: () => void;
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

function dailyRewardAmountLabel(status?: DailyRewardSpinStatus | null): string {
  const label = status?.rewardLabel?.trim() || '';
  return /^daily reward$/i.test(label) ? '' : label;
}

function dailyRewardCollected(status?: DailyRewardSpinStatus | null): boolean {
  const readyLabel = status?.readyLabel?.toLowerCase() ?? '';
  return Boolean(status?.claimed || status?.alreadyClaimed || readyLabel.includes('claimed') || readyLabel.includes('collected'));
}

function startupRewardCopy(status?: DailyRewardSpinStatus | null, loadingCube = false): {
  title: string;
  description: string;
} {
  const amount = dailyRewardAmountLabel(status);
  if (status?.claiming) {
    return {
      title: 'Claiming Daily Reward',
      description: amount ? `${amount} is being added to your account.` : 'Your daily reward is being added to your account.',
    };
  }

  if (dailyRewardCollected(status)) {
    return {
      title: amount ? `Daily Reward Collected ${amount}` : 'Daily Reward Collected',
      description: 'Today\'s spin is already claimed.',
    };
  }

  if (!status) {
    return {
      title: 'Claim Daily Reward',
      description: loadingCube ? 'Checking today\'s spin while the showcase prepares.' : 'Checking today\'s spin.',
    };
  }

  if (status.available === false && status.readyLabel) {
    return {
      title: 'Claim Daily Reward',
      description: status.readyLabel,
    };
  }

  return {
    title: 'Claim Daily Reward',
    description: amount ? `${amount} is ready to collect.` : 'Click the spinner to open your daily reward.',
  };
}

export function FeatureBannerSection({
  featureBannerItems = [],
  resolveImageUrl,
  controls,
  allowDebugBounds = false,
  previewLayoutMode = 'auto',
  dailyRewardStatus,
  onDailyRewardSpin,
}: FeatureBannerSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cubeReady, setCubeReady] = useState(false);
  const [startupCoverVisible, setStartupCoverVisible] = useState(true);
  const [startupCoverReleasing, setStartupCoverReleasing] = useState(false);
  const [startupCoverDismissed, setStartupCoverDismissed] = useState(false);
  const [deferredStartupIdleComplete, setDeferredStartupIdleComplete] = useState(false);
  const [imageLoadFallbackReady, setImageLoadFallbackReady] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
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
  const withImages = slides
    .map((item, index) => ({ image: item.image, originalIndex: index }))
    .filter((item): item is { image: string; originalIndex: number } => Boolean(item.image));
  const imageSources = withImages.map((item) => item.image);
  const imageSourcesKey = `${slides.length}:${imageSources.join('|')}`;
  const hasExpectedImages = activeFeatureBannerItems.some((item) => isImageHash(item.imageHash));
  const hasRewardEntryPoint = Boolean(dailyRewardStatus || onDailyRewardSpin);
  const startupControls = {
    ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.startup,
    ...controls?.startup,
  };
  const startupCoverEnabled = Boolean(startupControls.enabled);
  const startupMaskActive = startupCoverEnabled && (startupCoverVisible || startupCoverReleasing);
  const startupHoldAfterReadyMs = Math.max(0, startupControls.holdAfterReadyMs);

  const goToSlide = useCallback((newSlide: number) => {
    if (newSlide === currentSlide) return;
    setCurrentSlide(newSlide);
  }, [currentSlide]);

  const openRewardDialog = useCallback(() => {
    if (!hasRewardEntryPoint) return;
    setRewardDialogOpen(true);
  }, [hasRewardEntryPoint]);

  const advanceToNextSlide = useCallback(() => {
    if (slides.length > 1) {
      const nextSlide = (currentSlide + 1) % slides.length;
      goToSlide(nextSlide);
    }
  }, [currentSlide, slides.length, goToSlide]);

  const handleIdleComplete = useCallback(() => {
    if (startupMaskActive) {
      setDeferredStartupIdleComplete(true);
      return;
    }

    advanceToNextSlide();
  }, [advanceToNextSlide, startupMaskActive]);

  useEffect(() => {
    if (startupMaskActive || !deferredStartupIdleComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDeferredStartupIdleComplete(false);
      advanceToNextSlide();
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [advanceToNextSlide, deferredStartupIdleComplete, startupMaskActive]);

  useEffect(() => {
    if (!startupCoverEnabled || !cubeReady || !startupCoverVisible || startupCoverReleasing || dailyRewardStatus?.claiming) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStartupCoverReleasing(true);
    }, startupHoldAfterReadyMs);
    return () => window.clearTimeout(timeoutId);
  }, [
    cubeReady,
    dailyRewardStatus?.claiming,
    startupCoverEnabled,
    startupCoverReleasing,
    startupCoverVisible,
    startupHoldAfterReadyMs,
  ]);

  useEffect(() => {
    if (!startupCoverReleasing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStartupCoverDismissed(true);
      setStartupCoverVisible(false);
      setStartupCoverReleasing(false);
    }, Math.max(0, startupControls.fadeMs));
    return () => window.clearTimeout(timeoutId);
  }, [startupCoverReleasing, startupControls.fadeMs]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!startupCoverEnabled) {
        setStartupCoverVisible(false);
        setStartupCoverReleasing(false);
        return;
      }

      if (!startupCoverDismissed && !startupCoverReleasing) {
        setStartupCoverVisible(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [startupCoverDismissed, startupCoverEnabled, startupCoverReleasing]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCubeReady(false);
      setImageLoadFallbackReady(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [imageSourcesKey]);

  useEffect(() => {
    if (slides.length === 0 || imageSources.length > 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setImageLoadFallbackReady(hasExpectedImages);
      setCubeReady(true);
    }, hasExpectedImages ? 2800 : 220);
    return () => window.clearTimeout(timeoutId);
  }, [hasExpectedImages, imageSources.length, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const currentItem = slides[currentSlide] ?? slides[0];
  const targetIndex = Math.max(0, withImages.findIndex((item) => item.originalIndex === currentSlide));
  const shouldRenderEmptyCube = !hasExpectedImages && imageLoadFallbackReady;
  const activeCopy = startupMaskActive
    ? startupRewardCopy(dailyRewardStatus, !cubeReady)
    : {
        title: currentItem.title,
        description: currentItem.description,
      };
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
  const startupPanelScale = Math.max(0.1, startupControls.panelScale);
  const startupCoverInverseScale = startupPanelScale / Math.max(0.1, sideAControls.contentScale);
  const copyTextAlign =
    copyControls.textAlign === 'center' || copyControls.textAlign === 'right'
      ? copyControls.textAlign
      : 'left';
  const bodyAccentPalette = parseAccentPalette(copyControls.bodyAccentPalette);
  const bodyLineColor =
    copyControls.bodyColorMode === 'palette' && bodyAccentPalette.length > 0
      ? bodyAccentPalette[currentSlide % bodyAccentPalette.length]
      : copyControls.bodyColor;
  const titleFitDivisor = Math.max(7, activeCopy.title.length * 0.64);
  const bodyLongestWord = activeCopy.description
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
    '--feature-banner-startup-fade-ms': `${Math.max(0, startupControls.fadeMs)}ms`,
    '--feature-banner-startup-overlay-opacity': startupControls.overlayOpacity,
    '--feature-banner-startup-accent-opacity': startupControls.accentOpacity,
    '--feature-banner-startup-radius': `${startupControls.radius / 16}rem`,
    '--feature-banner-startup-cover-inverse-scale': startupCoverInverseScale,
    '--feature-banner-startup-panel-offset-x': `${startupControls.panelOffsetX / 16}rem`,
    '--feature-banner-startup-panel-offset-y': `${startupControls.panelOffsetY / 16}rem`,
    '--feature-banner-startup-panel-max-width': `${startupControls.panelMaxWidth / 16}rem`,
  } as CSSProperties;
  const cubePanelClassName = [
    'feature-banner-showcase__cube-panel',
    cubeReady ? 'feature-banner-showcase__cube-panel--ready' : '',
    startupMaskActive ? 'feature-banner-showcase__cube-panel--startup-masked' : '',
    startupCoverEnabled && startupCoverDismissed && !startupMaskActive
      ? 'feature-banner-showcase__cube-panel--startup-revealed'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="feature-banner-showcase-shell">
        <HomeShowcaseFrame
          className="feature-banner-showcase"
          controls={controls}
          style={copyStyle}
          allowDebugBounds={allowDebugBounds}
          previewLayoutMode={previewLayoutMode}
          sideA={() => (
            <div className={cubePanelClassName}>
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
              ) : shouldRenderEmptyCube ? (
                <div className="feature-banner-showcase__empty-cube" />
              ) : null}
              {startupCoverEnabled && startupMaskActive ? (
                <div className={`feature-banner-showcase__startup-cover ${startupCoverReleasing ? 'feature-banner-showcase__startup-cover--releasing' : ''}`}>
                  <DailyRewardSpinPanel
                    status={dailyRewardStatus}
                    onOpen={hasRewardEntryPoint ? openRewardDialog : undefined}
                    loadingCube={!cubeReady}
                  />
                </div>
              ) : null}
            </div>
          )}
          sideB={() => (
            <div className="feature-banner-showcase__copy-panel">
              <h3 className="feature-banner-showcase__title">{activeCopy.title}</h3>
              <p className="feature-banner-showcase__description">{activeCopy.description}</p>
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
      </div>
      <DailyRewardSpinDialog
        open={rewardDialogOpen}
        status={dailyRewardStatus}
        onClose={() => setRewardDialogOpen(false)}
        onSpin={onDailyRewardSpin}
      />
    </>
  );
}
