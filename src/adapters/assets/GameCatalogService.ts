import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetCategory, MimeType } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { normalizeAssetType, AssetPathSegment } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { isAssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetChecksum, GameId, AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import { ComingSoon } from '@ocentra/game-asset-domain/content/comingSoon/ComingSoon';
import { FeatureBanner } from '@ocentra/game-asset-domain/content/featureBanner/FeatureBanner';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import type { AssetIndexResourceEntry } from '@ocentra/game-asset-domain/schemas/entry-index-schema';
import type { ComingSoonTeaser } from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import type { GameEngine } from '@ocentra/game-asset-domain/schemas/game-engine-schema';
import {
  type GameCatalogEntry,
} from '@ocentra/game-asset-domain/schemas/game-catalog-entry-schema';
import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import { type HomePageGamesDocument } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getEntryIndex, getEntryIndexGameResources } from '@/adapters/assets/EntryIndexService';
import {
  loadRemoteGameCatalogDocument,
  loadRemoteGameEngine,
  loadRemoteHomePageGamesDocument,
  loadRemoteSelectedGamePage,
} from '@/adapters/assets/GameCatalogRuntimeSource';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_GAME_CATALOG = false;
const GAME_MODE_SUFFIX = AssetPathSegment.GameMode;

type GameModeConstructor = new () => GameMode;

type AssetTypeInfoLike = {
  constructor?: GameModeConstructor;
} | null;

let cachedEntries: AssetResourceEntry<GameMode>[] | null = null;
let cachedCatalogEntries: GameCatalogEntry[] | null = null;
const cachedGameModes = new Map<string, GameMode>();
const cachedConstructors = new Map<string, new () => GameMode>();
const cachedPages = new Map<string, GamePage | null>();
const cachedEngines = new Map<string, GameEngine | null>();
let cachedHomePageData: HomePageGamesDocument | null = null;

function isGameModeResource(resource: AssetIndexResourceEntry): boolean {
  const assetType = resource.assetType;
  if (!assetType) {
    return false;
  }

  const normalizedType = normalizeAssetType(assetType);
  if (Array.isArray(resource.inheritanceChain) && resource.inheritanceChain.includes(GAME_MODE_SUFFIX)) {
    return true;
  }

  return normalizedType.endsWith(GAME_MODE_SUFFIX);
}

function toGameModeEntry(resource: AssetIndexResourceEntry): AssetResourceEntry<GameMode> | null {
  const assetType = resource.assetType;
  if (!resource.guid || !assetType || !isGameModeResource(resource)) {
    return null;
  }

  const entry = new AssetResourceEntry<GameMode>(asAssetType(assetType), resource.guid as AssetGUIDType);
  entry.displayName = resource.displayName ?? '';
  entry.path = resource.path;
  entry.gameId = (resource.gameId ?? null) as GameId | null;
  entry.category = (resource.category ?? null) as AssetCategory | null;
  entry.mimeType = (resource.mimeType ?? null) as MimeType | null;
  entry.fileSize = resource.fileSize ?? null;
  entry.checksum = resource.checksum
    ? (isAssetChecksum(resource.checksum) ? resource.checksum : resource.checksum as AssetChecksum)
    : null;
  entry.inheritanceChain = resource.inheritanceChain ?? null;
  entry.variant = resource.variant ?? null;
  return entry;
}

async function getGameModeConstructor(assetType: string): Promise<GameModeConstructor | null> {
  const cached = cachedConstructors.get(assetType);
  if (cached) {
    return cached;
  }

  const deferred = new OperationDeferred<AssetTypeInfoLike>();
  await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, deferred));
  const result = await deferred.promise;
  const constructor = result.isSuccess ? result.value?.constructor : undefined;
  if (!constructor) {
    return null;
  }

  cachedConstructors.set(assetType, constructor);
  return constructor;
}

async function getComingSoonTeasers(): Promise<ComingSoonTeaser[]> {
  try {
    const comingSoonAsset = await ComingSoon.getOrCreateInstance();
    if (!comingSoonAsset?.images?.length) {
      return [];
    }

    return comingSoonAsset.images.map((image) => ({
      id: image.id,
      name: image.label || image.id,
      bannerImage: image.imageHash,
      alt: image.alt,
    }));
  } catch (error) {
    log.logWarn('[GameCatalogService] Failed to load coming soon teasers', getStackTrace(), {
      error: error instanceof Error ? error.message : String(error),
    }, LOG_GAME_CATALOG);
    return [];
  }
}

async function getFeatureBannerItems(): Promise<FeatureBannerItem[]> {
  try {
    const featureBannerAsset = await FeatureBanner.getOrCreateInstance();
    if (!Array.isArray(featureBannerAsset?.items) || featureBannerAsset.items.length === 0) {
      return [];
    }

    return featureBannerAsset.items.map((item) => ({
      title: item.title,
      description: item.description,
      imageHash: item.imageHash,
    }));
  } catch (error) {
    log.logWarn('[GameCatalogService] Failed to load feature banner items', getStackTrace(), {
      error: error instanceof Error ? error.message : String(error),
    }, LOG_GAME_CATALOG);
    return [];
  }
}

async function loadGameModeByEntry(entry: AssetResourceEntry<GameMode>): Promise<GameMode | null> {
  if (cachedGameModes.has(entry.guid)) {
    return cachedGameModes.get(entry.guid) ?? null;
  }

  const constructor = await getGameModeConstructor(entry.assetType as string);
  if (!constructor) {
    return null;
  }

  try {
    const gameMode = await ScriptableObject.loadByGuid(constructor, AssetGUID.from(entry.guid));
    if (!gameMode) {
      return null;
    }

    await gameMode.loadNestedAssets();
    gameMode.onNestedAssetsLoaded();
    cachedGameModes.set(entry.guid, gameMode);
    if (entry.gameId) {
      cachedGameModes.set(String(entry.gameId), gameMode);
    }
    return gameMode;
  } catch (error) {
    log.logWarn('[GameCatalogService] Failed to load game mode', getStackTrace(), {
      guid: entry.guid,
      assetType: entry.assetType,
      error: error instanceof Error ? error.message : String(error),
    }, LOG_GAME_CATALOG);
    return null;
  }
}

async function getEntryByIdentifier(identifier: string): Promise<AssetResourceEntry<GameMode> | null> {
  const entries = await getGameModeEntries();
  return entries.find((entry) => entry.guid === identifier || String(entry.gameId) === identifier) ?? null;
}

export function clearGameCatalogCache(): void {
  cachedEntries = null;
  cachedCatalogEntries = null;
  cachedHomePageData = null;
  cachedConstructors.clear();
  cachedGameModes.clear();
  cachedPages.clear();
  cachedEngines.clear();
}

function cacheCatalogEntries(entries: GameCatalogEntry[]): GameCatalogEntry[] {
  cachedCatalogEntries = entries;
  return entries;
}

function buildCatalogEntryFromEntry(entry: AssetResourceEntry<GameMode>, home: GameHome): GameCatalogEntry {
  return {
    gameId: home.gameId,
    displayName: home.name,
    guid: entry.guid,
    path: entry.path,
    assetType: String(entry.assetType),
    mode: entry.path.replace(/\\/g, '/').match(/GameMode\/([^/]+)\//)?.[1] ?? 'Other',
    enabled: home.enabled,
    releaseStatus: home.releaseStatus ?? null,
    tags: home.tags,
    category: home.gameCategory ?? null,
    subcategory: home.subcategory ?? null,
    difficulty: home.difficulty ?? null,
    duration: home.duration ?? null,
    deck: home.deck ?? null,
    playersDisplay: home.playersDisplay ?? null,
    playerMode: null,
    quality: home.quality ?? null,
  };
}

export async function getGameModeEntries(): Promise<AssetResourceEntry<GameMode>[]> {
  if (cachedEntries) {
    return cachedEntries;
  }

  const entries = (await getEntryIndexGameResources())
    .map(toGameModeEntry)
    .filter((entry): entry is AssetResourceEntry<GameMode> => entry !== null);

  cachedEntries = entries;
  return entries;
}

export async function getGameMode(idOrGuid: string): Promise<GameMode | null> {
  const cached = cachedGameModes.get(idOrGuid);
  if (cached) {
    return cached;
  }

  const entry = await getEntryByIdentifier(idOrGuid);
  if (!entry) {
    return null;
  }

  return await loadGameModeByEntry(entry);
}

export async function getGameCatalogEntries(): Promise<GameCatalogEntry[]> {
  if (cachedCatalogEntries) {
    return cachedCatalogEntries;
  }

  const remoteCatalog = await loadRemoteGameCatalogDocument();
  if (remoteCatalog) {
    return cacheCatalogEntries(remoteCatalog.games);
  }

  const entryIndex = await getEntryIndex();
  if (entryIndex?.games?.length) {
    return cacheCatalogEntries(entryIndex.games);
  }

  const entries = await getGameModeEntries();
  const catalogEntries = await Promise.all(
    entries.map(async (entry) => {
      const gameMode = await loadGameModeByEntry(entry);
      const home = await gameMode?.getHome();
      return home ? buildCatalogEntryFromEntry(entry, home) : null;
    })
  );

  return cacheCatalogEntries(catalogEntries.filter((entry): entry is GameCatalogEntry => entry !== null));
}

export async function getAssetTypeByGuid(guid: string): Promise<string | undefined> {
  const entry = await getEntryByIdentifier(guid);
  return entry?.assetType;
}

export async function getHomePageGamesInfos(): Promise<HomePageGamesDocument> {
  if (cachedHomePageData) {
    return cachedHomePageData;
  }

  const remoteData = await loadRemoteHomePageGamesDocument();
  if (remoteData) {
    cachedHomePageData = remoteData;
    return remoteData;
  }

  const entries = await getGameModeEntries();
  const gameHomes: Array<GameHome | null> = await Promise.all(
    entries.map(async (entry) => {
      const gameMode = await loadGameModeByEntry(entry);
      return await gameMode?.getHome() ?? null;
    })
  );

  const featured = gameHomes.filter((game): game is GameHome => game !== null && game.enabled);
  const availableNow = featured.filter((game) => game.releaseStatus === GameModeStatus.Available);
  const comingSoon = await getComingSoonTeasers();
  const featureBannerItems = await getFeatureBannerItems();
  const recommended = [...featured];

  cachedHomePageData = {
    featured,
    recommended,
    comingSoon,
    availableNow,
    featureBannerItems,
  };

  return cachedHomePageData;
}

export async function getSelectedGamePageInfos(identifier: string): Promise<GamePage | null> {
  if (cachedPages.has(identifier)) {
    return cachedPages.get(identifier) ?? null;
  }

  const entry = await getEntryByIdentifier(identifier);
  const remoteGameId = entry?.gameId ? String(entry.gameId) : null;
  const requestedGameId = remoteGameId ?? identifier;
  if (requestedGameId) {
    const remotePage = await loadRemoteSelectedGamePage(requestedGameId);
    if (remotePage) {
      cachedPages.set(identifier, remotePage);
      cachedPages.set(requestedGameId, remotePage);
      if (entry?.guid) {
        cachedPages.set(entry.guid, remotePage);
      }
      return remotePage;
    }
  }

  const gameMode = entry ? await loadGameModeByEntry(entry) : await getGameMode(identifier);
  const page = await gameMode?.getPage() ?? null;
  cachedPages.set(identifier, page);
  if (entry?.guid) {
    cachedPages.set(entry.guid, page);
  }
  if (requestedGameId) {
    cachedPages.set(requestedGameId, page);
  }
  return page;
}

export async function getGameEngineInfos(identifier: string): Promise<GameEngine | null> {
  if (cachedEngines.has(identifier)) {
    return cachedEngines.get(identifier) ?? null;
  }

  const entry = await getEntryByIdentifier(identifier);
  const requestedGameId = entry?.gameId ? String(entry.gameId) : identifier;
  if (requestedGameId) {
    const remoteEngine = await loadRemoteGameEngine(requestedGameId);
    if (remoteEngine) {
      cachedEngines.set(identifier, remoteEngine);
      cachedEngines.set(requestedGameId, remoteEngine);
      if (entry?.guid) {
        cachedEngines.set(entry.guid, remoteEngine);
      }
      return remoteEngine;
    }
  }

  const gameMode = entry ? await loadGameModeByEntry(entry) : await getGameMode(identifier);
  const engine = gameMode?.getEngine() ?? null;
  cachedEngines.set(identifier, engine);
  if (requestedGameId) {
    cachedEngines.set(requestedGameId, engine);
  }
  if (entry?.guid) {
    cachedEngines.set(entry.guid, engine);
  }
  return engine;
}
