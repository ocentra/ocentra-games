import { useState, useEffect } from 'react';
import type { Game, GameMetadata } from '../types';
import { enrich } from '../helpers';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { duckGameToGameInfoSummary } from '../adapters/duckToGameInfo';

interface GamesDataState {
  games: Game[];
  metadata: GameMetadata | null;
  loading: boolean;
  loadError: string | null;
  refresh: () => void;
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
        const url = refreshKey > 0 ? `${LocalApiEndpoint.CardGames.Games}?refresh=1` : LocalApiEndpoint.CardGames.Games;
        const resp = await fetch(url);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`${LocalApiEndpoint.CardGames.Games}: ${resp.status} ${text.slice(0, 200)}`);
        }
        const raw = await resp.json() as { games?: unknown[]; metadata?: GameMetadata };
        if (cancelled) return;
        const gamesList = Array.isArray(raw.games) ? raw.games : [];
        setMetadata(raw.metadata ?? null);
        const gameInfoShaped = gamesList.map(g => duckGameToGameInfoSummary(g as Parameters<typeof duckGameToGameInfoSummary>[0]));
        setGames(gameInfoShaped.map(g => enrich(g)));
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
