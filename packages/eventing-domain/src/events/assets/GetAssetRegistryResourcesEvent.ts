import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';
import type { AssetRegistryHandlerMarker } from '@/interfaces/IEventHandler';

export class GetAssetRegistryResourcesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetAssetRegistryResources';

  readonly deferred: OperationDeferred<IResourceEntry[]>;

  constructor(
    deferred: OperationDeferred<IResourceEntry[]> = new OperationDeferred<IResourceEntry[]>(),
    targetHandler?: typeof AssetRegistryHandlerMarker
  ) {
    super(targetHandler);
    this.deferred = deferred;
  }
}
