import { GameMode } from '../gameMode/core/GameMode';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetGameModeEvent } from '@ocentra/eventing-domain/events/game/GetGameModeEvent';
import { GetAllGameIdsEvent } from '@ocentra/eventing-domain/events/game/GetAllGameIdsEvent';
import { ClearGameRegistryCacheEvent } from '@ocentra/eventing-domain/events/game/ClearGameRegistryCacheEvent';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

type GameModeConstructor = new () => GameMode;

const GAME_MODE_REGISTRY: Record<string, GameModeConstructor> = {
};

export class GameModeFactory {
  private static instances: Map<string, GameMode> = new Map();


  static async getGameMode(gameModeId: string): Promise<GameMode> {
    if (this.instances.has(gameModeId)) {
      return this.instances.get(gameModeId)!;
    }

    const getGameModeDeferred = new OperationDeferred<GameMode | null>();
    await EventBus.instance.publishAsync(new GetGameModeEvent(gameModeId, getGameModeDeferred));
    const result = await getGameModeDeferred.promise;
    const assetGameMode = result.isSuccess ? result.value : null;

    if (assetGameMode) {
      this.instances.set(gameModeId, assetGameMode);
      return assetGameMode;
    }

    const GameModeClass = GAME_MODE_REGISTRY[gameModeId];
    if (!GameModeClass) {
      throw new Error(
        `GameMode '${gameModeId}' not found in assets and not registered. ` +
        `Available modes: ${Object.keys(GAME_MODE_REGISTRY).join(', ')}`
      );
    }

    logWarn(
      'Assets',
      `[GameModeFactory] Asset not found for '${gameModeId}', creating from class. Consider creating an asset file in Phase 5.`
    );

    const instance = new GameModeClass();
    instance.__initialize();
    instance.start();
    this.instances.set(gameModeId, instance);

    return instance;
  }

  static getGameModeSync(gameModeId: string): GameMode {
    if (this.instances.has(gameModeId)) {
      return this.instances.get(gameModeId)!;
    }

    const GameModeClass = GAME_MODE_REGISTRY[gameModeId];
    if (!GameModeClass) {
      throw new Error(`GameMode '${gameModeId}' is not registered. Available modes: ${Object.keys(GAME_MODE_REGISTRY).join(', ')}`);
    }

    const instance = new GameModeClass();
    instance.__initialize();
    instance.start();
    this.instances.set(gameModeId, instance);

    return instance;
  }

  static registerGameMode(gameModeId: string, GameModeClass: GameModeConstructor): void {
    if (GAME_MODE_REGISTRY[gameModeId]) {
      logWarn(`GameMode '${gameModeId}' is already registered. Overwriting.`);
    }
    GAME_MODE_REGISTRY[gameModeId] = GameModeClass;
    this.instances.delete(gameModeId);
  }

  static async getAllGameModeIds(): Promise<string[]> {
    const getAllGameIdsDeferred = new OperationDeferred<string[]>();
    await EventBus.instance.publishAsync(new GetAllGameIdsEvent(getAllGameIdsDeferred));
    const result = await getAllGameIdsDeferred.promise;
    const assetIds = result.isSuccess && result.value ? result.value : [];
    const registryIds = Object.keys(GAME_MODE_REGISTRY);

    const allIds = new Set([...assetIds, ...registryIds]);
    return Array.from(allIds);
  }

  static async isAvailable(gameModeId: string): Promise<boolean> {
    const getGameModeDeferred = new OperationDeferred<GameMode | null>();
    await EventBus.instance.publishAsync(new GetGameModeEvent(gameModeId, getGameModeDeferred));
    const result = await getGameModeDeferred.promise;
    const assetGameMode = result.isSuccess ? result.value : null;
    if (assetGameMode) {
      return true;
    }

    return gameModeId in GAME_MODE_REGISTRY;
  }

  static isRegistered(gameModeId: string): boolean {
    return gameModeId in GAME_MODE_REGISTRY;
  }

  static getGameModeClass(gameModeId: string): GameModeConstructor | null {
    return GAME_MODE_REGISTRY[gameModeId] || null;
  }

  static getGameModeClassRegistry(): Record<string, GameModeConstructor> {
    return GAME_MODE_REGISTRY;
  }

  static async clearCache(): Promise<void> {
    this.instances.clear();
    const clearCacheDeferred = new OperationDeferred<boolean>();
    await EventBus.instance.publishAsync(new ClearGameRegistryCacheEvent(clearCacheDeferred));
    await clearCacheDeferred.promise;
  }
}
