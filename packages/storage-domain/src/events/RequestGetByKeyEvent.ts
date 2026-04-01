import { EventArgsBase } from '@ocentra/eventing-domain/core/EventArgsBase';
import type { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';

export class RequestGetByKeyEvent extends EventArgsBase {
  static readonly eventType = 'Storage/RequestGetByKey';

  readonly key: string;
  readonly deferred: OperationDeferred<ArrayBuffer | null>;

  constructor(key: string, deferred: OperationDeferred<ArrayBuffer | null>) {
    super();
    this.key = key;
    this.deferred = deferred;
  }
}
