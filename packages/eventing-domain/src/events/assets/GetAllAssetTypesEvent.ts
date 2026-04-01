import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetAllAssetTypesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetAllAssetTypes';

  readonly deferred: OperationDeferred<unknown>;

  constructor(deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()) {
    super();
    this.deferred = deferred;
  }
}

