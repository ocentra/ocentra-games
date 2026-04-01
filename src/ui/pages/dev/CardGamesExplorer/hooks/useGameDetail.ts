import { useState, useCallback } from 'react';
import type { Game, GameDetail } from '../types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { duckDetailToGameInfoDetail } from '../adapters/duckToGameInfo';

const log = MainAppLogger.instance;
log.register(import.meta.url);

export function useGameDetail() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (game: Game) => {
    setSelectedGame(game);
    setGameDetail(null);
    setDetailLoading(true);
    try {
      const resp = await fetch(LocalApiEndpoint.CardGames.GameBySlug(game.slug));
      if (resp.ok) {
        const raw = await resp.json();
        setGameDetail(duckDetailToGameInfoDetail(raw));
      }
    } catch (e) {
      log.logError('[CardGamesExplorer] Detail load error', getStackTrace(), { error: e });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedGame(null);
    setGameDetail(null);
  }, []);

  return { selectedGame, gameDetail, detailLoading, openDetail, closeDetail };
}
