import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetGameModeEvent } from '@ocentra/eventing-domain/events/game/GetGameModeEvent';
import { GetAllGameIdsEvent } from '@ocentra/eventing-domain/events/game/GetAllGameIdsEvent';
import { ClearGameRegistryCacheEvent } from '@ocentra/eventing-domain/events/game/ClearGameRegistryCacheEvent';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
const log = MainAppLogger.instance;
const logWarn = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
log.register(import.meta.url);
const GAME_MODE_REGISTRY = {};
export class GameModeFactory {
    static instances = new Map();
    static async getGameMode(gameModeId) {
        if (this.instances.has(gameModeId)) {
            return this.instances.get(gameModeId);
        }
        const getGameModeDeferred = new OperationDeferred();
        await EventBus.instance.publishAsync(new GetGameModeEvent(gameModeId, getGameModeDeferred));
        const result = await getGameModeDeferred.promise;
        const assetGameMode = result.isSuccess ? result.value : null;
        if (assetGameMode) {
            this.instances.set(gameModeId, assetGameMode);
            return assetGameMode;
        }
        const GameModeClass = GAME_MODE_REGISTRY[gameModeId];
        if (!GameModeClass) {
            throw new Error(`GameMode '${gameModeId}' not found in assets and not registered. ` +
                `Available modes: ${Object.keys(GAME_MODE_REGISTRY).join(', ')}`);
        }
        logWarn('Assets', `[GameModeFactory] Asset not found for '${gameModeId}', creating from class. Consider creating an asset file in Phase 5.`);
        const instance = new GameModeClass();
        instance.__initialize();
        instance.start();
        this.instances.set(gameModeId, instance);
        return instance;
    }
    static getGameModeSync(gameModeId) {
        if (this.instances.has(gameModeId)) {
            return this.instances.get(gameModeId);
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
    static registerGameMode(gameModeId, GameModeClass) {
        if (GAME_MODE_REGISTRY[gameModeId]) {
            logWarn(`GameMode '${gameModeId}' is already registered. Overwriting.`);
        }
        GAME_MODE_REGISTRY[gameModeId] = GameModeClass;
        this.instances.delete(gameModeId);
    }
    static async getAllGameModeIds() {
        const getAllGameIdsDeferred = new OperationDeferred();
        await EventBus.instance.publishAsync(new GetAllGameIdsEvent(getAllGameIdsDeferred));
        const result = await getAllGameIdsDeferred.promise;
        const assetIds = result.isSuccess && result.value ? result.value : [];
        const registryIds = Object.keys(GAME_MODE_REGISTRY);
        const allIds = new Set([...assetIds, ...registryIds]);
        return Array.from(allIds);
    }
    static async isAvailable(gameModeId) {
        const getGameModeDeferred = new OperationDeferred();
        await EventBus.instance.publishAsync(new GetGameModeEvent(gameModeId, getGameModeDeferred));
        const result = await getGameModeDeferred.promise;
        const assetGameMode = result.isSuccess ? result.value : null;
        if (assetGameMode) {
            return true;
        }
        return gameModeId in GAME_MODE_REGISTRY;
    }
    static isRegistered(gameModeId) {
        return gameModeId in GAME_MODE_REGISTRY;
    }
    static getGameModeClass(gameModeId) {
        return GAME_MODE_REGISTRY[gameModeId] || null;
    }
    static getGameModeClassRegistry() {
        return GAME_MODE_REGISTRY;
    }
    static async clearCache() {
        this.instances.clear();
        const clearCacheDeferred = new OperationDeferred();
        await EventBus.instance.publishAsync(new ClearGameRegistryCacheEvent(clearCacheDeferred));
        await clearCacheDeferred.promise;
    }
}
