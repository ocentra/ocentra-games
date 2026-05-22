import { useEffect, useState } from 'react';
import type { Game, GameMetadata } from '../types';
import {
  getCachedGamesDataSnapshot,
  loadGamesDataSnapshot,
} from '../adapters/gamesDataSnapshot';

interface GamesDataState {
  games: Game[];
  metadata: GameMetadata | null;
  loading: boolean;
  loadError: string | null;
  refresh: () => void;
}

export { loadGamesDataSnapshot };

export function useGamesData(): GamesDataState {
  const initialSnapshot = getCachedGamesDataSnapshot();
  const [games, setGames] = useState<Game[]>(() => initialSnapshot?.games ?? []);
  const [metadata, setMetadata] = useState<GameMetadata | null>(() => initialSnapshot?.metadata ?? null);
  const [loading, setLoading] = useState(() => initialSnapshot === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cachedSnapshot = refreshKey === 0 ? getCachedGamesDataSnapshot() : null;
    if (cachedSnapshot) {
      setGames(cachedSnapshot.games);
      setMetadata(cachedSnapshot.metadata);
    }
    setLoading(cachedSnapshot === null);
    setLoadError(null);

    (async () => {
      try {
        const snapshot = await loadGamesDataSnapshot({ refresh: refreshKey > 0 });
        if (cancelled) return;

        setMetadata(snapshot.metadata);
        setGames(snapshot.games);
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
