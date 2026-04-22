import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SyncToR2Event } from '@ocentra/eventing-domain/events/assets/SyncToR2Event';
import { SyncAssetEvent } from '@ocentra/eventing-domain/events/assets/SyncAssetEvent';
import {
  getAssetEditorSyncTargetDetails,
  getActiveAssetEditorSyncTarget,
} from '@/services/storage/syncTarget';

export interface LayoutEditorSyncResult {
  synced: boolean;
  message: string;
}

export async function syncSavedLayoutAssetToR2(assetPath?: string): Promise<LayoutEditorSyncResult> {
  const syncTarget = getAssetEditorSyncTargetDetails(getActiveAssetEditorSyncTarget());
  if (!syncTarget.configured) {
    return {
      synced: false,
      message: 'Saved locally',
    };
  }

  const deferred = new OperationDeferred<void>();
  if (assetPath) {
    await EventBus.instance.publishAsync(new SyncAssetEvent(assetPath, deferred));
  } else {
    await EventBus.instance.publishAsync(new SyncToR2Event(deferred));
  }
  const result = await deferred.promise;
  if (!result.isSuccess) {
    throw new Error(result.errorMessage || `Failed to sync ${assetPath ? 'asset' : 'layout assets'} to ${syncTarget.label}`);
  }

  return {
    synced: true,
    message: `Saved and synced to ${syncTarget.label}`,
  };
}
