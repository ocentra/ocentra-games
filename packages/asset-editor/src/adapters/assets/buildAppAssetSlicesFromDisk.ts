import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { AssetContentSlicePath } from '@ocentra/game-asset-domain/constants/content-slices';
import {
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
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import type { GameEngine } from '@ocentra/game-asset-domain/schemas/game-engine-schema';
import {
  HomePageGamesDocumentSchema,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import { getDiskResourceEntries } from '@/adapters/assets/diskResourceLoader';
import {
  loadGameArtifactBundlesFromDisk,
  loadHomepageFromDisk,
} from '@/adapters/layout/loadHomepageFromDisk';

type SliceUploadFile = {
  key: string;
  contentType: string;
  contentBytes: Uint8Array;
};

type BuiltAppAssetSlicesFromDisk = {
  entryIndex: EntryIndexDocument;
  home: HomePageGamesDocument;
  games: GameCatalogDocument;
  pages: Record<string, GamePage>;
  engines: Record<string, GameEngine>;
  uploads: SliceUploadFile[];
};

function extractModeFromPath(resourcePath: string): string {
  const match = resourcePath.replace(/\\/g, '/').match(/GameMode\/([^/]+)\//);
  return match?.[1] ?? 'Other';
}

function derivePlayerMode(bundle: Awaited<ReturnType<typeof loadGameArtifactBundlesFromDisk>>[number]): string | null {
  const supportsAI = bundle.sourceData.supportsAI === true;
  const minHumanPlayers =
    typeof bundle.sourceData.minHumanPlayers === 'number' ? bundle.sourceData.minHumanPlayers : undefined;
  const maxHumanPlayers =
    typeof bundle.sourceData.maxHumanPlayers === 'number' ? bundle.sourceData.maxHumanPlayers : undefined;

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

function toEntryIndexResource(resource: ResourceEntry): AssetIndexResourceEntry {
  if (resource instanceof AssetResourceEntry) {
    return {
      resourceEntryType: 'AssetResourceEntry',
      path: resource.path,
      guid: resource.guid,
      checksum: resource.checksum ?? undefined,
      assetType: resource.assetType as string,
      displayName: resource.displayName,
      gameId: resource.gameId ?? null,
      category: resource.category ?? null,
      mimeType: resource.mimeType ?? null,
      fileSize: resource.fileSize ?? undefined,
      inheritanceChain: resource.inheritanceChain ?? null,
      variant: resource.variant ?? null,
    };
  }

  if (resource instanceof ImageResourceEntry) {
    return {
      resourceEntryType: 'ImageResourceEntry',
      path: resource.path,
      hash: resource.hash,
      checksum: resource.checksum ?? undefined,
      fileSize: resource.fileSize ?? undefined,
    };
  }

  const fileResource = resource as FileResourceEntry;
  return {
    resourceEntryType: 'FileResourceEntry',
    path: fileResource.path,
    checksum: fileResource.checksum ?? undefined,
    fileSize: fileResource.fileSize ?? undefined,
  };
}

function toGameCatalogEntry(bundle: Awaited<ReturnType<typeof loadGameArtifactBundlesFromDisk>>[number]): GameCatalogEntry {
  return GameCatalogEntrySchema.parse({
    gameId: bundle.home.gameId,
    displayName: bundle.home.name,
    guid: bundle.entry.guid,
    path: bundle.path,
    assetType: bundle.entry.assetType,
    mode: extractModeFromPath(bundle.path),
    enabled: bundle.home.enabled,
    releaseStatus: bundle.home.releaseStatus ?? null,
    tags: bundle.home.tags,
    category: bundle.home.gameCategory ?? null,
    subcategory: bundle.home.subcategory ?? null,
    difficulty: bundle.home.difficulty ?? null,
    duration: bundle.home.duration ?? null,
    deck: bundle.home.deck ?? null,
    playersDisplay: bundle.home.playersDisplay ?? null,
    playerMode: derivePlayerMode(bundle),
    quality: bundle.home.quality ?? null,
  });
}

function toUpload(key: string, value: unknown): SliceUploadFile {
  return {
    key,
    contentType: 'application/json',
    contentBytes: new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`),
  };
}

export async function buildAppAssetSlicesFromDisk(): Promise<BuiltAppAssetSlicesFromDisk> {
  const [resources, home, bundles] = await Promise.all([
    getDiskResourceEntries(),
    loadHomepageFromDisk(),
    loadGameArtifactBundlesFromDisk(),
  ]);
  const parsedHome = HomePageGamesDocumentSchema.parse(home);

  const games = GameCatalogDocumentSchema.parse({
    games: bundles.map((bundle) => toGameCatalogEntry(bundle)),
  });

  const entryIndex = EntryIndexSchema.parse({
    generatedAt: new Date().toISOString(),
    resources: resources.map((resource) => toEntryIndexResource(resource)),
    games: games.games,
  });

  const pages: Record<string, GamePage> = {};
  const engines: Record<string, GameEngine> = {};
  const uploads: SliceUploadFile[] = [
    toUpload(AssetContentSlicePath.EntryIndex, entryIndex),
    toUpload(AssetContentSlicePath.Home, parsedHome),
    toUpload(AssetContentSlicePath.Games, games),
  ];

  for (const bundle of bundles) {
    pages[bundle.home.gameId] = bundle.page;
    engines[bundle.home.gameId] = bundle.engine;
    uploads.push(toUpload(AssetContentSlicePath.gamePage(bundle.home.gameId), bundle.page));
    uploads.push(toUpload(AssetContentSlicePath.gameEngine(bundle.home.gameId), bundle.engine));
  }

  return {
    entryIndex,
    home: parsedHome,
    games,
    pages,
    engines,
    uploads,
  };
}
