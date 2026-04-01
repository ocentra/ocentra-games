import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class ScanR2StatusEvent extends EventArgsBase {
  static readonly eventType = 'Assets/ScanR2Status';

  readonly deferred: OperationDeferred<void>;

  constructor(
    deferred: OperationDeferred<void> = new OperationDeferred<void>()
  ) {
    super();
    this.deferred = deferred;
  }
}

