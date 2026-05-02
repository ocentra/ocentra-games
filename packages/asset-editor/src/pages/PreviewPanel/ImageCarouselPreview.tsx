import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSON5 from 'json5';
import { AssetTypeCategory, MimeTypes } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { CarouselSlide } from '@ocentra/game-asset-domain/content/imageCarousel/ImageCarousel';
import { BannerPlaybackMode, BannerTransitionType } from '@ocentra/game-asset-domain/constants/banner-presentation';
import type { BannerPlaybackModeValue, BannerTransitionTypeValue } from '@ocentra/game-asset-domain/constants/banner-presentation';
import { getBannerPlaybackImageCount } from '@ocentra/core-ui/Common/FeaturedGameCarousel/bannerPlayback';
import { FeaturedGameBannerStage } from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameCarousel';
import type { FeaturedBannerComposition } from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameCarousel';
import type { AssetData } from '@/types/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { ImageBatchLoadRequestEvent, ImageLoadPriority, type ImageBatchRequestItem } from '@ocentra/eventing-domain/events/image/ImageBatchLoadRequestEvent';
import { ImageBatchLoadedEvent } from '@ocentra/eventing-domain/events/image/ImageBatchLoadedEvent';
import { createGuid } from '@ocentra/app-core/guid';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';
import { computeAssetHash } from '@/adapters/assets/TauriAssetAdapter';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import './ImageCarouselPreview.css';

interface ImageCarouselPreviewProps {
  assetId: string;
  assetData: AssetData;
  onAssetUpdate?: (updatedData: AssetData) => void;
}

type ImageCarouselDraftData = Record<string, unknown>;
type ComposerTab = 'base' | 'identity' | 'motion' | 'look' | 'reveal';

const TRANSITION_OPTIONS = [
  BannerTransitionType.CrossDissolve,
  BannerTransitionType.Swipe,
  BannerTransitionType.Cut,
] as const;

const PLAYBACK_OPTIONS = [
  BannerPlaybackMode.PingPong,
  BannerPlaybackMode.Linear,
] as const;

const COMPOSER_TABS: { id: ComposerTab; label: string }[] = [
  { id: 'base', label: 'Base Images' },
  { id: 'identity', label: 'Identity' },
  { id: 'motion', label: 'Motion' },
  { id: 'look', label: 'Look' },
  { id: 'reveal', label: 'Reveal' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  const text = stringValue(value).trim();
  return text.length > 0 ? text : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function imageHashValue(value: unknown): ImageHash | undefined {
  return typeof value === 'string' && isImageHash(value) ? value : undefined;
}

const carouselImageUrlCache = new Map<string, string>();

function getCachedCarouselUrls(hashes: string[]): Map<string, string> {
  const urls = new Map<string, string>();
  hashes.forEach((hash) => {
    const url = carouselImageUrlCache.get(hash);
    if (url) urls.set(hash, url);
  });
  return urls;
}

function transitionValue(value: unknown): BannerTransitionTypeValue {
  return TRANSITION_OPTIONS.includes(value as BannerTransitionTypeValue)
    ? value as BannerTransitionTypeValue
    : BannerTransitionType.CrossDissolve;
}

function playbackValue(value: unknown): BannerPlaybackModeValue {
  return PLAYBACK_OPTIONS.includes(value as BannerPlaybackModeValue)
    ? value as BannerPlaybackModeValue
    : BannerPlaybackMode.PingPong;
}

function normalizeSlides(value: unknown): CarouselSlide[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((slide, index) => ({
    ...slide,
    id: stringValue(slide.id, `slide-${index + 1}`),
    alt: stringValue(slide.alt, stringValue(slide.label, `Banner image ${index + 1}`)),
    imageHash: stringValue(slide.imageHash),
  } as CarouselSlide));
}

function toResourcePath(value: string): string {
  const normalized = value.trim().replace(/\\/g, '/');
  const marker = '/Resources/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length);
  }
  return normalized.startsWith('Resources/')
    ? normalized.slice('Resources/'.length)
    : normalized;
}

function getDroppedImageHash(event: React.DragEvent): ImageHash | null {
  const hash =
    event.dataTransfer.getData('text/asset-hash') ||
    event.dataTransfer.getData('text/asset-guid') ||
    event.dataTransfer.getData('text/plain');
  return isImageHash(hash) ? hash : null;
}

export const ImageCarouselPreview: React.FC<ImageCarouselPreviewProps> = ({
  assetId,
  assetData,
  onAssetUpdate,
}) => {
  const [draftState, setDraftState] = useState<{ assetId: string; asset: AssetData }>({ assetId, asset: assetData });
  const [imageCursor, setImageCursor] = useState<{ assetId: string; currentImageIndex: number; prevImageIndex: number | null }>({
    assetId,
    currentImageIndex: 0,
    prevImageIndex: null,
  });
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [imageLoadErrors, setImageLoadErrors] = useState<Map<string, string>>(new Map());
  const pendingImageHashesRef = useRef<Set<string>>(new Set());
  const imageLoadSubscriberIdRef = useRef<string>(createGuid());
  const [saveState, setSaveState] = useState<{ assetId: string; status: string | null }>({ assetId, status: null });
  const [activeTab, setActiveTab] = useState<ComposerTab>('base');
  const [newImageSource, setNewImageSource] = useState('');
  const draftAsset = draftState.assetId === assetId ? draftState.asset : assetData;
  const currentImageIndex = imageCursor.assetId === assetId ? imageCursor.currentImageIndex : 0;
  const prevImageIndex = imageCursor.assetId === assetId ? imageCursor.prevImageIndex : null;
  const saveStatus = saveState.assetId === assetId ? saveState.status : null;
  const setSaveStatus = useCallback((status: string | null) => {
    setSaveState({ assetId, status });
  }, [assetId]);

  const data = useMemo<ImageCarouselDraftData>(() => (
    isRecord(draftAsset.data) ? draftAsset.data : {}
  ), [draftAsset.data]);
  const slides = useMemo(() => normalizeSlides(data.slides), [data.slides]);
  const slideImages = useMemo(() => (
    slides
      .map((slide) => imageHashValue(slide.imageHash))
      .filter((hash): hash is ImageHash => Boolean(hash))
  ), [slides]);
  const logoImageHash = imageHashValue(data.logoImageHash);
  const hashesToLoad = useMemo(() => {
    const hashes = new Set<string>();
    slideImages.forEach((hash) => hashes.add(hash));
    if (logoImageHash) hashes.add(logoImageHash);
    return Array.from(hashes);
  }, [logoImageHash, slideImages]);

  const resolvedImageUrls = useMemo(() => {
    const next = new Map(imageUrls);
    for (const [hash, url] of getCachedCarouselUrls(hashesToLoad)) {
      if (!next.has(hash)) {
        next.set(hash, url);
      }
    }
    return next;
  }, [hashesToLoad, imageUrls]);

  const activeImageLoadErrors = useMemo(() => {
    const activeHashes = new Set(hashesToLoad);
    const next = new Map<string, string>();
    for (const [hash, error] of imageLoadErrors) {
      if (activeHashes.has(hash)) {
        next.set(hash, error);
      }
    }
    return next;
  }, [hashesToLoad, imageLoadErrors]);

  useEffect(() => {
    const subscriberId = imageLoadSubscriberIdRef.current;
    const handleBatchLoaded = (event: ImageBatchLoadedEvent) => {
      if (event.subscriberId !== subscriberId) return;

      event.results.forEach((result) => pendingImageHashesRef.current.delete(String(result.hash)));

      setImageUrls((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const result of event.results) {
          if (result.variant !== ImageVariant.Full || !result.blobUrl) continue;
          const hash = String(result.hash);
          if (next.get(hash) !== result.blobUrl) {
            carouselImageUrlCache.set(hash, result.blobUrl);
            next.set(hash, result.blobUrl);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setImageLoadErrors((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const result of event.results) {
          const hash = String(result.hash);
          if (result.error) {
            next.set(hash, result.error);
            changed = true;
          } else if (next.delete(hash)) {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    EventBus.instance.subscribe(ImageBatchLoadedEvent, handleBatchLoaded);
    return () => EventBus.instance.unsubscribe(ImageBatchLoadedEvent, handleBatchLoaded);
  }, []);

  useEffect(() => {
    const requests: ImageBatchRequestItem[] = hashesToLoad
      .filter((hash) => !resolvedImageUrls.has(hash) && !carouselImageUrlCache.has(hash) && !activeImageLoadErrors.has(hash) && !pendingImageHashesRef.current.has(hash))
      .map((hash) => {
        pendingImageHashesRef.current.add(hash);
        return {
          hash: hash as ImageHash,
          variant: ImageVariant.Full,
          priority: ImageLoadPriority.HIGH,
        };
      });

    if (requests.length === 0) return;

    EventBus.instance.publish(
      new ImageBatchLoadRequestEvent(requests, imageLoadSubscriberIdRef.current, false)
    );
  }, [activeImageLoadErrors, hashesToLoad, resolvedImageUrls]);

  const currentPlaybackMode = playbackValue(data.playbackMode);
  const playbackImageCount = getBannerPlaybackImageCount(slideImages.length, currentPlaybackMode);
  const visibleImageIndex = playbackImageCount > 0
    ? Math.min(currentImageIndex, playbackImageCount - 1)
    : 0;
  const visiblePrevImageIndex = prevImageIndex !== null && prevImageIndex < playbackImageCount
    ? prevImageIndex
    : null;

  const updateAssetData = useCallback((nextData: ImageCarouselDraftData) => {
    const nextAsset = {
      ...draftAsset,
      data: nextData,
    };
    setDraftState({ assetId, asset: nextAsset });
    onAssetUpdate?.(nextAsset);
    setSaveStatus('Draft changes');
  }, [assetId, draftAsset, onAssetUpdate, setSaveStatus]);

  const updateField = useCallback((field: string, value: unknown) => {
    updateAssetData({
      ...data,
      [field]: value,
    });
  }, [data, updateAssetData]);

  const updateFields = useCallback((patch: ImageCarouselDraftData) => {
    updateAssetData({
      ...data,
      ...patch,
    });
  }, [data, updateAssetData]);

  const updateSlide = useCallback((index: number, patch: Partial<CarouselSlide>) => {
    const nextSlides = slides.map((slide, slideIndex) => (
      slideIndex === index ? { ...slide, ...patch } : slide
    ));
    updateField('slides', nextSlides);
  }, [slides, updateField]);

  const addSlide = useCallback((hash: ImageHash) => {
    const nextIndex = slides.length + 1;
    updateField('slides', [
      ...slides,
      {
        id: `slide-${nextIndex}`,
        label: `Frame ${nextIndex}`,
        alt: `Banner image ${nextIndex}`,
        imageHash: hash,
      },
    ]);
  }, [slides, updateField]);

  const resolveImageSource = useCallback(async (source: string): Promise<ImageHash | null> => {
    const trimmed = source.trim();
    if (!trimmed) return null;
    if (isImageHash(trimmed)) return trimmed;
    try {
      const hash = await computeAssetHash(toResourcePath(trimmed));
      return isImageHash(hash) ? hash : null;
    } catch {
      return null;
    }
  }, []);

  const addImageSource = useCallback(async () => {
    const hash = await resolveImageSource(newImageSource);
    if (!hash) {
      setSaveStatus('Image source not found');
      return;
    }
    addSlide(hash);
    setNewImageSource('');
  }, [addSlide, newImageSource, resolveImageSource, setSaveStatus]);

  const updateSlideSource = useCallback(async (index: number, source: string) => {
    const hash = await resolveImageSource(source);
    if (!hash) {
      setSaveStatus('Image source not found');
      return;
    }
    updateSlide(index, { imageHash: hash });
  }, [resolveImageSource, setSaveStatus, updateSlide]);

  const removeSlide = useCallback((index: number) => {
    updateField('slides', slides.filter((_, slideIndex) => slideIndex !== index));
  }, [slides, updateField]);

  const handleStageNext = useCallback(() => {
    if (playbackImageCount <= 1) return;
    setImageCursor((cursor) => {
      const current = cursor.assetId === assetId
        ? Math.min(cursor.currentImageIndex, playbackImageCount - 1)
        : 0;
      return {
        assetId,
        currentImageIndex: (current + 1) % playbackImageCount,
        prevImageIndex: current,
      };
    });
  }, [assetId, playbackImageCount]);

  useEffect(() => {
    if (playbackImageCount <= 1) return;
    const lastImageDuration = numberValue(data.lastImageDurationMs, numberValue(data.autoplayIntervalMs, 5000));
    const fastRotationDuration = numberValue(data.fastRotationDurationMs, 2000);
    const defaultRotationDuration = numberValue(data.defaultRotationDurationMs, numberValue(data.autoplayIntervalMs, 5000));
    const fastRotationThreshold = numberValue(data.fastRotationThreshold, 4);
    const duration = visibleImageIndex === playbackImageCount - 1
      ? lastImageDuration
      : visibleImageIndex >= fastRotationThreshold
        ? fastRotationDuration
        : defaultRotationDuration;
    const timeout = window.setTimeout(handleStageNext, duration);
    return () => window.clearTimeout(timeout);
  }, [
    data.autoplayIntervalMs,
    data.defaultRotationDurationMs,
    data.fastRotationDurationMs,
    data.fastRotationThreshold,
    data.lastImageDurationMs,
    handleStageNext,
    playbackImageCount,
    visibleImageIndex,
  ]);

  const previewGame = useMemo<FeaturedBannerComposition>(() => ({
    gameId: assetId,
    name: stringValue(draftAsset.system?.displayName, assetId),
    carouselPlaybackMode: currentPlaybackMode,
    carouselTransitionType: transitionValue(data.transitionType),
    carouselTransitionDurationMs: numberValue(data.transitionDurationMs, 1500),
    bannerLogoImage: logoImageHash,
    bannerLogoAlt: optionalString(data.logoAlt),
    bannerLogoStartMs: numberValue(data.logoStartMs, 0),
    bannerLogoDurationMs: numberValue(data.logoDurationMs, 1600),
    bannerLogoScaleFrom: numberValue(data.logoScaleFrom, 1),
    bannerLogoScaleTo: numberValue(data.logoScaleTo, 1),
    bannerLogoOpacityFrom: numberValue(data.logoOpacityFrom, 1),
    bannerLogoOpacityTo: numberValue(data.logoOpacityTo, 1),
    bannerLogoVisibleFromIndex: optionalNumber(data.logoVisibleFromIndex),
    bannerLogoVisibleToIndex: optionalNumber(data.logoVisibleToIndex),
    bannerTitleText: optionalString(data.titleText),
    bannerTitleColor: optionalString(data.titleTextColor),
    bannerTitleStartMs: numberValue(data.titleTextStartMs, numberValue(data.logoStartMs, 0)),
    bannerTitleDurationMs: numberValue(data.titleTextDurationMs, numberValue(data.logoDurationMs, 1600)),
    bannerTitleScaleFrom: numberValue(data.titleTextScaleFrom, numberValue(data.logoScaleFrom, 1)),
    bannerTitleScaleTo: numberValue(data.titleTextScaleTo, numberValue(data.logoScaleTo, 1)),
    bannerTitleOpacityFrom: numberValue(data.titleTextOpacityFrom, numberValue(data.logoOpacityFrom, 1)),
    bannerTitleOpacityTo: numberValue(data.titleTextOpacityTo, numberValue(data.logoOpacityTo, 1)),
    bannerTitleVisibleFromIndex: optionalNumber(data.titleTextVisibleFromIndex),
    bannerTitleVisibleToIndex: optionalNumber(data.titleTextVisibleToIndex),
    bannerOverlayTintColor: optionalString(data.overlayTintColor),
    bannerOverlayTintOpacity: numberValue(data.overlayTintOpacity, 0),
    bannerVignetteOpacity: numberValue(data.vignetteOpacity, 0),
    bannerFadeToBlackOpacity: numberValue(data.fadeToBlackOpacity, 0),
  }), [assetId, currentPlaybackMode, data, draftAsset.system?.displayName, logoImageHash]);

  const resolveImageUrl = useCallback((hash: ImageHash) => resolvedImageUrls.get(hash) ?? null, [resolvedImageUrls]);
  const imageLoadStatus = saveStatus ?? (
    activeImageLoadErrors.size > 0
      ? `${activeImageLoadErrors.size} image${activeImageLoadErrors.size === 1 ? '' : 's'} failed to load`
      : null
  );

  const handleDropAdd = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const hash = getDroppedImageHash(event);
    if (hash) addSlide(hash);
  }, [addSlide]);

  const handleDropSlide = useCallback((event: React.DragEvent, index: number) => {
    event.preventDefault();
    const hash = getDroppedImageHash(event);
    if (hash) updateSlide(index, { imageHash: hash });
  }, [updateSlide]);

  const handleDropLogo = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const hash = getDroppedImageHash(event);
    if (hash) updateField('logoImageHash', hash);
  }, [updateField]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleSave = useCallback(async () => {
    const system = isRecord(draftAsset.system) ? draftAsset.system : {};
    const metadata: Record<string, unknown> = isRecord(draftAsset.metadata) ? draftAsset.metadata : {};
    const guid = stringValue(system.guid, assetId);
    const content = JSON5.stringify(draftAsset, null, 2);
    const deferred = new OperationDeferred<AssetEntry>();
    setSaveStatus('Saving...');
    await EventBus.instance.publishAsync(new UploadAssetEvent(
      guid,
      content,
      {
        assetType: stringValue(system.assetType, 'ImageCarousel'),
        displayName: stringValue(system.displayName, assetId),
        category: stringValue(system.category, stringValue(metadata.category, AssetTypeCategory.Content)),
        mimeType: MimeTypes.Json,
        fileSize: content.length,
      },
      deferred,
    ));
    const result = await deferred.promise;
    if (!result.isSuccess) {
      setSaveStatus(result.errorMessage || 'Save failed');
      return;
    }
    setSaveStatus('Saved locally');
    onAssetUpdate?.(draftAsset);
  }, [assetId, draftAsset, onAssetUpdate, setSaveStatus]);

  return (
    <div className="preview-panel">
      <div className="preview-panel__content preview-panel__content--image-carousel">
        <div className="image-carousel-preview">
          <div className="image-carousel-preview__toolbar">
            <div>
              <div className="image-carousel-preview__eyebrow">Banner Composer</div>
              <h2>{stringValue(draftAsset.system?.displayName, assetId)}</h2>
            </div>
            <div className="image-carousel-preview__toolbar-actions">
              {imageLoadStatus ? <span className="image-carousel-preview__status">{imageLoadStatus}</span> : null}
              <button type="button" className="image-carousel-preview__primary-button" onClick={() => void handleSave()}>
                Save Carousel
              </button>
            </div>
          </div>

          <div className="image-carousel-preview__stage-shell">
            <FeaturedGameBannerStage
              game={previewGame}
              images={slideImages}
              currentImageIndex={visibleImageIndex}
              prevImageIndex={visiblePrevImageIndex}
              resolveImageUrl={resolveImageUrl}
              className="image-carousel-preview__stage"
              emptyMessage="No base images"
            />
          </div>

          <div className="image-carousel-preview__authoring">
            <div className="image-carousel-preview__tabs" role="tablist" aria-label="Carousel authoring">
              {COMPOSER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`image-carousel-preview__tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'base' ? (
              <section className="image-carousel-preview__section">
                <div className="image-carousel-preview__section-header">
                  <h3>Base Images</h3>
                  <div className="image-carousel-preview__source-actions">
                    <input
                      value={newImageSource}
                      onChange={(event) => setNewImageSource(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void addImageSource();
                        }
                      }}
                      placeholder="Hash or resource path"
                      aria-label="Image source"
                    />
                    <button type="button" onClick={() => void addImageSource()}>
                      Add
                    </button>
                    <div
                      className="image-carousel-preview__drop-action"
                      onDragOver={handleDragOver}
                      onDrop={handleDropAdd}
                    >
                      Drop
                    </div>
                  </div>
                </div>
                <div className="image-carousel-preview__slots">
                  {slides.map((slide, index) => {
                    const hash = imageHashValue(slide.imageHash);
                    const url = hash ? resolvedImageUrls.get(hash) : null;
                    return (
                      <div
                        key={`${slide.id}:${index}`}
                        className="image-carousel-preview__slot image-carousel-preview__slot--compact"
                        onDragOver={handleDragOver}
                        onDrop={(event) => handleDropSlide(event, index)}
                      >
                        <div className="image-carousel-preview__slot-thumb">
                          {url ? <img src={url} alt={slide.alt} /> : <span>{index + 1}</span>}
                        </div>
                        <div className="image-carousel-preview__slot-body">
                          <div className="image-carousel-preview__slot-meta">
                            <span>{index + 1}</span>
                            <input
                              value={stringValue(slide.label)}
                              onChange={(event) => updateSlide(index, { label: event.target.value })}
                              aria-label={`Frame ${index + 1} label`}
                            />
                          </div>
                          <div className="image-carousel-preview__source-row">
                            <input
                              key={`${slide.id}:${slide.imageHash}:source`}
                              defaultValue={stringValue(slide.imageHash)}
                              onBlur={(event) => void updateSlideSource(index, event.target.value)}
                              aria-label={`Frame ${index + 1} source`}
                            />
                            <button type="button" onClick={() => removeSlide(index)}>Remove</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {slides.length === 0 ? (
                    <div
                      className="image-carousel-preview__empty-slot"
                      onDragOver={handleDragOver}
                      onDrop={handleDropAdd}
                    >
                      Drop Image
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeTab === 'identity' ? (
              <section className="image-carousel-preview__section">
                <h3>Identity Layer</h3>
                <div className="image-carousel-preview__identity-grid">
                  <div
                    className="image-carousel-preview__logo-slot"
                    onDragOver={handleDragOver}
                    onDrop={handleDropLogo}
                  >
                    {logoImageHash && resolvedImageUrls.get(logoImageHash) ? (
                      <img src={resolvedImageUrls.get(logoImageHash)} alt={stringValue(data.logoAlt, 'Logo')} />
                    ) : (
                      <span>Logo</span>
                    )}
                  </div>
                  <div className="image-carousel-preview__field-grid">
                    <label>
                      Logo Hash
                      <input
                        value={stringValue(data.logoImageHash)}
                        onChange={(event) => updateField('logoImageHash', event.target.value)}
                      />
                    </label>
                    <label>
                      Logo Alt
                      <input
                        value={stringValue(data.logoAlt)}
                        onChange={(event) => updateField('logoAlt', event.target.value)}
                      />
                    </label>
                    <label>
                      Title Text
                      <input
                        value={stringValue(data.titleText)}
                        onChange={(event) => updateField('titleText', event.target.value)}
                      />
                    </label>
                    <label>
                      Title Color
                      <input
                        type="color"
                        value={stringValue(data.titleTextColor, '#ffffff')}
                        onChange={(event) => updateField('titleTextColor', event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'motion' ? (
              <section className="image-carousel-preview__section">
              <h3>Motion</h3>
              <div className="image-carousel-preview__motion-presets">
                <button
                  type="button"
                  onClick={() => updateFields({
                    transitionType: BannerTransitionType.CrossDissolve,
                    transitionDurationMs: 1800,
                    defaultRotationDurationMs: 2400,
                    fastRotationDurationMs: 2400,
                    lastImageDurationMs: 3600,
                    slideTransitionDelayMs: 0,
                  })}
                >
                  Slow Dissolve
                </button>
                <button
                  type="button"
                  onClick={() => updateFields({
                    transitionType: BannerTransitionType.CrossDissolve,
                    transitionDurationMs: 1100,
                    defaultRotationDurationMs: 1800,
                    fastRotationDurationMs: 1800,
                    lastImageDurationMs: 2800,
                    slideTransitionDelayMs: 0,
                  })}
                >
                  Medium Dissolve
                </button>
                <button
                  type="button"
                  onClick={() => updateFields({
                    transitionType: BannerTransitionType.CrossDissolve,
                    transitionDurationMs: 520,
                    defaultRotationDurationMs: 650,
                    fastRotationDurationMs: 650,
                    lastImageDurationMs: 1000,
                    slideTransitionDelayMs: 0,
                  })}
                >
                  Fast Dissolve
                </button>
              </div>
              <div className="image-carousel-preview__field-grid">
                <label>
                  Playback
                  <select
                    value={currentPlaybackMode}
                    onChange={(event) => updateField('playbackMode', event.target.value)}
                  >
                    <option value={BannerPlaybackMode.PingPong}>Ping Pong</option>
                    <option value={BannerPlaybackMode.Linear}>Linear</option>
                  </select>
                </label>
                <label>
                  Image Transition
                  <select
                    value={transitionValue(data.transitionType)}
                    onChange={(event) => updateField('transitionType', event.target.value)}
                  >
                    <option value={BannerTransitionType.CrossDissolve}>Cross Dissolve</option>
                    <option value={BannerTransitionType.Swipe}>Swipe</option>
                    <option value={BannerTransitionType.Cut}>Cut</option>
                  </select>
                </label>
                <NumberField label="Dissolve Ms" value={numberValue(data.transitionDurationMs, 1500)} min={0} onChange={(value) => updateField('transitionDurationMs', value)} />
                <NumberField label="Fallback Hold Ms" value={numberValue(data.autoplayIntervalMs, 5000)} min={1000} onChange={(value) => updateField('autoplayIntervalMs', value)} />
                <NumberField label="Normal Hold Ms" value={numberValue(data.defaultRotationDurationMs, 3000)} min={250} onChange={(value) => updateField('defaultRotationDurationMs', value)} />
                <NumberField label="Fast Hold Ms" value={numberValue(data.fastRotationDurationMs, 2000)} min={250} onChange={(value) => updateField('fastRotationDurationMs', value)} />
                <NumberField label="Last Frame Hold Ms" value={numberValue(data.lastImageDurationMs, 6000)} min={1000} onChange={(value) => updateField('lastImageDurationMs', value)} />
                <NumberField label="Fast After" value={numberValue(data.fastRotationThreshold, 4)} min={1} onChange={(value) => updateField('fastRotationThreshold', value)} />
                <NumberField label="Next Game Delay Ms" value={numberValue(data.slideTransitionDelayMs, 500)} min={0} onChange={(value) => updateField('slideTransitionDelayMs', value)} />
              </div>
              </section>
            ) : null}

            {activeTab === 'look' ? (
              <section className="image-carousel-preview__section">
              <h3>Look</h3>
              <div className="image-carousel-preview__field-grid">
                <label>
                  Tint
                  <input
                    type="color"
                    value={stringValue(data.overlayTintColor, '#1f4d2b')}
                    onChange={(event) => updateField('overlayTintColor', event.target.value)}
                  />
                </label>
                <RangeField label="Tint Opacity" value={numberValue(data.overlayTintOpacity, 0)} onChange={(value) => updateField('overlayTintOpacity', value)} />
                <RangeField label="Vignette" value={numberValue(data.vignetteOpacity, 0)} onChange={(value) => updateField('vignetteOpacity', value)} />
                <RangeField label="Fade Black" value={numberValue(data.fadeToBlackOpacity, 0)} onChange={(value) => updateField('fadeToBlackOpacity', value)} />
              </div>
              </section>
            ) : null}

            {activeTab === 'reveal' ? (
              <section className="image-carousel-preview__section">
              <h3>Reveal</h3>
              <div className="image-carousel-preview__field-grid">
                <NumberField label="Logo Start" value={numberValue(data.logoStartMs, 0)} min={0} onChange={(value) => updateField('logoStartMs', value)} />
                <NumberField label="Logo Duration" value={numberValue(data.logoDurationMs, 1600)} min={0} onChange={(value) => updateField('logoDurationMs', value)} />
                <NumberField label="Logo Scale From" value={numberValue(data.logoScaleFrom, 1)} min={0} step={0.01} onChange={(value) => updateField('logoScaleFrom', value)} />
                <NumberField label="Logo Scale To" value={numberValue(data.logoScaleTo, 1)} min={0} step={0.01} onChange={(value) => updateField('logoScaleTo', value)} />
                <RangeField label="Logo Opacity From" value={numberValue(data.logoOpacityFrom, 1)} onChange={(value) => updateField('logoOpacityFrom', value)} />
                <RangeField label="Logo Opacity To" value={numberValue(data.logoOpacityTo, 1)} onChange={(value) => updateField('logoOpacityTo', value)} />
                <NumberField label="Logo From Frame" value={numberValue(data.logoVisibleFromIndex, 0)} min={0} onChange={(value) => updateField('logoVisibleFromIndex', value)} />
                <NumberField label="Logo To Frame" value={numberValue(data.logoVisibleToIndex, Math.max(playbackImageCount - 1, 0))} min={0} onChange={(value) => updateField('logoVisibleToIndex', value)} />
                <NumberField label="Title Start" value={numberValue(data.titleTextStartMs, 0)} min={0} onChange={(value) => updateField('titleTextStartMs', value)} />
                <NumberField label="Title Duration" value={numberValue(data.titleTextDurationMs, 1600)} min={0} onChange={(value) => updateField('titleTextDurationMs', value)} />
                <NumberField label="Title Scale From" value={numberValue(data.titleTextScaleFrom, 1)} min={0} step={0.01} onChange={(value) => updateField('titleTextScaleFrom', value)} />
                <NumberField label="Title Scale To" value={numberValue(data.titleTextScaleTo, 1)} min={0} step={0.01} onChange={(value) => updateField('titleTextScaleTo', value)} />
                <RangeField label="Title Opacity From" value={numberValue(data.titleTextOpacityFrom, 1)} onChange={(value) => updateField('titleTextOpacityFrom', value)} />
                <RangeField label="Title Opacity To" value={numberValue(data.titleTextOpacityTo, 1)} onChange={(value) => updateField('titleTextOpacityTo', value)} />
                <NumberField label="Title From Frame" value={numberValue(data.titleTextVisibleFromIndex, 0)} min={0} onChange={(value) => updateField('titleTextVisibleFromIndex', value)} />
                <NumberField label="Title To Frame" value={numberValue(data.titleTextVisibleToIndex, Math.max(playbackImageCount - 1, 0))} min={0} onChange={(value) => updateField('titleTextVisibleToIndex', value)} />
              </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, value, min = 0, step = 1, onChange }) => (
  <label>
    {label}
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const RangeField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <label className="image-carousel-preview__range-field">
    <span>{label}</span>
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    <output>{value.toFixed(2)}</output>
  </label>
);
