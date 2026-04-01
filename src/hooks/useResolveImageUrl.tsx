import { useCallback, useMemo, useState } from 'react';
import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ComingSoonTeaser } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { ResolveImageUrlLoader } from '@/hooks/ResolveImageUrlLoader';

function hashKey(h: ImageHash): string {
  return typeof h === 'string' ? h : JSON.stringify(h);
}

function extractHashes(data: {
  featured?: GameHome[];
  recommended?: GameHome[];
  comingSoon?: ComingSoonTeaser[];
  availableNow?: GameHome[];
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
  featured?: GameHome[];
  recommended?: GameHome[];
  comingSoon?: ComingSoonTeaser[];
  availableNow?: GameHome[];
  featureBannerItems?: FeatureBannerItem[];
}): {
  resolveImageUrl: (hash: ImageHash) => string | null;
  ImageLoaders: React.ReactNode;
} {
  const [map, setMap] = useState<Record<string, string>>({});
  const hashes = useMemo(() => extractHashes(data), [data]);
  const resolveImageUrl = useCallback(
    (h: ImageHash) => map[hashKey(h)] ?? null,
    [map]
  );
  const onLoad = useCallback((hash: ImageHash, url: string | null) => {
    const k = hashKey(hash);
    setMap(prev => {
      const next = { ...prev };
      if (url) next[k] = url;
      return next;
    });
  }, []);
  const ImageLoaders = (
    <>
      {hashes.map(h => (
        <ResolveImageUrlLoader key={hashKey(h)} hash={h} onLoad={(url) => onLoad(h, url)} />
      ))}
    </>
  );
  return { resolveImageUrl, ImageLoaders };
}
