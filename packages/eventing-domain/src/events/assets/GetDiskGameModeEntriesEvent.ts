import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetDiskGameModeEntriesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetDiskGameModeEntries';

  readonly deferred: OperationDeferred<unknown>;

  constructor(deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()) {
    super();
    this.deferred = deferred;
  }
}
