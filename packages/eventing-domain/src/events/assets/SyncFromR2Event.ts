import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SyncFromR2Event extends EventArgsBase {
  static readonly eventType = 'Assets/SyncFromR2';

  readonly deferred: OperationDeferred<void>;

  constructor(
    deferred: OperationDeferred<void> = new OperationDeferred<void>()
  ) {
    super();
    this.deferred = deferred;
  }
}

