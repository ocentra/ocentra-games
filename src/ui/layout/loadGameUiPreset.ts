import { toSerializedGameAssetFromLayoutSource } from '@/ui/layout/cardGameLayoutAsset';
import type { SerializedCardGameLayoutAsset } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import {
  cloneCardGameLayoutDocument,
  createDefaultCardGameLayoutAsset,
  hydrateCardGameLayoutAsset,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import type { GameAsset } from './tableLayoutTypes';
import { getGameAsset, setGameAsset } from './tableLayoutStore';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import { getGameMode } from '@/adapters/assets/GameCatalogService';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { serialize } from '@ocentra/asset-domain/Serializable';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';

const log = MainAppLogger.instance;
const LOG_ASSETS = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_ASSETS) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_ASSETS) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

let loadPromise: Promise<void> | null = null;
let loadedGameId: string | null = null;

const SHOULD_PERSIST_DEFAULT_ASSET =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.DEV &&
  import.meta.env?.VITE_ENABLE_DEV_LAYOUT_SAVE !== 'false';

export const createDefaultGameAsset = (gameId: string): GameAsset => {
  return createDefaultCardGameLayoutAsset(gameId);
};

type FetchResult = {
  serialized: SerializedCardGameLayoutAsset | null;
  gameModeExists: boolean;
  layoutMissing: boolean;
};

async function fetchSerializedAsset(gameId: string): Promise<FetchResult> {
  try {
    logInfo(`[GameAsset] fetchSerializedAsset called for: ${gameId}`, undefined, LOG_ASSETS);

    const gameMode = await getGameMode(gameId);

    if (!gameMode) {
      logWarn('[GameAsset] Game mode not found - game does not exist', gameId, LOG_ASSETS);
      return { serialized: null, gameModeExists: false, layoutMissing: false };
    }

    logInfo(`[GameAsset] GameMode loaded, layoutAsset: ${gameMode.layoutAsset?.guid || 'none'}`, undefined, LOG_ASSETS);

    const layoutAsset = gameMode.layoutAsset;
    if (!layoutAsset || !layoutAsset.guid) {
      logWarn('[GameAsset] No layoutAsset in game mode', gameId, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }

    const loader = AssetLoader.getInstance();
    const guidString = String(layoutAsset.guid);
    const response = await loader.loadAssetByGuid(guidString);
    if (!response.ok) {
      logWarn(`[GameAsset] Layout asset not found for GUID: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    const text = await response.text();
    
    if (!text) {
      logWarn(`[GameAsset] Layout asset not found, will generate defaults: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const assetType = ScriptableObject.extractAssetType(text);
    
    if (!assetType) {
      logWarn(`[GameAsset] Could not determine asset type for layout: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
    await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
    const typeInfoResult = await getTypeInfoDeferred.promise;
    
    if (!typeInfoResult.isSuccess || !typeInfoResult.value?.constructor) {
      logWarn(`[GameAsset] Could not get constructor for asset type: ${assetType}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const asset = await ScriptableObject.loadByGuid(typeInfoResult.value.constructor, layoutAsset.guid);
    if (!asset) {
      logWarn(`[GameAsset] Failed to load layout asset: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const layoutData = serialize(asset) as Record<string, unknown>;
    const serialized = toSerializedGameAssetFromLayoutSource(layoutData, gameId);
    return { serialized, gameModeExists: true, layoutMissing: false };
  } catch (error) {
    logWarn('[GameAsset] Error loading layout asset', { gameId, error }, LOG_ASSETS);
    return { serialized: null, gameModeExists: true, layoutMissing: true };
  }
}

export async function ensureGameAssetLoaded(gameId: string): Promise<void> {
  const currentAsset = getGameAsset();
  if (currentAsset && loadedGameId === gameId) {
    return;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const result = await fetchSerializedAsset(gameId);
      
      if (!result.gameModeExists) {
        const error = new Error(`Game mode not found: ${gameId}. The game does not exist.`);
        logError(`[GameAsset] Cannot load - game mode missing: ${gameId}`, undefined, LOG_ASSETS);
        loadPromise = null;
        throw error;
      }

      const wasLayoutMissing = result.layoutMissing;
      const asset = hydrateCardGameLayoutAsset(result.serialized, result.serialized?.metadata?.gameId ?? gameId);
      setGameAsset(asset);
      loadedGameId = asset.metadata.gameId;
      
      if (wasLayoutMissing && SHOULD_PERSIST_DEFAULT_ASSET) {
        logInfo(`[GameAsset] Layout missing - generated defaults and auto-saving: ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
        await persistGameAsset(asset);
      } else if (wasLayoutMissing) {
        logWarn(`[GameAsset] Layout missing - generated defaults (dev auto-save disabled): ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
      }
      loadPromise = null;
    })();
  }

  await loadPromise;
}

export async function persistGameAsset(asset: GameAsset): Promise<void> {
  try {
    const gameMode = await getGameMode(asset.metadata.gameId);
    const layoutAsset = gameMode?.layoutAsset;
    
    if (!layoutAsset || !layoutAsset.guid) {
      logWarn(`[GameAsset] Cannot auto-save: game mode missing or no layoutAsset: ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
      return;
    }

    const guidString = String(layoutAsset.guid);
    const loader = AssetLoader.getInstance();
    const response = await loader.loadAssetByGuid(guidString);
    if (!response.ok) {
      throw new Error(`Failed to load layout asset: ${guidString}`);
    }
    const text = await response.text();
    const assetType = ScriptableObject.extractAssetType(text);
    if (!assetType) {
      throw new Error(`Could not determine asset type for layout: ${guidString}`);
    }

    const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
    await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
    const typeInfoResult = await getTypeInfoDeferred.promise;
    if (!typeInfoResult.isSuccess || !typeInfoResult.value?.constructor) {
      throw new Error(`Could not get constructor for asset type: ${assetType}`);
    }

    const layoutInstance = await ScriptableObject.loadByGuid(typeInfoResult.value.constructor, layoutAsset.guid);
    if (!layoutInstance) {
      throw new Error(`Failed to load layout asset instance: ${guidString}`);
    }

    const layoutRecord = layoutInstance as unknown as Record<string, unknown>;
    Object.assign(layoutRecord, cloneCardGameLayoutDocument(asset.layout));
    layoutRecord.metadata = { ...asset.metadata };
    layoutRecord.gameplay = { ...asset.gameplay };
    layoutRecord.extensions = { ...asset.extensions };

    await layoutInstance.saveChanges();
    logInfo(`[GameAsset] Saved layout asset: ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
  } catch (error) {
    logError(`[GameAsset] Failed to persist asset: ${asset.metadata.gameId}`, error, LOG_ASSETS);
  }
}

export async function loadGameUiPreset(gameId: string): Promise<GameAsset> {
  await ensureGameAssetLoaded(gameId);
  const asset = getGameAsset();
  if (!asset) {
    throw new Error(`Failed to load game asset for ${gameId}`);
  }
  return asset;
}
