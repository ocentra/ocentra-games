import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class SaveLogsEvent extends EventArgsBase {
  static readonly eventType = 'Logs/SaveLogs';

  readonly logs: unknown[];
  readonly deferred: OperationDeferred<void>;

  constructor(
    logs: unknown[],
    deferred: OperationDeferred<void> = new OperationDeferred<void>()
  ) {
    super();
    this.logs = logs;
    this.deferred = deferred;
  }
}

