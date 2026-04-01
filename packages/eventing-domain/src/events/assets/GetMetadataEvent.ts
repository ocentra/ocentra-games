import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class GetMetadataEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetMetadata';

  readonly guid: string;
  readonly deferred: OperationDeferred<IResourceEntry | null>;

  constructor(guid: string, deferred: OperationDeferred<IResourceEntry | null> = new OperationDeferred<IResourceEntry | null>()) {
    super();
    this.guid = guid;
    this.deferred = deferred;
  }
}

