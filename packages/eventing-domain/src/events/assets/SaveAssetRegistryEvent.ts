import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SaveAssetRegistryEvent extends EventArgsBase {
  static readonly eventType = 'Assets/SaveAssetRegistry';

  readonly deferred: OperationDeferred<boolean>;

  constructor(deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()) {
    super();
    this.deferred = deferred;
  }
}
