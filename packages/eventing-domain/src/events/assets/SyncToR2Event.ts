import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SyncToR2Event extends EventArgsBase {
  static readonly eventType = 'Assets/SyncToR2';

  readonly deferred: OperationDeferred<void>;

  constructor(
    deferred: OperationDeferred<void> = new OperationDeferred<void>()
  ) {
    super();
    this.deferred = deferred;
  }
}

