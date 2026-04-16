import type { GameEngine } from '@ocentra/game-asset-domain/schemas/game-engine-schema';
import type { GameCatalogDocument } from '@ocentra/game-asset-domain/schemas/game-catalog-entry-schema';
import type { HomePageGamesDocument } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getPlatformAssetRuntime } from '@/adapters/assets/PlatformAssetRuntime';
import { getStorageConfig } from '@/services/storage/StorageConfig';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_GAME_CATALOG_RUNTIME = false;

async function withRuntimeRead<T>(
  label: string,
  read: () => Promise<T | null>
): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    log.logWarn(`[GameCatalogRuntimeSource] Failed to fetch ${label}`, getStackTrace(), {
      error: error instanceof Error ? error.message : String(error),
    }, LOG_GAME_CATALOG_RUNTIME);
    return null;
  }
}

export async function loadRemoteGameCatalogDocument(): Promise<GameCatalogDocument | null> {
  return await withRuntimeRead('remote game catalog', async () =>
    await getPlatformAssetRuntime().getGameCatalog(getStorageConfig())
  );
}

export async function loadRemoteHomePageGamesDocument(): Promise<HomePageGamesDocument | null> {
  return await withRuntimeRead('remote homepage games', async () =>
    await getPlatformAssetRuntime().getHomePageGames(getStorageConfig())
  );
}

export async function loadRemoteSelectedGamePage(gameId: string): Promise<GamePage | null> {
  return await withRuntimeRead(`remote selected game page (${gameId})`, async () =>
    await getPlatformAssetRuntime().getSelectedGamePage(gameId, getStorageConfig())
  );
}

export async function loadRemoteGameEngine(gameId: string): Promise<GameEngine | null> {
  return await withRuntimeRead(`remote game engine (${gameId})`, async () =>
    await getPlatformAssetRuntime().getGameEngine(gameId, getStorageConfig())
  );
}

export async function loadRemoteCatalogIndex(): Promise<unknown | null> {
  const storageConfig = getStorageConfig();
  const workerBase = storageConfig.r2Assets?.workerUrl?.replace(/\/$/, '') ?? '';
  if (!workerBase) return null;
  const url = `${workerBase}/api/v1/slices/catalog/index`;
  return await withRuntimeRead('remote catalog index', async () => {
    const res = await fetch(url);
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return null;
    }
    return await res.json() as unknown;
  });
}

export async function loadRemoteCatalogGame(slug: string): Promise<unknown | null> {
  const storageConfig = getStorageConfig();
  const workerBase = storageConfig.r2Assets?.workerUrl?.replace(/\/$/, '') ?? '';
  if (!workerBase) return null;
  const url = `${workerBase}/api/v1/slices/catalog/games/${encodeURIComponent(slug)}`;
  return await withRuntimeRead(`remote catalog game (${slug})`, async () => {
    const res = await fetch(url);
    if (!res.ok) {
      await res.text().catch(() => undefined);
      return null;
    }
    return await res.json() as unknown;
  });
}

