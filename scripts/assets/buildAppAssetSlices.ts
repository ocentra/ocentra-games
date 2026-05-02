import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';
import { resolveAssetSourceRoot } from './assetSourceRoot';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import {
  AssetIndexResourceEntrySchema,
  EntryIndexSchema,
  type AssetIndexResourceEntry,
  type EntryIndexDocument,
} from '@ocentra/game-asset-domain/schemas/entry-index-schema';
import {
  GameCatalogDocumentSchema,
  GameCatalogEntrySchema,
  type GameCatalogDocument,
  type GameCatalogEntry,
} from '@ocentra/game-asset-domain/schemas/game-catalog-entry-schema';
import { GameHomeSchema, type GameHome, type GameHomeBadge } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import { GamePageSchema, type GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import { GameEngineSchema, type GameEngine } from '@ocentra/game-asset-domain/schemas/game-engine-schema';
import {
  ComingSoonTeaserSchema,
  type ComingSoonTeaser,
} from '@ocentra/game-asset-domain/schemas/coming-soon-teaser-schema';
import {
  FeatureBannerItemSchema,
  type FeatureBannerItem,
} from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema';
import {
  AppPageSliceDocumentSchema,
  type AppPageSliceDocument,
} from '@ocentra/game-asset-domain/schemas/app-page-slice-schema';
import {
  FeaturedShowcaseControlsSchema,
  HomeShowcaseFrameControlsSchema,
  HomepageLayoutControlsSchema,
  HomePageGamesDocumentSchema,
  type FeaturedShowcaseControlsData,
  type HomeShowcaseFrameControlsData,
  type HomepageLayoutControlsData,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema';

type AssetDocument = {
  system?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type BuildAppAssetSlicesOptions = {
  repoRoot?: string;
  resourcesDir?: string;
  outDir: string;
};

type BuiltAppAssetSlices = {
  resourcesDir: string;
  outDir: string;
  entryIndex: EntryIndexDocument;
  home: HomePageGamesDocument;
  games: GameCatalogDocument;
  appPages: Record<string, AppPageSliceDocument>;
  pages: Record<string, GamePage>;
  engines: Record<string, GameEngine>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return asString(value);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return filtered.length > 0 ? filtered : undefined;
}

function asGameHomeBadges(value: unknown): GameHomeBadge[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const badges = value
    .map((item) => {
      const record = asRecord(item);
      const label = asString(record?.label);
      if (!label) return null;
      const tone = asString(record?.tone);
      return tone ? { label, tone } : { label };
    })
    .filter((item): item is GameHomeBadge => item !== null);
  return badges.length > 0 ? badges : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readPathLike(value: unknown): string | undefined {
  const record = asRecord(value);
  return asString(record?.path);
}

function readGuidLike(value: unknown): string | undefined {
  const record = asRecord(value);
  return asString(record?.guid);
}

function toRelativeResourcePath(resourcePath: string): string {
  return resourcePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^Resources\//, '');
}

function extractModeFromPath(resourcePath: string): string {
  const match = resourcePath.replace(/\\/g, '/').match(/GameMode\/([^/]+)\//);
  return match?.[1] ?? 'Other';
}

function derivePlayerMode(gameData: Record<string, unknown>): string | null {
  const minHumanPlayers = asNumber(gameData.minHumanPlayers);
  const maxHumanPlayers = asNumber(gameData.maxHumanPlayers);
  const supportsAI = gameData.supportsAI === true;

  if (typeof maxHumanPlayers === 'number' && maxHumanPlayers <= 1) {
    return 'singleplayer';
  }

  if (typeof minHumanPlayers === 'number' && minHumanPlayers <= 1 && supportsAI) {
    return 'singleplayer';
  }

  if (typeof maxHumanPlayers === 'number' && maxHumanPlayers > 1) {
    return 'multiplayer';
  }

  return null;
}

function extractGameIdFromPath(resourcePath: string): string | null {
  const normalized = resourcePath.replace(/\\/g, '/');
  const match = normalized.match(/GameMode\/[^/]+\/([^/]+)\//);
  if (match?.[1]) return match[1];
  const segments = normalized.split('/');
  return segments.length >= 3 ? segments[segments.length - 2] ?? null : null;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif']);

type ResourceFileEntry = {
  relativePath: string;
  fullPath: string;
  fileSize: number;
};

function normalizeResourcePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/')
    ? normalized
    : `Resources/${normalized}`;
}

function hashBytesHex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function collectResourceFiles(
  root: string,
  current = root,
  out: ResourceFileEntry[] = []
): Promise<ResourceFileEntry[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.index' || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectResourceFiles(root, fullPath, out);
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.meta')) {
      continue;
    }

    const stat = await fs.stat(fullPath);
    out.push({
      relativePath: path.relative(root, fullPath).replace(/\\/g, '/'),
      fullPath,
      fileSize: stat.size,
    });
  }

  return out;
}

async function scanResourceIndex(resourcesDir: string): Promise<AssetIndexResourceEntry[]> {
  const files = await collectResourceFiles(resourcesDir);
  const entries: AssetIndexResourceEntry[] = [];

  for (const file of files) {
    const resourcePath = normalizeResourcePath(file.relativePath);
    const lowerPath = resourcePath.toLowerCase();

    if (lowerPath.endsWith('.asset')) {
      try {
        const raw = await fs.readFile(file.fullPath, 'utf8');
        const parsed = JSON5.parse(raw) as unknown;
        const record = asRecord(parsed);
        const system = asRecord(record?.system);
        const guid = asString(system?.guid);
        if (!guid) {
          continue;
        }

        entries.push(
          AssetIndexResourceEntrySchema.parse({
            resourceEntryType: 'AssetResourceEntry',
            path: resourcePath,
            guid,
            assetType: asString(system?.assetType) ?? 'Unknown',
            displayName:
              asString(system?.displayName) ??
              path.basename(resourcePath, path.extname(resourcePath)),
            gameId: asNullableString(system?.gameId),
            category: asNullableString(system?.category),
            mimeType: 'application/json',
            fileSize: file.fileSize,
            checksum: hashBytesHex(Buffer.from(raw, 'utf8')),
            inheritanceChain: Array.isArray(system?.inheritanceChain)
              ? (system?.inheritanceChain as string[])
              : null,
            variant: asNullableString(system?.variant),
          })
        );
      } catch {
        continue;
      }
      continue;
    }

    try {
      const bytes = await fs.readFile(file.fullPath);
      const digest = hashBytesHex(bytes);
      if (IMAGE_EXTENSIONS.has(path.extname(lowerPath))) {
        entries.push(
          AssetIndexResourceEntrySchema.parse({
            resourceEntryType: 'ImageResourceEntry',
            path: resourcePath,
            hash: digest,
            checksum: digest,
            fileSize: file.fileSize,
          })
        );
      } else {
        entries.push(
          AssetIndexResourceEntrySchema.parse({
            resourceEntryType: 'FileResourceEntry',
            path: resourcePath,
            checksum: digest,
            fileSize: file.fileSize,
          })
        );
      }
    } catch {
      continue;
    }
  }

  return entries;
}

async function readAssetDocument(
  resourcesDir: string,
  resourcePath: string
): Promise<AssetDocument | null> {
  try {
    const fullPath = path.join(resourcesDir, toRelativeResourcePath(resourcePath));
    const raw = await fs.readFile(fullPath, 'utf8');
    const parsed = JSON5.parse(raw) as unknown;
    const record = asRecord(parsed);
    return {
      system: asRecord(record?.system) ?? undefined,
      data: asRecord(record?.data) ?? undefined,
    };
  } catch {
    return null;
  }
}

function resolveResourcePathFromReference(
  reference: unknown,
  resourceByGuid: Map<string, AssetIndexResourceEntry>
): string | null {
  const byPath = readPathLike(reference);
  if (byPath) {
    return byPath;
  }
  const guid = readGuidLike(reference);
  if (!guid) {
    return null;
  }
  return resourceByGuid.get(guid)?.path ?? null;
}

async function readReferencedAsset(
  resourcesDir: string,
  reference: unknown,
  resourceByGuid: Map<string, AssetIndexResourceEntry>
): Promise<AssetDocument | null> {
  const resourcePath = resolveResourcePathFromReference(reference, resourceByGuid);
  if (!resourcePath) {
    return null;
  }
  return await readAssetDocument(resourcesDir, resourcePath);
}

function buildCarouselHashes(carouselDoc: AssetDocument | null): {
  hashes: string[] | undefined;
  lastImageDurationMs: number | undefined;
  fastRotationDurationMs: number | undefined;
  defaultRotationDurationMs: number | undefined;
  fastRotationThreshold: number | undefined;
  slideTransitionDelayMs: number | undefined;
  playbackMode: string | undefined;
  transitionType: string | undefined;
  transitionDurationMs: number | undefined;
  logoImageHash: string | undefined;
  logoAlt: string | undefined;
  logoStartMs: number | undefined;
  logoDurationMs: number | undefined;
  logoScaleFrom: number | undefined;
  logoScaleTo: number | undefined;
  logoOpacityFrom: number | undefined;
  logoOpacityTo: number | undefined;
  logoVisibleFromIndex: number | undefined;
  logoVisibleToIndex: number | undefined;
  titleText: string | undefined;
  titleTextColor: string | undefined;
  titleTextStartMs: number | undefined;
  titleTextDurationMs: number | undefined;
  titleTextScaleFrom: number | undefined;
  titleTextScaleTo: number | undefined;
  titleTextOpacityFrom: number | undefined;
  titleTextOpacityTo: number | undefined;
  titleTextVisibleFromIndex: number | undefined;
  titleTextVisibleToIndex: number | undefined;
  overlayTintColor: string | undefined;
  overlayTintOpacity: number | undefined;
  vignetteOpacity: number | undefined;
  fadeToBlackOpacity: number | undefined;
} {
  const carouselData = carouselDoc?.data ?? null;
  const slides = Array.isArray(carouselData?.slides) ? carouselData.slides : [];
  const hashes = slides
    .map((slide) => asString(asRecord(slide)?.imageHash))
    .filter((value): value is string => typeof value === 'string');

  return {
    hashes: hashes.length > 0 ? hashes : undefined,
    lastImageDurationMs: asNumber(carouselData?.lastImageDurationMs),
    fastRotationDurationMs: asNumber(carouselData?.fastRotationDurationMs),
    defaultRotationDurationMs: asNumber(carouselData?.defaultRotationDurationMs),
    fastRotationThreshold: asNumber(carouselData?.fastRotationThreshold),
    slideTransitionDelayMs: asNumber(carouselData?.slideTransitionDelayMs),
    playbackMode: asString(carouselData?.playbackMode),
    transitionType: asString(carouselData?.transitionType),
    transitionDurationMs: asNumber(carouselData?.transitionDurationMs),
    logoImageHash: asString(carouselData?.logoImageHash),
    logoAlt: asString(carouselData?.logoAlt),
    logoStartMs: asNumber(carouselData?.logoStartMs),
    logoDurationMs: asNumber(carouselData?.logoDurationMs),
    logoScaleFrom: asNumber(carouselData?.logoScaleFrom),
    logoScaleTo: asNumber(carouselData?.logoScaleTo),
    logoOpacityFrom: asNumber(carouselData?.logoOpacityFrom),
    logoOpacityTo: asNumber(carouselData?.logoOpacityTo),
    logoVisibleFromIndex: asNumber(carouselData?.logoVisibleFromIndex),
    logoVisibleToIndex: asNumber(carouselData?.logoVisibleToIndex),
    titleText: asString(carouselData?.titleText),
    titleTextColor: asString(carouselData?.titleTextColor),
    titleTextStartMs: asNumber(carouselData?.titleTextStartMs),
    titleTextDurationMs: asNumber(carouselData?.titleTextDurationMs),
    titleTextScaleFrom: asNumber(carouselData?.titleTextScaleFrom),
    titleTextScaleTo: asNumber(carouselData?.titleTextScaleTo),
    titleTextOpacityFrom: asNumber(carouselData?.titleTextOpacityFrom),
    titleTextOpacityTo: asNumber(carouselData?.titleTextOpacityTo),
    titleTextVisibleFromIndex: asNumber(carouselData?.titleTextVisibleFromIndex),
    titleTextVisibleToIndex: asNumber(carouselData?.titleTextVisibleToIndex),
    overlayTintColor: asString(carouselData?.overlayTintColor),
    overlayTintOpacity: asNumber(carouselData?.overlayTintOpacity),
    vignetteOpacity: asNumber(carouselData?.vignetteOpacity),
    fadeToBlackOpacity: asNumber(carouselData?.fadeToBlackOpacity),
  };
}

function buildGameCatalogEntry(
  resource: AssetIndexResourceEntry,
  gameHome: GameHome
): GameCatalogEntry {
  return GameCatalogEntrySchema.parse({
    gameId: gameHome.gameId,
    displayName: gameHome.name,
    guid: resource.guid,
    path: resource.path,
    assetType: resource.assetType,
    mode: extractModeFromPath(resource.path),
    enabled: gameHome.enabled,
    releaseStatus: gameHome.releaseStatus ?? null,
    tags: gameHome.tags,
    category: gameHome.gameCategory ?? null,
    subcategory: gameHome.subcategory ?? null,
    difficulty: gameHome.difficulty ?? null,
    duration: gameHome.duration ?? null,
    deck: gameHome.deck ?? null,
    playersDisplay: gameHome.playersDisplay ?? null,
    playerMode: null,
    quality: gameHome.quality ?? null,
  });
}

async function buildGameArtifacts(
  resourcesDir: string,
  resource: AssetIndexResourceEntry,
  resourceByGuid: Map<string, AssetIndexResourceEntry>
): Promise<{
  home: GameHome;
  page: GamePage;
  engine: GameEngine;
  catalogEntry: GameCatalogEntry;
} | null> {
  const gameDoc = await readAssetDocument(resourcesDir, resource.path);
  const gameSystem = gameDoc?.system ?? {};
  const gameData = gameDoc?.data ?? {};
  const gameId = asString(gameSystem.gameId) ?? extractGameIdFromPath(resource.path) ?? resource.guid;
  const releaseStatus = asString(gameData.releaseStatus);
  const enabled = releaseStatus !== 'Deprecated';

  const gameInfoDoc = await readReferencedAsset(resourcesDir, gameData.gameInfoAsset, resourceByGuid);
  const gameInfoData = gameInfoDoc?.data ?? {};
  const hero = asRecord(gameInfoData.hero);
  const carouselDoc = await readReferencedAsset(resourcesDir, gameData.carouselImagesAsset, resourceByGuid);
  const carouselMeta = buildCarouselHashes(carouselDoc);

  const gameHome = GameHomeSchema.parse({
    gameId,
    guid: resource.guid,
    name: asString(hero?.title) ?? resource.displayName ?? gameId,
    enabled,
    releaseStatus,
    tags: asStringArray(gameInfoData.tags),
    comingSoon: releaseStatus === 'ComingSoon',
    bannerImage: asString(gameData.bannerImage),
    carouselImages: carouselMeta.hashes,
    gameIcon: asString(gameData.gameIcon),
    tagline: asString(hero?.subtitle) ?? asString(gameInfoData.tagline),
    tagline2: asString(gameInfoData.tagline2),
    shortDescription: asString(gameInfoData.shortDescription),
    description: asString(gameInfoData.description),
    featuredTopBadges: asGameHomeBadges(gameInfoData.featuredTopBadges),
    featuredBottomBadges: asGameHomeBadges(gameInfoData.featuredBottomBadges),
    textImageUrl: asString(gameInfoData.gameIconImage),
    minPlayers: asNumber(gameInfoData.minPlayers) ?? asNumber(gameData.minPlayers),
    maxPlayers: asNumber(gameInfoData.maxPlayers) ?? asNumber(gameData.maxPlayers),
    carouselLastImageDurationMs: carouselMeta.lastImageDurationMs,
    carouselFastRotationDurationMs: carouselMeta.fastRotationDurationMs,
    carouselDefaultRotationDurationMs: carouselMeta.defaultRotationDurationMs,
    carouselFastRotationThreshold: carouselMeta.fastRotationThreshold,
    carouselSlideTransitionDelayMs: carouselMeta.slideTransitionDelayMs,
    carouselPlaybackMode: carouselMeta.playbackMode,
    carouselTransitionType: carouselMeta.transitionType,
    carouselTransitionDurationMs: carouselMeta.transitionDurationMs,
    bannerLogoImage: carouselMeta.logoImageHash,
    bannerLogoAlt: carouselMeta.logoAlt,
    bannerLogoStartMs: carouselMeta.logoStartMs,
    bannerLogoDurationMs: carouselMeta.logoDurationMs,
    bannerLogoScaleFrom: carouselMeta.logoScaleFrom,
    bannerLogoScaleTo: carouselMeta.logoScaleTo,
    bannerLogoOpacityFrom: carouselMeta.logoOpacityFrom,
    bannerLogoOpacityTo: carouselMeta.logoOpacityTo,
    bannerLogoVisibleFromIndex: carouselMeta.logoVisibleFromIndex,
    bannerLogoVisibleToIndex: carouselMeta.logoVisibleToIndex,
    bannerTitleText: carouselMeta.titleText,
    bannerTitleColor: carouselMeta.titleTextColor,
    bannerTitleStartMs: carouselMeta.titleTextStartMs,
    bannerTitleDurationMs: carouselMeta.titleTextDurationMs,
    bannerTitleScaleFrom: carouselMeta.titleTextScaleFrom,
    bannerTitleScaleTo: carouselMeta.titleTextScaleTo,
    bannerTitleOpacityFrom: carouselMeta.titleTextOpacityFrom,
    bannerTitleOpacityTo: carouselMeta.titleTextOpacityTo,
    bannerTitleVisibleFromIndex: carouselMeta.titleTextVisibleFromIndex,
    bannerTitleVisibleToIndex: carouselMeta.titleTextVisibleToIndex,
    bannerOverlayTintColor: carouselMeta.overlayTintColor,
    bannerOverlayTintOpacity: carouselMeta.overlayTintOpacity,
    bannerVignetteOpacity: carouselMeta.vignetteOpacity,
    bannerFadeToBlackOpacity: carouselMeta.fadeToBlackOpacity,
    gameCategory: asString(gameInfoData.gameCategory) ?? asString(gameSystem.gameModeCategory),
    subcategory: asNullableString(gameInfoData.subcategory),
    difficulty: asString(gameInfoData.difficulty),
    duration: asString(gameInfoData.duration),
    deck: asString(gameInfoData.deck),
    playersDisplay: asString(gameInfoData.playersDisplay),
    quality: asString(gameInfoData.quality),
    completeness: asRecord(gameInfoData.completeness) as Record<string, boolean> | undefined,
  });

  const gamePage = GamePageSchema.parse({
    ...gameHome,
    minPlayers: gameHome.minPlayers ?? 2,
    maxPlayers: gameHome.maxPlayers ?? 4,
    gameInfoAsset: asRecord(gameData.gameInfoAsset) ?? undefined,
    gameInfoAssetGuid: readGuidLike(gameData.gameInfoAsset),
    sections: Array.isArray(gameInfoData.sections) ? gameInfoData.sections : undefined,
  });

  const gameEngine = GameEngineSchema.parse({
    gameId: gameHome.gameId,
    guid: gameHome.guid,
    name: gameHome.name,
    enabled: gameHome.enabled,
    releaseStatus: gameHome.releaseStatus,
    tags: gameHome.tags,
    gameRulesAsset: asRecord(gameData.gameRulesAsset) ?? gameData.gameRulesAsset,
    strategyAsset: asRecord(gameData.strategyAsset) ?? gameData.strategyAsset,
    scoringAsset: asRecord(gameData.scoringAsset) ?? gameData.scoringAsset,
    layoutAsset: asRecord(gameData.layoutAsset) ?? gameData.layoutAsset,
  });

  return {
    home: gameHome,
    page: gamePage,
    engine: gameEngine,
    catalogEntry: GameCatalogEntrySchema.parse({
      ...buildGameCatalogEntry(resource, gameHome),
      playerMode: derivePlayerMode(gameData),
    }),
  };
}

async function buildComingSoonTeasers(
  resourcesDir: string,
  resources: AssetIndexResourceEntry[]
): Promise<ComingSoonTeaser[]> {
  const comingSoonEntry = resources.find((resource) => resource.assetType === 'ComingSoon');
  if (!comingSoonEntry) {
    return [];
  }
  const comingSoonDoc = await readAssetDocument(resourcesDir, comingSoonEntry.path);
  const images = Array.isArray(comingSoonDoc?.data?.images) ? comingSoonDoc?.data?.images : [];
  return images.map((item) => {
    const record = asRecord(item);
    return ComingSoonTeaserSchema.parse({
      id: asString(record?.id) ?? randomUUID(),
      name: asString(record?.label) ?? asString(record?.id) ?? '',
      bannerImage: asString(record?.imageHash) ?? '',
      alt: asString(record?.alt),
    });
  });
}

async function buildFeatureBannerItems(
  resourcesDir: string,
  resources: AssetIndexResourceEntry[]
): Promise<FeatureBannerItem[]> {
  const featureBannerEntry = resources.find((resource) => resource.assetType === 'FeatureBanner');
  if (!featureBannerEntry) {
    return [];
  }
  const featureBannerDoc = await readAssetDocument(resourcesDir, featureBannerEntry.path);
  const items = Array.isArray(featureBannerDoc?.data?.items) ? featureBannerDoc?.data?.items : [];
  return items.map((item) => {
    const record = asRecord(item);
    return FeatureBannerItemSchema.parse({
      title: asString(record?.title) ?? '',
      description: asString(record?.description) ?? '',
      imageHash: asString(record?.imageHash) ?? '',
    });
  });
}

function buildCatalogMontageImages(resources: AssetIndexResourceEntry[]): ComingSoonTeaser[] {
  return resources
    .filter((resource) => {
      const normalizedPath = resource.path.replace(/\\/g, '/');
      return (
        resource.resourceEntryType === 'ImageResourceEntry' &&
        normalizedPath.includes('AppAssets/PlaceHolders/') &&
        typeof resource.hash === 'string' &&
        resource.hash.length > 0
      );
    })
    .map((resource) => {
      const fileName = path.basename(resource.path);
      const name = fileName
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      return ComingSoonTeaserSchema.parse({
        id: resource.hash,
        name,
        bannerImage: resource.hash,
        alt: name,
      });
    });
}

async function readFeaturedShowcaseControls(
  resourcesDir: string,
  fileName = 'featuredShowcaseControls.json'
): Promise<FeaturedShowcaseControlsData | undefined> {
  try {
    const raw = await fs.readFile(
      path.join(resourcesDir, 'Content', 'Home', fileName),
      'utf8'
    );
    const parsed = FeaturedShowcaseControlsSchema.parse(JSON5.parse(raw));
    return {
      ...parsed,
      overall: {
        ...parsed.overall,
        debugBounds: false,
      },
    };
  } catch {
    return undefined;
  }
}

async function readHomeShowcaseFrameControls(
  resourcesDir: string,
  fileName: string
): Promise<HomeShowcaseFrameControlsData | undefined> {
  try {
    const raw = await fs.readFile(
      path.join(resourcesDir, 'Content', 'Home', fileName),
      'utf8'
    );
    const parsed = HomeShowcaseFrameControlsSchema.parse(JSON5.parse(raw));
    return {
      ...parsed,
      overall: {
        ...parsed.overall,
        debugBounds: false,
      },
    };
  } catch {
    return undefined;
  }
}

async function readHomepageLayoutControls(
  resourcesDir: string
): Promise<HomepageLayoutControlsData | undefined> {
  try {
    const raw = await fs.readFile(
      path.join(resourcesDir, 'Content', 'Home', 'homepageLayoutControls.json'),
      'utf8'
    );
    return HomepageLayoutControlsSchema.parse(JSON5.parse(raw));
  } catch {
    return undefined;
  }
}

async function readAppPageSlices(resourcesDir: string): Promise<AppPageSliceDocument[]> {
  const pagesDir = path.join(resourcesDir, 'Content', 'Pages');
  try {
    const entries = await fs.readdir(pagesDir, { withFileTypes: true });
    const pageFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    const pages = await Promise.all(
      pageFiles.map(async (fileName) => {
        const raw = await fs.readFile(path.join(pagesDir, fileName), 'utf8');
        return AppPageSliceDocumentSchema.parse(JSON5.parse(raw));
      })
    );
    return pages;
  } catch {
    return [];
  }
}

async function cleanOutputDir(outDir: string): Promise<void> {
  await fs.rm(outDir, { recursive: true, force: true });
  await ensureDir(outDir);
}

export async function buildAppAssetSlices(
  options: BuildAppAssetSlicesOptions
): Promise<BuiltAppAssetSlices> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const resourcesDir = resolveAssetSourceRoot(repoRoot, options.resourcesDir);
  const outDir = path.resolve(options.outDir);
  const resources = await scanResourceIndex(resourcesDir);
  const resourceByGuid = new Map(
    resources
      .filter((resource): resource is AssetIndexResourceEntry & { guid: string } => typeof resource.guid === 'string')
      .map((resource) => [resource.guid, resource])
  );

  const gameModeResources = resources.filter((resource) => {
    if (resource.resourceEntryType !== 'AssetResourceEntry') return false;
    const assetType = resource.assetType ?? '';
    return assetType.endsWith('GameMode');
  });

  const artifacts = await Promise.all(
    gameModeResources.map((resource) => buildGameArtifacts(resourcesDir, resource, resourceByGuid))
  );
  const builtGames = artifacts.filter((artifact): artifact is NonNullable<typeof artifact> => artifact !== null);
  const catalogEntries = builtGames.map((artifact) => artifact.catalogEntry);
  const gamesDocument = GameCatalogDocumentSchema.parse({ games: catalogEntries });
  const entryIndex = EntryIndexSchema.parse({
    generatedAt: new Date().toISOString(),
    resources,
    games: catalogEntries,
  });
  const comingSoon = await buildComingSoonTeasers(resourcesDir, resources);
  const featureBannerItems = await buildFeatureBannerItems(resourcesDir, resources);
  const catalogMontageImages = buildCatalogMontageImages(resources);
  const featuredShowcaseControls = await readFeaturedShowcaseControls(resourcesDir);
  const aboutShowcaseControls = await readHomeShowcaseFrameControls(
    resourcesDir,
    'aboutShowcaseControls.json'
  );
  const comingSoonShowcaseControls = await readFeaturedShowcaseControls(
    resourcesDir,
    'comingSoonShowcaseControls.json'
  );
  const effectiveFeatureBannerItems = aboutShowcaseControls?.items?.length
    ? aboutShowcaseControls.items
    : featureBannerItems;
  const homepageLayoutControls = await readHomepageLayoutControls(resourcesDir);
  const appPageSlices = await readAppPageSlices(resourcesDir);
  const featured = builtGames
    .map((artifact) => artifact.home)
    .filter((game) => game.enabled);
  const availableNow = featured.filter((game) => game.releaseStatus === 'Available');
  const recommended = [...featured];
  const home = HomePageGamesDocumentSchema.parse({
    featured,
    recommended,
    comingSoon,
    catalogMontageImages,
    availableNow,
    featureBannerItems: effectiveFeatureBannerItems,
    ...(featuredShowcaseControls ? { featuredShowcaseControls } : {}),
    ...(aboutShowcaseControls ? { aboutShowcaseControls } : {}),
    ...(comingSoonShowcaseControls || featuredShowcaseControls
      ? { comingSoonShowcaseControls: comingSoonShowcaseControls ?? featuredShowcaseControls }
      : {}),
    ...(homepageLayoutControls ? { homepageLayoutControls } : {}),
  });

  await cleanOutputDir(outDir);
  await writeJsonFile(path.join(outDir, AssetContentSlicePath.EntryIndex), entryIndex);
  await writeJsonFile(path.join(outDir, AssetContentSlicePath.Home), home);
  await writeJsonFile(path.join(outDir, AssetContentSlicePath.Games), gamesDocument);
  const appPages: Record<string, AppPageSliceDocument> = {};

  for (const pageSlice of appPageSlices) {
    appPages[pageSlice.pageId] = pageSlice;
    await writeJsonFile(path.join(outDir, AssetContentSlicePath.AppPage(pageSlice.pageId)), pageSlice);
  }

  const pages: Record<string, GamePage> = {};
  const engines: Record<string, GameEngine> = {};

  for (const artifact of builtGames) {
    pages[artifact.home.gameId] = artifact.page;
    engines[artifact.home.gameId] = artifact.engine;
    await writeJsonFile(path.join(outDir, AssetContentSlicePath.gamePage(artifact.home.gameId)), artifact.page);
    await writeJsonFile(path.join(outDir, AssetContentSlicePath.gameEngine(artifact.home.gameId)), artifact.engine);
  }

  return {
    resourcesDir,
    outDir,
    entryIndex,
    home,
    games: gamesDocument,
    appPages,
    pages,
    engines,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outDirArg = args.find((arg) => arg.startsWith('--out-dir='));
  const resourcesDirArg = args.find((arg) => arg.startsWith('--resources-dir='));
  const outDir = outDirArg
    ? outDirArg.slice('--out-dir='.length)
    : path.join(process.cwd(), '.generated', 'app-slices');
  const resourcesDir = resourcesDirArg ? resourcesDirArg.slice('--resources-dir='.length) : undefined;
  const result = await buildAppAssetSlices({ outDir, resourcesDir, repoRoot: process.cwd() });
  process.stdout.write(
    `${JSON.stringify(
      {
        resourcesDir: result.resourcesDir,
        outDir: result.outDir,
        games: result.games.games.length,
        appPages: Object.keys(result.appPages).length,
        resources: result.entryIndex.resources.length,
      },
      null,
      2
    )}\n`
  );
}

const isEntrypoint = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
  : false;

if (isEntrypoint) {
  main().catch((error) => {
    console.error('[build-app-asset-slices] failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
