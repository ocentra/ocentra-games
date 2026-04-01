import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetDirtyAssetsEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/GetDirtyAssets';

  readonly deferred: OperationDeferred<string[]>;

  constructor(deferred: OperationDeferred<string[]> = new OperationDeferred<string[]>()) {
    super();
    this.deferred = deferred;
  }
}

