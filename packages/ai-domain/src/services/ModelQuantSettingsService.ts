import type { InferenceSettings } from '@/types/inference-settings';
import { DEFAULT_INFERENCE_SETTINGS } from '@/types/inference-settings';
import { getModelQuantSettings, saveModelQuantSettings } from '@/storage/model-storage-api';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export function generateModelQuantAssetId(modelId: string, quantPath: string): string {
  const sanitizedModelId = modelId.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedQuant = quantPath
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/\.onnx$/, '')
    .replace(/^onnx_/, '');
  return `${sanitizedModelId}_${sanitizedQuant}`;
}

export interface ModelQuantSettingsServiceAdapters {
  loadSettingsFromAsset?: (modelId: string, quantPath: string) => Promise<InferenceSettings | null>;
  saveSettingsToAsset?: (modelId: string, quantPath: string, settings: InferenceSettings) => Promise<void>;
}

export class ModelQuantSettingsService {
  constructor(private adapters?: ModelQuantSettingsServiceAdapters) {}

  async getSettings(modelId: string, quantPath: string): Promise<InferenceSettings> {
    try {
      if (this.adapters?.loadSettingsFromAsset) {
        try {
          const assetSettings = await this.adapters.loadSettingsFromAsset(modelId, quantPath);
          if (assetSettings) {
            logInfo(`Loaded settings from asset for ${modelId}:${quantPath}`);
            return assetSettings;
          }
        } catch {
          logInfo(`Asset not found, trying IndexedDB for ${modelId}:${quantPath}`);
        }
      }

      const manifestSettings = await getModelQuantSettings(modelId, quantPath);
      if (manifestSettings) {
        logInfo('Loaded settings from IndexedDB manifest');
        return manifestSettings;
      }

      logInfo('Using default settings');
      return { ...DEFAULT_INFERENCE_SETTINGS };
    } catch (error) {
      logError(`Failed to load settings for ${modelId}:${quantPath}:`, error);
      return { ...DEFAULT_INFERENCE_SETTINGS };
    }
  }

  async saveSettings(
    modelId: string,
    quantPath: string,
    settings: InferenceSettings
  ): Promise<void> {
    try {
      if (this.adapters?.saveSettingsToAsset) {
        await this.adapters.saveSettingsToAsset(modelId, quantPath, settings);
      }

      await saveModelQuantSettings(modelId, quantPath, settings);

      logInfo(`Saved settings for ${modelId}:${quantPath}`);
    } catch (error) {
      logError(`Failed to save settings for ${modelId}:${quantPath}:`, error);
      throw error;
    }
  }

  getAssetPath(modelId: string, quantPath: string): string {
    const assetId = generateModelQuantAssetId(modelId, quantPath);
    return `/Resources/AI/Settings/${assetId}.asset`;
  }
}

let modelQuantSettingsServiceInstance: ModelQuantSettingsService | null = null;

export function createModelQuantSettingsService(adapters?: ModelQuantSettingsServiceAdapters): ModelQuantSettingsService {
  if (modelQuantSettingsServiceInstance) {
    return modelQuantSettingsServiceInstance;
  }
  modelQuantSettingsServiceInstance = new ModelQuantSettingsService(adapters);
  return modelQuantSettingsServiceInstance;
}

export function getModelQuantSettingsService(): ModelQuantSettingsService {
  if (!modelQuantSettingsServiceInstance) {
    throw new Error('ModelQuantSettingsService not initialized. Call createModelQuantSettingsService first.');
  }
  return modelQuantSettingsServiceInstance;
}
