import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class ClearLogsEvent extends EventArgsBase {
  static readonly eventType = 'Logs/ClearLogs';

  readonly deferred: OperationDeferred<void>;

  constructor(deferred: OperationDeferred<void> = new OperationDeferred<void>()) {
    super();
    this.deferred = deferred;
  }
}

