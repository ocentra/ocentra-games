import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { AssetRegistryHandlerMarker } from '@/interfaces/IEventHandler';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class GetResourceByGuidEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetResourceByGuid';

  readonly deferred: OperationDeferred<IResourceEntry | null>;
  readonly guid: string;

  constructor(
    guid: string,
    deferred?: OperationDeferred<IResourceEntry | null>,
    targetHandler?: typeof AssetRegistryHandlerMarker
  ) {
    super(targetHandler);
    this.guid = guid;
    this.deferred = deferred || new OperationDeferred<IResourceEntry | null>();
  }
}
