import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class QueryLogsEvent extends EventArgsBase {
  static readonly eventType = 'Logs/QueryLogs';

  readonly queryParams: URLSearchParams;
  readonly deferred: OperationDeferred<{ logs: unknown[] }>;

  constructor(
    queryParams: URLSearchParams,
    deferred: OperationDeferred<{ logs: unknown[] }> = new OperationDeferred<{ logs: unknown[] }>()
  ) {
    super();
    this.queryParams = queryParams;
    this.deferred = deferred;
  }
}

