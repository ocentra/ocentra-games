import type { Game, GameMetadata } from '../types';
import { enrich } from '../helpers';
import { clearContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { clearGameCatalogCache, getGameCatalogEntries } from '@/adapters/assets/GameCatalogService';
import { clearRawAssetDocumentCache } from '@/adapters/assets/rawAssetDocument';
import { buildGameMetadata } from './gameCatalogToGameInfo';
import { loadAssetExplorerContent } from './assetExplorerContent';
import { authoredCatalogKeys, catalogEntryKeys } from './catalogIdentity';
import { loadRemoteCatalogIndex } from '@/adapters/assets/GameCatalogRuntimeSource';

type CatalogIndexEntry = {
  slug: string;
  name: string;
  quality: string;
  completeness: Record<string, boolean>;
  description: string;
  origin: string;
  players: string;
  deck: string;
  difficulty: string;
  duration: string;
  category: string;
  subcategory: string | null;
  playerMode: string | null;
  alsoKnownAs: string[];
  tags: string[];
  source: 'catalog';
};

type CatalogIndex = {
  version: number;
  generatedAt: string;
  totalGames: number;
  games: CatalogIndexEntry[];
};

export interface GamesDataSnapshot {
  games: Game[];
  metadata: GameMetadata | null;
  cachedAt: number;
}

let cachedGamesDataSnapshot: GamesDataSnapshot | null = null;
let inFlightGamesDataSnapshot: Promise<GamesDataSnapshot> | null = null;
let gamesDataCacheGeneration = 0;

function mergeAssetSummary(game: Game, summary: Partial<Game> | undefined): Game {
  if (!summary) {
    return game;
  }

  return enrich({
    ...game,
    description: summary.description || game.description,
    origin: summary.origin || game.origin,
    players: summary.players || game.players,
    deck: summary.deck || game.deck,
    difficulty: summary.difficulty || game.difficulty,
    duration: summary.duration || game.duration,
    category: summary.category || game.category,
    subcategory: summary.subcategory ?? game.subcategory,
    player_mode: summary.player_mode ?? game.player_mode,
    quality: summary.quality || game.quality,
    completeness: summary.completeness && Object.keys(summary.completeness).length > 0 ? summary.completeness : game.completeness,
    alsoKnownAs: summary.alsoKnownAs && summary.alsoKnownAs.length > 0 ? [...summary.alsoKnownAs] : game.alsoKnownAs,
  });
}

export function getCachedGamesDataSnapshot(): GamesDataSnapshot | null {
  return cachedGamesDataSnapshot;
}

function clearGamesDataSnapshotCache(): void {
  gamesDataCacheGeneration += 1;
  cachedGamesDataSnapshot = null;
  inFlightGamesDataSnapshot = null;
}

async function buildGamesDataSnapshot(): Promise<GamesDataSnapshot> {
  const [entries, catalogIndexRaw] = await Promise.all([
    getGameCatalogEntries(),
    loadRemoteCatalogIndex(),
  ]);

  const madeGameKeys = new Set<string>();
  const loadedGames: Game[] = [];

  for (const entry of entries) {
    if (entry.enabled === false || entry.releaseStatus === 'ComingSoon' || entry.releaseStatus === 'Deprecated') {
      continue;
    }

    const slug = entry.gameId ? String(entry.gameId) : entry.displayName || entry.path;
    const game = enrich({
      slug,
      guid: entry.guid,
      file: entry.path,
      name: entry.displayName || entry.path,
      quality: entry.quality || 'placeholder',
      completeness: entry.completeness || {},
      description: entry.description || '',
      origin: '',
      players: entry.playersDisplay || '',
      deck: entry.deck || '',
      difficulty: entry.difficulty || '',
      duration: entry.duration || '',
      alsoKnownAs: [],
      category: entry.category || undefined,
      subcategory: entry.subcategory || null,
      player_mode: entry.playerMode || null,
      file_exists: true,
      link_valid: entry.releaseStatus || 'asset',
      source: 'asset' as const,
    });

    const assetContent = await loadAssetExplorerContent(game).catch(() => null);
    const enrichedGame = mergeAssetSummary(game, assetContent?.summary);
    authoredCatalogKeys(enrichedGame).forEach((key) => madeGameKeys.add(key));
    loadedGames.push(enrichedGame);
  }

  const catalogIndex = catalogIndexRaw as CatalogIndex | null;
  if (catalogIndex?.games && Array.isArray(catalogIndex.games)) {
    for (const catalogEntry of catalogIndex.games) {
      if (catalogEntryKeys(catalogEntry).some((key) => madeGameKeys.has(key))) {
        continue;
      }
      loadedGames.push(enrich({
        slug: catalogEntry.slug,
        guid: undefined,
        file: `catalog/games/${catalogEntry.slug}.json`,
        name: catalogEntry.name,
        quality: catalogEntry.quality || 'placeholder',
        completeness: catalogEntry.completeness || {},
        description: catalogEntry.description || '',
        origin: catalogEntry.origin || '',
        players: catalogEntry.players || '',
        deck: catalogEntry.deck || '',
        difficulty: catalogEntry.difficulty || '',
        duration: catalogEntry.duration || '',
        alsoKnownAs: catalogEntry.alsoKnownAs || [],
        category: catalogEntry.category || undefined,
        subcategory: catalogEntry.subcategory || null,
        player_mode: catalogEntry.playerMode || null,
        file_exists: true,
        link_valid: 'catalog',
        source: 'catalog' as const,
      }));
    }
  }

  return {
    games: loadedGames,
    metadata: buildGameMetadata(loadedGames),
    cachedAt: Date.now(),
  };
}

async function loadFreshGamesDataSnapshot(): Promise<GamesDataSnapshot> {
  if (inFlightGamesDataSnapshot) {
    return await inFlightGamesDataSnapshot;
  }

  const generation = gamesDataCacheGeneration;
  inFlightGamesDataSnapshot = buildGamesDataSnapshot();
  try {
    const snapshot = await inFlightGamesDataSnapshot;
    if (generation === gamesDataCacheGeneration) {
      cachedGamesDataSnapshot = snapshot;
    }
    return snapshot;
  } finally {
    if (generation === gamesDataCacheGeneration) {
      inFlightGamesDataSnapshot = null;
    }
  }
}

export async function loadGamesDataSnapshot(options: { refresh?: boolean } = {}): Promise<GamesDataSnapshot> {
  if (options.refresh) {
    clearGamesDataSnapshotCache();
    clearGameCatalogCache();
    await Promise.all([
      clearContentSliceCache(),
      clearRawAssetDocumentCache(),
    ]);
  }

  return await loadFreshGamesDataSnapshot();
}
