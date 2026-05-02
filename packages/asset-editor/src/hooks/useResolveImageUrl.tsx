import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeaturedGameItem } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ComingSoonItem } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ImageBatchLoadRequestEvent, ImageLoadPriority } from '@ocentra/eventing-domain/events/image/ImageBatchLoadRequestEvent';
import { ImageBatchLoadedEvent } from '@ocentra/eventing-domain/events/image/ImageBatchLoadedEvent';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import { createGuid } from '@ocentra/app-core/guid';

function hashKey(h: ImageHash): string {
  return typeof h === 'string' ? h : JSON.stringify(h);
}

const resolvedImageUrlCache = new Map<string, string>();

function getCachedMap(hashes: ImageHash[]): Record<string, string> {
  const cached: Record<string, string> = {};
  for (const hash of hashes) {
    const key = hashKey(hash);
    const url = resolvedImageUrlCache.get(key);
    if (url) {
      cached[key] = url;
    }
  }
  return cached;
}

function extractHashes(data: {
  featured?: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  comingSoon?: ComingSoonItem[];
  catalogMontageImages?: ComingSoonItem[];
  availableNow?: FeaturedGameItem[];
  featureBannerItems?: FeatureBannerItem[];
}): ImageHash[] {
  const seen = new Set<string>();
  const out: ImageHash[] = [];
  const add = (h: unknown) => {
    if (typeof h === 'string' && isImageHash(h)) {
      const k = hashKey(h);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(h);
      }
    }
  };
  const addGame = (g: FeaturedGameItem) => {
    add(g.bannerImage);
    add(g.gameIcon);
    add(g.textImageUrl);
    add(g.bannerLogoImage);
    for (const c of g.carouselImages ?? []) add(c);
  };
  for (const g of data.featured ?? []) addGame(g);
  for (const g of data.recommended ?? []) addGame(g);
  for (const t of data.comingSoon ?? []) add(t.bannerImage);
  for (const t of data.catalogMontageImages ?? []) add(t.bannerImage);
  for (const g of data.availableNow ?? []) addGame(g);
  for (const item of data.featureBannerItems ?? []) add(item.imageHash);
  return out;
}

export function useResolveImageUrl(data: {
  featured?: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  comingSoon?: ComingSoonItem[];
  catalogMontageImages?: ComingSoonItem[];
  availableNow?: FeaturedGameItem[];
  featureBannerItems?: FeatureBannerItem[];
}): {
  resolveImageUrl: (hash: ImageHash) => string | null;
  ImageLoaders: React.ReactNode;
  prefetchHashes: (hashes: ImageHash[]) => void;
} {
  const [map, setMap] = useState<Record<string, string>>(() => getCachedMap(extractHashes(data)));
  const subscriberIdRef = useRef<string>(createGuid());
  const requestedKeysRef = useRef<Set<string>>(new Set());

  const hashes = useMemo(() => extractHashes(data), [
    data,
  ]);

  useEffect(() => {
    const subscriberId = subscriberIdRef.current;
    const handleBatchLoaded = (event: ImageBatchLoadedEvent) => {
      if (event.subscriberId !== subscriberId) return;
      setMap(prev => {
        const next = { ...prev };
        for (const result of event.results) {
          if (result.variant === ImageVariant.Full) {
            const key = hashKey(result.hash);
            requestedKeysRef.current.delete(key);
            if (result.blobUrl) {
              resolvedImageUrlCache.set(key, result.blobUrl);
              next[key] = result.blobUrl;
            }
          }
        }
        return next;
      });
    };
    EventBus.instance.subscribe(ImageBatchLoadedEvent, handleBatchLoaded);
    return () => EventBus.instance.unsubscribe(ImageBatchLoadedEvent, handleBatchLoaded);
  }, []);

  const requestHashes = useCallback((nextHashes: ImageHash[]) => {
    const requests: Array<{
      hash: ImageHash;
      variant: ImageVariant;
      priority: ImageLoadPriority;
    }> = [];
    const seen = new Set<string>();
    for (const hash of nextHashes) {
      if (!isImageHash(hash)) continue;
      const key = hashKey(hash);
      if (seen.has(key) || resolvedImageUrlCache.has(key) || requestedKeysRef.current.has(key)) {
        continue;
      }
      seen.add(key);
      requestedKeysRef.current.add(key);
      requests.push({
        hash,
        variant: ImageVariant.Full,
        priority: ImageLoadPriority.HIGH,
      });
    }
    if (requests.length === 0) return;
    EventBus.instance.publish(
      new ImageBatchLoadRequestEvent(requests, subscriberIdRef.current, true)
    );
  }, []);

  useEffect(() => {
    if (hashes.length === 0) return;
    requestHashes(hashes);
  }, [hashes, requestHashes]);

  const resolveImageUrl = useCallback(
    (h: ImageHash) => map[hashKey(h)] ?? resolvedImageUrlCache.get(hashKey(h)) ?? null,
    [map]
  );

  const prefetchHashes = useCallback((nextHashes: ImageHash[]) => {
    requestHashes(nextHashes);
  }, [requestHashes]);

  return {
    resolveImageUrl,
    ImageLoaders: null,
    prefetchHashes,
  };
}
