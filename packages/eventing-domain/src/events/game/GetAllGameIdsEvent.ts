import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetAllGameIdsEvent extends EventArgsBase {
  static readonly eventType = 'Game/GetAllGameIds';

  readonly deferred: OperationDeferred<string[]>;

  constructor(deferred: OperationDeferred<string[]> = new OperationDeferred<string[]>()) {
    super();
    this.deferred = deferred;
  }
}

