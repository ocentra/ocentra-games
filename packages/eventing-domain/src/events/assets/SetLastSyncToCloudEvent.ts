import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SetLastSyncToCloudEvent extends EventArgsBase {
  static readonly eventType = 'Assets/SetLastSyncToCloud';

  readonly deferred: OperationDeferred<boolean>;
  readonly syncTimestamp: string;

  constructor(
    syncTimestamp: string,
    deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()
  ) {
    super();
    this.syncTimestamp = syncTimestamp;
    this.deferred = deferred;
  }
}

