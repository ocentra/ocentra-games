import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class ScanAndPopulateEvent extends EventArgsBase {
  static readonly eventType = 'Game/ScanAndPopulate';

  readonly deferred: OperationDeferred<boolean>;

  constructor(deferred: OperationDeferred<boolean> = new OperationDeferred<boolean>()) {
    super();
    this.deferred = deferred;
  }
}

