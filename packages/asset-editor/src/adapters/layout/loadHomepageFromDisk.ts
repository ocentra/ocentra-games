import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { normalizeAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { getDiskResourceEntries } from '@/adapters/assets/diskResourceLoader';
import { ComingSoon } from '@ocentra/game-asset-domain/content/comingSoon/ComingSoon';
import { FeatureBanner } from '@ocentra/game-asset-domain/content/featureBanner/FeatureBanner';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type { ComingSoonTeaser } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import type { GameEngine } from '@ocentra/game-asset-domain/schemas/game-engine-schema';
import type { HomePageGamesDocument } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import {
  loadComingSoonShowcaseControlsFromDisk,
  loadFeaturedShowcaseControlsFromDisk,
} from '@/utils/featuredShowcaseControlsPersistence';
import { loadHomeShowcaseFrameControlsFromDisk } from '@/utils/homeShowcaseFrameControlsPersistence';
import { loadHomepageLayoutControlsFromDisk } from '@/utils/homepageLayoutControlsPersistence';

const GAME_MODE_SUFFIX = 'GameMode';

function isGameModeEntry(r: ResourceEntry): r is AssetResourceEntry {
  if (!(r instanceof AssetResourceEntry)) return false;
  const normalized = normalizeAssetType(r.assetType as string);
  if (r.inheritanceChain?.includes(GAME_MODE_SUFFIX)) return true;
  return normalized.endsWith(GAME_MODE_SUFFIX);
}

function displayNameFromPath(resourcePath: string): string {
  const fileName = resourcePath.split('/').pop() ?? resourcePath;
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function buildCatalogMontageImagesFromEntries(
  entries: ResourceEntry[]
): ComingSoonTeaser[] {
  const montageImages: ComingSoonTeaser[] = [];

  for (const entry of entries) {
    const record = entry as unknown as {
      path?: unknown;
      hash?: unknown;
    };
    const resourcePath = typeof record.path === 'string'
      ? record.path.replace(/\\/g, '/')
      : '';
    const hash = typeof record.hash === 'string' ? record.hash : '';
    if (
      !resourcePath.includes('AppAssets/PlaceHolders/') ||
      !isImageHash(hash)
    ) {
      continue;
    }
    const name = displayNameFromPath(resourcePath);
    montageImages.push({
      id: hash,
      name,
      bannerImage: hash,
      alt: name,
    });
  }

  return montageImages;
}

export type HomepageFromDisk = HomePageGamesDocument;

export type GameArtifactBundle = {
  home: GameHome;
  page: GamePage;
  engine: GameEngine;
  path: string;
  entry: AssetResourceEntry<GameMode>;
  sourceData: Record<string, unknown>;
};

async function loadGameModeBundle(
  entry: AssetResourceEntry<GameMode>,
  onPrefetchHashes?: (hashes: ImageHash[]) => void
): Promise<GameArtifactBundle | null> {
  if (!entry.guid || !entry.assetType) {
    return null;
  }

  try {
    const getTypeDeferred = new OperationDeferred<AssetTypeInfo | null>();
    await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(entry.assetType, getTypeDeferred));
    const typeResult = await getTypeDeferred.promise;
    const info = typeResult.isSuccess ? typeResult.value : null;
    if (!info?.constructor) {
      return null;
    }

    const getResourceDeferred = new OperationDeferred<Response>();
    await EventBus.instance.publishAsync(new GetResourceEvent({ guid: entry.guid }, getResourceDeferred));
    const resResult = await getResourceDeferred.promise;
    if (!resResult.isSuccess || !resResult.value?.ok) {
      return null;
    }

    const text = await resResult.value.text();
    const gameMode = ScriptableObject.deserialize(info.constructor as new () => GameMode, text) as GameMode;

    if (onPrefetchHashes) {
      const early: ImageHash[] = [];
      if (typeof gameMode.bannerImage === 'string' && isImageHash(gameMode.bannerImage)) {
        early.push(gameMode.bannerImage);
      }
      if (typeof gameMode.gameIcon === 'string' && isImageHash(gameMode.gameIcon)) {
        early.push(gameMode.gameIcon);
      }
      if (early.length > 0) onPrefetchHashes(early);
    }

    const home = await gameMode.getHome();
    const page = await gameMode.getPage();
    const engine = gameMode.getEngine();
    if (!home) {
      return null;
    }

    return {
      home,
      page,
      engine,
      path: (entry.path as string) ?? '',
      entry,
      sourceData: gameMode as unknown as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export async function loadGameArtifactBundlesFromDisk(): Promise<GameArtifactBundle[]> {
  const entries = await getDiskResourceEntries();
  const gameModes = entries.filter((r): r is AssetResourceEntry => isGameModeEntry(r));
  const bundles = await Promise.all(gameModes.map((entry) => loadGameModeBundle(entry as AssetResourceEntry<GameMode>)));
  return bundles.filter((bundle): bundle is GameArtifactBundle => bundle !== null);
}

export async function loadHomepageFromDisk(): Promise<HomepageFromDisk> {
  const [
    entries,
    bundles,
    featuredShowcaseControls,
    aboutShowcaseControls,
    comingSoonShowcaseControls,
    homepageLayoutControls,
  ] = await Promise.all([
    getDiskResourceEntries(),
    loadGameArtifactBundlesFromDisk(),
    loadFeaturedShowcaseControlsFromDisk(),
    loadHomeShowcaseFrameControlsFromDisk('about'),
    loadComingSoonShowcaseControlsFromDisk(),
    loadHomepageLayoutControlsFromDisk(),
  ]);
  const metadatas = bundles.map((bundle) => bundle.home);
  const catalogMontageImages = buildCatalogMontageImagesFromEntries(entries);

  const featured = metadatas.filter((g) => g.enabled);
  const availableNow = metadatas.filter(
    (g) => g.enabled && g.releaseStatus === GameModeStatus.Available
  );
  const recommended = [...featured];

  let comingSoon: ComingSoonTeaser[] = [];
  let featureBannerItems: FeatureBannerItem[] = [];
  try {
    const comingSoonAsset = await ComingSoon.getOrCreateInstance();
    if (comingSoonAsset?.images?.length) {
      comingSoon = comingSoonAsset.images.map((img) => ({
        id: img.id,
        name: img.label ?? img.id ?? '',
        bannerImage: img.imageHash,
        alt: img.alt,
      }));
    }
  } catch {
    comingSoon = [];
  }

  try {
    const featureBannerAsset = await FeatureBanner.getOrCreateInstance();
    if (Array.isArray(featureBannerAsset?.items)) {
      featureBannerItems = featureBannerAsset.items.map((item) => ({
        title: item.title,
        description: item.description,
        imageHash: item.imageHash,
      }));
    }
  } catch {
    featureBannerItems = [];
  }

  const effectiveFeatureBannerItems = aboutShowcaseControls.items?.length
    ? aboutShowcaseControls.items
    : featureBannerItems;

  return {
    featured,
    recommended,
    comingSoon,
    availableNow,
    featureBannerItems: effectiveFeatureBannerItems,
    catalogMontageImages,
    featuredShowcaseControls,
    aboutShowcaseControls,
    comingSoonShowcaseControls,
    homepageLayoutControls,
  };
}

const HOMEPAGE_CHUNK_SIZE = 5;

export async function loadHomepageFromDiskIncremental(
  onBatch: (partial: HomePageGamesDocument) => void,
  onPrefetchHashes?: (hashes: ImageHash[]) => void
): Promise<HomepageFromDisk> {
  const [
    entries,
    comingSoon,
    featureBannerItems,
    featuredShowcaseControls,
    aboutShowcaseControls,
    comingSoonShowcaseControls,
    homepageLayoutControls,
  ] = await Promise.all([
    getDiskResourceEntries(),
    (async (): Promise<ComingSoonTeaser[]> => {
      try {
        const comingSoonAsset = await ComingSoon.getOrCreateInstance();
        if (comingSoonAsset?.images?.length) {
          return comingSoonAsset.images.map((img) => ({
            id: img.id,
            name: img.label ?? img.id ?? '',
            bannerImage: img.imageHash,
            alt: img.alt,
          }));
        }
      } catch {
        void 0;
      }
      return [];
    })(),
    (async (): Promise<FeatureBannerItem[]> => {
      try {
        const featureBannerAsset = await FeatureBanner.getOrCreateInstance();
        if (Array.isArray(featureBannerAsset?.items)) {
          return featureBannerAsset.items.map((item) => ({
            title: item.title,
            description: item.description,
            imageHash: item.imageHash,
          }));
        }
      } catch {
        void 0;
      }
      return [];
    })(),
    loadFeaturedShowcaseControlsFromDisk(),
    loadHomeShowcaseFrameControlsFromDisk('about'),
    loadComingSoonShowcaseControlsFromDisk(),
    loadHomepageLayoutControlsFromDisk(),
  ]);

  const effectiveFeatureBannerItems = aboutShowcaseControls.items?.length
    ? aboutShowcaseControls.items
    : featureBannerItems;

  if (onPrefetchHashes && effectiveFeatureBannerItems.length > 0) {
    const hashes = effectiveFeatureBannerItems
      .map((item) => item.imageHash)
      .filter((hash): hash is ImageHash => isImageHash(hash));
    if (hashes.length > 0) {
      onPrefetchHashes(hashes);
    }
  }
  const catalogMontageImages = buildCatalogMontageImagesFromEntries(entries);
  if (onPrefetchHashes && catalogMontageImages.length > 0) {
    const hashes = catalogMontageImages
      .map((item) => item.bannerImage)
      .filter((hash): hash is ImageHash => isImageHash(hash));
    if (hashes.length > 0) {
      onPrefetchHashes(hashes);
    }
  }

  const gameModes = entries.filter((r): r is AssetResourceEntry => isGameModeEntry(r)) as AssetResourceEntry<GameMode>[];

  const featured: GameHome[] = [];
  const availableNow: GameHome[] = [];
  let recommended: GameHome[] = [];

  for (let i = 0; i < gameModes.length; i += HOMEPAGE_CHUNK_SIZE) {
    const chunk = gameModes.slice(i, i + HOMEPAGE_CHUNK_SIZE);
    const bundles = await Promise.all(chunk.map((entry) => loadGameModeBundle(entry, onPrefetchHashes)));
    const homes = bundles.filter((b): b is GameArtifactBundle => b !== null).map((b) => b.home);

    for (const home of homes) {
      if (home.enabled) {
        featured.push(home);
        if (home.releaseStatus === GameModeStatus.Available) {
          availableNow.push(home);
        }
      }
    }

    recommended = [...featured];
    onBatch({
      featured: [...featured],
      recommended,
      comingSoon,
      catalogMontageImages,
      availableNow: [...availableNow],
      featureBannerItems: effectiveFeatureBannerItems,
      featuredShowcaseControls,
      aboutShowcaseControls,
      comingSoonShowcaseControls,
      homepageLayoutControls,
    });
  }

  if (gameModes.length === 0) {
    onBatch({
      featured: [],
      recommended: [],
      comingSoon,
      catalogMontageImages,
      availableNow: [],
      featureBannerItems: effectiveFeatureBannerItems,
      featuredShowcaseControls,
      aboutShowcaseControls,
      comingSoonShowcaseControls,
      homepageLayoutControls,
    });
  }

  return {
    featured,
    recommended,
    comingSoon,
    catalogMontageImages,
    availableNow,
    featureBannerItems: effectiveFeatureBannerItems,
    featuredShowcaseControls,
    aboutShowcaseControls,
    comingSoonShowcaseControls,
    homepageLayoutControls,
  };
}

export type GameWithMetadata = {
  home: GameHome;
  path: string;
  entry: AssetResourceEntry<GameMode>;
};

export async function loadGamesWithMetadataFromDisk(): Promise<GameWithMetadata[]> {
  const bundles = await loadGameArtifactBundlesFromDisk();
  return bundles.map((bundle) => ({
    home: bundle.home,
    path: bundle.path,
    entry: bundle.entry,
  }));
}
