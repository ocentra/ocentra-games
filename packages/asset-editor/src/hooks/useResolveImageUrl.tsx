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

function extractHashes(data: {
  featured?: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  comingSoon?: ComingSoonItem[];
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
  for (const g of data.featured ?? []) {
    add(g.bannerImage);
    add(g.textImageUrl);
    for (const c of g.carouselImages ?? []) add(c);
  }
  for (const g of data.recommended ?? []) {
    add(g.bannerImage);
    add(g.textImageUrl);
    for (const c of g.carouselImages ?? []) add(c);
  }
  for (const t of data.comingSoon ?? []) add(t.bannerImage);
  for (const g of data.availableNow ?? []) add(g.bannerImage);
  for (const item of data.featureBannerItems ?? []) add(item.imageHash);
  return out;
}

export function useResolveImageUrl(data: {
  featured?: FeaturedGameItem[];
  recommended?: FeaturedGameItem[];
  comingSoon?: ComingSoonItem[];
  availableNow?: FeaturedGameItem[];
  featureBannerItems?: FeatureBannerItem[];
}): {
  resolveImageUrl: (hash: ImageHash) => string | null;
  ImageLoaders: React.ReactNode;
  prefetchHashes: (hashes: ImageHash[]) => void;
} {
  const [map, setMap] = useState<Record<string, string>>({});
  const subscriberIdRef = useRef<string>(createGuid());
  const hashes = useMemo(() => extractHashes(data), [
    JSON.stringify((data.featured ?? []).map(g => g.guid)),
    JSON.stringify((data.recommended ?? []).map(g => g.guid)),
    JSON.stringify((data.comingSoon ?? []).map(t => t.id)),
    JSON.stringify((data.availableNow ?? []).map(g => g.guid)),
    JSON.stringify((data.featureBannerItems ?? []).map(item => item.imageHash)),
  ]);

  useEffect(() => {
    const subscriberId = subscriberIdRef.current;
    const handleBatchLoaded = (event: ImageBatchLoadedEvent) => {
      if (event.subscriberId !== subscriberId) return;
      setMap(prev => {
        const next = { ...prev };
        for (const result of event.results) {
          if (result.variant === ImageVariant.Full && result.blobUrl) {
            next[hashKey(result.hash)] = result.blobUrl;
          }
        }
        return next;
      });
    };
    EventBus.instance.subscribe(ImageBatchLoadedEvent, handleBatchLoaded);
    return () => EventBus.instance.unsubscribe(ImageBatchLoadedEvent, handleBatchLoaded);
  }, []);

  useEffect(() => {
    if (hashes.length === 0) return;
    const requests = hashes.map(h => ({
      hash: h,
      variant: ImageVariant.Full,
      priority: ImageLoadPriority.HIGH,
    }));
    EventBus.instance.publish(
      new ImageBatchLoadRequestEvent(requests, subscriberIdRef.current, true)
    );
  }, [hashes]);

  const resolveImageUrl = useCallback(
    (h: ImageHash) => map[hashKey(h)] ?? null,
    [map]
  );

  const prefetchHashes = useCallback((hashes: ImageHash[]) => {
    const valid = hashes.filter((h) => typeof h === 'string' && isImageHash(h));
    if (valid.length === 0) return;
    EventBus.instance.publish(
      new ImageBatchLoadRequestEvent(
        valid.map((h) => ({ hash: h, variant: ImageVariant.Full, priority: ImageLoadPriority.HIGH })),
        subscriberIdRef.current,
        false
      )
    );
  }, []);

  return { resolveImageUrl, ImageLoaders: null, prefetchHashes };
}
