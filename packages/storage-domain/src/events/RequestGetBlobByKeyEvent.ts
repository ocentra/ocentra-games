import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestGetBlobByKeyEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetBlobByKey';

  readonly key: string;
  readonly deferred: OperationDeferred<Blob | null>;

  constructor(key: string, deferred: OperationDeferred<Blob | null>) {
    super();
    this.key = key;
    this.deferred = deferred;
  }
}
