import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class GetLogStatsEvent extends EventArgsBase {
  static readonly eventType = 'Logs/GetLogStats';

  readonly source?: string;
  readonly deferred: OperationDeferred<unknown>;

  constructor(
    source: string | undefined,
    deferred: OperationDeferred<unknown> = new OperationDeferred<unknown>()
  ) {
    super();
    this.source = source;
    this.deferred = deferred;
  }
}

