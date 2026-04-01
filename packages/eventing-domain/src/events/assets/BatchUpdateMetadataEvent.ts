import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';

export class BatchUpdateMetadataEvent extends EventArgsBase {
  static readonly eventType = 'Assets/BatchUpdateMetadata';

  readonly metadataMap: Map<string, IResourceEntry>;
  readonly deferred: OperationDeferred<boolean>;

  constructor(
    metadataMap: Map<string, IResourceEntry>,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.metadataMap = metadataMap;
    this.deferred = deferred;
  }
}

