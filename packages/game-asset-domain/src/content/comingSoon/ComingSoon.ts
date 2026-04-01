import 'reflect-metadata';
import { serializableClass, serializable } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableSingleton } from '@ocentra/asset-domain/ScriptableSingleton';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { ImageListEntry } from '@/content/imageList/ImageList';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_COMING_SOON_VERBOSE = false;

const logInfo = (message: string, data?: unknown, enabled?: boolean) => {
  if (enabled ?? LOG_COMING_SOON_VERBOSE) {
    log.logInfo(message, getStackTrace(), data);
  }
};

const logError = (message: string, data?: unknown, enabled?: boolean) => {
  if (enabled ?? LOG_COMING_SOON_VERBOSE) {
    log.logError(message, getStackTrace(), data);
  }
};

@serializableClass({
  schemaVersion: 1,
  assetType: 'ComingSoon',
  displayName: 'Coming Soon',
  icon: '🎮',
  category: AssetTypeCategory.UI,
})
export class ComingSoon extends ScriptableSingleton {
  static override schemaVersion = 1;
  static override executionOrder = -40;
  static readonly requiresInspector = true;

  static override createTemplate(): Record<string, unknown> {
    return {
      images: [],
    };
  }

  static {
    ComingSoon.registerSingleton(ComingSoon);
  }

  @serializable({
    label: 'Coming Soon Images',
    group: 'Display',
  })
  images!: ImageListEntry[];

  static async getOrCreateInstance(): Promise<ComingSoon> {
    return ComingSoon.getOrCreateSingletonInstance(async () => {
      logInfo('Loading ComingSoon singleton...', undefined, LOG_COMING_SOON_VERBOSE);

      try {
        const loaded = await ScriptableSingleton.FirstOrDefault(ComingSoon);
        if (loaded) {
          logInfo('ComingSoon loaded from asset', {
            hasImages: !!loaded.images,
            imagesType: typeof loaded.images,
            isArray: Array.isArray(loaded.images),
            imageCount: loaded.images?.length || 0,
            images: loaded.images,
          }, LOG_COMING_SOON_VERBOSE);
          return loaded;
        }
      } catch (error) {
        logError('[ComingSoon] Failed to load existing instance', { data: error });
      }

      logInfo('Creating in-memory ComingSoon instance (not saved to disk)', undefined, LOG_COMING_SOON_VERBOSE);
      const instance = new ComingSoon();
      instance.images = [];
      return instance;
    });
  }
}
