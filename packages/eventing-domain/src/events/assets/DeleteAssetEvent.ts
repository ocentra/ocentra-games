import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class DeleteAssetEvent extends EventArgsBase {
  static readonly eventType = 'Assets/DeleteAsset';

  readonly guid: string;
  readonly deferred: OperationDeferred<void>;

  constructor(
    guid: string,
    deferred: OperationDeferred<void> = new OperationDeferred<void>()
  ) {
    super();
    this.guid = guid;
    this.deferred = deferred;
  }
}

