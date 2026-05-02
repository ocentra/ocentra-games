import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const fallback = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const createAssetGuid = (): AssetGUIDType => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID() as AssetGUIDType;
  }
  return fallback() as AssetGUIDType;
};

export const generateAssetGuid = async (assetType: string, gameId: string): Promise<AssetGUIDType> => {
  const deferred = new OperationDeferred<string>();
  const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));

  if (!publishResult.isSuccess || publishResult.value !== true) {
    const guid = createAssetGuid();
    MainAppLogger.instance.logWarn(`[${assetType}] GUID event unavailable, using fallback GUID (not uniqueness-checked)`, getStackTrace(), {
      assetType,
      gameId,
      fallbackGuid: guid,
    });
    return guid;
  }

  const result = await deferred.promise;
  const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
  const guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;

  if (!result.isSuccess || !result.value) {
    MainAppLogger.instance.logWarn(`[${assetType}] GUID generation failed, using fallback GUID (not uniqueness-checked)`, getStackTrace(), {
      assetType,
      gameId,
      fallbackGuid: guid,
    });
  }

  return guid;
};

export interface AssetCreationContext {
  gameId: string;
  displayName: string;
  category: string;
  timestamp: string;
}

export interface CreatedAsset {
  assetId: string;
  fileName: string;
  guid: string;
  data: Record<string, unknown>;
}
