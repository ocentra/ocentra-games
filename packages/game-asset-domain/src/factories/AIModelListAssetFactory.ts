import { AIModelList, type AIModelEntry } from '../ai/aiModelList/AIModelList';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import type { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { DEFAULT_MODEL_ENTRIES } from '../ai/default-model-list';

const log = MainAppLogger.instance;
const LOG_AI = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export class AIModelListFactory {
  private static instance: AIModelListFactory | null = null
  private cache: Map<string, AIModelList> = new Map()

  private constructor() {}

  static getInstance(): AIModelListFactory {
    if (!AIModelListFactory.instance) {
      AIModelListFactory.instance = new AIModelListFactory()
    }
    return AIModelListFactory.instance
  }

  createModelList(name: string, models: AIModelEntry[]): AIModelList {
    const assetId = name.toLowerCase().replace(/\s+/g, '-')

    if (this.cache.has(assetId)) {
      return this.cache.get(assetId)!
    }

    const asset = new AIModelList()
    asset.name = name
    asset.models = models

    this.cache.set(assetId, asset)

    return asset
  }

  private createDefaultFallbackModelList(): AIModelList {
    return this.createModelList('default', DEFAULT_MODEL_ENTRIES)
  }

  async loadModelList(assetId: string = 'default'): Promise<AIModelList | null> {
    if (this.cache.has(assetId)) {
      return this.cache.get(assetId)!
    }

    try {
      const assetType = AIModelList.assetType
      if (!assetType) {
        logError(`AIModelList.assetType is not defined`, undefined, LOG_AI)
        return null
      }

      const findAssetDeferred = new OperationDeferred<ResourceEntry | null>()
      await EventBus.instance.publishAsync(new FindAssetByTypeAndNameEvent(assetType, assetId, findAssetDeferred))
      const findResult = await findAssetDeferred.promise

      if (!findResult.isSuccess || !findResult.value) {
        logError(`Failed to find AIModelList asset with displayName: ${assetId}`, undefined, LOG_AI)
        if (assetId === 'default') {
          const fallback = this.createDefaultFallbackModelList()
          logInfo('Using built-in default AI model list (fallback)', undefined, LOG_AI)
          return fallback
        }
        return null
      }

      const assetEntry = findResult.value as AssetResourceEntry
      if (!assetEntry.guid) {
        logError(`Found AIModelList asset but it has no GUID: ${assetId}`, undefined, LOG_AI)
        return null
      }

      const asset = await ScriptableObject.loadByGuid(AIModelList, AssetGUID.from(assetEntry.guid))

      if (asset) {
        const hasModels = Array.isArray(asset.models) && asset.models.length > 0
        const hasEnabledModels = hasModels && asset.models.some((model) => model.enabled !== false)
        if (assetId === 'default' && !hasEnabledModels) {
          logWarn('Default AI model asset resolved with no enabled models; using fallback defaults', {
            data: { guid: assetEntry.guid, modelCount: Array.isArray(asset.models) ? asset.models.length : 0 },
          }, LOG_AI)
          const fallback = this.createDefaultFallbackModelList()
          this.cache.set(assetId, fallback)
          return fallback
        }
        this.cache.set(assetId, asset)
        return asset
      }

      if (assetId === 'default') {
        const fallback = this.createDefaultFallbackModelList()
        logWarn('Default AI model asset failed to deserialize; using fallback defaults', undefined, LOG_AI)
        return fallback
      }

      return null
    } catch (error) {
      logError(`Failed to load model list ${assetId}:`, error, LOG_AI)
      if (assetId === 'default') {
        const fallback = this.createDefaultFallbackModelList()
        logInfo('Using built-in default AI model list after load error', undefined, LOG_AI)
        return fallback
      }
      return null
    }
  }

  async getEnabledModels(): Promise<AIModelEntry[]> {
    const asset = await this.loadModelList('default')
    if (!asset) {
      return []
    }

    return asset.models
      .filter((model: AIModelEntry) => model.enabled !== false)
      .sort((a: AIModelEntry, b: AIModelEntry) => (a.priority ?? 999) - (b.priority ?? 999))
  }

  clearCache(): void {
    this.cache.clear()
  }
}
