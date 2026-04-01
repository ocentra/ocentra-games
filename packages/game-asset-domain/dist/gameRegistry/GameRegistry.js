import 'reflect-metadata';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetPathSegment } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetGameModeEvent } from '@ocentra/eventing-domain/events/game/GetGameModeEvent';
import { GetAllGameIdsEvent } from '@ocentra/eventing-domain/events/game/GetAllGameIdsEvent';
import { GetHomePageGamesInfosEvent } from '@ocentra/eventing-domain/events/game/GetHomePageGamesInfosEvent';
import { GetSelectedGamePageInfosEvent } from '@ocentra/eventing-domain/events/game/GetSelectedGamePageInfosEvent';
import { GetAssetTypeByGuidEvent } from '@ocentra/eventing-domain/events/game/GetAssetTypeByGuidEvent';
import { ClearGameRegistryCacheEvent } from '@ocentra/eventing-domain/events/game/ClearGameRegistryCacheEvent';
import { UpdateGameRegistryViewEvent } from '@ocentra/eventing-domain/events/game/UpdateGameRegistryViewEvent';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import { ComingSoon } from '../content/comingSoon/ComingSoon.js';
import { GameModeStatus } from '../constants/game-mode-status.js';
const log = MainAppLogger.instance;
log.register(import.meta.url);
const LOG_GAME_REGISTRY_VERBOSE = false;
log.logInfo('[GameRegistry] MODULE LOADED - file executed', getStackTrace(), {}, LOG_GAME_REGISTRY_VERBOSE);
const logInfo = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
const logWarn = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
const logError = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logError(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logError(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
export class GameRegistry extends ReactBehaviour {
    static executionOrder = -50;
    static {
        GameRegistry.setupEventSubscription();
        ServiceRegistry.register(GameRegistry, 'GameRegistry', GameRegistry.getOrCreateInstance);
    }
    static eventRegistrar = null;
    gameModeEntries = [];
    gameModeCache = new Map();
    constructorCache = new Map();
    constructor() {
        super();
    }
    static setupEventSubscription() {
        if (this.eventRegistrar)
            return;
        logInfo(`[GameRegistry] EVENT STEP 1: Setting up event subscriptions`, {}, LOG_GAME_REGISTRY_VERBOSE);
        this.eventRegistrar = new EventRegistrar();
        this.eventRegistrar.subscribeAsync(GetGameModeEvent, this.onGetGameModeEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetAllGameIdsEvent, this.onGetAllGameIdsEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetHomePageGamesInfosEvent, this.onGetHomePageGamesInfosEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetSelectedGamePageInfosEvent, this.onGetSelectedGamePageInfosEvent.bind(this));
        this.eventRegistrar.subscribeAsync(GetAssetTypeByGuidEvent, this.onGetAssetTypeByGuidEvent.bind(this));
        this.eventRegistrar.subscribeAsync(ClearGameRegistryCacheEvent, this.onClearGameRegistryCacheEvent.bind(this));
        this.eventRegistrar.subscribeAsync(UpdateGameRegistryViewEvent, this.onUpdateGameRegistryViewEvent.bind(this));
        logInfo(`[GameRegistry] EVENT STEP 2: Event subscriptions set up successfully`, {}, LOG_GAME_REGISTRY_VERBOSE);
    }
    static async onGetGameModeEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            const gameMode = await registry.getGameMode(event.idOrClassOrGuid);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(gameMode));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get game mode';
            logError(`Failed to get game mode: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetAllGameIdsEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            const ids = await registry.getAllGameIds();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(ids));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get all game IDs';
            logError(`Failed to get all game IDs: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetHomePageGamesInfosEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            const response = await registry.getHomePageGamesInfos();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(response));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get home page games infos';
            logError(`Failed to get home page games infos: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetSelectedGamePageInfosEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            const page = await registry.getSelectedGamePageInfos(event.gameId);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(page));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get selected game page infos';
            logError(`Failed to get selected game page infos: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onGetAssetTypeByGuidEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            const assetType = await registry.getAssetType(event.guid);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(assetType ?? null));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to get asset type by GUID';
            logError(`Failed to get asset type by GUID: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onClearGameRegistryCacheEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            registry.clearCache();
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to clear cache';
            logError(`Failed to clear cache: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static async onUpdateGameRegistryViewEvent(event) {
        try {
            const registry = await GameRegistry.getOrCreateInstance();
            registry.updateView(event.gameModeEntries);
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.success(true));
            }
        }
        catch (error) {
            const failureMessage = error instanceof Error ? error.message : 'Failed to update GameRegistry view';
            logError(`Failed to update GameRegistry view: ${failureMessage}`, { data: error });
            if (!event.deferred.isSettled()) {
                event.deferred.resolve(OperationResult.failure(failureMessage));
            }
        }
    }
    static instance = null;
    static loadingPromise = null;
    static getOrCreateInstance() {
        if (GameRegistry.instance) {
            logInfo('[GameRegistry] getOrCreateInstance - returning existing instance', LOG_GAME_REGISTRY_VERBOSE);
            return Promise.resolve(GameRegistry.instance);
        }
        if (GameRegistry.loadingPromise) {
            logInfo('[GameRegistry] getOrCreateInstance - returning loading promise', LOG_GAME_REGISTRY_VERBOSE);
            return GameRegistry.loadingPromise;
        }
        const getInstanceStart = performance.now();
        logInfo('[GameRegistry] getOrCreateInstance START - creating new instance', undefined, LOG_GAME_REGISTRY_VERBOSE);
        GameRegistry.loadingPromise = (async () => {
            const registry = new GameRegistry();
            registry.gameModeEntries = [];
            registry.__initialize();
            registry.start();
            await registry.syncFromAssetRegistry();
            const getInstanceEnd = performance.now();
            logInfo(`[GameRegistry] getOrCreateInstance END - ${(getInstanceEnd - getInstanceStart).toFixed(2)}ms`, LOG_GAME_REGISTRY_VERBOSE);
            GameRegistry.instance = registry;
            return registry;
        })();
        return GameRegistry.loadingPromise;
    }
    updateView(gameModeEntries) {
        this.gameModeEntries = gameModeEntries;
        const validGuids = new Set(gameModeEntries.map(e => e.guid).filter((g) => Boolean(g)));
        for (const [guid] of this.gameModeCache) {
            if (!validGuids.has(guid)) {
                this.gameModeCache.delete(guid);
            }
        }
        logInfo(`Updated GameRegistry view: ${this.gameModeEntries.length} game modes`, LOG_GAME_REGISTRY_VERBOSE);
    }
    async syncFromAssetRegistry() {
        logInfo('[GameRegistry] syncFromAssetRegistry START', {}, LOG_GAME_REGISTRY_VERBOSE);
        try {
            const getGameModeEntriesDeferred = new OperationDeferred();
            await EventBus.instance.publishAsync(new GetGameModeEntriesEvent(getGameModeEntriesDeferred));
            logInfo('[GameRegistry] syncFromAssetRegistry - Waiting for deferred promise...', {}, LOG_GAME_REGISTRY_VERBOSE);
            const result = await getGameModeEntriesDeferred.promise;
            logInfo('[GameRegistry] syncFromAssetRegistry - Received result', { isSuccess: result.isSuccess, count: result.value?.length }, LOG_GAME_REGISTRY_VERBOSE);
            if (result.isSuccess && result.value) {
                this.updateView(result.value);
            }
            else {
                logError('Failed to sync from asset registry:', { data: result.errorMessage });
            }
        }
        catch (error) {
            logError('Failed to sync from asset registry:', { data: error });
        }
    }
    awake() {
        if (!this.gameModeEntries || this.gameModeEntries.length === 0) {
            void this.syncFromAssetRegistry();
        }
    }
    async getAllGameIds() {
        return this.gameModeEntries
            .map(r => r.gameId)
            .filter((id) => Boolean(id))
            .map(id => id);
    }
    async getGameMode(idOrClassOrGuid) {
        let gameId = null;
        let guid = null;
        if (typeof idOrClassOrGuid === 'string') {
            if (idOrClassOrGuid.includes(':')) {
                const parts = idOrClassOrGuid.split(':');
                if (parts.length === 2) {
                    gameId = parts[0];
                    const possibleGuid = parts[1];
                    if (this.isGuid(possibleGuid)) {
                        guid = possibleGuid;
                    }
                }
            }
            else if (this.isGuid(idOrClassOrGuid)) {
                guid = idOrClassOrGuid;
            }
            else {
                gameId = idOrClassOrGuid;
            }
        }
        else if (idOrClassOrGuid instanceof AssetGUID) {
            guid = idOrClassOrGuid.toString();
        }
        else {
            const GameModeClass = idOrClassOrGuid;
            gameId = this.extractGameIdFromClass(GameModeClass);
            if (!gameId) {
                logWarn(`Cannot extract gameId from class: ${GameModeClass.name} `);
                return null;
            }
        }
        if (guid) {
            return this.getGameModeByGuid(guid);
        }
        return this.getGameModeById(gameId);
    }
    isGuid(value) {
        return AssetGUID.isValid(value);
    }
    extractGameIdFromClass(GameModeClass) {
        const className = GameModeClass.name;
        const gameModeSuffix = AssetPathSegment.GameMode;
        if (className.endsWith(gameModeSuffix)) {
            const gameId = className.replace(gameModeSuffix, '').toLowerCase();
            return gameId;
        }
        return null;
    }
    async getGameModeByGuid(guid) {
        if (this.gameModeCache.has(guid)) {
            const cached = this.gameModeCache.get(guid);
            if (cached) {
                logInfo(`Returning cached game mode by GUID: ${guid}`, LOG_GAME_REGISTRY_VERBOSE);
                return cached;
            }
        }
        try {
            const entry = this.gameModeEntries.find(e => e.guid === guid);
            if (!entry || !entry.assetType) {
                logError(`Game mode entry not found or missing assetType for GUID: ${guid}`);
                return null;
            }
            const constructor = await this.getGameModeConstructor(entry.assetType);
            if (!constructor) {
                logError(`Failed to get constructor for assetType: ${entry.assetType}`);
                return null;
            }
            const guidObj = AssetGUID.from(guid);
            const gameMode = await ScriptableObject.loadByGuid(constructor, guidObj);
            if (!gameMode) {
                logError(`ScriptableObject.loadByGuid returned null for GUID: ${guid}`);
                return null;
            }
            try {
                await this.loadNestedAssets(gameMode);
                gameMode.onNestedAssetsLoaded();
            }
            catch (error) {
                logError(`Failed to load nested assets for GUID ${guid}:`, { data: error });
            }
            this.gameModeCache.set(guid, gameMode);
            return gameMode;
        }
        catch (error) {
            logError(`Failed to load asset by GUID ${guid}:`, { data: error });
            return null;
        }
    }
    async getGameModeConstructor(assetType) {
        if (this.constructorCache.has(assetType)) {
            return this.constructorCache.get(assetType);
        }
        try {
            const getTypeInfoDeferred = new OperationDeferred();
            await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
            const result = await getTypeInfoDeferred.promise;
            if (!result.isSuccess || !result.value || !result.value.constructor) {
                logError(`Failed to get asset type info for: ${assetType}`);
                return null;
            }
            const constructor = result.value.constructor;
            this.constructorCache.set(assetType, constructor);
            return constructor;
        }
        catch (error) {
            logError(`Error getting constructor for assetType ${assetType}:`, { data: error });
            return null;
        }
    }
    async getGameModeById(gameId) {
        if (!gameId || typeof gameId !== 'string') {
            logError(`Invalid gameId provided to getGameModeById: ${gameId}`);
            return null;
        }
        logInfo(`getGameMode called for: ${gameId}`, LOG_GAME_REGISTRY_VERBOSE);
        if (this.gameModeCache.has(gameId)) {
            const cached = this.gameModeCache.get(gameId);
            if (cached) {
                logInfo(`Returning cached game mode: ${gameId}`, LOG_GAME_REGISTRY_VERBOSE);
                return cached;
            }
        }
        const entry = this.gameModeEntries.find(e => e.gameId === gameId);
        if (!entry || !entry.guid) {
            logError(`Game mode entry not found for gameId: ${gameId}`);
            return null;
        }
        const gameMode = await this.getGameModeByGuid(entry.guid);
        if (gameMode) {
            this.gameModeCache.set(gameId, gameMode);
        }
        return gameMode;
    }
    async loadNestedAssets(gameMode) {
        if (!gameMode) {
            logError('loadNestedAssets called with null/undefined gameMode');
            return;
        }
        try {
            await gameMode.loadNestedAssets();
        }
        catch (error) {
            logWarn('Error loading nested assets:', error);
        }
    }
    async getAssetType(guid) {
        const entry = this.gameModeEntries.find(e => e.guid === guid);
        return entry?.assetType;
    }
    clearCache() {
        this.gameModeCache.clear();
    }
    async getComingSoonImagesAsset() {
        try {
            const comingSoon = await ComingSoon.getOrCreateInstance();
            return comingSoon;
        }
        catch (error) {
            logWarn('Failed to load ComingSoon asset:', { data: error });
            return null;
        }
    }
    async getAllGameMetadatas() {
        logInfo(`Getting metadata for ${this.gameModeEntries.length} game modes...`, LOG_GAME_REGISTRY_VERBOSE);
        const metadataPromises = this.gameModeEntries.map(async (entry) => {
            if (!entry.guid) {
                logError(`Skipping game mode entry without GUID`);
                return null;
            }
            logInfo(`Getting metadata for entry (GUID: ${entry.guid})`, LOG_GAME_REGISTRY_VERBOSE);
            try {
                if (!entry.assetType) {
                    logError(`Game mode entry missing assetType for ${entry.gameId}`);
                    return null;
                }
                const constructor = await this.getGameModeConstructor(entry.assetType);
                if (!constructor) {
                    logError(`Failed to get constructor for assetType: ${entry.assetType} (gameId: ${entry.gameId})`);
                    return null;
                }
                const guidObj = AssetGUID.from(entry.guid);
                const gameMode = await ScriptableObject.loadByGuid(constructor, guidObj);
                if (!gameMode) {
                    logError(`GameMode not found for ${entry.gameId}`);
                    return null;
                }
                const home = await gameMode.getHome();
                if (!home) {
                    logError(`getHome returned null for: ${entry.gameId}`);
                    return null;
                }
                if (home.comingSoon && entry.gameId) {
                    try {
                        const comingSoonImage = await this.getComingSoonImageForGame(entry.gameId, home.gameId);
                        if (comingSoonImage) {
                            home.carouselImages = [comingSoonImage];
                        }
                    }
                    catch (error) {
                        logWarn(`Failed to get coming soon image for ${entry.gameId}:`, error);
                    }
                }
                logInfo(`Added game info home: ${home.name} (id: ${home.gameId}, comingSoon: ${home.comingSoon})`, LOG_GAME_REGISTRY_VERBOSE);
                return home;
            }
            catch (error) {
                logError(`Failed to get metadata for ${entry.gameId}:`, { data: error });
                return null;
            }
        });
        const results = await Promise.all(metadataPromises);
        const metadatas = results.filter((item) => item !== null);
        logInfo(`getAllGameMetadatas complete: ${metadatas.length} games`, LOG_GAME_REGISTRY_VERBOSE);
        return metadatas;
    }
    async getComingSoonImageForGame(gameId, routePath) {
        const comingSoonAsset = await this.getComingSoonImagesAsset();
        if (!comingSoonAsset || !comingSoonAsset.images) {
            return null;
        }
        const normalizedGameId = gameId.toLowerCase();
        const normalizedRoutePath = routePath?.toLowerCase();
        const matchingImage = comingSoonAsset.images.find((img) => {
            const imgId = img.id?.toLowerCase() || '';
            const imgLabel = img.label?.toLowerCase() || '';
            return imgId.includes(normalizedGameId) ||
                imgLabel === normalizedGameId ||
                imgId.includes(normalizedRoutePath || '') ||
                imgLabel === normalizedRoutePath;
        });
        if (matchingImage?.imageHash) {
            return matchingImage.imageHash;
        }
        return null;
    }
    async getComingSoonTeasers() {
        const comingSoonAsset = await this.getComingSoonImagesAsset();
        if (!comingSoonAsset || !comingSoonAsset.images) {
            return [];
        }
        return comingSoonAsset.images.map(img => ({
            id: img.id,
            name: img.label || img.id,
            bannerImage: img.imageHash,
            alt: img.alt,
        }));
    }
    async getHomePageGamesInfos() {
        const allGames = await this.getAllGameMetadatas();
        const teasers = await this.getComingSoonTeasers();
        const featured = allGames.filter((game) => game.enabled);
        const availableNow = allGames.filter((game) => game.enabled && game.releaseStatus === GameModeStatus.Available);
        const recommended = [...featured];
        return {
            featured,
            recommended,
            comingSoon: teasers,
            availableNow,
        };
    }
    async getSelectedGamePageInfos(gameId) {
        const gameIdStr = typeof gameId === 'string' ? gameId : String(gameId);
        try {
            const entry = this.gameModeEntries.find(e => e.gameId === gameIdStr || e.guid === gameIdStr || e.guid === String(gameId));
            if (!entry || !entry.guid || !entry.assetType) {
                logError(`Game mode entry not found for ${gameIdStr}`);
                return null;
            }
            const constructor = await this.getGameModeConstructor(entry.assetType);
            if (!constructor) {
                logError(`Failed to get constructor for assetType: ${entry.assetType} (gameId: ${gameIdStr})`);
                return null;
            }
            const guidObj = AssetGUID.from(entry.guid);
            const gameMode = await ScriptableObject.loadByGuid(constructor, guidObj);
            if (!gameMode) {
                logError(`GameMode not found for ${gameIdStr}`);
                return null;
            }
            const page = await gameMode.getPage();
            return page ?? null;
        }
        catch (error) {
            logError(`Failed to get selected game page infos for ${gameIdStr}:`, { data: error });
            return null;
        }
    }
}
