import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestDeleteBlobByKeyEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestDeleteBlobByKey';

  readonly key: string;
  readonly deferred: OperationDeferred<void>;

  constructor(key: string, deferred: OperationDeferred<void>) {
    super();
    this.key = key;
    this.deferred = deferred;
  }
}
