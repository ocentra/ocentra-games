import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { DeleteAssetEvent } from '@ocentra/eventing-domain/events/assets/DeleteAssetEvent';

export async function handleDeleteGameMode(
  guid: string,
  onAssetDeleted: (path: string) => void
): Promise<void> {
  const deleteDeferred = new OperationDeferred<void>();
  await EventBus.instance.publishAsync(new DeleteAssetEvent(guid, deleteDeferred));
  const result = await deleteDeferred.promise;
  
  if (!result.isSuccess) {
    throw new Error(result.errorMessage || 'Failed to delete asset');
  }

  onAssetDeleted(guid);
}

export function handleAssetCreated(
  path: string,
  _selectedAsset: string | null,
  setSelectedAsset: (path: string) => void,
  _loadAsset: (path: string) => Promise<void>,
  refreshTree: () => void
): void {
  setSelectedAsset(path);

  setTimeout(() => {
    refreshTree();
  }, 500);

  // No special handling needed - GameRegistry is now virtual
}


