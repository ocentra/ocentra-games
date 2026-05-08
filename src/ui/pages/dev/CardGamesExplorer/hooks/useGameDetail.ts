import { useState, useCallback } from 'react';
import type { Game, GameDetail } from '../types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getGameMode } from '@/adapters/assets/GameCatalogService';
import { buildGameDetail } from '../adapters/gameCatalogToGameInfo';
import { loadAssetExplorerContent } from '../adapters/assetExplorerContent';
import { loadRemoteCatalogGame } from '@/adapters/assets/GameCatalogRuntimeSource';
import type { GameInfo } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';

const log = MainAppLogger.instance;
log.register(import.meta.url);

function buildCatalogGameDetail(slug: string, raw: unknown): GameDetail {
  const data = raw as Record<string, unknown>;
  return {
    filename: slug,
    name: (data.name as string) ?? slug,
    guid: undefined,
    completeness: (data.completeness as Record<string, boolean>) ?? {},
    quality: (data.quality as string) ?? 'placeholder',
    overview: data.overview,
    history: data.history,
    setup: data.setup,
    rules: data.rules,
    strategy: data.strategy,
    variations: data.variations,
    ai: null,
    sources: data.sources,
    source: 'catalog',
  };
}

export function useGameDetail() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = useCallback(async (game: Game) => {
    setSelectedGame(game);
    setDetailLoading(true);
    setGameDetail(null);

    let isResolved = false;

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (isResolved) return;
      isResolved = true;
      
      log.logWarn('[CardGamesExplorer] Detail load timeout (15s), using fallback metadata', getStackTrace(), { slug: game.slug });
      
      // Fallback in timeout to ensure UI shows something
      setGameDetail({
        filename: game.slug,
        name: game.name,
        guid: game.guid,
        completeness: game.completeness,
        quality: game.quality,
        source: game.source,
        overview: game.description,
        ai: null,
      });
      setDetailLoading(false);
    }, 15000);

    try {
      log.logInfo('[CardGamesExplorer] Starting detail load', getStackTrace(), { slug: game.slug, source: game.source });
      
      if (game.source === 'catalog') {
        const raw = await loadRemoteCatalogGame(game.slug);
        if (isResolved) return; // Already handled by timeout

        if (raw) {
          log.logInfo('[CardGamesExplorer] Catalog game loaded from R2', getStackTrace(), { slug: game.slug });
          setGameDetail(buildCatalogGameDetail(game.slug, raw));
        } else {
          log.logWarn('[CardGamesExplorer] Catalog game record NOT found in R2 path card-games/games/<slug>.json, using item metadata', getStackTrace(), { slug: game.slug });
          // Fallback to basic info if R2 record is missing
          setGameDetail({
            filename: game.slug,
            name: game.name,
            guid: undefined,
            completeness: game.completeness,
            quality: game.quality,
            overview: game.description,
            ai: null,
            source: 'catalog',
          });
        }
      } else {
        try {
          const assetContent = await loadAssetExplorerContent(game);
          if (isResolved) return;

          if (assetContent?.detail) {
            log.logInfo('[CardGamesExplorer] Asset-backed game detail loaded', getStackTrace(), { slug: game.slug });
            setGameDetail(assetContent.detail);
            return;
          }

          const gameModeId = game.guid || game.slug;
          log.logInfo('[CardGamesExplorer] Fetching GameMode for "Made" game', getStackTrace(), { identifier: gameModeId });
          const gameMode = await getGameMode(gameModeId);
          
          if (isResolved) return;

          if (gameMode) {
            log.logInfo('[CardGamesExplorer] GameMode loaded successfully', getStackTrace(), { slug: game.slug, guid: gameMode.guid?.toString() });
            
            const home = await gameMode.getHome().catch(err => {
              log.logWarn('[CardGamesExplorer] getHome() fail (non-fatal)', getStackTrace(), { slug: game.slug, error: err });
              return null;
            });

            // Extract GameInfo asset - handle cases where it might be the entry or the instance
            const gameInfoProperty = gameMode.gameInfoAsset;
            const gameInfo = gameInfoProperty?.asset ?? (gameInfoProperty && 'sections' in gameInfoProperty ? gameInfoProperty as unknown as GameInfo : null);
            
            log.logInfo('[CardGamesExplorer] Finalizing made game details', getStackTrace(), { 
              slug: game.slug, 
              hasHome: !!home, 
              hasInfo: !!gameInfo,
              infoAssetType: (gameInfo as { constructor?: { name?: string } })?.constructor?.name
            });
            
            setGameDetail(buildGameDetail(home, gameInfo));
          } else {
            log.logWarn('[CardGamesExplorer] GameMode not found in registry or bucket, using catalog fallback', getStackTrace(), { slug: game.slug });
            setGameDetail({
              filename: game.slug,
              name: game.name,
              guid: game.guid,
              completeness: game.completeness,
              quality: game.quality,
              source: 'asset',
              overview: game.description,
              ai: null,
            });
          }
        } catch (innerError) {
          log.logWarn('[CardGamesExplorer] Managed exception during asset load, reverting to fallback', getStackTrace(), { 
            slug: game.slug, 
            error: innerError instanceof Error ? innerError.message : String(innerError) 
          });
          if (isResolved) return;
          setGameDetail({
            filename: game.slug,
            name: game.name,
            guid: game.guid,
            completeness: game.completeness,
            quality: game.quality,
            source: 'asset',
            overview: game.description,
            ai: null,
          });
        }
      }
    } catch (e) {
      log.logError('[CardGamesExplorer] Uncaught exception in load flow', getStackTrace(), { 
        slug: game.slug, 
        error: e instanceof Error ? e.message : String(e) 
      });
      if (isResolved) return;
      // Final fallback to ensure UI doesn't hang
      setGameDetail({
        filename: game.slug,
        name: game.name,
        guid: game.guid,
        completeness: game.completeness,
        quality: game.quality,
        source: game.source,
        overview: game.description,
        ai: null,
      });
    } finally {
      if (!isResolved) {
        clearTimeout(timeoutId);
        setDetailLoading(false);
        isResolved = true;
      }
    }
  }, []);


  const closeDetail = useCallback(() => {
    setSelectedGame(null);
    setGameDetail(null);
  }, []);

  return { selectedGame, gameDetail, detailLoading, openDetail, closeDetail };
}
