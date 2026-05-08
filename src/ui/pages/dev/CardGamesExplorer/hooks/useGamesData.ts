import { useState, useEffect } from 'react';
import type { Game, GameMetadata } from '../types';
import { enrich } from '../helpers';
import { clearContentSliceCache } from '@/adapters/assets/ContentSliceCache';
import { clearGameCatalogCache, getGameCatalogEntries } from '@/adapters/assets/GameCatalogService';
import { buildGameMetadata } from '../adapters/gameCatalogToGameInfo';
import { loadAssetExplorerContent } from '../adapters/assetExplorerContent';
import { authoredCatalogKeys, catalogEntryKeys } from '../adapters/catalogIdentity';
import { loadRemoteCatalogIndex } from '@/adapters/assets/GameCatalogRuntimeSource';

interface GamesDataState {
  games: Game[];
  metadata: GameMetadata | null;
  loading: boolean;
  loadError: string | null;
  refresh: () => void;
}

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

export function useGamesData(): GamesDataState {
  const [games, setGames] = useState<Game[]>([]);
  const [metadata, setMetadata] = useState<GameMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        if (refreshKey > 0) {
          clearGameCatalogCache();
          await clearContentSliceCache();
        }

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

        if (cancelled) return;

        setMetadata(buildGameMetadata(loadedGames));
        setGames(loadedGames);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshKey]);

  return {
    games,
    metadata,
    loading,
    loadError,
    refresh: () => setRefreshKey(k => k + 1),
  };
}
