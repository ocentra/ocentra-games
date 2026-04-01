import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { Layout } from '@/ui/layout/Layout';
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
import type { TableShapeSettings, SeatLayout } from '@ocentra/game-ui-types/tableLayoutTypes';

export interface LayoutPreset {
  table: TableShapeSettings;
  seats: SeatLayout[];
}

@serializableClass({
  schemaVersion: 1,
  assetType: 'CardGameLayout',
  displayName: 'Card Game Layout',
  icon: '🃏',
  category: AssetTypeCategory.UI,
})
export class CardGameLayout extends Layout {
  static override schemaVersion = 1;
  static override readonly requiresInspector = true;


  static override createTemplate(): Record<string, unknown> {
    return {
      defaultPlayerCount: 4,
      presets: {},
    };
  }

  @serializable({ label: 'Default Player Count' })
  defaultPlayerCount: number = 4;

  @serializable({ label: 'Layout Presets' })
  presets: Record<string, LayoutPreset> = {};

  @serializable({ label: 'Gameplay' })
  gameplay: Record<string, unknown> = {};

  @serializable({ label: 'Extensions' })
  extensions: Record<string, unknown> = {};

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      const log = MainAppLogger.instance;
      log.logWarn('[CardGameLayout] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'CardGameLayout',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        const log = MainAppLogger.instance;
        log.logWarn('[CardGameLayout] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'CardGameLayout',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }
    const assetId = `${context.gameId}-layout`;
    const data: Record<string, unknown> = {
      defaultPlayerCount: 4,
      presets: {},
      gameplay: {},
      extensions: {},
    };

    return {
      assetId,
      fileName: `${context.gameId}Layout.asset`,
      guid,
      data,
    };
  }
}


