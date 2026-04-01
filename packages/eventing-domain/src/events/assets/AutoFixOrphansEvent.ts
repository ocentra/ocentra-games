import { EventArgsBase } from '@/core/EventArgsBase';
import { OperationDeferred } from '@/core/OperationDeferred';

export class AutoFixOrphansEvent extends EventArgsBase {
  static readonly eventType = 'MetaFile/AutoFixOrphans';

  readonly deferred: OperationDeferred<void>;

  constructor(deferred: OperationDeferred<void> = new OperationDeferred<void>()) {
    super();
    this.deferred = deferred;
  }
}


