import type { Game, GameMetadata } from '../types';
import { enrich } from '../helpers';
import { clearContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { clearGameCatalogCache, getGameCatalogEntries } from '@/adapters/assets/GameCatalogService';
import { clearRawAssetDocumentCache } from '@/adapters/assets/rawAssetDocument';
import { buildGameMetadata } from './gameCatalogToGameInfo';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';

export interface GamesDataSnapshot {
  games: Game[];
  metadata: GameMetadata | null;
  cachedAt: number;
}

let cachedGamesDataSnapshot: GamesDataSnapshot | null = null;
let inFlightGamesDataSnapshot: Promise<GamesDataSnapshot> | null = null;
let gamesDataCacheGeneration = 0;

export function getCachedGamesDataSnapshot(): GamesDataSnapshot | null {
  return cachedGamesDataSnapshot;
}

function clearGamesDataSnapshotCache(): void {
  gamesDataCacheGeneration += 1;
  cachedGamesDataSnapshot = null;
  inFlightGamesDataSnapshot = null;
}

async function buildGamesDataSnapshot(): Promise<GamesDataSnapshot> {
  const entries = await getGameCatalogEntries();

  const loadedGames: Game[] = [];

  for (const entry of entries) {
    if (entry.releaseStatus === GameModeStatus.Deprecated) {
      continue;
    }

    const slug = entry.gameId ? String(entry.gameId) : entry.displayName || entry.path;
    loadedGames.push(enrich({
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
      link_valid: entry.releaseStatus || GameModeStatus.WorkInProgress,
      source: 'asset' as const,
      releaseStatus: entry.releaseStatus ?? GameModeStatus.WorkInProgress,
    }));
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
