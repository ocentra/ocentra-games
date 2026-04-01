import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetGameModeEntriesEvent extends EventArgsBase {
  static readonly eventType = 'Assets/GetGameModeEntries';

  readonly deferred: OperationDeferred<unknown>;

  constructor(deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()) {
    super();
    this.deferred = deferred;
  }
}

