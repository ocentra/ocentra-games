import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { ImageListEntry } from '../imageList/ImageList';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '@/AssetCreation';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
export interface CarouselAction {
  label: string;
  href?: string;
}

export interface CarouselSlide extends ImageListEntry {
  heading?: string;
  subheading?: string;
  action?: CarouselAction;
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'ImageCarousel',
  displayName: 'Image Carousel',
  icon: '🎞️',
  category: AssetTypeCategory.Content,
})
export class ImageCarousel extends ScriptableObject {

  static override schemaVersion = 1;
  static readonly requiresInspector = true;
  static override createTemplate(): Record<string, unknown> {
    return {
      slides: [],
      autoplayIntervalMs: 5000,
      lastImageDurationMs: 6000,
      fastRotationDurationMs: 2000,
      defaultRotationDurationMs: 3000,
      fastRotationThreshold: 4,
      slideTransitionDelayMs: 500,
    };
  }

  @serializable({ label: 'Slides' })
  slides!: CarouselSlide[];

  @serializable({ label: 'Autoplay Interval (ms)' })
  autoplayIntervalMs!: number;

  @serializable({ label: 'Last Image Duration (ms)' })
  lastImageDurationMs!: number;

  @serializable({ label: 'Fast Rotation Duration (ms)' })
  fastRotationDurationMs!: number;

  @serializable({ label: 'Default Rotation Duration (ms)' })
  defaultRotationDurationMs!: number;

  @serializable({ label: 'Fast Rotation Threshold' })
  fastRotationThreshold!: number;

  @serializable({ label: 'Slide Transition Delay (ms)' })
  slideTransitionDelayMs!: number;

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      const log = MainAppLogger.instance;
      log.logWarn('[ImageCarousel] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'ImageCarousel',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        const log = MainAppLogger.instance;
        log.logWarn('[ImageCarousel] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'ImageCarousel',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }
    const assetId = `${context.gameId}-carousel`;
    const data: Record<string, unknown> = {
      ...this.createTemplate(),
    };

    return {
      assetId,
      fileName: `${context.gameId}Carousel.asset`,
      guid,
      data,
    };
  }
}
