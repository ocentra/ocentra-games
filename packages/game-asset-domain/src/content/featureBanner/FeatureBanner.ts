import 'reflect-metadata';
import { serializableClass, serializable } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableSingleton } from '@ocentra/asset-domain/ScriptableSingleton';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_FEATURE_BANNER_VERBOSE = false;

export interface FeatureBannerItem {
  title: string;
  description: string;
  imageHash: ImageHash;
}

const logInfo = (message: string, data?: unknown, enabled?: boolean) => {
  if (enabled ?? LOG_FEATURE_BANNER_VERBOSE) {
    log.logInfo(message, getStackTrace(), data);
  }
};

const logError = (message: string, data?: unknown, enabled?: boolean) => {
  if (enabled ?? LOG_FEATURE_BANNER_VERBOSE) {
    log.logError(message, getStackTrace(), data);
  }
};

@serializableClass({
  schemaVersion: 1,
  assetType: 'FeatureBanner',
  displayName: 'Feature Banner',
  icon: '📋',
  category: AssetTypeCategory.Content,
})
export class FeatureBanner extends ScriptableSingleton {
  static override schemaVersion = 1;
  static override executionOrder = -40;
  static readonly requiresInspector = true;

  static override createTemplate(): Record<string, unknown> {
    return {
      items: [],
    };
  }

  static {
    FeatureBanner.registerSingleton(FeatureBanner);
  }

  @serializable({
    label: 'Feature Banner Items',
    group: 'Display',
  })
  items!: FeatureBannerItem[];

  static async getOrCreateInstance(): Promise<FeatureBanner> {
    return FeatureBanner.getOrCreateSingletonInstance(async () => {
      logInfo('Loading FeatureBanner singleton...', undefined, LOG_FEATURE_BANNER_VERBOSE);

      try {
        const loaded = await ScriptableSingleton.FirstOrDefault(FeatureBanner);
        if (loaded) {
          logInfo('FeatureBanner loaded from asset', {
            hasItems: !!loaded.items,
            itemCount: loaded.items?.length || 0,
          }, LOG_FEATURE_BANNER_VERBOSE);
          return loaded;
        }
      } catch (error) {
        logError('[FeatureBanner] Failed to load existing instance', { data: error });
      }

      logInfo('Creating in-memory FeatureBanner instance (not saved to disk)', undefined, LOG_FEATURE_BANNER_VERBOSE);
      const instance = new FeatureBanner();
      instance.items = [];
      return instance;
    });
  }
}
