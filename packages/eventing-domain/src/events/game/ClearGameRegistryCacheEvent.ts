import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class ClearGameRegistryCacheEvent extends EventArgsBase {
  static readonly eventType = 'Game/ClearGameRegistryCache';

  readonly deferred: OperationDeferred<boolean>;

  constructor(deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()) {
    super();
    this.deferred = deferred;
  }
}

